<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('recommendation_reviews');
    }

    public function down(): void
    {
        Schema::create('recommendation_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('applicant_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_listing_id')->nullable()->constrained('job_listings')->cascadeOnDelete();
            $table->string('target_type', 20);
            $table->enum('status', ['flagged', 'dismissed']);
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->index(['target_type', 'status']);
        });
    }
};
