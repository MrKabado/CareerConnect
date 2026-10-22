<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Route;

uses(LazilyRefreshDatabase::class)->group('api');

function listingTestCompany(User $owner, bool $verified = false): Company
{
    $company = Company::firstOrNew(['user_id' => $owner->id]);
    $company->fill([
        'name' => fake()->company(),
        'city' => fake()->city(),
        'is_verified' => $verified,
    ]);
    $company->save();

    if ($verified) {
        CompanyVerification::updateOrCreate(
            ['company_id' => $company->id],
            [
                'status' => 'verified',
                'reviewed_at' => now(),
            ],
        );
    }

    return $company;
}

function listingTestPayload(Category $category, array $overrides = []): array
{
    return array_merge([
        'listing_type' => 'job',
        'title' => 'Backend Engineer',
        'category_id' => $category->id,
        'description' => 'Build reliable services.',
        'responsibilities' => 'Design and maintain API services.',
        'requirements' => 'Experience with PHP and SQL.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'salary_min' => 30000,
        'salary_max' => 50000,
    ], $overrides);
}

function listingTestRecord(
    User $owner,
    Category $category,
    array $overrides = [],
    bool $verified = true,
): JobListing {
    $company = listingTestCompany($owner, $verified);
    $attributes = array_merge([
        'listing_type' => 'job',
        'title' => 'Backend Engineer',
        'description' => 'Build reliable services.',
        'responsibilities' => 'Design and maintain API services.',
        'requirements' => 'Experience with PHP and SQL.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'salary_min' => 30000,
        'salary_max' => 50000,
        'status' => 'open',
        'published_at' => now(),
    ], $overrides);
    $attributes['category_id'] = $category->id;

    $listing = $company->jobListings()->create($attributes);

    if ($listing->listing_type === 'ojt') {
        $listing->ojtDetails()->create([
            'duration_hours' => 486,
            'allowance_type' => 'paid',
            'allowance_amount' => 5000,
            'slots' => 3,
            'accepted_courses' => ['BSIT'],
            'moa_accepted' => true,
        ]);
    }

    return $listing;
}

it('creates a draft owned by the authenticated employer without trusting client status or company id', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $company = listingTestCompany($employer);
    $category = Category::create(['name' => 'Engineering']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'company_id' => $company->id + 1,
        'status' => 'open',
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors(['company_id', 'status']);

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category))
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.company.name', $company->name);

    $this->assertDatabaseHas('job_listings', [
        'company_id' => $company->id,
        'listing_type' => 'job',
        'status' => 'draft',
        'published_at' => null,
    ]);
});

it('validates listing fields and stores OJT allowance separately from job salary', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer);
    $category = Category::create(['name' => 'Education']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'salary_min' => 60000,
        'salary_max' => 20000,
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors('salary_max');

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'listing_type' => 'ojt',
        'employment_type' => 'full_time',
        'salary_min' => 30000,
        'salary_max' => 50000,
        'duration_hours' => 486,
        'allowance_type' => 'paid',
        'allowance_amount' => 5000,
        'slots' => 2,
        'accepted_courses' => ['BSIT', 'BSCS'],
        'moa_accepted' => true,
    ]))->assertCreated()
        ->assertJsonPath('data.listing_type', 'ojt')
        ->assertJsonPath('data.salary_min', null)
        ->assertJsonPath('data.ojt.allowance_amount', 5000);

    $this->assertDatabaseHas('ojt_listing_details', [
        'allowance_type' => 'paid',
        'allowance_amount' => 5000,
        'duration_hours' => 486,
    ]);
});

it('requires an active employer and approved company before opening a listing', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer);
    $category = Category::create(['name' => 'Operations']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category))
        ->assertCreated();
    $listing = JobListing::query()->firstOrFail();

    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'open'])
        ->assertForbidden()
        ->assertJsonPath('code', 'company_not_verified');

    $company = $employer->company()->firstOrFail();
    $company->is_verified = true;
    $company->save();
    CompanyVerification::create(['company_id' => $company->id, 'status' => 'pending']);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'open'])
        ->assertForbidden()
        ->assertJsonPath('code', 'company_not_verified');

    $verification = $company->verification;
    $verification->status = 'verified';
    $verification->save();

    $employer->account_status = 'deactivated';
    $employer->save();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'open'])
        ->assertForbidden()
        ->assertJsonPath('code', 'account_deactivated');

    expect($listing->refresh()->status)->toBe('draft');
});

it('enforces ownership for employer reads and updates', function (): void {
    $owner = User::factory()->create(['role' => 'employer']);
    $otherEmployer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Design']);
    $listing = listingTestRecord($owner, $category);
    listingTestCompany($otherEmployer);
    $ownerToken = $owner->createToken('owner')->plainTextToken;
    $otherToken = $otherEmployer->createToken('other')->plainTextToken;

    $this->withToken($ownerToken)->getJson("/api/employer/jobs/{$listing->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $listing->id);

    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->getJson("/api/employer/jobs/{$listing->id}")->assertNotFound();
    $this->withToken($otherToken)->putJson("/api/jobs/{$listing->id}", listingTestPayload($category, [
        'title' => 'Hijacked title',
    ]))->assertNotFound();

    expect($listing->refresh()->title)->toBe('Backend Engineer');
});

it('enforces allowed status transitions and archives employer deletions as closed', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Sales']);
    $listing = listingTestRecord($employer, $category, ['status' => 'draft', 'published_at' => null]);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'closed'])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'invalid_status_transition');

    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'deactivated'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $this->withToken($token)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'open'])
        ->assertOk()
        ->assertJsonPath('listing.status', 'open');
    expect($listing->refresh()->published_at)->not->toBeNull();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson("/api/jobs/{$listing->id}")
        ->assertOk()
        ->assertJsonPath('status', 'closed');
    expect($listing->refresh()->status)->toBe('closed');
});

