<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $table->string('profile_photo_disk')->default('public');
            $table->string('profile_photo_asset_id')->nullable()->unique();
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->string('logo_disk')->default('public');
            $table->string('logo_asset_id')->nullable()->unique();
        });

        Schema::table('verification_documents', function (Blueprint $table): void {
            $table->string('storage_disk')->default('local');
            $table->string('cloudinary_asset_id')->nullable()->unique();
        });

        Schema::table('identity_verifications', function (Blueprint $table): void {
            $table->string('storage_disk')->default('local');
            $table->string('cloudinary_asset_id')->nullable()->unique();
            $table->string('document_mime_type', 127)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('identity_verifications', function (Blueprint $table): void {
            $table->dropUnique(['cloudinary_asset_id']);
            $table->dropColumn(['storage_disk', 'cloudinary_asset_id', 'document_mime_type']);
        });

        Schema::table('verification_documents', function (Blueprint $table): void {
            $table->dropUnique(['cloudinary_asset_id']);
            $table->dropColumn(['storage_disk', 'cloudinary_asset_id']);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->dropUnique(['logo_asset_id']);
            $table->dropColumn(['logo_disk', 'logo_asset_id']);
        });

        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $table->dropUnique(['profile_photo_asset_id']);
            $table->dropColumn(['profile_photo_disk', 'profile_photo_asset_id']);
        });
    }
};
