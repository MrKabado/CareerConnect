<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $this->addLocationFields($table, true, false);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $this->addLocationFields($table, false, false);
        });

        Schema::table('job_listings', function (Blueprint $table): void {
            $this->addLocationFields($table, true, true);
        });

        Schema::table('interviews', function (Blueprint $table): void {
            $this->addLocationFields($table, true, true);
        });
    }

    public function down(): void
    {
        Schema::table('applicant_profiles', function (Blueprint $table): void {
            $this->dropLocationFields($table, true, false);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $this->dropLocationFields($table, false, false);
        });

        Schema::table('job_listings', function (Blueprint $table): void {
            $this->dropLocationFields($table, true, true);
        });

        Schema::table('interviews', function (Blueprint $table): void {
            $this->dropLocationFields($table, true, true);
        });
    }

    private function addLocationFields(Blueprint $table, bool $streetAddress, bool $cityName): void
    {
        $table->string('region_code', 10)->nullable();
        $table->string('region_name', 100)->nullable();
        $table->string('province_code', 10)->nullable();
        $table->string('province_name', 100)->nullable();
        $table->string('city_municipality_code', 10)->nullable();
        if ($cityName) {
            $table->string('city_municipality_name', 150)->nullable();
        }
        $table->string('barangay_code', 10)->nullable();
        $table->string('barangay_name', 150)->nullable();
        if ($streetAddress) {
            $table->string('street_address')->nullable();
        }
        $table->string('zip_code', 4)->nullable();
    }

    private function dropLocationFields(Blueprint $table, bool $streetAddress, bool $cityName): void
    {
        $columns = [
            'region_code',
            'region_name',
            'province_code',
            'province_name',
            'city_municipality_code',
            'barangay_code',
            'barangay_name',
            'zip_code',
        ];
        if ($streetAddress) {
            $columns[] = 'street_address';
        }
        if ($cityName) {
            $columns[] = 'city_municipality_name';
        }

        $table->dropColumn($columns);
    }
};
