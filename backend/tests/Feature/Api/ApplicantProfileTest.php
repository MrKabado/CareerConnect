<?php

use App\Models\ApplicantProfile;
use App\Models\Category;
use App\Models\User;
use App\Services\CloudinaryMediaGateway;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Config::set('careerconnect.media_storage_disk', 'local');
});

function applicantToken(User $user): string
{
    return $user->createToken('applicant-profile-test')->plainTextToken;
}

it('allows only applicants to retrieve and update their own profile', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $anotherApplicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);

    $this->getJson('/api/applicant/profile')->assertUnauthorized();

    $this->withToken($token)->getJson('/api/applicant/profile')
        ->assertOk()
        ->assertJsonPath('data.name', $applicant->name)
        ->assertJsonPath('data.phone', null)
        ->assertJsonPath('data.city', null)
        ->assertJsonPath('data.interests', [])
        ->assertJsonPath('data.skills', [])
        ->assertJsonPath('data.ojt_details', null)
        ->assertJsonPath('data.looking_for_jobs', true);

    $this->withToken($token)->putJson('/api/applicant/profile', [
        'name' => 'Updated Applicant',
        'phone' => '+639123456789',
        'city' => 'Cebu City',
        'role' => 'admin',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('role');

    $this->withToken($token)->patchJson('/api/applicant/profile', [
        'name' => 'Updated Applicant',
        'phone' => '+639123456789',
        'city' => 'Cebu City',
    ])->assertOk()
        ->assertJsonPath('data.name', 'Updated Applicant')
        ->assertJsonPath('data.phone', '+639123456789')
        ->assertJsonPath('data.city', 'Cebu City');

    expect($anotherApplicant->refresh()->name)->not->toBe('Updated Applicant');

    foreach (['employer', 'admin'] as $role) {
        $otherRole = User::factory()->create(['role' => $role]);
        $this->app['auth']->forgetGuards();
        $this->withToken(applicantToken($otherRole))->getJson('/api/applicant/profile')
            ->assertForbidden();
    }

});

it('uploads, replaces, deletes and validates profile photos', function (): void {
    Storage::fake('public');
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);

    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('first.jpg', 10, 'image/jpeg'),
    ])->assertCreated();
    $profile = ApplicantProfile::where('user_id', $applicant->id)->firstOrFail();
    $firstPath = $profile->profile_photo_path;
    Storage::disk('public')->assertExists($firstPath);

    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('second.png', 10, 'image/png'),
    ])->assertCreated();
    $profile->refresh();
    Storage::disk('public')->assertMissing($firstPath);
    Storage::disk('public')->assertExists($profile->profile_photo_path);

    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('bad.pdf', 10, 'application/pdf'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('photo');

    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('large.jpg', 2049, 'image/jpeg'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('photo');

    $this->withToken($token)->deleteJson('/api/applicant/profile/photo')
        ->assertOk()
        ->assertJsonPath('data.profile_photo_path', null);
    Storage::disk('public')->assertMissing($profile->profile_photo_path);
});

