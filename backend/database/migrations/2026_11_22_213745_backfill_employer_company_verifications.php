<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $employerIds = DB::table('users')
            ->where('role', 'employer')
            ->pluck('id');

        foreach ($employerIds as $employerId) {
            $companyId = DB::table('companies')
                ->where('user_id', $employerId)
                ->value('id');

            if ($companyId === null) {
                $employer = DB::table('users')
                    ->where('id', $employerId)
                    ->first(['name', 'email']);

                $companyId = DB::table('companies')->insertGetId([
                    'user_id' => $employerId,
                    'name' => 'Pending Company Profile',
                    'contact_name' => $employer->name,
                    'contact_email' => $employer->email,
                    'logo_disk' => 'public',
                    'hires_jobs' => false,
                    'hires_ojt' => false,
                    'open_to_moa' => false,
                    'is_verified' => false,
                    'verified_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $verificationExists = DB::table('company_verifications')
                ->where('company_id', $companyId)
                ->exists();

            if (! $verificationExists) {
                $isVerified = (bool) DB::table('companies')
                    ->where('id', $companyId)
                    ->value('is_verified');

                DB::table('company_verifications')->insert([
                    'company_id' => $companyId,
                    'status' => $isVerified ? 'verified' : 'incomplete',
                    'authorization_confirmed_at' => null,
                    'submitted_at' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                    'rejection_reason' => null,
                    'rejection_note' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration only restores missing verification relationships.
        // It intentionally leaves existing and backfilled records intact.
    }
};
