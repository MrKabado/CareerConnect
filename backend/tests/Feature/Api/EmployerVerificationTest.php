<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class)->group('api');

it('allows employers to manage their company profile, logo, and verification status', function (): void {
    Storage::fake('local');
    Storage::fake('public');

    $employer = User::factory()->create(['role' => 'employer']);
    $token = $employer->createToken('test')->plainTextToken;
    $category = Category::create(['name' => 'Information Technology', 'is_active' => true]);

    $this->withToken($token)->putJson('/api/employer/company', [
        'name' => 'Acme Tech',
        'category_id' => $category->id,
        'company_size' => '11-50',
        'address' => '123 Main St',
        'city' => 'Cebu City',
        'website' => 'https://acmetech.test',
        'description' => 'A growing software company',
        'contact_name' => 'Jane Doe',
        'contact_phone' => '+639171234567',
        'contact_email' => 'jane@acmetech.test',
        'hires_jobs' => true,
        'hires_ojt' => true,
        'open_to_moa' => true,
        'accepted_courses' => ['BSIT', 'BSCS'],
    ])->assertOk();

    $company = Company::query()->where('user_id', $employer->id)->firstOrFail();
    expect($company->is_verified)->toBeFalse();

    $this->withToken($token)->postJson('/api/employer/company/logo', [
        'logo' => UploadedFile::fake()->create('logo.png', 120, 'image/png'),
    ])->assertOk();

    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('registration.pdf', 2048, 'application/pdf'),
    ])->assertCreated();

    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_permit',
        'document' => UploadedFile::fake()->create('permit.pdf', 2048, 'application/pdf'),
    ])->assertCreated();

    $this->withToken($token)->postJson('/api/employer/verification/submit')->assertOk();

    $verification = CompanyVerification::query()->where('company_id', $company->id)->firstOrFail();
    expect($verification->status)->toBe('pending')
        ->and($verification->submitted_at)->not->toBeNull();

    $this->withToken($token)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'pending');
});

it('lets admin review company verification submissions and reject them with reasons', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::create(['name' => 'Healthcare', 'is_active' => true]);

    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'CarePlus',
        'category_id' => $category->id,
        'company_size' => '51-200',
        'address' => '456 Wellness St',
        'city' => 'Davao City',
        'website' => 'https://careplus.test',
        'description' => 'Healthcare services',
        'contact_name' => 'Mia',
        'contact_phone' => '+639991122334',
        'contact_email' => 'mia@careplus.test',
        'hires_jobs' => true,
        'hires_ojt' => false,
    ]);

    $verification = CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'pending',
        'authorization_confirmed_at' => now(),
        'submitted_at' => now(),
    ]);

    $employerToken = $employer->createToken('employer')->plainTextToken;
    $adminToken = $admin->createToken('admin')->plainTextToken;

    $this->withToken($adminToken)->postJson("/api/admin/company-verifications/{$verification->id}/review", [
        'status' => 'rejected',
        'rejection_reason' => 'expired_permit',
        'rejection_note' => 'The permit must be renewed.',
    ])->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'rejected')
        ->assertJsonPath('rejection_reason', 'expired_permit');
});
