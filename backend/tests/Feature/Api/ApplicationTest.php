<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\Interview;
use App\Models\JobListing;
use App\Models\User;
use App\Services\CloudinaryMediaGateway;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tests\TestCase;

uses(LazilyRefreshDatabase::class)->group('api');

beforeEach(function (): void {
    Config::set('careerconnect.media_storage_disk', 'local');
});

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
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertCreated()
        ->assertJsonPath('data.original_filename', 'resume.pdf')
        ->assertJsonPath('data.mime_type', 'application/pdf');

    $firstResume = $applicant->resumes()->where('is_current', true)->firstOrFail();
    Storage::disk('local')->assertExists($firstResume->storage_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFiveDocx('resume.docx'),
    ])->assertOk()
        ->assertJsonPath('data.original_filename', 'resume.docx')
        ->assertJsonPath('data.mime_type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    Storage::disk('local')->assertMissing($firstResume->storage_path);
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/resume')
        ->assertOk()
        ->assertJsonPath('data.original_filename', 'resume.docx')
        ->assertJsonMissingPath('data.storage_path');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson('/api/applicant/resume')->assertOk();
});

it('stores Cloudinary resumes as authenticated assets and keeps downloads behind the API', function (): void {
    Config::set('careerconnect.media_storage_disk', 'cloudinary');
    $applicant = phaseFiveApplicant();
    $token = phaseFiveToken($this, $applicant);
    $gateway = Mockery::mock(CloudinaryMediaGateway::class);
    $gateway->shouldReceive('upload')
        ->twice()
        ->withArgs(fn (UploadedFile $file, string $publicId, string $assetFolder): bool => str_starts_with($publicId, 'applicant-resumes/'.$applicant->id.'/')
            && $assetFolder === 'career-connect/users/'.$applicant->id.'/resumes'
        )
        ->andReturnUsing(fn (UploadedFile $file, string $publicId, string $assetFolder): array => [
            'asset_id' => 'cloudinary-asset-'.Str::uuid(),
            'public_id' => $publicId,
        ]);
    $gateway->shouldReceive('download')
        ->twice()
        ->withArgs(fn (string $publicId, string $extension, string $filename, string $mimeType): bool => str_starts_with($publicId, 'applicant-resumes/'.$applicant->id.'/')
            && $extension === 'pdf'
            && $filename === 'resume.pdf'
            && $mimeType === 'application/pdf'
        )
        ->andReturnUsing(fn (): StreamedResponse => response()->streamDownload(
            static fn () => print ('%PDF-1.4'),
            'resume.pdf',
            ['Content-Type' => 'application/pdf'],
        ));
    $gateway->shouldReceive('delete')->once()->andReturnNull();
    $this->app->instance(CloudinaryMediaGateway::class, $gateway);

    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertCreated()
        ->assertJsonMissingPath('data.storage_path')
        ->assertJsonMissingPath('data.cloudinary_asset_id');

    $firstResume = $applicant->resumes()->where('is_current', true)->firstOrFail();
    expect($firstResume->storage_disk)->toBe('cloudinary')
        ->and($firstResume->cloudinary_asset_id)->toStartWith('cloudinary-asset-');
    $this->assertDatabaseHas('resumes', [
        'id' => $firstResume->id,
        'storage_disk' => 'cloudinary',
        'cloudinary_asset_id' => $firstResume->cloudinary_asset_id,
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->get('/api/applicant/resume/download')
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertStreamedContent('%PDF-1.4');

    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Cloud Computing']));
    $application = $applicant->applications()->make([
        'resume_id' => $firstResume->id,
        'status' => 'pending',
        'resume_original_filename' => $firstResume->original_filename,
        'resume_mime_type' => $firstResume->mime_type,
        'resume_file_size' => $firstResume->file_size,
        'applied_at' => now(),
    ]);
    $application->jobListing()->associate($listing);
    $application->save();
    $employerToken = phaseFiveToken($this, $employer);

    $this->withToken($employerToken)->get("/api/employer/applications/{$application->id}/resume")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertStreamedContent('%PDF-1.4');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertOk();
    $this->assertDatabaseHas('resumes', [
        'id' => $firstResume->id,
        'is_current' => false,
        'storage_disk' => 'cloudinary',
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson('/api/applicant/resume')->assertOk();
    $this->assertDatabaseHas('resumes', ['id' => $firstResume->id]);
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

it('accepts valid resumes with arbitrary filenames', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $token = phaseFiveToken($this, $applicant);

    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('my-profile.pdf'),
    ])->assertCreated()
        ->assertJsonPath('data.original_filename', 'my-profile.pdf');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/resume', [
        'resume' => phaseFiveDocx('candidate-cv.docx'),
    ])->assertOk()
        ->assertJsonPath('data.original_filename', 'candidate-cv.docx');
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
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertCreated();
    $submittedResume = $applicant->resumes()->where('is_current', true)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications", [
        'cover_letter' => 'I am interested in this role.',
    ])->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.resume.original_filename', 'resume.pdf')
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
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertOk();

    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'resume_id' => $submittedResume->id,
        'resume_original_filename' => 'resume.pdf',
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

it('stores cover letters as private documents and snapshots them on applications', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Document Applications']));
    $applicantToken = phaseFiveToken($this, $applicant);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();

    $firstUpload = $this->withToken($applicantToken)->postJson('/api/applicant/documents', [
        'document_type' => 'cover_letter',
        'document' => phaseFivePdf('cover-letter.pdf'),
    ])->assertCreated()
        ->assertJsonPath('data.document_type', 'cover_letter')
        ->assertJsonPath('data.original_filename', 'cover-letter.pdf');
    $coverLetterId = $firstUpload->json('data.id');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/documents', [
        'document_type' => 'cover_letter',
        'document' => phaseFivePdf('another-name.pdf'),
    ])->assertOk()
        ->assertJsonPath('data.id', $coverLetterId);
    $this->assertDatabaseCount('applicant_documents', 1);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications", [
        'cover_letter_document_id' => $coverLetterId,
    ])->assertCreated()
        ->assertJsonPath('data.cover_letter_document.id', $coverLetterId)
        ->assertJsonPath('data.cover_letter_document.original_filename', 'cover-letter.pdf');

    $application = $applicant->applications()->firstOrFail();
    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'cover_letter_document_id' => $coverLetterId,
    ]);

    $employerToken = phaseFiveToken($this, $employer);
    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->getJson("/api/employer/applications/{$application->id}")
        ->assertOk()
        ->assertJsonPath('data.cover_letter_document.id', $coverLetterId);

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->get("/api/employer/applications/{$application->id}/cover-letter")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertStreamedContent("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

    $this->app['auth']->forgetGuards();
    $this->withToken(phaseFiveToken($this, $otherEmployer))
        ->get("/api/employer/applications/{$application->id}/cover-letter")
        ->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->deleteJson("/api/applicant/documents/{$coverLetterId}")
        ->assertStatus(409)
        ->assertJsonPath('code', 'document_in_use');
});

