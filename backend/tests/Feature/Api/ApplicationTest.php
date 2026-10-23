<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(LazilyRefreshDatabase::class)->group('api');

function phaseFiveApplicant(array $attributes = []): User
{
    $applicant = User::factory()->create(['role' => 'applicant', ...$attributes]);
    IdentityVerification::create([
        'user_id' => $applicant->id,
        'status' => 'verified',
    ]);
    $applicant->applicantProfile()->create([
        'looking_for_jobs' => true,
        'looking_for_ojt' => false,
    ]);

    return $applicant;
}

function phaseFiveListing(User $employer, Category $category, array $attributes = []): JobListing
{
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Verified Employer',
        'is_verified' => true,
    ]);
    CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'verified',
    ]);

    $listing = $company->jobListings()->create([
        'category_id' => $category->id,
        'listing_type' => 'job',
        'title' => 'Backend Developer',
        'description' => 'Build APIs.',
        'responsibilities' => 'Maintain services.',
        'requirements' => 'PHP experience.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
        ...$attributes,
    ]);

    if ($listing->listing_type === 'ojt') {
        $listing->ojtDetails()->create([
            'duration_hours' => 480,
            'allowance_type' => 'paid',
            'allowance_amount' => 5000,
            'slots' => 5,
            'accepted_courses' => ['Computer Science'],
            'moa_accepted' => true,
        ]);
    }

    return $listing;
}

function phaseFivePdf(string $filename = 'resume.pdf'): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        $filename,
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    );
}

function phaseFiveDocx(string $filename = 'resume.docx'): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'careerconnect-docx-');
    $archive = new ZipArchive;
    $archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $archive->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>');
    $archive->addFromString('word/document.xml', '<?xml version="1.0"?><document></document>');
    $archive->close();
    $contents = file_get_contents($path);
    unlink($path);

    return UploadedFile::fake()->createWithContent($filename, $contents);
}

function phaseFiveToken(TestCase $test, User $user): string
{
    Auth::forgetGuards();

    return $user->createToken('phase-five-test')->plainTextToken;
}

it('uploads PDF and DOCX resumes, replaces the current version and keeps metadata private', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $token = phaseFiveToken($this, $applicant);

    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('maria-resume.pdf'),
    ])->assertCreated()
        ->assertJsonPath('data.original_filename', 'maria-resume.pdf')
        ->assertJsonPath('data.mime_type', 'application/pdf');

    $firstResume = $applicant->resumes()->where('is_current', true)->firstOrFail();
    Storage::disk('local')->assertExists($firstResume->storage_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFiveDocx('updated-resume.docx'),
    ])->assertOk()
        ->assertJsonPath('data.original_filename', 'updated-resume.docx')
        ->assertJsonPath('data.mime_type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    Storage::disk('local')->assertMissing($firstResume->storage_path);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/resume')
        ->assertOk()
        ->assertJsonPath('data.original_filename', 'updated-resume.docx')
        ->assertJsonMissingPath('data.storage_path');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson('/api/applicant/resume')->assertOk();
});

it('rejects invalid resume content and files above the configured size limit', function (): void {
    Storage::fake('local');
    Config::set('careerconnect.resume_max_size_kb', 2);
    $applicant = phaseFiveApplicant();
    $token = phaseFiveToken($this, $applicant);

    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => UploadedFile::fake()->createWithContent('fake.pdf', 'not a PDF document'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('resume');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => UploadedFile::fake()->createWithContent('unsafe.exe', 'MZ invalid executable'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('resume');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => UploadedFile::fake()->create('large.pdf', 3, 'application/pdf'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('resume');
});

it('allows only the authenticated applicant to manage and download their own current resume', function (): void {
    Storage::fake('local');
    $owner = phaseFiveApplicant();
    $other = phaseFiveApplicant();
    $ownerToken = phaseFiveToken($this, $owner);

    $this->withToken($ownerToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $resume = $owner->resumes()->where('is_current', true)->firstOrFail();

    $otherToken = phaseFiveToken($this, $other);
    $this->withToken($otherToken)->getJson('/api/applicant/resume')
        ->assertOk()
        ->assertJsonPath('data', null);

    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->getJson('/api/applicant/resume/download')->assertNotFound();
    expect($resume->refresh()->is_current)->toBeTrue();
});

it('submits eligible applications once with immutable resume and cover-letter snapshots', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Engineering']));
    $applicantToken = phaseFiveToken($this, $applicant);

    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications", [
        'cover_letter' => 'I am interested in this role.',
        'applicant_id' => $employer->id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('applicant_id');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('submitted-resume.pdf'),
    ])->assertCreated();
    $submittedResume = $applicant->resumes()->where('is_current', true)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications", [
        'cover_letter' => 'I am interested in this role.',
    ])->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.resume.original_filename', 'submitted-resume.pdf')
        ->assertJsonPath('data.cover_letter', 'I am interested in this role.');

    $application = $applicant->applications()->firstOrFail();
    $this->assertDatabaseHas('application_status_histories', [
        'application_id' => $application->id,
        'previous_status' => null,
        'new_status' => 'pending',
        'actor_id' => $applicant->id,
    ]);
    expect($application->applied_at)->not->toBeNull();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->deleteJson('/api/applicant/resume')
        ->assertStatus(409)
        ->assertJsonPath('code', 'resume_in_use');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('new-current-resume.pdf'),
    ])->assertOk();

    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'resume_id' => $submittedResume->id,
        'resume_original_filename' => 'submitted-resume.pdf',
    ]);
    Storage::disk('local')->assertExists($submittedResume->storage_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertStatus(409)
        ->assertJsonPath('code', 'already_applied');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->deleteJson('/api/applicant/resume')
        ->assertOk();
});

