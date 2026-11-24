<?php

use App\Mail\ApplicantNoteMail;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\Interview;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

uses(LazilyRefreshDatabase::class)->group('api');

function phaseSixToken(User $user): string
{
    Auth::forgetGuards();

    return $user->createToken('phase-six-test')->plainTextToken;
}

function phaseSixApplication(User $employer, User $applicant, string $status = 'shortlisted'): Application
{
    $company = Company::firstOrCreate(
        ['user_id' => $employer->id],
        ['name' => 'Interview Test Company', 'is_verified' => true],
    );
    CompanyVerification::updateOrCreate(
        ['company_id' => $company->id],
        ['status' => 'verified'],
    );

    $listing = $company->jobListings()->create([
        'category_id' => Category::create(['name' => fake()->unique()->words(2, true)])->id,
        'listing_type' => 'job',
        'title' => 'Software Developer',
        'description' => 'Build software.',
        'responsibilities' => 'Build and maintain software.',
        'requirements' => 'Relevant experience.',
        'location' => 'Cebu City',
        'work_setup' => 'onsite',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
    ]);

    $resume = $applicant->resumes()->create([
        'storage_path' => 'applicant-resumes/'.$applicant->id.'/'.fake()->uuid().'.pdf',
        'original_filename' => 'resume.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 100,
        'is_current' => true,
    ]);

    $application = new Application([
        'resume_id' => $resume->id,
        'status' => $status,
        'resume_original_filename' => $resume->original_filename,
        'resume_mime_type' => $resume->mime_type,
        'resume_file_size' => $resume->file_size,
        'applied_at' => now()->subDay(),
    ]);
    $application->applicant()->associate($applicant);
    $application->jobListing()->associate($listing);
    $application->save();
    $application->statusHistories()->create([
        'previous_status' => 'reviewing',
        'new_status' => $status,
        'actor_id' => $employer->id,
        'created_at' => now()->subHour(),
    ]);

    return $application;
}

function phaseSixSchedule(array $overrides = []): array
{
    return array_merge([
        'availability_dates' => [now('Asia/Manila')->addDays(2)->toDateString()],
        'start_time' => '09:00',
        'end_time' => '17:00',
        'break_start_time' => '12:00',
        'break_end_time' => '13:00',
        'duration_minutes' => 60,
        'buffer_minutes' => 0,
        'timezone' => 'Asia/Manila',
        'mode' => 'onsite',
        'location' => 'Cebu City office',
        'applicant_notes' => 'Please bring a valid ID.',
        'internal_notes' => 'Review coding exercise.',
    ], $overrides);
}

function phaseSixInterview(Application $application, string $status, $scheduledAt): Interview
{
    $interview = new Interview([
        'scheduled_at' => $scheduledAt,
        'end_at' => $scheduledAt->copy()->addHour(),
        'timezone' => 'Asia/Manila',
        'mode' => 'online',
        'meeting_url' => 'https://meet.example.com/private',
        'meeting_instructions' => 'Join the call.',
        'internal_notes' => 'Private employer feedback.',
        'applicant_notes' => 'Please join early.',
        'status' => $status,
        'cancelled_at' => $status === 'cancelled' ? now()->subDay() : null,
        'cancelled_by' => $status === 'cancelled' ? $application->jobListing->company->user_id : null,
        'cancellation_reason' => $status === 'cancelled' ? 'Schedule conflict.' : null,
    ]);
    $interview->application()->associate($application);
    $interview->applicant_id = $application->applicant_id;
    $interview->employer_id = $application->jobListing->company->user_id;
    $interview->save();

    return $interview;
}

