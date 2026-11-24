<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $table->json('other_categories')->nullable();
        });

        Schema::table('applicant_ojt_details', function (Blueprint $table): void {
            $table->string('education_status', 20)->nullable();
            $table->unsignedSmallInteger('graduation_year')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('applicant_ojt_details', function (Blueprint $table): void {
            $table->dropColumn(['education_status', 'graduation_year']);
        });

        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $table->dropColumn('other_categories');
        });
    }
};
