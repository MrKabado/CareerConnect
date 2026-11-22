<?php

use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\User;
use App\Models\VerificationDocument;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(LazilyRefreshDatabase::class)->group('api');

function coreBusinessApplication(User $applicant, JobListing $listing, Resume $resume, string $status): Application
{
    $application = new Application([
        'status' => $status,
        'resume_original_filename' => $resume->original_filename,
        'resume_mime_type' => $resume->mime_type,
        'resume_file_size' => $resume->file_size,
        'applied_at' => now(),
    ]);
    $application->applicant()->associate($applicant);
    $application->jobListing()->associate($listing);
    $application->resume()->associate($resume);
    $application->save();

    return $application;
}

function coreBusinessListing(Company $company, Category $category, array $attributes = []): JobListing
{
    return $company->jobListings()->create([
        'category_id' => $category->id,
        'listing_type' => 'job',
        'title' => 'Backend Engineer',
        'description' => 'Build reliable systems.',
        'responsibilities' => 'Maintain application services.',
        'requirements' => 'Relevant experience.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
        ...$attributes,
    ]);
}

function coreBusinessResume(User $applicant): Resume
{
    return $applicant->resumes()->create([
        'storage_path' => 'test-resumes/'.Str::uuid().'.pdf',
        'original_filename' => 'resume.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 100,
        'is_current' => true,
    ]);
}

it('returns role-scoped dashboard totals from persisted records', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Test Employer',
        'is_verified' => true,
    ]);
    $category = Category::create(['name' => 'Engineering']);
    $listing = coreBusinessListing($company, $category);

    $applicant = User::factory()->create(['role' => 'applicant']);
    $resume = coreBusinessResume($applicant);
    coreBusinessApplication($applicant, $listing, $resume, 'pending');
    $hiredListing = coreBusinessListing($company, $category, ['status' => 'closed', 'published_at' => null]);
    $rejectedListing = coreBusinessListing($company, $category, ['status' => 'deactivated', 'published_at' => null]);
    coreBusinessApplication($applicant, $hiredListing, $resume, 'hired');
    coreBusinessApplication($applicant, $rejectedListing, $resume, 'rejected');

    IdentityVerification::create(['user_id' => User::factory()->create(['role' => 'applicant'])->id, 'status' => 'pending']);
    CompanyVerification::create(['company_id' => $company->id, 'status' => 'pending']);

    $this->withToken($admin->createToken('test')->plainTextToken)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->assertJsonPath('data.total_applicants', 2)
        ->assertJsonPath('data.total_employers', 1)
        ->assertJsonPath('data.pending_verifications.total', 2)
        ->assertJsonPath('data.pending_verifications.applicants', 1)
        ->assertJsonPath('data.pending_verifications.employers', 1)
        ->assertJsonStructure(['data' => ['recommendations']])
        ->assertJsonPath('data.total_job_listings', 3)
        ->assertJsonPath('data.active_job_listings', 1)
        ->assertJsonPath('data.total_applications', 3);

    $this->app['auth']->forgetGuards();
    $this->withToken($employer->createToken('test')->plainTextToken)
        ->getJson('/api/employer/dashboard')
        ->assertOk()
        ->assertJsonPath('data.total_job_listings', 3)
        ->assertJsonPath('data.active_job_listings', 1)
        ->assertJsonPath('data.total_applications', 3)
        ->assertJsonPath('data.pending_applications', 1)
        ->assertJsonStructure(['data' => ['recommendations']]);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicant->createToken('test')->plainTextToken)
        ->getJson('/api/applicant/dashboard')
        ->assertOk()
        ->assertJsonPath('data.total_applications', 3)
        ->assertJsonPath('data.pending_applications', 1)
        ->assertJsonPath('data.accepted_applications', 1)
        ->assertJsonPath('data.rejected_applications', 1)
        ->assertJsonStructure(['data' => ['recommendations']]);
});

