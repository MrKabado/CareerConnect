<?php

use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\User;
use App\Notifications\CareerConnectNotification;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(LazilyRefreshDatabase::class)->group('api');

function phaseSevenToken(User $user): string
{
    Auth::forgetGuards();

    return $user->createToken('phase-seven-test')->plainTextToken;
}

function phaseSevenApplication(
    User $applicant,
    User $employer,
    string $status = 'pending',
    ?string $listingType = 'job',
): Application {
    $company = Company::firstOrCreate(
        ['user_id' => $employer->id],
        ['name' => 'Notification Test Company', 'is_verified' => true],
    );
    CompanyVerification::updateOrCreate(
        ['company_id' => $company->id],
        ['status' => 'verified'],
    );
    $listing = $company->jobListings()->create([
        'category_id' => Category::create(['name' => 'Notification '.Str::uuid()])->id,
        'listing_type' => $listingType,
        'title' => 'Notification Test Listing',
        'description' => 'Test listing description.',
        'responsibilities' => 'Test responsibilities.',
        'requirements' => 'Test requirements.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => $listingType === 'job' ? 'full_time' : null,
        'status' => 'open',
        'published_at' => now(),
    ]);
    $resume = $applicant->resumes()->create([
        'storage_path' => 'applicant-resumes/'.$applicant->id.'/'.Str::uuid().'.pdf',
        'original_filename' => 'resume.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 128,
        'is_current' => true,
    ]);

    $application = new Application([
        'resume_id' => $resume->id,
        'status' => $status,
        'resume_original_filename' => $resume->original_filename,
        'resume_mime_type' => $resume->mime_type,
        'resume_file_size' => $resume->file_size,
        'applied_at' => now(),
    ]);
    $application->applicant()->associate($applicant);
    $application->jobListing()->associate($listing);
    $application->save();
    $application->statusHistories()->create([
        'previous_status' => null,
        'new_status' => $status,
        'actor_id' => $applicant->id,
        'created_at' => now(),
    ]);

    return $application;
}

function phaseSevenInterviewSchedule(array $changes = []): array
{
    return array_merge([
        'scheduled_at' => now('Asia/Manila')->addDays(2)->setTime(10, 0)->format('Y-m-d H:i:s'),
        'end_at' => now('Asia/Manila')->addDays(2)->setTime(11, 0)->format('Y-m-d H:i:s'),
        'timezone' => 'Asia/Manila',
        'mode' => 'online',
        'meeting_url' => 'https://meet.example.com/interview',
        'meeting_instructions' => null,
        'internal_notes' => 'Internal-only notes.',
        'applicant_notes' => 'Please join early.',
    ], $changes);
}

it('notifies only the correct employer after successful application submission', function (): void {
    Storage::fake('local');
    $applicant = User::factory()->create(['role' => 'applicant', 'email_verified_at' => now()]);
    $applicant->applicantProfile()->create(['looking_for_jobs' => true, 'looking_for_ojt' => false]);
    IdentityVerification::create(['user_id' => $applicant->id, 'status' => 'verified']);
    $employer = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $application = phaseSevenApplication($applicant, $employer);
    $listing = $application->jobListing;
    $application->delete();
    $application->statusHistories()->delete();
    $applicant->resumes()->firstOrFail()->update(['is_current' => true]);
    Storage::disk('local')->put(
        $applicant->resumes()->firstOrFail()->storage_path,
        "%PDF-1.4\n%%EOF",
    );

    $this->withToken(phaseSevenToken($applicant))->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated();

    $notification = $employer->notifications()->firstOrFail();
    expect($notification->data['event'])->toBe('application_submitted')
        ->and($notification->data['metadata']['job_listing_id'])->toBe($listing->id)
        ->and($notification->data['metadata']['application_id'])->toBe($applicant->applications()->first()->id)
        ->and($otherEmployer->notifications()->count())->toBe(0);
});

it('notifies applicants once for meaningful application status transitions and excludes internal notes', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSevenApplication($applicant, $employer);
    $token = phaseSevenToken($employer);

    $this->withToken($token)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'reviewing',
        'public_reason' => 'Your application is being reviewed.',
        'internal_reason' => 'Do not expose this.',
    ])->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'reviewing',
        'internal_reason' => 'Changed private note only.',
    ])->assertOk();

    $notification = $applicant->notifications()->firstOrFail();
    expect($applicant->notifications()->count())->toBe(1)
        ->and($notification->data['event'])->toBe('application_status_changed')
        ->and($notification->data['metadata']['status'])->toBe('reviewing')
        ->and($notification->data['metadata']['public_reason'])->toBe('Your application is being reviewed.')
        ->and(json_encode($notification->data))->not->toContain('Do not expose this');
});

