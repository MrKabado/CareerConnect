<?php

namespace Database\Factories;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    protected $model = ActivityLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->applicant(),
            'actor_id' => User::factory()->admin(),
            'action' => fake()->randomElement(['login', 'profile_updated', 'application_reviewed', 'listing_deactivated']),
            'subject_type' => User::class,
            'subject_id' => function () {
                return User::factory()->create()->id;
            },
            'payload' => [
                'message' => fake()->sentence(),
            ],
        ];
    }
}
