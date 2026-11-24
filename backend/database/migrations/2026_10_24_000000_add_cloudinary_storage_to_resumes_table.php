<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->string('storage_disk')->default('local');
            $table->string('cloudinary_asset_id')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropUnique(['cloudinary_asset_id']);
            $table->dropColumn(['storage_disk', 'cloudinary_asset_id']);
        });
    }
};