it('enforces account, listing-type and OJT eligibility when applying', function (): void {
    Storage::fake('local');
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Internships']), [
        'listing_type' => 'ojt',
        'employment_type' => null,
    ]);

    $this->withToken(phaseFiveToken($this, $applicant))
        ->postJson("/api/jobs/{$listing->id}/applications")
        ->assertForbidden()
        ->assertJsonPath('code', 'application_ineligible');

    $verifiedApplicant = phaseFiveApplicant();
    $token = phaseFiveToken($this, $verifiedApplicant);
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'listing_type_ineligible');

    $verifiedApplicant->applicantProfile->update([
        'looking_for_jobs' => false,
        'looking_for_ojt' => true,
    ]);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'ojt_details_required');

    $verifiedApplicant->applicantProfile->ojtDetails()->create([
        'school' => 'State University',
        'course' => 'Computer Science',
        'year_level' => 4,
        'required_hours' => 480,
    ]);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated();
});

it('returns only owned application history and retains it when a listing closes', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $otherApplicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Technology']));
    $token = phaseFiveToken($this, $applicant);

    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/jobs/{$listing->id}/applications")->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $listing->update(['status' => 'closed']);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/applications')
        ->assertOk()
        ->assertJsonPath('data.0.id', $application->id)
        ->assertJsonPath('data.0.listing.status', 'closed');

    $otherToken = phaseFiveToken($this, $otherApplicant);
    $this->withToken($otherToken)->getJson("/api/applicant/applications/{$application->id}")
        ->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson("/api/applicant/applications/{$application->id}/status-history")
        ->assertOk()
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonMissingPath('data.0.internal_reason');
});

it('restricts employer review to owned listings and enforces status transitions with private notes', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Development']));
    $otherListing = phaseFiveListing($otherEmployer, Category::create(['name' => 'Operations']));
    $applicantToken = phaseFiveToken($this, $applicant);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $employerToken = phaseFiveToken($this, $employer);
    $this->withToken($employerToken)->getJson('/api/employer/applications')
        ->assertOk()
        ->assertJsonPath('data.0.id', $application->id)
        ->assertJsonMissingPath('data.0.applicant.email');

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'reviewing',
        'public_reason' => 'Your application is under review.',
        'internal_reason' => 'Check work history.',
    ])->assertOk()
        ->assertJsonPath('data.status', 'reviewing')
        ->assertJsonPath('data.status_history.1.internal_reason', 'Check work history.');

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'pending',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $otherToken = phaseFiveToken($this, $otherEmployer);
    $this->withToken($otherToken)->getJson("/api/employer/applications/{$application->id}")
        ->assertNotFound();
    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'rejected',
    ])->assertNotFound();

    $this->assertDatabaseCount('application_status_histories', 2);
    $this->assertDatabaseHas('job_listings', ['id' => $otherListing->id]);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->getJson("/api/applicant/applications/{$application->id}/status-history")
        ->assertOk()
        ->assertJsonPath('data.1.public_reason', 'Your application is under review.')
        ->assertJsonMissingPath('data.1.internal_reason');
});

it('serves the exact application resume only to its applicant and listing owner', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Services']));
    $otherListing = phaseFiveListing($otherEmployer, Category::create(['name' => 'Logistics']));
    $applicantToken = phaseFiveToken($this, $applicant);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('first-submission.pdf'),
    ])->assertCreated();
    $firstResume = $applicant->resumes()->where('is_current', true)->firstOrFail();
    Storage::disk('local')->put($firstResume->storage_path, '%PDF-1.4 original content');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('new-current.pdf'),
    ])->assertOk();
    Storage::disk('local')->assertExists($firstResume->storage_path);

    $ownerToken = phaseFiveToken($this, $employer);
    $this->withToken($ownerToken)->get("/api/employer/applications/{$application->id}/resume")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('content-disposition', 'attachment; filename=first-submission.pdf');

    $otherToken = phaseFiveToken($this, $otherEmployer);
    $this->withToken($otherToken)->getJson("/api/employer/applications/{$application->id}/resume")
        ->assertNotFound();
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->get("/api/applicant/applications/{$application->id}/resume")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    Storage::disk('local')->delete($firstResume->storage_path);
    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->getJson("/api/employer/applications/{$application->id}/resume")
        ->assertNotFound();

    $this->assertDatabaseHas('job_listings', ['id' => $otherListing->id]);
});
