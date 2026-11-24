<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ojt_listing_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_listing_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('duration_hours');
            $table->enum('allowance_type', ['paid', 'unpaid']);
            $table->unsignedInteger('allowance_amount')->nullable();
            $table->unsignedSmallInteger('slots');
            $table->json('accepted_courses')->nullable();
            $table->boolean('moa_accepted')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ojt_listing_details');
    }
};
