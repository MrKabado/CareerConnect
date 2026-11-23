<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_listings', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable()->change();
            $table->string('title')->nullable()->change();
            $table->text('description')->nullable()->change();
            $table->text('responsibilities')->nullable()->change();
            $table->text('requirements')->nullable()->change();
            $table->string('location')->nullable()->change();
            $table->enum('work_setup', ['onsite', 'hybrid', 'remote'])->nullable()->change();
        });

        Schema::table('ojt_listing_details', function (Blueprint $table): void {
            $table->unsignedSmallInteger('duration_hours')->nullable()->change();
            $table->enum('allowance_type', ['paid', 'unpaid'])->nullable()->change();
            $table->unsignedSmallInteger('slots')->nullable()->change();
        });
    }

    public function down(): void
    {
        $incompleteListingsExist = DB::table('job_listings')
            ->whereNull('category_id')
            ->orWhereNull('title')
            ->orWhereNull('description')
            ->orWhereNull('responsibilities')
            ->orWhereNull('requirements')
            ->orWhereNull('location')
            ->orWhereNull('work_setup')
            ->exists();
        $incompleteOjtDetailsExist = DB::table('ojt_listing_details')
            ->whereNull('duration_hours')
            ->orWhereNull('allowance_type')
            ->orWhereNull('slots')
            ->exists();

        if ($incompleteListingsExist || $incompleteOjtDetailsExist) {
            throw new RuntimeException('Cannot restore required listing fields while incomplete drafts exist.');
        }

        Schema::table('job_listings', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable(false)->change();
            $table->string('title')->nullable(false)->change();
            $table->text('description')->nullable(false)->change();
            $table->text('responsibilities')->nullable(false)->change();
            $table->text('requirements')->nullable(false)->change();
            $table->string('location')->nullable(false)->change();
            $table->enum('work_setup', ['onsite', 'hybrid', 'remote'])->nullable(false)->change();
        });

        Schema::table('ojt_listing_details', function (Blueprint $table): void {
            $table->unsignedSmallInteger('duration_hours')->nullable(false)->change();
            $table->enum('allowance_type', ['paid', 'unpaid'])->nullable(false)->change();
            $table->unsignedSmallInteger('slots')->nullable(false)->change();
        });
    }
};
