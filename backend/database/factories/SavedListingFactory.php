<?php

namespace Database\Factories;

use App\Models\JobListing;
use App\Models\SavedListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedListing>
 */
class SavedListingFactory extends Factory
{
    protected $model = SavedListing::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->applicant(),
            'job_listing_id' => JobListing::factory(),
        ];
    }
}
