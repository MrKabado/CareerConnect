<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_id')->constrained('users')->restrictOnDelete();
            $table->string('storage_path')->unique();
            $table->string('original_filename');
            $table->string('mime_type', 127);
            $table->unsignedInteger('file_size');
            $table->boolean('is_current')->default(true);
            $table->timestamps();
            $table->index(['applicant_id', 'is_current']);
        });

        Schema::create('applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('job_listing_id')->constrained()->restrictOnDelete();
            $table->foreignId('resume_id')->constrained('resumes')->restrictOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('resume_original_filename');
            $table->string('resume_mime_type', 127);
            $table->unsignedInteger('resume_file_size');
            $table->text('cover_letter')->nullable();
            $table->timestamp('applied_at');
            $table->timestamps();
            $table->unique(['applicant_id', 'job_listing_id']);
            $table->index(['job_listing_id', 'status', 'applied_at']);
            $table->index(['applicant_id', 'applied_at']);
        });

        Schema::create('application_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('previous_status', 20)->nullable();
            $table->string('new_status', 20);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('public_reason')->nullable();
            $table->text('internal_reason')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_status_histories');
        Schema::dropIfExists('applications');
        Schema::dropIfExists('resumes');
    }
};
