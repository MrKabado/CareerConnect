<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applicant_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('applicant_id')->constrained('users')->restrictOnDelete();
            $table->string('document_type', 30);
            $table->string('storage_disk', 30)->default('local');
            $table->string('storage_path')->unique();
            $table->string('cloudinary_asset_id')->nullable()->unique();
            $table->string('original_filename');
            $table->string('mime_type', 127);
            $table->unsignedInteger('file_size');
            $table->char('content_hash', 64);
            $table->boolean('is_current')->default(true);
            $table->timestamps();
            $table->unique(
                ['applicant_id', 'document_type', 'content_hash'],
                'app_docs_owner_type_hash_uq',
            );
            $table->index(
                ['applicant_id', 'document_type', 'is_current'],
                'app_docs_owner_type_current_idx',
            );
        });

        Schema::table('applications', function (Blueprint $table): void {
            $table->foreignId('cover_letter_document_id')
                ->nullable()
                ->constrained('applicant_documents')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('cover_letter_document_id');
        });

        Schema::dropIfExists('applicant_documents');
    }
};
