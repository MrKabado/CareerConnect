<?php

namespace Database\Factories;

use App\Models\CompanyVerification;
use App\Models\VerificationDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VerificationDocument>
 */
class VerificationDocumentFactory extends Factory
{
    protected $model = VerificationDocument::class;

    public function definition(): array
    {
        return [
            'company_verification_id' => CompanyVerification::factory(),
            'type' => fake()->randomElement(['business_registration', 'business_permit', 'supporting']),
            'file_path' => 'company-verifications/'.fake()->uuid().'.pdf',
            'original_filename' => fake()->word().'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 250000,
        ];
    }
}
