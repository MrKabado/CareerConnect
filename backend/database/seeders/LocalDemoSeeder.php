<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\SavedListing;
use App\Models\User;
use App\Models\VerificationDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class LocalDemoSeeder extends Seeder
{
    private const DEMO_PDF = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";

    public function run(): void
    {
        $categories = [
            ['name' => 'Software Development', 'is_active' => true],
            ['name' => 'Business Administration', 'is_active' => true],
            ['name' => 'Marketing', 'is_active' => true],
            ['name' => 'Design', 'is_active' => true],
            ['name' => 'Finance', 'is_active' => true],
            ['name' => 'Healthcare', 'is_active' => true],
        ];

        $categoryRecords = [];
        foreach ($categories as $category) {
            $categoryRecords[] = Category::updateOrCreate(
                ['name' => $category['name']],
                $category,
            );
        }

        $adminPassword = env('ADMIN_SEED_PASSWORD', 'Password123?');
        $admin = User::updateOrCreate(
            ['email' => env('ADMIN_SEED_EMAIL', 'admin@gmail.com')],
            [
                'name' => env('ADMIN_SEED_NAME', 'System Administrator'),
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'account_status' => 'active',
                'email_verified_at' => now(),
            ],
        );

        $employers = [
            [
                'name' => 'Aster Labs',
                'email' => 'employer1@careerconnect.test',
                'company_name' => 'Aster Labs',
                'contact_name' => 'Maria Santos',
                'city' => 'Metro Manila',
            ],
            [
                'name' => 'North Harbor Inc.',
                'email' => 'employer2@careerconnect.test',
                'company_name' => 'North Harbor Inc.',
                'contact_name' => 'Daniel Cruz',
                'city' => 'Cebu City',
            ],
        ];

        $createdEmployers = [];
        foreach ($employers as $employer) {
            $isPendingVerification = count($createdEmployers) === 1;
            $user = User::updateOrCreate(
                ['email' => $employer['email']],
                [
                    'name' => $employer['name'],
                    'password' => Hash::make('Password123!'),
                    'role' => 'employer',
                    'account_status' => 'active',
                    'email_verified_at' => now(),
                ],
            );

            $company = Company::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'category_id' => $categoryRecords[0]->id,
                    'name' => $employer['company_name'],
                    'company_size' => '11-50',
                    'address' => '123 '.str($employer['company_name'])->slug().' Street',
                    'city' => $employer['city'],
                    'website' => 'https://example.com',
                    'description' => 'Local business focused on digital operations.',
                    'contact_name' => $employer['contact_name'],
                    'contact_phone' => '+639170000001',
                    'contact_email' => $user->email,
                    'logo_path' => null,
                    'hires_jobs' => true,
                    'hires_ojt' => true,
                    'open_to_moa' => true,
                    'accepted_courses' => ['Computer Science', 'Information Technology'],
                    'is_verified' => ! $isPendingVerification,
                    'verified_at' => $isPendingVerification ? null : now(),
                ],
            );

            $verification = CompanyVerification::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'status' => $isPendingVerification ? 'pending' : 'verified',
                    'authorization_confirmed_at' => now(),
                    'submitted_at' => now()->subDay(),
                    'reviewed_by' => $isPendingVerification ? null : $admin->id,
                    'reviewed_at' => $isPendingVerification ? null : now(),
                    'rejection_reason' => null,
                    'rejection_note' => null,
                ],
            );

            $registrationPath = 'company-verifications/'.$company->id.'/business_registration.pdf';
            VerificationDocument::firstOrCreate(
                [
                    'company_verification_id' => $verification->id,
                    'type' => 'business_registration',
                ],
                [
                    'file_path' => $registrationPath,
                    'original_filename' => 'registration.pdf',
                    'mime_type' => 'application/pdf',
                    'size_bytes' => strlen(self::DEMO_PDF),
                ],
            );
            $this->storeDemoPdf($registrationPath);

            $permitPath = 'company-verifications/'.$company->id.'/business_permit.pdf';
            VerificationDocument::firstOrCreate(
                [
                    'company_verification_id' => $verification->id,
                    'type' => 'business_permit',
                ],
                [
                    'file_path' => $permitPath,
                    'original_filename' => 'permit.pdf',
                    'mime_type' => 'application/pdf',
                    'size_bytes' => strlen(self::DEMO_PDF),
                ],
            );
            $this->storeDemoPdf($permitPath);

            $createdEmployers[] = $company;
        }

        $applicants = [
            ['name' => 'Alicia Meneses', 'email' => 'applicant1@careerconnect.test'],
            ['name' => 'Ben Martinez', 'email' => 'applicant2@careerconnect.test'],
            ['name' => 'Carla Ramos', 'email' => 'applicant3@careerconnect.test'],
        ];

        $applicantUsers = [];
        foreach ($applicants as $applicant) {
            $applicantIndex = count($applicantUsers);
            $user = User::updateOrCreate(
                ['email' => $applicant['email']],
                [
                    'name' => $applicant['name'],
                    'password' => Hash::make('Password123!'),
                    'role' => 'applicant',
                    'account_status' => 'active',
                    'email_verified_at' => now(),
                ],
            );
            $identityStatus = match ($applicantIndex) {
                0 => 'verified',
                1 => 'pending',
                default => 'rejected',
            };
            $identityPath = 'applicant-verifications/'.$user->id.'/identity-document.pdf';
            IdentityVerification::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'document_path' => $identityPath,
                    'status' => $identityStatus,
                    'rejection_reason' => $identityStatus === 'rejected' ? 'Please submit a clearer identity document.' : null,
                    'reviewed_by' => $identityStatus === 'pending' ? null : $admin->id,
                    'reviewed_at' => $identityStatus === 'pending' ? null : now(),
                ],
            );
            $this->storeDemoPdf($identityPath);

            $profile = ApplicantProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'phone' => '+63917000000'.(count($applicantUsers) + 1),
                    'city' => 'Quezon City',
                    'profile_photo_path' => null,
                    'looking_for_jobs' => true,
                    'looking_for_ojt' => true,
                    'experience_level' => '1_3_years',
                    'desired_titles' => ['Frontend Developer', 'UI Engineer'],
                    'employment_types' => ['full_time', 'contract'],
                    'work_setups' => ['hybrid', 'remote'],
                    'preferred_locations' => ['Metro Manila', 'Cebu'],
                    'salary_min' => 25000,
                    'salary_max' => 60000,
                    'onboarding_step' => 'review',
                    'onboarding_completed_at' => now(),
                ],
            );

            $profile->categories()->sync($categoryRecords[0]->id);
            $applicantUsers[] = $user;
        }

        $allListings = JobListing::query()->pluck('id');
        foreach ($applicantUsers as $applicant) {
            $resumePath = 'resumes/'.$applicant->id.'/resume.pdf';
            $resume = Resume::updateOrCreate(
                ['applicant_id' => $applicant->id],
                [
                    'storage_path' => $resumePath,
                    'original_filename' => 'resume-'.$applicant->id.'.pdf',
                    'mime_type' => 'application/pdf',
                    'file_size' => strlen(self::DEMO_PDF),
                    'is_current' => true,
                ],
            );
            $this->storeDemoPdf($resumePath);

            $listingId = $allListings->first();
            if ($listingId === null) {
                continue;
            }

            $application = Application::updateOrCreate(
                [
                    'applicant_id' => $applicant->id,
                    'job_listing_id' => $listingId,
                ],
                [
                    'resume_id' => $resume->id,
                    'status' => 'pending',
                    'resume_original_filename' => $resume->original_filename,
                    'resume_mime_type' => $resume->mime_type,
                    'resume_file_size' => $resume->file_size,
                    'cover_letter' => 'Interested in this opportunity and eager to contribute.',
                    'applied_at' => now(),
                ],
            );

            SavedListing::firstOrCreate(
                [
                    'user_id' => $applicant->id,
                    'job_listing_id' => $listingId,
                ],
            );

            ActivityLog::firstOrCreate(
                [
                    'user_id' => $applicant->id,
                    'actor_id' => $admin->id,
                    'action' => 'application_viewed',
                    'subject_type' => Application::class,
                    'subject_id' => $application->id,
                ],
                ['payload' => ['message' => 'Seed application was created for demonstration.']],
            );
        }
    }

    private function storeDemoPdf(string $path): void
    {
        if (! Storage::disk('local')->put($path, self::DEMO_PDF)) {
            throw new RuntimeException('Failed to store a local demo document.');
        }
    }
}