it('organizes Cloudinary applicant photos under their user folder', function (): void {
    Config::set('careerconnect.media_storage_disk', 'cloudinary');
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);
    $gateway = Mockery::mock(CloudinaryMediaGateway::class);
    $gateway->shouldReceive('uploadImage')
        ->twice()
        ->withArgs(fn (UploadedFile $file, string $folder): bool => $folder === 'career-connect/users/'.$applicant->id.'/profile-photos'
        )
        ->andReturn(
            ['asset_id' => 'photo-asset-1', 'public_id' => 'photo-one'],
            ['asset_id' => 'photo-asset-2', 'public_id' => 'photo-two'],
        );
    $gateway->shouldReceive('imageUrl')->twice()
        ->andReturn('https://res.cloudinary.com/demo/image/upload/photo-one', 'https://res.cloudinary.com/demo/image/upload/photo-two');
    $gateway->shouldReceive('delete')->twice()->withArgs(
        fn (string $publicId, string $resourceType, string $deliveryType): bool => in_array($publicId, ['photo-one', 'photo-two'], true)
            && $resourceType === 'image'
            && $deliveryType === 'upload',
    );
    $this->app->instance(CloudinaryMediaGateway::class, $gateway);

    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('first.jpg', 10, 'image/jpeg'),
    ])->assertCreated()
        ->assertJsonPath('photo_url', 'https://res.cloudinary.com/demo/image/upload/photo-one');

    $profile = ApplicantProfile::where('user_id', $applicant->id)->firstOrFail();
    expect($profile->profile_photo_path)->toBe('photo-one')
        ->and($profile->profile_photo_disk)->toBe('cloudinary')
        ->and($profile->profile_photo_asset_id)->toBe('photo-asset-1');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/applicant/profile/photo', [
        'photo' => UploadedFile::fake()->create('second.png', 10, 'image/png'),
    ])->assertCreated()
        ->assertJsonPath('photo_url', 'https://res.cloudinary.com/demo/image/upload/photo-two');

    $profile->refresh();
    expect($profile->profile_photo_path)->toBe('photo-two')
        ->and($profile->profile_photo_asset_id)->toBe('photo-asset-2');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson('/api/applicant/profile/photo')
        ->assertOk()
        ->assertJsonPath('data.profile_photo_path', null);
});

