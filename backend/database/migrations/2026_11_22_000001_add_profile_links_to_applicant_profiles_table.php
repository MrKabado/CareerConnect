<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            if (! Schema::hasColumn('applicant_profiles', 'profile_links')) {
                $table->json('profile_links')->nullable()->after('city');
            }
        });
    }

    public function down(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            if (Schema::hasColumn('applicant_profiles', 'profile_links')) {
                $table->dropColumn('profile_links');
            }
        });
    }
};
