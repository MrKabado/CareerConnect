<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\User;
use App\Services\JobLocationGeocoder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Client\Request as HttpRequest;

uses(LazilyRefreshDatabase::class)->group('api');

beforeEach(function (): void {
    Config::set('careerconnect.media_storage_disk', 'local');
    Http::fake(function (HttpRequest $request) {
        if (str_contains($request->url(), 'psgc.cloud')) {
            $path = trim((string) parse_url($request->url(), PHP_URL_PATH), '/');

            return match ($path) {
                'api/regions' => Http::response([
                    ['code' => '0100000000', 'name' => 'Region I'],
                ]),
                'api/regions/0100000000/provinces' => Http::response([
                    ['code' => '0102800000', 'name' => 'Ilocos Norte'],
                ]),
                'api/provinces/0102800000/cities-municipalities' => Http::response([
                    ['code' => '0128010000', 'name' => 'Laoag City', 'type' => 'City', 'zip_code' => '2900'],
                ]),
                'api/cities-municipalities/0128010000/barangays' => Http::response([
                    ['code' => '0128010001', 'name' => 'Barangay One'],
                ]),
                default => Http::response([], 404),
            };
        }

        return Http::response([
            [
                'lat' => str_starts_with($request['q'], 'Marigondon,') ? '10.2650' : '10.3157',
                'lon' => str_starts_with($request['q'], 'Marigondon,') ? '123.9500' : '123.8854',
                'type' => $request['q'] === 'Zamboanga City'
                    || str_contains($request['q'], '10 Imaginary Street')
                    || str_contains($request['q'], 'Skina Ylaya')
                    ? 'city'
                    : (str_starts_with($request['q'], 'Marigondon,') ? 'suburb' : 'house'),
            ],
        ]);
    });
});

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

it('stores precise job coordinates and exposes them through the public listing API', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $company = listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category))
        ->assertCreated()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);
    $listingId = $response->json('data.id');

    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertOk();
    $this->getJson("/api/jobs/{$listingId}")
        ->assertOk()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);

    $this->assertDatabaseHas('job_listings', [
        'id' => $listingId,
        'latitude' => '10.3157000',
        'longitude' => '123.8854000',
    ]);
    Http::assertSentCount(1);
});

it('stores employer-selected map coordinates without geocoding', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'latitude' => 10.265,
        'longitude' => 123.95,
    ]))
        ->assertCreated()
        ->assertJsonPath('data.latitude', 10.265)
        ->assertJsonPath('data.longitude', 123.95);

    $this->assertDatabaseHas('job_listings', [
        'id' => $response->json('data.id'),
        'latitude' => '10.2650000',
        'longitude' => '123.9500000',
    ]);
    Http::assertNotSent(fn (HttpRequest $request): bool => str_contains($request->url(), 'nominatim'));
});

it('requires map coordinates to be submitted as a valid pair', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'latitude' => 10.265,
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['latitude']);
});

it('previews an employer address for the interactive location picker', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/employer/jobs/location-preview', [
        'location' => 'Skina Ylaya, Marigondon, City of Lapu-Lapu, Cebu, Region VII (Central Visayas), 6015, Philippines',
        'fallback_location' => 'Marigondon, City of Lapu-Lapu, Cebu, Region VII (Central Visayas), Philippines',
    ])
        ->assertOk()
        ->assertJsonPath('data.latitude', 10.265)
        ->assertJsonPath('data.longitude', 123.95);
});

it('stores and returns a validated Philippine workplace address', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;
    $listingId = $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'location' => 'Laoag City',
        'work_setup' => 'onsite',
        'region_code' => '0100000000',
        'province_code' => '0102800000',
        'city_municipality_code' => '0128010000',
        'barangay_code' => '0128010001',
        'street_address' => '10 Main Street',
        'zip_code' => '1234',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.region_name', 'Region I')
        ->assertJsonPath('data.province_name', 'Ilocos Norte')
        ->assertJsonPath('data.city_municipality_name', 'Laoag City')
        ->assertJsonPath('data.barangay_name', 'Barangay One')
        ->assertJsonPath('data.street_address', '10 Main Street')
        ->assertJsonPath('data.zip_code', '1234')
        ->json('data.id');

    $this->assertDatabaseHas('job_listings', [
        'id' => $listingId,
        'region_code' => '0100000000',
        'city_municipality_code' => '0128010000',
        'barangay_code' => '0128010001',
        'street_address' => '10 Main Street',
        'zip_code' => '1234',
    ]);

    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertOk();
    $this->getJson("/api/jobs/{$listingId}")
        ->assertOk()
        ->assertJsonPath('data.city_municipality_name', 'Laoag City')
        ->assertJsonPath('data.street_address', '10 Main Street');
});

