<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applicant_ojt_details', function (Blueprint $table): void {
            $table->string('allowance_preference', 20)->nullable()->default(null)->change();
            $table->boolean('requires_moa')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        DB::table('applicant_ojt_details')
            ->whereNull('requires_moa')
            ->update(['requires_moa' => false]);
        DB::table('applicant_ojt_details')
            ->whereNull('allowance_preference')
            ->update(['allowance_preference' => 'no_preference']);

        Schema::table('applicant_ojt_details', function (Blueprint $table): void {
            $table->string('allowance_preference', 20)->default('no_preference')->nullable(false)->change();
            $table->boolean('requires_moa')->default(false)->nullable(false)->change();
        });
    }
};