it('notifies applicants about changed interview schedules and cancellation without duplicates', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSevenApplication($applicant, $employer, 'shortlisted');
    $token = phaseSevenToken($employer);

    $this->withToken($token)->postJson(
        "/api/employer/applications/{$application->id}/interviews",
        phaseSevenInterviewSchedule(),
    )->assertCreated();
    $interview = $application->interviews()->firstOrFail();
    expect($applicant->notifications()->count())->toBe(1)
        ->and($applicant->notifications()->first()->data['event'])->toBe('interview_scheduled');

    $newSchedule = phaseSevenInterviewSchedule([
        'scheduled_at' => now('Asia/Manila')->addDays(4)->setTime(13, 0)->format('Y-m-d H:i:s'),
        'end_at' => now('Asia/Manila')->addDays(4)->setTime(14, 0)->format('Y-m-d H:i:s'),
    ]);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", $newSchedule)
        ->assertOk()
        ->assertJsonPath('data.scheduled_at', $interview->fresh()->scheduled_at->toISOString());
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson("/api/employer/interviews/{$interview->id}", $newSchedule)
        ->assertOk()
        ->assertJsonPath('message', 'Interview schedule is unchanged.');

    expect($applicant->notifications()->count())->toBe(2)
        ->and($applicant->notifications->first(fn ($notification): bool => $notification->data['event'] === 'interview_rescheduled'))->not->toBeNull();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/employer/interviews/{$interview->id}/cancel", [
        'reason' => 'Schedule conflict.',
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/employer/interviews/{$interview->id}/cancel")
        ->assertUnprocessable();

    $latest = $applicant->notifications()->get()->first(fn ($notification): bool => $notification->data['event'] === 'interview_cancelled');
    expect($applicant->notifications()->count())->toBe(3)
        ->and($latest)->not->toBeNull()
        ->and($latest->data['event'])->toBe('interview_cancelled')
        ->and($latest->data['metadata']['status'])->toBe('cancelled')
        ->and($latest->data['message'])->not->toContain('rejected');
});

it('does not notify on invalid operations or rolled back application transactions', function (): void {
    Storage::fake('local');
    $applicant = User::factory()->create(['role' => 'applicant', 'email_verified_at' => now()]);
    $applicant->applicantProfile()->create(['looking_for_jobs' => true, 'looking_for_ojt' => false]);
    IdentityVerification::create(['user_id' => $applicant->id, 'status' => 'verified']);
    $employer = User::factory()->create(['role' => 'employer']);
    $application = phaseSevenApplication($applicant, $employer);
    $listing = $application->jobListing;
    $application->statusHistories()->delete();
    $application->delete();
    $resume = $applicant->resumes()->firstOrFail();
    Storage::disk('local')->put($resume->storage_path, "%PDF-1.4\n%%EOF");

    DB::statement(<<<'SQL'
        CREATE TRIGGER fail_application_history
        BEFORE INSERT ON application_status_histories
        WHEN NEW.new_status = 'pending'
        BEGIN
            SELECT RAISE(ABORT, 'simulated application history failure');
        END
        SQL);

    try {
        expect(fn () => $this->withoutExceptionHandling()
            ->withToken(phaseSevenToken($applicant))
            ->postJson("/api/jobs/{$listing->id}/applications"))
            ->toThrow(QueryException::class);
    } finally {
        DB::statement('DROP TRIGGER IF EXISTS fail_application_history');
    }

    expect($applicant->applications()->count())->toBe(0)
        ->and($employer->notifications()->count())->toBe(0);
});

it('lists, counts and marks only the authenticated user notifications as read', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $this->getJson('/api/notifications/unread-count')->assertUnauthorized();
    foreach (range(1, 3) as $index) {
        $applicant->notify(new CareerConnectNotification(
            'test_event',
            'Notification '.$index,
            'Test notification '.$index,
            ['index' => $index],
        ));
    }
    $employer->notify(new CareerConnectNotification(
        'employer_event',
        'Employer notification',
        'Employer-only notification',
    ));

    $token = phaseSevenToken($applicant);
    $this->withToken($token)->getJson('/api/notifications?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('count', 3);

    $notificationId = $applicant->notifications()->firstOrFail()->id;
    $employerToken = phaseSevenToken($employer);
    $this->withToken($employerToken)->patchJson("/api/notifications/{$notificationId}/read")
        ->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/notifications/{$notificationId}/read")
        ->assertOk()
        ->assertJsonPath('data.read_at', fn ($value) => $value !== null);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/notifications/{$notificationId}/read")
        ->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('count', 2);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson('/api/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('updated', 2);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('count', 0);
});