it('allows an employer to send a branded note to the applicant email', function (): void {
    Mail::fake();
    $applicant = User::factory()->create(['role' => 'applicant', 'email' => 'applicant-note@example.test']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);

    $this->withToken(phaseSixToken($employer))
        ->postJson("/api/employer/applications/{$application->id}/note", [
            'note' => 'Please bring a copy of your resume.',
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Note sent to the applicant.');

    Mail::assertSent(ApplicantNoteMail::class, function (ApplicantNoteMail $mail) use ($applicant): bool {
        return $mail->hasTo($applicant->email)
            && $mail->note === 'Please bring a copy of your resume.';
    });
    expect($applicant->notifications()->count())->toBe(1);
});

it('allows an employer to invite an applicant to schedule and atomically moves shortlisted applications to interview', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $this->withToken($token)->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated()
        ->assertJsonPath('data.application_id', $application->id)
        ->assertJsonPath('data.status', 'invited')
        ->assertJsonPath('data.mode', 'onsite')
        ->assertJsonPath('data.location', 'Cebu City office')
        ->assertJsonPath('data.internal_notes', 'Review coding exercise.')
        ->assertJsonCount(1, 'data.availability');

    $interview = Interview::where('application_id', $application->id)->firstOrFail();
    expect($application->refresh()->status)->toBe('interview')
        ->and($interview->applicant_id)->toBe($applicant->id)
        ->and($interview->employer_id)->toBe($employer->id)
        ->and($interview->status)->toBe('invited');
    expect($applicant->notifications()->count())->toBe(1);
    expect((int) ($applicant->notifications()->first()?->data['metadata']['interview_id'] ?? 0))
        ->toBe($interview->id);

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($applicant))
        ->getJson('/api/applicant/applications')
        ->assertOk()
        ->assertJsonPath('data.0.interview.id', $interview->id)
        ->assertJsonPath('data.0.interview.status', 'invited')
        ->assertJsonPath('data.0.interview.availability.0.date', $interview->availability()->first()->available_date->toDateString());

    $this->assertDatabaseHas('application_status_histories', [
        'application_id' => $application->id,
        'previous_status' => 'shortlisted',
        'new_status' => 'interview',
        'actor_id' => $employer->id,
    ]);
    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'invited',
        'actor_id' => $employer->id,
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson("/api/employer/applications/{$application->id}/interviews")
        ->assertOk()
        ->assertJsonPath('data.0.id', $interview->id);

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($employer))
        ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('application');
});

it('prevents scheduling interviews for another employer or ineligible applications', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $owner = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($owner, $applicant);

    $this->withToken(phaseSixToken($otherEmployer))
        ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertNotFound();

    $pendingApplication = phaseSixApplication($owner, User::factory()->create(['role' => 'applicant']), 'pending');
    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($owner))
        ->postJson("/api/employer/applications/{$pendingApplication->id}/interviews", phaseSixSchedule())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('application');

    expect(Interview::count())->toBe(0)
        ->and($pendingApplication->refresh()->status)->toBe('pending');
});

it('rolls back interview and application changes when writing status history fails', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    DB::statement(<<<'SQL'
        CREATE TRIGGER fail_interview_status_history
        BEFORE INSERT ON application_status_histories
        WHEN NEW.new_status = 'interview'
        BEGIN
            SELECT RAISE(ABORT, 'simulated status history failure');
        END
        SQL);

    try {
        expect(fn () => $this->withoutExceptionHandling()
            ->withToken($token)
            ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule()))
            ->toThrow(QueryException::class);
    } finally {
        DB::statement('DROP TRIGGER IF EXISTS fail_interview_status_history');
    }

    expect(Interview::count())->toBe(0)
        ->and($application->refresh()->status)->toBe('shortlisted');
    $this->assertDatabaseMissing('application_status_histories', [
        'application_id' => $application->id,
        'new_status' => 'interview',
    ]);
});

it('validates availability dates, time windows, timezone, mode, and meeting details', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $invalidSchedules = [
        ['availability_dates' => [now('Asia/Manila')->subDay()->toDateString()]],
        ['start_time' => '17:00', 'end_time' => '09:00'],
        ['break_start_time' => '12:00', 'break_end_time' => null],
        ['break_start_time' => '08:00', 'break_end_time' => '08:30'],
        ['mode' => 'video_call'],
        ['mode' => 'onsite', 'location' => null],
        ['mode' => 'online', 'location' => null, 'meeting_url' => null, 'meeting_instructions' => null],
        ['timezone' => 'Mars/Olympus_Mons'],
    ];

    foreach ($invalidSchedules as $overrides) {
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson(
            "/api/employer/applications/{$application->id}/interviews",
            phaseSixSchedule($overrides),
        )->assertUnprocessable();
    }

    expect(Interview::count())->toBe(0)
        ->and($application->refresh()->status)->toBe('shortlisted');
});

