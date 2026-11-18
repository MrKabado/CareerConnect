<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resume>
 */
class ResumeFactory extends Factory
{
    protected $model = Resume::class;

    public function definition(): array
    {
        return [
            'applicant_id' => User::factory()->applicant(),
            'storage_path' => 'resumes/'.fake()->uuid().'.pdf',
            'original_filename' => 'resume-'.fake()->numerify('###').'.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 120000,
            'is_current' => true,
        ];
    }
}