it('blocks applications to the same company during a scheduled interview and allows resubmission after cancellation', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Interview Retry']));
    $sameCompanyListing = $listing->company->jobListings()->create([
        'category_id' => $listing->category_id,
        'listing_type' => 'job',
        'title' => 'Another role at the same company',
        'description' => 'A second open role.',
        'responsibilities' => 'Complete the work.',
        'requirements' => 'Relevant experience.',
        'location' => 'Cebu City',
        'work_setup' => 'onsite',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
    ]);
    $applicantToken = phaseFiveToken($this, $applicant);
    $employerToken = phaseFiveToken($this, $employer);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'reviewing',
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'shortlisted',
    ])->assertOk();

    $scheduledAt = now('Asia/Manila')->addDays(2)->setTime(10, 0);
    $schedule = [
        'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
        'end_at' => $scheduledAt->copy()->addHour()->format('Y-m-d H:i:s'),
        'timezone' => 'Asia/Manila',
        'mode' => 'onsite',
        'location' => 'Cebu City office',
    ];
    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->postJson("/api/employer/applications/{$application->id}/interviews", $schedule)
        ->assertCreated();
    $interview = Interview::query()->where('application_id', $application->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$sameCompanyListing->id}/applications")
        ->assertStatus(409)
        ->assertJsonPath('code', 'company_interview_in_progress');
    $this->assertDatabaseMissing('applications', [
        'applicant_id' => $applicant->id,
        'job_listing_id' => $sameCompanyListing->id,
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->postJson("/api/employer/interviews/{$interview->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertOk()
        ->assertJsonPath('message', 'Application resubmitted.')
        ->assertJsonPath('data.status', 'pending');

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'reviewing',
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'shortlisted',
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->postJson("/api/employer/applications/{$application->id}/interviews", $schedule)
        ->assertCreated();

    expect(Interview::query()->where('application_id', $application->id)->count())->toBe(2)
        ->and($application->refresh()->status)->toBe('interview');
});

it('records the hire start date and lets only the employer record the employment end date', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Employment Dates']));
    $applicantToken = phaseFiveToken($this, $applicant);
    $employerToken = phaseFiveToken($this, $employer);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    foreach (['reviewing', 'shortlisted', 'interview', 'hired'] as $status) {
        $this->app['auth']->forgetGuards();
        $response = $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
            'status' => $status,
        ])->assertOk();
    }

    expect($application->refresh()->hired_at)->not->toBeNull();
    $response->assertJsonPath('data.hired_at', $application->hired_at->toISOString());

    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $otherEmployerToken = phaseFiveToken($this, $otherEmployer);
    $endedAt = now()->toDateString();

    $this->withToken($otherEmployerToken)->patchJson("/api/employer/applications/{$application->id}/employment/end", [
        'employment_ended_at' => $endedAt,
    ])->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/employment/end", [
        'employment_ended_at' => now()->subYear()->toDateString(),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('employment_ended_at');

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/employment/end", [
        'employment_ended_at' => $endedAt,
    ])->assertOk()
        ->assertJsonPath('data.status', 'hired')
        ->assertJsonPath('data.employment_ended_at', $endedAt);
    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'employment_ended_by' => $employer->id,
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/employment/end", [
        'employment_ended_at' => $endedAt,
    ])->assertStatus(409)
        ->assertJsonPath('code', 'employment_already_ended');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->getJson('/api/applicant/applications')
        ->assertOk()
        ->assertJsonPath('data.0.hired_at', $application->hired_at->toISOString())
        ->assertJsonPath('data.0.employment_ended_at', $endedAt);
});