it('persists seeker types, interests, skills, work and job preferences with partial updates', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);

    $this->withToken($token)->putJson('/api/applicant/onboarding/seeker-types', [
        'looking_for_jobs' => false,
        'looking_for_ojt' => true,
    ])->assertOk()
        ->assertJsonPath('data.looking_for_jobs', false)
        ->assertJsonPath('data.looking_for_ojt', true);

    $this->withToken($token)->putJson('/api/applicant/onboarding/seeker-types', [
        'looking_for_jobs' => true,
        'looking_for_ojt' => true,
    ])->assertOk()
        ->assertJsonPath('data.looking_for_jobs', true)
        ->assertJsonPath('data.looking_for_ojt', true);

    $this->withToken($token)->putJson('/api/applicant/onboarding/seeker-types', [
        'looking_for_jobs' => false,
        'looking_for_ojt' => false,
    ])->assertUnprocessable();

    $this->withToken($token)->putJson('/api/applicant/onboarding/interests', [
        'category_ids' => [$category->id],
        'skills' => ['Laravel', 'PHP'],
    ])->assertOk()
        ->assertJsonPath('data.interests.0.name', 'Engineering')
        ->assertJsonPath('data.skills.0', 'Laravel');

    $this->withToken($token)->putJson('/api/applicant/onboarding/interests', [
        'category_ids' => [999999],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('category_ids.0');

    $this->withToken($token)->putJson('/api/applicant/onboarding/work-preferences', [
        'work_setups' => ['hybrid', 'remote'],
        'preferred_locations' => ['Cebu City'],
    ])->assertOk()
        ->assertJsonPath('data.work_setups.0', 'hybrid');

    $this->withToken($token)->putJson('/api/applicant/onboarding/job-preferences', [
        'desired_titles' => ['Backend Developer'],
        'experience_level' => 'fresh_graduate',
        'employment_types' => ['full_time'],
        'salary_min' => 20000,
        'salary_max' => 40000,
    ])->assertOk();

    $this->withToken($token)->putJson('/api/applicant/onboarding/job-preferences', [
        'salary_max' => 10000,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('salary_max');

    $this->withToken($token)->putJson('/api/applicant/onboarding/job-preferences', [
        'desired_titles' => ['QA Engineer'],
    ])->assertOk()
        ->assertJsonPath('data.desired_titles.0', 'QA Engineer')
        ->assertJsonPath('data.employment_types.0', 'full_time')
        ->assertJsonPath('data.salary_min', 20000)
        ->assertJsonPath('data.salary_max', 40000);
});

it('persists job onboarding answers through the limited onboarding token', function (): void {
    $applicant = User::factory()->create([
        'role' => 'applicant',
        'email_verified_at' => null,
    ]);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $applicant->createToken(
        'onboarding-profile-test',
        ['onboarding:profile'],
    )->plainTextToken;

    $this->withToken($token)->putJson('/api/onboarding/profile', [
        'goal' => 'job-seeker',
        'job_categories' => ['Engineering', 'Customer Service / BPO'],
        'desired_titles' => ['Backend Developer'],
        'skills' => ['PHP', 'Laravel'],
        'experience_level' => 'Fresh graduate',
        'employment_types' => ['Full-time', 'Contract'],
        'minimum_salary' => '30000',
        'maximum_salary' => '50000',
        'work_setup' => 'Remote',
        'preferred_locations' => ['Cebu City'],
    ])->assertOk()
        ->assertJsonPath('data.looking_for_jobs', true)
        ->assertJsonPath('data.looking_for_ojt', false)
        ->assertJsonPath('data.interests.0.id', $category->id)
        ->assertJsonPath('data.other_categories.0', 'Customer Service / BPO')
        ->assertJsonPath('data.skills.0', 'PHP')
        ->assertJsonPath('data.work_setups.0', 'remote')
        ->assertJsonPath('data.desired_titles.0', 'Backend Developer')
        ->assertJsonPath('data.employment_types.0', 'full_time')
        ->assertJsonPath('data.experience_level', 'fresh_graduate')
        ->assertJsonPath('data.salary_min', 30000)
        ->assertJsonPath('data.salary_max', 50000)
        ->assertJsonPath('data.preferred_locations.0', 'Cebu City');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/onboarding/complete')
        ->assertOk()
        ->assertJsonPath('onboarding.completed', true);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/profile')->assertForbidden();
});

it('persists OJT onboarding details including false MOA values', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    Category::create(['name' => 'Applied Research Track', 'is_active' => true]);
    $token = $applicant->createToken(
        'onboarding-profile-test',
        ['onboarding:profile'],
    )->plainTextToken;

    $this->withToken($token)->putJson('/api/onboarding/profile', [
        'goal' => 'ojt-seeker',
        'training_fields' => ['Applied Research Track', 'Specialized Training Track'],
        'skills' => ['Communication'],
        'work_setup' => 'Hybrid',
        'preferred_locations' => ['Quezon City'],
        'school' => 'State University',
        'course' => 'Information Technology',
        'year_level' => '4th year',
        'required_ojt_hours' => '486',
        'requires_moa' => false,
        'preferred_start_date' => now()->addDay()->toDateString(),
        'allowance_preference' => 'Required',
    ])->assertOk()
        ->assertJsonPath('data.looking_for_jobs', false)
        ->assertJsonPath('data.looking_for_ojt', true)
        ->assertJsonPath('data.ojt_details.school', 'State University')
        ->assertJsonPath('data.ojt_details.course', 'Information Technology')
        ->assertJsonPath('data.ojt_details.year_level', 4)
        ->assertJsonPath('data.ojt_details.required_hours', 486)
        ->assertJsonPath('data.ojt_details.requires_moa', false)
        ->assertJsonPath('data.ojt_details.allowance_preference', 'paid_only')
        ->assertJsonPath('data.other_categories.0', 'Specialized Training Track');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/onboarding/complete')
        ->assertOk()
        ->assertJsonPath('onboarding.completed', true);
});

it('saves incomplete OJT details, enforces completion requirements, and retains details after finishing OJT', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);

    $this->withToken($token)->putJson('/api/applicant/onboarding/seeker-types', [
        'looking_for_jobs' => false,
        'looking_for_ojt' => true,
    ])->assertOk();

    $this->withToken($token)->putJson('/api/applicant/onboarding/ojt-details', [
        'school' => 'Cebu University',
    ])->assertOk()
        ->assertJsonPath('data.ojt_details.school', 'Cebu University');

    $this->withToken($token)->postJson('/api/applicant/onboarding/complete')
        ->assertUnprocessable()
        ->assertJsonPath('code', 'onboarding_incomplete');

    $this->withToken($token)->putJson('/api/applicant/onboarding/ojt-details', [
        'course' => 'Information Technology',
        'year_level' => 4,
        'required_hours' => 486,
        'allowance_preference' => 'paid_only',
        'requires_moa' => true,
    ])->assertOk();

    $this->withToken($token)->postJson('/api/applicant/onboarding/complete')
        ->assertOk()
        ->assertJsonPath('onboarding.completed', true);

    $this->withToken($token)->postJson('/api/applicant/finish-ojt')
        ->assertOk()
        ->assertJsonPath('data.looking_for_jobs', true)
        ->assertJsonPath('data.looking_for_ojt', false)
        ->assertJsonPath('data.ojt_details.school', 'Cebu University');

    $this->withToken($token)->postJson('/api/applicant/finish-ojt')
        ->assertOk()
        ->assertJsonPath('data.looking_for_ojt', false);
});

