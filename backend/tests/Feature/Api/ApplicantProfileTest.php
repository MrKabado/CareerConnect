<?php

use App\Models\ApplicantProfile;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

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
        'category_ids' => [$category->id],
        'skills' => ['Figma'],
        'looking_for_jobs' => true,
        'looking_for_ojt' => false,
        'preferred_locations' => ['Manila'],
        'ojt_details' => [
            'school' => 'Design Institute',
            'course' => 'Visual Communication',
        ],
    ])->assertOk()
        ->assertJsonPath('data.interests.0.name', 'Design')
        ->assertJsonPath('data.skills.0', 'Figma')
        ->assertJsonPath('data.employment_types.0', 'part_time')
        ->assertJsonPath('data.salary_min', 15000)
        ->assertJsonPath('data.salary_max', 25000)
        ->assertJsonPath('data.ojt_details.school', 'Design Institute');
});
