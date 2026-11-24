<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyVerification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyVerification>
 */
class CompanyVerificationFactory extends Factory
{
    protected $model = CompanyVerification::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'status' => 'pending',
            'authorization_confirmed_at' => now(),
            'submitted_at' => now(),
            'reviewed_by' => null,
            'reviewed_at' => null,
            'rejection_reason' => null,
            'rejection_note' => null,
        ];
    }
}
