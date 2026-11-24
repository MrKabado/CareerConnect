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
            if (! Schema::hasColumn('job_listings', 'approval_status')) {
                $table->string('approval_status', 20)->default('not_required')->after('status');
            }
            if (! Schema::hasColumn('job_listings', 'approval_reason')) {
                $table->text('approval_reason')->nullable()->after('approval_status');
            }
            if (! Schema::hasColumn('job_listings', 'approval_reviewed_at')) {
                $table->timestamp('approval_reviewed_at')->nullable()->after('approval_reason');
            }
        });

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('job_listing_admin_actions', function (Blueprint $table): void {
                $table->string('action', 30)->change();
            });
        } elseif (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE job_listing_admin_actions MODIFY action ENUM('deactivated','restored','approved','rejected') NOT NULL");
        }
    }

    public function down(): void
    {
        Schema::table('job_listings', function (Blueprint $table): void {
            $columns = [];
            foreach (['approval_status', 'approval_reason', 'approval_reviewed_at'] as $column) {
                if (Schema::hasColumn('job_listings', $column)) {
                    $columns[] = $column;
                }
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE job_listing_admin_actions MODIFY action ENUM('deactivated','restored') NOT NULL");
        }
    }
};