it('retries geocoding without the street when that street cannot be matched', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'location' => 'Zamboanga City',
        'work_setup' => 'onsite',
        'region_code' => '0100000000',
        'province_code' => '0102800000',
        'city_municipality_code' => '0128010000',
        'barangay_code' => '0128010001',
        'street_address' => '10 Imaginary Street',
        'zip_code' => '1234',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);

    Http::assertSent(fn (HttpRequest $request): bool => str_contains($request->url(), 'nominatim')
        && str_contains($request['q'], '10 Imaginary Street'));
    Http::assertSent(fn (HttpRequest $request): bool => str_contains($request->url(), 'nominatim')
        && ! str_contains($request['q'], '10 Imaginary Street')
        && str_contains($request['q'], 'Barangay One'));
});

it('falls back from an unmatched street to the Marigondon locality', function (): void {
    $coordinates = app(JobLocationGeocoder::class)->geocodeAddress(
        'Skina Ylaya, Marigondon, City of Lapu-Lapu, Cebu, Region VII (Central Visayas), 6015, Philippines',
        'Marigondon, City of Lapu-Lapu, Cebu, Region VII (Central Visayas), Philippines',
    );

    expect($coordinates)->toBe(['latitude' => 10.265, 'longitude' => 123.95]);
    Http::assertSent(fn (HttpRequest $request): bool => str_contains($request->url(), 'nominatim')
        && str_contains($request['q'], 'Skina Ylaya'));
    Http::assertSent(fn (HttpRequest $request): bool => str_contains($request->url(), 'nominatim')
        && str_starts_with($request['q'], 'Marigondon,')
        && ! str_contains($request['q'], 'Skina Ylaya'));
});

it('stores city-level coordinates when a precise workplace match is unavailable', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer);
    $category = Category::create(['name' => 'Engineering', 'is_active' => true]);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'location' => 'Zamboanga City',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);
});

it('geocodes existing listings when their details are opened', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = listingTestRecord($employer, Category::create([
        'name' => 'Engineering',
        'is_active' => true,
    ]));

    $this->getJson("/api/jobs/{$listing->id}")
        ->assertOk()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);

    $this->assertDatabaseHas('job_listings', [
        'id' => $listing->id,
        'latitude' => '10.3157000',
        'longitude' => '123.8854000',
    ]);
    Http::assertSentCount(1);
});

it('geocodes existing employer listings when their details are opened', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $listing = listingTestRecord($employer, Category::create([
        'name' => 'Engineering',
        'is_active' => true,
    ]));
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->getJson("/api/employer/jobs/{$listing->id}")
        ->assertOk()
        ->assertJsonPath('data.latitude', 10.3157)
        ->assertJsonPath('data.longitude', 123.8854);

    $this->assertDatabaseHas('job_listings', [
        'id' => $listing->id,
        'latitude' => '10.3157000',
        'longitude' => '123.8854000',
    ]);
    Http::assertSentCount(1);
});

it('supports custom categories, applicant limits, expiration, manual closure and reopening', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $company = listingTestCompany($employer, true);
    $token = $employer->createToken('employer')->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/jobs', [
        'listing_type' => 'job',
        'title' => 'Specialist',
        'custom_category_name' => 'Creative Robotics',
        'description' => 'Build creative robots.',
        'responsibilities' => 'Design prototypes.',
        'requirements' => 'Robotics experience.',
        'location' => 'Cebu City',
        'work_setup' => 'hybrid',
        'employment_type' => 'full_time',
        'applicant_limit' => 5,
        'expires_at' => now()->addMonth()->toDateString(),
        'salary_min' => 30000,
        'salary_max' => 50000,
    ])->assertCreated();
    $listingId = $response->json('data.id');
    $this->assertDatabaseHas('categories', [
        'name' => 'Creative Robotics',
        'is_custom' => true,
        'is_active' => false,
    ]);
    $this->assertDatabaseHas('job_listings', [
        'id' => $listingId,
        'custom_category_name' => 'Creative Robotics',
        'applicant_limit' => 5,
    ]);

    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'category_pending_approval');

    $listing = JobListing::findOrFail($listingId);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->app['auth']->forgetGuards();
    $this->withToken($admin->createToken('admin')->plainTextToken)
        ->postJson("/api/admin/jobs/{$listingId}/approve-category")
        ->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertOk();
    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'closed'])
        ->assertOk()
        ->assertJsonPath('listing.status', 'closed');
    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertOk()
        ->assertJsonPath('listing.status', 'open');

    expect($company->jobListings()->whereKey($listingId)->exists())->toBeTrue();
});

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

