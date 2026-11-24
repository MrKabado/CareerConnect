<?php

use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyRating;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(LazilyRefreshDatabase::class)->group('api');

function companyRatingTestSetup(array $employment = []): array
{
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Maya Philippines',
        'is_verified' => true,
    ]);
    $category = Category::create(['name' => 'Rating Test Category']);
    $listing = $company->jobListings()->create([
        'category_id' => $category->id,
        'listing_type' => 'job',
        'title' => 'Rating Test Role',
        'description' => 'A role used for rating tests.',
        'responsibilities' => 'Complete the work.',
        'requirements' => 'Relevant experience.',
        'location' => 'Manila',
        'work_setup' => 'onsite',
        'employment_type' => 'full_time',
        'status' => 'open',
        'published_at' => now(),
    ]);
    $resume = $applicant->resumes()->create([
        'storage_path' => 'rating-test/'.$applicant->id.'/resume.pdf',
        'original_filename' => 'resume.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 100,
        'is_current' => false,
    ]);
    $hiredAt = $employment['hired_at'] ?? now()->subMonths(4);
    $application = new Application([
        'resume_id' => $resume->id,
        'status' => 'hired',
        'hired_at' => $hiredAt,
        'employment_ended_at' => $employment['employment_ended_at'] ?? null,
        'resume_original_filename' => $resume->original_filename,
        'resume_mime_type' => $resume->mime_type,
        'resume_file_size' => $resume->file_size,
        'applied_at' => now()->subMonths(4),
    ]);
    $application->applicant()->associate($applicant);
    $application->jobListing()->associate($listing);
    $application->save();
    $application->statusHistories()->create([
        'previous_status' => 'interview',
        'new_status' => 'hired',
        'actor_id' => $employer->id,
        'created_at' => $hiredAt,
    ]);

    return [$applicant, $employer, $company];
}

function companyRatingTestToken(User $user): string
{
    Auth::forgetGuards();

    return $user->createToken('company-rating-test')->plainTextToken;
}

it('returns a public empty rating summary for demo profiles without a backend company', function (): void {
    $this->getJson('/api/companies/maya-philippines/ratings')
        ->assertOk()
        ->assertJsonPath('average_rating', null)
        ->assertJsonPath('rating_count', 0)
        ->assertJsonPath('user_rating', null)
        ->assertJsonPath('can_rate', false);
});

it('allows applicants to rate a company after three months since being marked hired', function (): void {
    [$applicant, , $company] = companyRatingTestSetup([
        'hired_at' => now()->subMonths(4),
        'employment_ended_at' => now()->subDays(5)->toDateString(),
    ]);
    $token = companyRatingTestToken($applicant);

    $this->withToken($token)->getJson('/api/companies/maya-philippines/ratings')
        ->assertOk()
        ->assertJsonPath('can_rate', true)
        ->assertJsonPath('employment.status', 'former')
        ->assertJsonPath('employment.meets_minimum_tenure', true);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/companies/maya-philippines/ratings', [
        'rating' => 5,
        'review' => 'A supportive team.',
    ])->assertOk()
        ->assertJsonPath('average_rating', 5)
        ->assertJsonPath('rating_count', 1)
        ->assertJsonPath('user_rating.rating', 5)
        ->assertJsonPath('user_rating.review', 'A supportive team.');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/companies/maya-philippines/ratings', [
        'rating' => 4,
        'review' => '',
    ])->assertOk()
        ->assertJsonPath('average_rating', 4)
        ->assertJsonPath('rating_count', 1)
        ->assertJsonPath('user_rating.rating', 4)
        ->assertJsonPath('user_rating.review', null);

    expect(CompanyRating::query()->where('company_id', $company->id)->count())->toBe(1);
});

it('rejects ratings before three months of employment and reports the unlock date', function (): void {
    $hiredAt = now()->subMonths(2)->startOfSecond();
    [$applicant] = companyRatingTestSetup([
        'hired_at' => $hiredAt,
        'employment_ended_at' => now()->subDays(5)->toDateString(),
    ]);
    $token = companyRatingTestToken($applicant);

    $this->withToken($token)->getJson('/api/companies/maya-philippines/ratings')
        ->assertOk()
        ->assertJsonPath('can_rate', false)
        ->assertJsonPath('eligible_at', null)
        ->assertJsonPath('ineligibility_reason', 'minimum_tenure')
        ->assertJsonPath('employment.status', 'former');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/companies/maya-philippines/ratings', [
        'rating' => 5,
    ])->assertForbidden()
        ->assertJsonPath('code', 'company_rating_not_eligible');

    expect(CompanyRating::count())->toBe(0);
});

it('prevents current employees from rating even after three months and excludes old ratings', function (): void {
    [$applicant, , $company] = companyRatingTestSetup([
        'hired_at' => now()->subMonths(6),
    ]);
    $company->ratings()->create([
        'applicant_id' => $applicant->id,
        'rating' => 5,
    ]);

    $token = companyRatingTestToken($applicant);
    $this->withToken($token)->getJson('/api/companies/maya-philippines/ratings')
        ->assertOk()
        ->assertJsonPath('can_rate', false)
        ->assertJsonPath('rating_count', 0)
        ->assertJsonPath('average_rating', null)
        ->assertJsonPath('employment.status', 'current')
        ->assertJsonPath('ineligibility_reason', 'current_employee');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/companies/maya-philippines/ratings', [
        'rating' => 1,
    ])->assertForbidden()
        ->assertJsonPath('code', 'company_rating_not_eligible');
});

it('rejects invalid rating values', function (): void {
    [$applicant] = companyRatingTestSetup([
        'hired_at' => now()->subMonths(4),
        'employment_ended_at' => now()->subDays(5)->toDateString(),
    ]);

    $this->withToken(companyRatingTestToken($applicant))
        ->putJson('/api/companies/maya-philippines/ratings', ['rating' => 6])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('rating');
});
