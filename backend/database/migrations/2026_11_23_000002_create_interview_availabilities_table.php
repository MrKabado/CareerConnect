<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interviews', function (Blueprint $table): void {
            $table->timestamp('scheduled_at')->nullable()->change();
        });

        Schema::create('interview_availabilities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->date('available_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->time('break_start_time')->nullable();
            $table->time('break_end_time')->nullable();
            $table->unsignedSmallInteger('duration_minutes');
            $table->unsignedSmallInteger('buffer_minutes')->default(0);
            $table->timestamps();
            $table->unique(['interview_id', 'available_date']);
            $table->index(['available_date', 'interview_id']);
        });
    }

    public function down(): void
    {
        if (DB::table('interviews')->whereNull('scheduled_at')->exists()) {
            throw new RuntimeException('Cannot roll back interview availability while unscheduled invitations exist.');
        }

        Schema::dropIfExists('interview_availabilities');
        Schema::table('interviews', function (Blueprint $table): void {
            $table->timestamp('scheduled_at')->nullable(false)->change();
        });
    }
};