it('generates slots around breaks and confirms an applicant-selected time', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $date = now('Asia/Manila')->addDays(2)->toDateString();
    $this->withToken(phaseSixToken($employer))
        ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule([
            'availability_dates' => [$date],
        ]))
        ->assertCreated()
        ->assertJsonPath('data.status', 'invited');
    $interview = Interview::where('application_id', $application->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $applicantToken = phaseSixToken($applicant);
    $this->withToken($applicantToken)
        ->getJson("/api/applicant/interviews/{$interview->id}/availability")
        ->assertOk()
        ->assertJsonPath('data.dates.0.date', $date)
        ->assertJsonPath('data.dates.0.slots.0.start_time', '09:00')
        ->assertJsonPath('data.dates.0.slots.3.start_time', '13:00')
        ->assertJsonMissing(['start_time' => '12:00']);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)
        ->postJson("/api/applicant/interviews/{$interview->id}/schedule", [
            'date' => $date,
            'start_time' => '10:00',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'scheduled');

    $interview->refresh();
    expect($interview->scheduled_at->utc()->toISOString())
        ->toBe(CarbonImmutable::parse($date.' 10:00', 'Asia/Manila')->utc()->toISOString())
        ->and($applicant->notifications()->count())->toBe(1)
        ->and($employer->notifications()->count())->toBe(1);
    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'booked',
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)
        ->postJson("/api/applicant/interviews/{$interview->id}/schedule", [
            'date' => $date,
            'start_time' => '10:00',
        ])
        ->assertOk();
    expect($interview->histories()->count())->toBe(2);
});

it('rejects lunch, unlisted, and double-booked interview slots', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $firstApplicant = User::factory()->create(['role' => 'applicant']);
    $secondApplicant = User::factory()->create(['role' => 'applicant']);
    $firstApplication = phaseSixApplication($employer, $firstApplicant);
    $secondApplication = phaseSixApplication($employer, $secondApplicant);
    $date = now('Asia/Manila')->addDays(3)->toDateString();
    $employerToken = phaseSixToken($employer);

    foreach ([$firstApplication, $secondApplication] as $application) {
        $this->app['auth']->forgetGuards();
        $this->withToken($employerToken)
            ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule([
                'availability_dates' => [$date],
            ]))
            ->assertCreated();
    }

    $interviews = Interview::orderBy('id')->get();
    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($firstApplicant))
        ->postJson("/api/applicant/interviews/{$interviews[0]->id}/schedule", [
            'date' => $date,
            'start_time' => '12:00',
        ])
        ->assertStatus(409);

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($firstApplicant))
        ->postJson("/api/applicant/interviews/{$interviews[0]->id}/schedule", [
            'date' => now('Asia/Manila')->addDays(4)->toDateString(),
            'start_time' => '09:00',
        ])
        ->assertStatus(409);

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($firstApplicant))
        ->postJson("/api/applicant/interviews/{$interviews[0]->id}/schedule", [
            'date' => $date,
            'start_time' => '09:00',
        ])
        ->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseSixToken($secondApplicant))
        ->postJson("/api/applicant/interviews/{$interviews[1]->id}/schedule", [
            'date' => $date,
            'start_time' => '09:00',
        ])
        ->assertStatus(409);
});

it('preserves a confirmed interview when the employer edits availability and lets applicants cancel', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);
    $date = now('Asia/Manila')->addDays(2)->toDateString();
    $this->withToken($token)
        ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule([
            'availability_dates' => [$date],
        ]))
        ->assertCreated();
    $interview = Interview::where('application_id', $application->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $applicantToken = phaseSixToken($applicant);
    $this->withToken($applicantToken)
        ->postJson("/api/applicant/interviews/{$interview->id}/schedule", [
            'date' => $date,
            'start_time' => '10:00',
        ])
        ->assertOk();
    $bookedAt = $interview->refresh()->scheduled_at->toISOString();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)
        ->putJson("/api/employer/interviews/{$interview->id}/availability", phaseSixSchedule([
            'availability_dates' => [now('Asia/Manila')->addDays(5)->toDateString()],
        ]))
        ->assertOk()
        ->assertJsonPath('booked_date_preserved', true)
        ->assertJsonPath('data.status', 'scheduled');
    expect($interview->refresh()->scheduled_at->toISOString())->toBe($bookedAt)
        ->and($interview->availability()->count())->toBe(2);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)
        ->postJson("/api/applicant/interviews/{$interview->id}/cancel", ['reason' => 'Cannot attend'])
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');
    expect($employer->notifications()->count())->toBe(1)
        ->and($interview->refresh()->cancellation_reason)->toBe('Cannot attend');
});

