<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('companies', 'country')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('country', 2)->nullable()->after('address');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('companies', 'country')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropColumn('country');
            });
        }
    }
};
