<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('applicant_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('employer_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('scheduled_at');
            $table->timestamp('end_at')->nullable();
            $table->string('timezone', 64)->default('UTC');
            $table->string('mode', 20);
            $table->string('location')->nullable();
            $table->string('meeting_url')->nullable();
            $table->text('meeting_instructions')->nullable();
            $table->text('internal_notes')->nullable();
            $table->text('applicant_notes')->nullable();
            $table->string('status', 20)->default('scheduled');
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
            $table->index(['applicant_id', 'status', 'scheduled_at']);
            $table->index(['employer_id', 'status', 'scheduled_at']);
        });

        Schema::create('interview_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->string('event_type', 20);
            $table->json('previous_schedule')->nullable();
            $table->json('new_schedule')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['interview_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_histories');
        Schema::dropIfExists('interviews');
    }
};
