<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applicant_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('phone', 30)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('profile_photo_path')->nullable();
            $table->boolean('looking_for_jobs')->default(true);
            $table->boolean('looking_for_ojt')->default(false);
            $table->string('experience_level', 32)->nullable();
            $table->json('desired_titles')->nullable();
            $table->json('employment_types')->nullable();
            $table->json('work_setups')->nullable();
            $table->json('preferred_locations')->nullable();
            $table->unsignedInteger('salary_min')->nullable();
            $table->unsignedInteger('salary_max')->nullable();
            $table->string('onboarding_step', 20)->nullable();
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('skills', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 60);
            $table->string('normalized_name', 60)->unique();
            $table->timestamps();
        });

        Schema::create('applicant_profile_category', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['applicant_profile_id', 'category_id']);
        });

        Schema::create('applicant_profile_skill', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['applicant_profile_id', 'skill_id']);
        });

        Schema::create('applicant_ojt_details', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_profile_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('school', 255)->nullable();
            $table->string('course', 255)->nullable();
            $table->unsignedTinyInteger('year_level')->nullable();
            $table->unsignedSmallInteger('required_hours')->nullable();
            $table->date('preferred_start_date')->nullable();
            $table->string('allowance_preference', 20)->default('no_preference');
            $table->boolean('requires_moa')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applicant_ojt_details');
        Schema::dropIfExists('applicant_profile_skill');
        Schema::dropIfExists('applicant_profile_category');
        Schema::dropIfExists('skills');
        Schema::dropIfExists('applicant_profiles');
    }
};