it('blocks reapplication to the rejected listing for 30 days but allows other listings', function (): void {
    Storage::fake('local');
    $applicant = phaseFiveApplicant();
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Rejected Retry']));
    $company = $employer->company()->firstOrFail();
    $otherListing = $company->jobListings()->create([
        'category_id' => Category::create(['name' => 'Other Retry'])->id,
        'listing_type' => 'job',
        'title' => 'Different Role',
        'description' => 'A different job.',
        'responsibilities' => 'Complete different tasks.',
        'requirements' => 'Meet different requirements.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
    ]);
    $applicantToken = phaseFiveToken($this, $applicant);
    $employerToken = phaseFiveToken($this, $employer);

    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf(),
    ])->assertCreated();
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/employer/applications/{$application->id}/status", [
        'status' => 'rejected',
        'public_reason' => 'The role requires more experience.',
    ])->assertOk();

    $rejectionHistory = $application->statusHistories()
        ->where('new_status', 'rejected')
        ->firstOrFail();
    $rejectedAt = $rejectionHistory->created_at;
    $reapplyAvailableAt = $rejectedAt->copy()->addDays(30);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->getJson('/api/applicant/applications')
        ->assertOk()
        ->assertJsonPath('data.0.rejected_at', $rejectedAt->toISOString())
        ->assertJsonPath('data.0.reapply_available_at', $reapplyAvailableAt->toISOString())
        ->assertJsonPath('data.0.reapplication_allowed', false)
        ->assertJsonPath('data.0.status_history.1.public_reason', 'The role requires more experience.');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertStatus(409)
        ->assertJsonPath('code', 'reapplication_cooldown')
        ->assertJsonPath('reapply_available_at', $reapplyAvailableAt->toISOString());

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$otherListing->id}/applications")
        ->assertCreated();

    $rejectionHistory->update([
        'created_at' => $rejectedAt->copy()->subDays(30)->subSecond(),
    ]);
    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertOk()
        ->assertJsonPath('data.id', $application->id)
        ->assertJsonPath('data.status', 'pending');

    expect($applicant->applications()->where('job_listing_id', $listing->id)->count())->toBe(1);
    $this->assertDatabaseHas('application_status_histories', [
        'application_id' => $application->id,
        'previous_status' => 'rejected',
        'new_status' => 'pending',
        'actor_id' => $applicant->id,
    ]);
});

it('requires email verification but does not require separate identity approval to apply', function (): void {
    Storage::fake('local');
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = phaseFiveListing($employer, Category::create(['name' => 'Engineering']));

    $emailUnverified = phaseFiveApplicant(['email_verified_at' => null]);
    $emailToken = phaseFiveToken($this, $emailUnverified);

    $this->withToken($emailToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertForbidden()
        ->assertJsonPath('code', 'email_verification_required')
        ->assertJsonPath('message', 'Verify your email address before submitting applications.');

    $identityUnverified = phaseFiveApplicant();
    $identityUnverified->identityVerification()->update(['status' => 'pending']);
    $identityToken = phaseFiveToken($this, $identityUnverified);

    $this->app['auth']->forgetGuards();
    $this->withToken($identityToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('profile-cv.pdf'),
    ])->assertCreated();

    $this->app['auth']->forgetGuards();
    $this->withToken($identityToken)->postJson("/api/jobs/{$listing->id}/applications")
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending');
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
        ->assertUnprocessable()
        ->assertJsonPath('code', 'listing_type_ineligible');

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
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertCreated();
    $firstResume = $applicant->resumes()->where('is_current', true)->firstOrFail();
    Storage::disk('local')->put($firstResume->storage_path, '%PDF-1.4 original content');

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson("/api/jobs/{$listing->id}/applications")->assertCreated();
    $application = $applicant->applications()->firstOrFail();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/resume', [
        'resume' => phaseFivePdf('resume.pdf'),
    ])->assertOk();
    Storage::disk('local')->assertExists($firstResume->storage_path);

    $ownerToken = phaseFiveToken($this, $employer);
    $this->withToken($ownerToken)->get("/api/employer/applications/{$application->id}/resume")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('content-disposition', 'attachment; filename=resume.pdf');

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
