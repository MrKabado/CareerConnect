<?php

namespace Database\Factories;

use App\Models\ApplicantProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicantProfile>
 */
class ApplicantProfileFactory extends Factory
{
    protected $model = ApplicantProfile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->applicant(),
            'phone' => '+63'.fake()->numerify('9#########'),
            'city' => fake()->city(),
            'profile_photo_path' => null,
            'looking_for_jobs' => true,
            'looking_for_ojt' => fake()->boolean(),
            'experience_level' => fake()->randomElement(['fresh_graduate', '1_3_years', '3_5_years', '5_plus_years']),
            'desired_titles' => ['Frontend Developer', 'Software Engineer'],
            'employment_types' => ['full_time', 'part_time'],
            'work_setups' => ['onsite', 'hybrid'],
            'preferred_locations' => ['Metro Manila', 'Cebu'],
            'salary_min' => 25000,
            'salary_max' => 60000,
            'onboarding_step' => 'review',
            'onboarding_completed_at' => now(),
        ];
    }
}
