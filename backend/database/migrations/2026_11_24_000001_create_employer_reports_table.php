<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employer_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 40);
            $table->text('details');
            $table->string('status', 20)->default('pending');
            $table->string('decision', 30)->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['employer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employer_reports');
    }
};
