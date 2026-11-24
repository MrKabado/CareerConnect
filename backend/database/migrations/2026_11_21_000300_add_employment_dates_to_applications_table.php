<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->timestamp('hired_at')->nullable()->after('applied_at');
            $table->date('employment_ended_at')->nullable()->after('hired_at');
            $table->foreignId('employment_ended_by')->nullable()->after('employment_ended_at')->constrained('users')->nullOnDelete();
        });

        DB::table('applications')
            ->where('status', 'hired')
            ->orderBy('id')
            ->chunkById(100, function ($applications): void {
                foreach ($applications as $application) {
                    $hiredAt = DB::table('application_status_histories')
                        ->where('application_id', $application->id)
                        ->where('new_status', 'hired')
                        ->orderBy('created_at')
                        ->value('created_at');

                    if ($hiredAt !== null) {
                        DB::table('applications')
                            ->where('id', $application->id)
                            ->update(['hired_at' => $hiredAt]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->dropForeign(['employment_ended_by']);
            $table->dropColumn('employment_ended_by');
            $table->dropColumn(['employment_ended_at', 'hired_at']);
        });
    }
};
