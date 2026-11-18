<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    protected $model = Application::class;

    public function definition(): array
    {
        $resume = Resume::factory()->create();

        return [
            'applicant_id' => $resume->applicant_id,
            'job_listing_id' => JobListing::factory(),
            'resume_id' => $resume->id,
            'status' => 'pending',
            'resume_original_filename' => $resume->original_filename,
            'resume_mime_type' => $resume->mime_type,
            'resume_file_size' => $resume->file_size,
            'cover_letter' => fake()->paragraph(),
            'applied_at' => now(),
        ];
    }
}