it('rejects employer direct scheduling changes in favor of applicant-selected times', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $this->withToken($token)->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated();
    $interview = Interview::where('application_id', $application->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", phaseSixSchedule([
        'availability_dates' => [now('Asia/Manila')->addDays(4)->toDateString()],
    ]))->assertStatus(405);

    expect($interview->refresh()->status)->toBe('invited')
        ->and($application->refresh()->status)->toBe('interview');
});

it('cancels without changing the application pipeline and prevents repeated cancellation or rescheduling', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $this->withToken($token)->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated();
    $interview = Interview::where('application_id', $application->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/employer/interviews/{$interview->id}/cancel", [
        'reason' => 'Applicant requested a different date.',
    ])->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.cancellation_reason', 'Applicant requested a different date.');

    expect($application->refresh()->status)->toBe('interview')
        ->and($interview->refresh()->status)->toBe('cancelled')
        ->and($interview->cancelled_by)->toBe($employer->id);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/employer/interviews/{$interview->id}/cancel")
        ->assertUnprocessable();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", phaseSixSchedule())
        ->assertStatus(405);

    $this->assertDatabaseCount('interview_histories', 2);
    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'cancelled',
        'reason' => 'Applicant requested a different date.',
    ]);
});

it('prevents employers from modifying another employer interview', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $owner = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($owner, $applicant);
    $this->withToken(phaseSixToken($owner))
        ->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated();
    $interview = Interview::where('application_id', $application->id)->firstOrFail();

    $token = phaseSixToken($otherEmployer);
    $this->withToken($token)->getJson("/api/employer/interviews/{$interview->id}")->assertNotFound();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}/availability", phaseSixSchedule())
        ->assertNotFound();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/employer/interviews/{$interview->id}/cancel")
        ->assertNotFound();
});

it('allows employers to mark past interviews completed without changing the application pipeline', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);
    $interview = phaseSixInterview($application, 'scheduled', now()->subHour());
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/employer/interviews/{$interview->id}/status", [
        'status' => 'completed',
    ])->assertOk()
        ->assertJsonPath('data.status', 'completed');

    expect($application->refresh()->status)->toBe('shortlisted');
    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'completed',
    ]);
});

it('limits applicant interview listings to their own interviews and hides internal notes', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $anotherApplicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $upcomingApplication = phaseSixApplication($employer, $applicant);
    $pastApplication = phaseSixApplication($employer, $applicant);
    $cancelledApplication = phaseSixApplication($employer, $applicant);
    $otherApplication = phaseSixApplication($employer, $anotherApplicant);

    $upcoming = phaseSixInterview($upcomingApplication, 'scheduled', now()->addDays(2));
    $past = phaseSixInterview($pastApplication, 'completed', now()->subDays(2));
    $cancelled = phaseSixInterview($cancelledApplication, 'cancelled', now()->subDay());
    $other = phaseSixInterview($otherApplication, 'scheduled', now()->addDay());

    $upcoming->histories()->create([
        'event_type' => 'rescheduled',
        'previous_schedule' => [
            'scheduled_at' => now()->addDay()->toISOString(),
            'internal_notes' => 'Private employer feedback.',
        ],
        'new_schedule' => [
            'scheduled_at' => $upcoming->scheduled_at->toISOString(),
            'applicant_notes' => 'Please join early.',
            'internal_notes' => 'Private employer feedback.',
        ],
        'actor_id' => $employer->id,
    ]);

    $token = phaseSixToken($applicant);
    $this->withToken($token)->getJson('/api/applicant/interviews/upcoming')
        ->assertOk()
        ->assertJsonPath('data.0.id', $upcoming->id)
        ->assertJsonMissingPath('data.0.internal_notes')
        ->assertJsonMissingPath('data.0.history.0.previous_schedule.internal_notes')
        ->assertJsonMissingPath('data.0.history.0.new_schedule.internal_notes')
        ->assertJsonPath('data.0.applicant_notes', 'Please join early.')
        ->assertJsonPath('data.0.meeting_url', 'https://meet.example.com/private');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/interviews/past')
        ->assertOk()
        ->assertJsonPath('data.0.id', $past->id);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/interviews?filter=cancelled')
        ->assertOk()
        ->assertJsonPath('data.0.id', $cancelled->id)
        ->assertJsonPath('data.0.cancellation_reason', 'Schedule conflict.');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/interviews')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonMissing(['id' => $other->id]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson("/api/applicant/interviews/{$other->id}")
        ->assertNotFound();
});
