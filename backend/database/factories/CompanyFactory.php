<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->employer(),
            'category_id' => null,
            'name' => fake()->company(),
            'company_size' => fake()->randomElement(['1-10', '11-50', '51-200', '201-500', '500+']),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'website' => fake()->url(),
            'description' => fake()->paragraph(),
            'contact_name' => fake()->name(),
            'contact_phone' => '+63'.fake()->numerify('9#########'),
            'contact_email' => fake()->safeEmail(),
            'logo_path' => null,
            'hires_jobs' => true,
            'hires_ojt' => true,
            'open_to_moa' => fake()->boolean(),
            'accepted_courses' => ['Computer Science', 'Information Technology', 'Business Administration'],
            'is_verified' => true,
            'verified_at' => now(),
        ];
    }
}