it('paginates admin activity newest first with timestamp ties ordered by id', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $actor = User::factory()->create(['role' => 'applicant']);
    $older = ActivityLog::create([
        'user_id' => $actor->id,
        'actor_id' => $actor->id,
        'action' => 'account.registered',
        'payload' => ['description' => 'Older activity'],
    ]);
    $newest = ActivityLog::create([
        'user_id' => $actor->id,
        'actor_id' => $actor->id,
        'action' => 'account.registered',
        'payload' => ['description' => 'Newest activity'],
    ]);
    $tiedNewest = ActivityLog::create([
        'user_id' => $actor->id,
        'actor_id' => $actor->id,
        'action' => 'account.registered',
        'payload' => ['description' => 'Tied newest activity'],
    ]);
    $older->created_at = now()->subMinute();
    $older->save();
    $tiedAt = now();
    $newest->created_at = $tiedAt;
    $newest->save();
    $tiedNewest->created_at = $tiedAt;
    $tiedNewest->save();

    $token = $admin->createToken('test')->plainTextToken;
    $this->withToken($token)
        ->getJson('/api/admin/activity?per_page=1&page=1')
        ->assertOk()
        ->assertJsonPath('data.0.id', $tiedNewest->id)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.last_page', 3)
        ->assertJsonPath('meta.total', 3);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)
        ->getJson('/api/admin/activity?per_page=1&page=3')
        ->assertOk()
        ->assertJsonPath('data.0.id', $older->id)
        ->assertJsonPath('meta.current_page', 3);
});

it('authorizes admin user detail and updates while auditing and revoking tokens on identity changes', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $target = User::factory()->create([
        'role' => 'applicant',
        'email_verified_at' => now(),
    ]);
    $targetToken = $target->createToken('target-session')->plainTextToken;
    $adminToken = $admin->createToken('admin-session')->plainTextToken;

    $this->app['auth']->forgetGuards();
    $this->withToken($targetToken)
        ->getJson("/api/admin/users/{$target->id}")
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)
        ->getJson("/api/admin/users/{$target->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $target->id)
        ->assertJsonMissingPath('data.password');

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)
        ->putJson("/api/admin/users/{$target->id}", [
            'name' => 'Updated Applicant',
            'email' => 'updated-applicant@example.test',
            'role' => 'employer',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Applicant')
        ->assertJsonPath('data.role', 'employer')
        ->assertJsonPath('data.email_verified_at', null);

    $this->assertDatabaseHas('activity_logs', [
        'actor_id' => $admin->id,
        'user_id' => $target->id,
        'action' => 'admin.user_updated',
    ]);
    expect($target->tokens()->count())->toBe(0);

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)
        ->putJson("/api/admin/users/{$admin->id}", ['role' => 'applicant'])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'self_role_change_forbidden');
});

it('filters employer listings by title, location, and status within the employer company', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create(['user_id' => $employer->id, 'name' => 'Filter Test Employer']);
    $category = Category::create(['name' => 'Engineering']);
    coreBusinessListing($company, $category, [
        'title' => 'Senior Backend Engineer',
        'location' => 'Cebu City',
        'status' => 'open',
    ]);
    coreBusinessListing($company, $category, [
        'title' => 'Frontend Engineer',
        'location' => 'Manila',
        'status' => 'closed',
    ]);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $otherCompany = Company::create(['user_id' => $otherEmployer->id, 'name' => 'Other Employer']);
    coreBusinessListing($otherCompany, $category, [
        'title' => 'Senior Backend Engineer',
        'location' => 'Cebu City',
        'status' => 'open',
    ]);

    $this->withToken($employer->createToken('test')->plainTextToken)
        ->getJson('/api/employer/jobs?keyword=Backend&location=Cebu&status=open')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.title', 'Senior Backend Engineer');
});

it('provides admin verification details and documents and records review decisions', function (): void {
    Storage::fake('local');
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Verification Company',
        'city' => 'Cebu City',
    ]);
    $verification = CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'pending',
        'submitted_at' => now(),
    ]);
    $path = 'company-verifications/'.$company->id.'/permit.pdf';
    Storage::disk('local')->put($path, '%PDF-test');
    $document = VerificationDocument::create([
        'company_verification_id' => $verification->id,
        'type' => 'business_permit',
        'file_path' => $path,
        'original_filename' => 'permit.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 9,
    ]);
    $token = $admin->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson("/api/admin/company-verifications/{$verification->id}")
        ->assertOk()
        ->assertJsonPath('data.company.name', 'Verification Company')
        ->assertJsonPath('data.documents.0.original_filename', 'permit.pdf')
        ->assertJsonMissingPath('data.documents.0.file_path');

    $this->withToken($token)
        ->get("/api/admin/company-verifications/{$verification->id}/documents/{$document->id}")
        ->assertOk()
        ->assertHeader('content-disposition');

    $this->withToken($token)
        ->postJson("/api/admin/company-verifications/{$verification->id}/review", [
            'status' => 'verified',
        ])
        ->assertOk()
        ->assertJsonPath('status', 'verified');

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $employer->id,
        'actor_id' => $admin->id,
        'action' => 'admin.company_verification_reviewed',
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)
        ->postJson("/api/admin/company-verifications/{$verification->id}/review", [
            'status' => 'rejected',
            'rejection_reason' => 'duplicate',
        ])
        ->assertStatus(409);
});
