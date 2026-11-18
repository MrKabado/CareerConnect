<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\JobListing;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobListing>
 */
class JobListingFactory extends Factory
{
    protected $model = JobListing::class;

    public function definition(): array
    {
        $listingType = fake()->randomElement(['job', 'ojt']);

        return [
            'company_id' => Company::factory(),
            'category_id' => null,
            'listing_type' => $listingType,
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraph(3),
            'responsibilities' => fake()->paragraph(2),
            'requirements' => fake()->paragraph(2),
            'location' => fake()->city(),
            'work_setup' => fake()->randomElement(['onsite', 'hybrid', 'remote']),
            'employment_type' => $listingType === 'job' ? fake()->randomElement(['full_time', 'part_time', 'contract']) : null,
            'salary_min' => $listingType === 'job' ? 30000 : null,
            'salary_max' => $listingType === 'job' ? 70000 : null,
            'status' => 'open',
            'published_at' => now(),
        ];
    }
}
