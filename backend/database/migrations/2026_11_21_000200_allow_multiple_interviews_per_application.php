<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interviews', function (Blueprint $table): void {
            $table->index(['application_id', 'status']);
        });

        Schema::table('interviews', function (Blueprint $table): void {
            $table->dropUnique(['application_id']);
        });
    }

    public function down(): void
    {
        Schema::table('interviews', function (Blueprint $table): void {
            $table->unique('application_id');
        });

        Schema::table('interviews', function (Blueprint $table): void {
            $table->dropIndex(['application_id', 'status']);
        });
    }
};
