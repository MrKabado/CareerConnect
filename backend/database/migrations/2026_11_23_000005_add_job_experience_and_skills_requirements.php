<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_listings', function (Blueprint $table): void {
            $table->json('required_skills')->nullable();
            $table->boolean('experience_required')->default(false);
            $table->unsignedTinyInteger('minimum_experience_years')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('job_listings', function (Blueprint $table): void {
            $table->dropColumn([
                'required_skills',
                'experience_required',
                'minimum_experience_years',
            ]);
        });
    }
};
