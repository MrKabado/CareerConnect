<?php

use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
        'scheduled_at' => now('Asia/Manila')->addDays(2)->setTime(10, 0)->format('Y-m-d H:i:s'),
        'end_at' => now('Asia/Manila')->addDays(2)->setTime(11, 0)->format('Y-m-d H:i:s'),
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

it('allows an employer to schedule an interview and atomically moves shortlisted applications to interview', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $this->withToken($token)->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated()
        ->assertJsonPath('data.application_id', $application->id)
        ->assertJsonPath('data.status', 'scheduled')
        ->assertJsonPath('data.mode', 'onsite')
        ->assertJsonPath('data.location', 'Cebu City office')
        ->assertJsonPath('data.internal_notes', 'Review coding exercise.');

    $interview = Interview::where('application_id', $application->id)->firstOrFail();
    expect($application->refresh()->status)->toBe('interview')
        ->and($interview->applicant_id)->toBe($applicant->id)
        ->and($interview->employer_id)->toBe($employer->id)
        ->and($interview->status)->toBe('scheduled');

    $this->assertDatabaseHas('application_status_histories', [
        'application_id' => $application->id,
        'previous_status' => 'shortlisted',
        'new_status' => 'interview',
        'actor_id' => $employer->id,
    ]);
    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'scheduled',
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

it('validates future date, timezone, mode, onsite location, and online meeting details', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $invalidSchedules = [
        ['scheduled_at' => now()->subMinute()->toIso8601String()],
        ['mode' => 'video_call'],
        ['mode' => 'onsite', 'location' => null],
        ['mode' => 'online', 'location' => null, 'meeting_url' => null, 'meeting_instructions' => null],
        ['timezone' => 'Mars/Olympus_Mons'],
        ['end_at' => now('Asia/Manila')->addDays(2)->setTime(9, 0)->format('Y-m-d H:i:s')],
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

it('reschedules interviews with history and does not duplicate application status history', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSixApplication($employer, $applicant);
    $token = phaseSixToken($employer);

    $this->withToken($token)->postJson("/api/employer/applications/{$application->id}/interviews", phaseSixSchedule())
        ->assertCreated();
    $interview = Interview::where('application_id', $application->id)->firstOrFail();
    $statusHistoryCount = $application->statusHistories()->count();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", phaseSixSchedule([
        'scheduled_at' => now('Asia/Manila')->addDays(4)->setTime(13, 0)->format('Y-m-d H:i:s'),
        'end_at' => now('Asia/Manila')->addDays(4)->setTime(14, 0)->format('Y-m-d H:i:s'),
        'mode' => 'online',
        'location' => null,
        'meeting_url' => 'https://meet.example.com/interview',
        'meeting_instructions' => null,
        'applicant_notes' => 'Join five minutes early.',
    ]))->assertOk()
        ->assertJsonPath('data.mode', 'online')
        ->assertJsonPath('data.meeting_url', 'https://meet.example.com/interview')
        ->assertJsonCount(2, 'data.history');

    $interview->refresh();
    expect(abs($interview->scheduled_at->diffInSeconds(
        now('Asia/Manila')->addDays(4)->setTime(13, 0)->utc(),
    )))->toBeLessThanOrEqual(1)
        ->and($interview->mode)->toBe('online')
        ->and($application->statusHistories()->count())->toBe($statusHistoryCount);

    $this->assertDatabaseHas('interview_histories', [
        'interview_id' => $interview->id,
        'event_type' => 'rescheduled',
    ]);
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
        ->assertUnprocessable();

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
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", phaseSixSchedule())
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
    $schedule = phaseSixSchedule([
        'scheduled_at' => now()->subHour()->toIso8601String(),
        'end_at' => now()->addMinutes(30)->toIso8601String(),
    ]);

    $this->withToken($token)->postJson(
        "/api/employer/applications/{$application->id}/interviews",
        $schedule,
    )->assertUnprocessable();

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
