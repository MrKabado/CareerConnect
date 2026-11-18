<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Software Development',
                'Business Administration',
                'Marketing',
                'Design',
                'Finance',
                'Healthcare',
                'Operations',
                'Human Resources',
            ]),
            'is_active' => true,
        ];
    }
}