it('allows non-empty incomplete drafts but rejects empty drafts and incomplete publishing', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $token = $employer->createToken('employer')->plainTextToken;

    $draft = $this->withToken($token)->postJson('/api/jobs', [
        'listing_type' => 'job',
        'save_as_draft' => true,
        'title' => 'backend developer',
    ])->assertCreated()
        ->assertJsonPath('data.title', 'Backend Developer')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.category', null);

    $listingId = $draft->json('data.id');
    $this->assertDatabaseHas('job_listings', [
        'id' => $listingId,
        'title' => 'Backend Developer',
        'category_id' => null,
        'description' => null,
    ]);

    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category_id', 'description', 'salary_min', 'salary_max']);

    $this->withToken($token)->postJson('/api/jobs', [
        'listing_type' => 'ojt',
        'save_as_draft' => true,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('draft');

    $ojtDraft = $this->withToken($token)->postJson('/api/jobs', [
        'listing_type' => 'ojt',
        'save_as_draft' => true,
        'description' => 'internship program',
    ])->assertCreated();
    $this->assertDatabaseHas('ojt_listing_details', [
        'job_listing_id' => $ojtDraft->json('data.id'),
        'duration_hours' => null,
        'allowance_type' => null,
        'slots' => null,
    ]);
});

it('enforces salary digit limits and applicant count database limits', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer);
    $category = Category::create(['name' => 'Engineering']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'salary_min' => 999999998,
        'salary_max' => 999999999,
        'applicant_limit' => 4294967295,
        'title' => 'senior backend developer',
        'location' => 'new york city',
        'description' => 'build useful software.',
    ]))->assertCreated()
        ->assertJsonPath('data.title', 'Senior Backend Developer')
        ->assertJsonPath('data.location', 'New York City')
        ->assertJsonPath('data.description', 'Build useful software.');

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'salary_min' => 0,
        'salary_max' => 1000000000,
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors('salary_max');

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'salary_min' => '0000000000',
        'salary_max' => 100,
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors('salary_min');

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'applicant_limit' => 4294967296,
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors('applicant_limit');
});

it('stores structured job experience and skill requirements', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer);
    $category = Category::create(['name' => 'Software Engineering']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'work_setup' => 'hybrid',
        'required_skills' => ['PHP', 'SQL'],
        'experience_required' => true,
        'minimum_experience_years' => 3,
    ]))->assertCreated()
        ->assertJsonPath('data.work_setup', 'hybrid')
        ->assertJsonPath('data.required_skills.0', 'PHP')
        ->assertJsonPath('data.required_skills.1', 'SQL')
        ->assertJsonPath('data.experience_required', true)
        ->assertJsonPath('data.minimum_experience_years', 3);

    $this->assertDatabaseHas('job_listings', [
        'listing_type' => 'job',
        'work_setup' => 'hybrid',
        'experience_required' => true,
        'minimum_experience_years' => 3,
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'experience_required' => true,
        'required_skills' => ['PHP'],
    ]))->assertUnprocessable()
        ->assertJsonValidationErrors('minimum_experience_years');
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
        'salary_min' => 60000,
        'salary_max' => 60000,
    ]))->assertCreated();

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

it('requires salary information before publishing but allows draft listings without salary', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    listingTestCompany($employer, true);
    $category = Category::create(['name' => 'Finance']);
    $token = $employer->createToken('employer')->plainTextToken;

    $draft = $this->withToken($token)->postJson('/api/jobs', listingTestPayload($category, [
        'salary_min' => null,
        'salary_max' => null,
    ]))->assertCreated();
    $listingId = $draft->json('data.id');

    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['salary_min', 'salary_max']);

    $this->withToken($token)->putJson("/api/jobs/{$listingId}", listingTestPayload($category, [
        'salary_min' => 40000,
        'salary_max' => 60000,
    ]))->assertOk();
    $this->withToken($token)->putJson("/api/jobs/{$listingId}", listingTestPayload($category, [
        'salary_min' => 60000,
        'salary_max' => 60000,
    ]))->assertOk();
    JobListing::query()->findOrFail($listingId)->update(['salary_max' => 30000]);
    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['salary_min', 'salary_max']);
    $this->withToken($token)->putJson("/api/jobs/{$listingId}", listingTestPayload($category, [
        'salary_min' => 40000,
        'salary_max' => 60000,
    ]))->assertOk();
    $this->withToken($token)->patchJson("/api/jobs/{$listingId}/status", ['status' => 'open'])
        ->assertOk();
});