it('allows job-only applicants to complete without OJT details and resumes saved progress', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);

    $this->withToken($token)->getJson('/api/applicant/onboarding')
        ->assertOk()
        ->assertJsonPath('onboarding.completed', false);

    $this->withToken($token)->postJson('/api/applicant/onboarding/complete')
        ->assertOk()
        ->assertJsonPath('onboarding.completed', true)
        ->assertJsonPath('data.ojt_details', null);

    $this->withToken($token)->putJson('/api/applicant/onboarding/seeker-types', [
        'looking_for_ojt' => true,
    ])->assertOk()
        ->assertJsonPath('onboarding.completed', false)
        ->assertJsonPath('onboarding.can_complete', false);
});

it('applies combined preference updates without clearing unspecified fields', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = applicantToken($applicant);
    $category = Category::create(['name' => 'Design', 'is_active' => true]);

    $this->withToken($token)->putJson('/api/applicant/onboarding/job-preferences', [
        'employment_types' => ['part_time'],
        'salary_min' => 15000,
        'salary_max' => 25000,
    ])->assertOk();

    $this->withToken($token)->patchJson('/api/applicant/preferences', [
        'name' => 'Updated Applicant',
        'phone' => '+639123456789',
        'city' => 'Cebu City',
        'category_ids' => [$category->id],
        'other_categories' => ['Service design'],
        'skills' => ['Figma'],
        'looking_for_jobs' => true,
        'looking_for_ojt' => false,
        'work_setups' => ['remote'],
        'preferred_locations' => ['Manila'],
        'desired_titles' => ['Product Designer'],
        'employment_types' => ['part_time'],
        'experience_level' => 'fresh_graduate',
        'salary_min' => 25000,
        'salary_max' => 35000,
        'profile_links' => [
            'portfolio' => 'portfolio.example.test',
            'github' => 'https://github.com/applicant',
            'linkedin' => null,
            'other' => null,
        ],
        'ojt_details' => [
            'school' => 'Design Institute',
            'course' => 'Visual Communication',
            'education_status' => 'graduated',
            'graduation_year' => 2024,
            'allowance_preference' => null,
            'requires_moa' => null,
        ],
    ])->assertOk()
        ->assertJsonPath('data.name', 'Updated Applicant')
        ->assertJsonPath('data.phone', '+639123456789')
        ->assertJsonPath('data.city', 'Cebu City')
        ->assertJsonPath('data.interests.0.name', 'Design')
        ->assertJsonPath('data.other_categories.0', 'Service design')
        ->assertJsonPath('data.skills.0', 'Figma')
        ->assertJsonPath('data.work_setups.0', 'remote')
        ->assertJsonPath('data.preferred_locations.0', 'Manila')
        ->assertJsonPath('data.desired_titles.0', 'Product Designer')
        ->assertJsonPath('data.employment_types.0', 'part_time')
        ->assertJsonPath('data.experience_level', 'fresh_graduate')
        ->assertJsonPath('data.salary_min', 25000)
        ->assertJsonPath('data.salary_max', 35000)
        ->assertJsonPath('data.profile_links.portfolio', 'portfolio.example.test')
        ->assertJsonPath('data.ojt_details.school', 'Design Institute')
        ->assertJsonPath('data.ojt_details.education_status', 'graduated')
        ->assertJsonPath('data.ojt_details.graduation_year', 2024)
        ->assertJsonPath('data.ojt_details.allowance_preference', null)
        ->assertJsonPath('data.ojt_details.requires_moa', null);
});