it('shows only publicly visible listings and exposes no employer contact or verification data', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Technology']);
    $open = listingTestRecord($employer, $category);
    $closed = listingTestRecord($employer, $category, ['status' => 'closed']);
    $draft = listingTestRecord($employer, $category, ['status' => 'draft', 'published_at' => null]);
    $deactivated = listingTestRecord($employer, $category, ['status' => 'deactivated']);

    $this->getJson('/api/jobs')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $open->id)
        ->assertJsonMissingPath('data.0.company.contact_email')
        ->assertJsonMissingPath('data.0.company.user_id');

    $this->getJson("/api/jobs/{$closed->id}")->assertNotFound();
    $this->getJson("/api/jobs/{$draft->id}")->assertNotFound();
    $this->getJson("/api/jobs/{$deactivated->id}")->assertNotFound();
});

it('combines public filters and paginates in a predictable order', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $technology = Category::create(['name' => 'Technology']);
    $design = Category::create(['name' => 'Design']);
    $backend = listingTestRecord($employer, $technology, [
        'title' => 'Laravel API Engineer',
        'location' => 'Cebu City',
        'work_setup' => 'remote',
        'salary_min' => 30000,
        'salary_max' => 50000,
        'published_at' => now()->subMinute(),
    ]);
    listingTestRecord($employer, $technology, [
        'title' => 'Laravel Junior Engineer',
        'location' => 'Cebu City',
        'work_setup' => 'remote',
        'salary_min' => 25000,
        'salary_max' => 35000,
    ]);
    listingTestRecord($employer, $design, [
        'title' => 'Laravel Product Designer',
        'location' => 'Cebu City',
        'work_setup' => 'remote',
    ]);

    $this->getJson('/api/jobs?keyword=API&category_id='.$technology->id.'&location=Cebu&listing_type=job&employment_type=full_time&work_setup=remote&min_salary=40000&max_salary=60000&per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $backend->id)
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('meta.per_page', 1);

    $this->getJson('/api/jobs?min_salary=60000&max_salary=30000')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('max_salary');

    $this->getJson('/api/jobs?per_page=500')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('per_page');
});

it('filters OJT listings by allowance bounds', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Student Programs']);
    $listing = listingTestRecord($employer, $category, [
        'listing_type' => 'ojt',
        'employment_type' => null,
        'salary_min' => null,
        'salary_max' => null,
    ]);
    $this->assertDatabaseHas('ojt_listing_details', ['job_listing_id' => $listing->id]);

    $this->getJson('/api/jobs?listing_type=ojt&min_allowance=4000&max_allowance=6000')
        ->assertOk()
        ->assertJsonPath('data.0.id', $listing->id);
});

it('allows admins to deactivate and restore listings with an audit trail', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Finance']);
    $listing = listingTestRecord($employer, $category);
    $adminToken = $admin->createToken('admin')->plainTextToken;
    $employerToken = $employer->createToken('employer')->plainTextToken;

    $this->withToken($adminToken)->postJson("/api/admin/jobs/{$listing->id}/deactivate", [
        'reason' => 'Listing contains misleading compensation details.',
    ])->assertOk()
        ->assertJsonPath('listing.status', 'deactivated')
        ->assertJsonPath('listing.admin_actions.0.admin.id', $admin->id)
        ->assertJsonPath('listing.admin_actions.0.reason', 'Listing contains misleading compensation details.');

    $this->getJson("/api/jobs/{$listing->id}")->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->patchJson("/api/jobs/{$listing->id}/status", ['status' => 'open'])
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)->postJson("/api/admin/jobs/{$listing->id}/restore", [
        'reason' => 'Reviewed and corrected.',
    ])->assertOk()
        ->assertJsonPath('listing.status', 'closed')
        ->assertJsonCount(2, 'listing.admin_actions');

    expect($listing->refresh()->status)->toBe('closed');
    $this->assertDatabaseHas('job_listing_admin_actions', [
        'job_listing_id' => $listing->id,
        'admin_user_id' => $admin->id,
        'action' => 'deactivated',
        'reason' => 'Listing contains misleading compensation details.',
    ]);
});

it('restricts admin listing management to administrators', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Media']);
    $listing = listingTestRecord($employer, $category);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->getJson('/api/admin/jobs')->assertForbidden();
    $this->withToken($token)->postJson("/api/admin/jobs/{$listing->id}/deactivate", [
        'reason' => 'Not an administrator.',
    ])->assertForbidden();
});

it('blocks application requests for closed and deactivated listings at the API boundary', function (): void {
    Route::post('/__test/jobs/{jobListing}/applications', fn (JobListing $jobListing) => response()->json(['ready' => true]))
        ->middleware(['auth:sanctum', 'account.active', 'role:applicant', 'applicant.eligible', 'listing.accepting-applications'])
        ->whereNumber('jobListing');

    $applicant = User::factory()->create(['role' => 'applicant']);
    IdentityVerification::create(['user_id' => $applicant->id, 'status' => 'verified']);
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Research']);
    $closed = listingTestRecord($employer, $category, ['status' => 'closed']);
    $deactivated = listingTestRecord($employer, $category, ['status' => 'deactivated']);
    $open = listingTestRecord($employer, $category);
    $token = $applicant->createToken('applicant')->plainTextToken;

    $this->withToken($token)->postJson("/__test/jobs/{$closed->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'listing_not_open');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/__test/jobs/{$deactivated->id}/applications")
        ->assertUnprocessable()
        ->assertJsonPath('code', 'listing_not_open');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/__test/jobs/{$open->id}/applications")
        ->assertOk()
        ->assertJsonPath('ready', true);
});