it('allows admins to safely soft-delete listings while protecting application records', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Safe Delete']);
    $listing = listingTestRecord($employer, $category);

    $this->withToken($admin->createToken('admin')->plainTextToken)
        ->deleteJson("/api/admin/jobs/{$listing->id}")
        ->assertOk();
    $this->assertSoftDeleted('job_listings', ['id' => $listing->id]);

    $this->app['auth']->forgetGuards();
    $employerToken = $employer->createToken('employer')->plainTextToken;
    $this->withToken($employerToken)->getJson('/api/admin/jobs')->assertForbidden();
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
    Storage::fake('public');
    Storage::disk('public')->put('company-logos/logo.png', 'fake image');
    $open->company->forceFill([
        'logo_path' => 'company-logos/logo.png',
        'logo_disk' => 'public',
    ])->save();
    $closed = listingTestRecord($employer, $category, ['status' => 'closed']);
    $draft = listingTestRecord($employer, $category, ['status' => 'draft', 'published_at' => null]);
    $deactivated = listingTestRecord($employer, $category, ['status' => 'deactivated']);

    $this->getJson('/api/jobs')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $open->id)
        ->assertJsonPath('data.0.company.logo_url', Storage::disk('public')->url('company-logos/logo.png'))
        ->assertJsonMissingPath('data.0.company.contact_email')
        ->assertJsonMissingPath('data.0.company.user_id');

    $this->getJson("/api/jobs/{$closed->id}")->assertNotFound();
    $this->getJson("/api/jobs/{$draft->id}")->assertNotFound();
    $this->getJson("/api/jobs/{$deactivated->id}")->assertNotFound();
});

it('filters public opportunities by the normalized company slug', function (): void {
    $category = Category::create(['name' => 'Technology']);
    $owner = User::factory()->create(['role' => 'employer']);
    $matchingListing = listingTestRecord($owner, $category);
    $matchingListing->company()->update(['name' => 'Jerson Jay, Inc.']);

    $otherOwner = User::factory()->create(['role' => 'employer']);
    $otherListing = listingTestRecord($otherOwner, $category);
    $otherListing->company()->update(['name' => 'Different Company']);

    $this->getJson('/api/jobs?company_slug=jerson-jay-inc')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matchingListing->id)
        ->assertJsonPath('data.0.company.name', 'Jerson Jay, Inc.');
});

it('separates Job and OJT listings in public tab queries', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Mixed Search']);
    $job = listingTestRecord($employer, $category, ['title' => 'Regular Developer']);
    $ojt = listingTestRecord($employer, $category, [
        'title' => 'Intern Developer',
        'listing_type' => 'ojt',
        'employment_type' => null,
        'salary_min' => null,
        'salary_max' => null,
    ]);

    $this->getJson('/api/jobs?listing_type=job')
        ->assertOk()
        ->assertJsonPath('data.0.id', $job->id)
        ->assertJsonMissingPath('data.1');

    $this->getJson('/api/jobs?listing_type=ojt')
        ->assertOk()
        ->assertJsonPath('data.0.id', $ojt->id)
        ->assertJsonMissingPath('data.1');
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

it('lists all employer listings for admins', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $category = Category::create(['name' => 'Monitoring']);
    $listing = listingTestRecord($employer, $category, [
        'required_skills' => ['PHP'],
        'experience_required' => false,
    ]);
    $applicant = User::factory()->create(['role' => 'applicant']);
    $profile = $applicant->applicantProfile()->create([
        'looking_for_jobs' => true,
        'looking_for_ojt' => false,
        'experience_level' => 'fresh_graduate',
    ]);
    $profile->skills()->create([
        'name' => 'PHP',
        'normalized_name' => 'php',
    ]);
    $resume = $applicant->resumes()->create([
        'storage_path' => 'test-resumes/admin-monitor.pdf',
        'original_filename' => 'resume.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 100,
        'is_current' => true,
    ]);
    $application = $applicant->applications()->make([
        'resume_id' => $resume->id,
        'status' => 'pending',
        'resume_original_filename' => 'resume.pdf',
        'resume_mime_type' => 'application/pdf',
        'resume_file_size' => 100,
        'applied_at' => now(),
    ]);
    $application->jobListing()->associate($listing);
    $application->save();

    $token = $admin->createToken('admin')->plainTextToken;
    $this->withToken($token)->getJson('/api/admin/jobs')
        ->assertOk()
        ->assertJsonPath('data.0.applicant_count', 1);

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
