<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('job_listings', 'applicant_limit')) {
            Schema::table('job_listings', function (Blueprint $table): void {
                $table->unsignedInteger('applicant_limit')->nullable()->after('published_at');
            });
        }
        if (! Schema::hasColumn('job_listings', 'expires_at')) {
            Schema::table('job_listings', function (Blueprint $table): void {
                $table->timestamp('expires_at')->nullable()->after('applicant_limit');
            });
        }
        if (! Schema::hasColumn('job_listings', 'custom_category_name')) {
            Schema::table('job_listings', function (Blueprint $table): void {
                $table->string('custom_category_name')->nullable()->after('category_id');
            });
        }
        if (! Schema::hasColumn('categories', 'is_custom')) {
            Schema::table('categories', function (Blueprint $table): void {
                $table->boolean('is_custom')->default(false)->after('is_active');
            });
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE job_listings MODIFY status ENUM('draft','open','closed','full','expired','deactivated') NOT NULL DEFAULT 'draft'");
        } elseif (DB::getDriverName() === 'sqlite') {
            Schema::table('job_listings', function (Blueprint $table): void {
                $table->string('status', 20)->default('draft')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE job_listings MODIFY status ENUM('draft','open','closed','deactivated') NOT NULL DEFAULT 'draft'");
        }
        if (Schema::hasColumn('job_listings', 'applicant_limit')
            || Schema::hasColumn('job_listings', 'expires_at')
            || Schema::hasColumn('job_listings', 'custom_category_name')) {
            Schema::table('job_listings', function (Blueprint $table): void {
                $columns = [];
                foreach (['applicant_limit', 'expires_at', 'custom_category_name'] as $column) {
                    if (Schema::hasColumn('job_listings', $column)) {
                        $columns[] = $column;
                    }
                }
                $table->dropColumn($columns);
            });
        }
        if (Schema::hasColumn('categories', 'is_custom')) {
            Schema::table('categories', function (Blueprint $table): void {
                $table->dropColumn('is_custom');
            });
        }
    }
};
