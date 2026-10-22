<?php

use App\Mail\OtpCodeMail;
use App\Models\IdentityVerification;
use App\Models\OtpCode;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

function fakeIdentityPdf(): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        'identity.pdf',
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    );
}

it('registers applicant and employer through role-specific endpoints', function (): void {
    Mail::fake();

    $this->postJson('/api/register/applicant', [
        'name' => 'Applicant One',
        'email' => 'applicant-one@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'employer',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('role');

    $this->postJson('/api/register/applicant', [
        'name' => 'Applicant One',
        'email' => 'applicant-one@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertCreated()
        ->assertJsonPath('user.role', 'applicant');

    $this->postJson('/api/register/employer', [
        'name' => 'Employer One',
        'email' => 'employer-one@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertCreated()
        ->assertJsonPath('user.role', 'employer');

    Mail::assertSent(OtpCodeMail::class, 2);
});

it('rate limits email verification resends', function (): void {
    Mail::fake();

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/otp/request', [
            'email' => 'unknown@example.com',
            'purpose' => 'email_verification',
        ])->assertOk();
    }

    $this->postJson('/api/otp/request', [
        'email' => 'unknown@example.com',
        'purpose' => 'email_verification',
    ])->assertStatus(429);

    Mail::assertNothingSent();
});

it('seeds an administrator only from configured credentials', function (): void {
    Config::set('careerconnect.admin_seed', [
        'name' => 'Seeded Admin',
        'email' => 'seeded-admin@example.com',
        'password' => 'SecretAdmin123!',
    ]);

    app(AdminUserSeeder::class)->run();

    $admin = User::where('email', 'seeded-admin@example.com')->firstOrFail();

    expect($admin->role)->toBe('admin')
        ->and($admin->email_verified_at)->not->toBeNull()
        ->and(Hash::check('SecretAdmin123!', $admin->password))->toBeTrue();
});

it('allows applicants to submit a private identity document once and view only its status', function (): void {
    Storage::fake('local');

    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = $applicant->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson('/api/applicant/identity-verification')
        ->assertOk()
        ->assertJsonPath('verification', null);

    $this->withToken($token)->postJson('/api/applicant/identity-verification', [
        'document' => fakeIdentityPdf(),
    ])->assertCreated()
        ->assertJsonPath('status', 'pending');

    $verification = IdentityVerification::where('user_id', $applicant->id)->firstOrFail();

    Storage::disk('local')->assertExists($verification->document_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/applicant/identity-verification')
        ->assertOk()
        ->assertJsonPath('verification.status', 'pending')
        ->assertJsonMissingPath('verification.document_path');

    $this->withToken($token)->postJson('/api/applicant/identity-verification', [
        'document' => fakeIdentityPdf(),
    ])->assertStatus(409);

    $this->withToken($token)->postJson('/api/applicant/identity-verification', [
        'document' => UploadedFile::fake()->create('unsafe.exe', 10, 'application/x-msdownload'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('document');
});

it('lets admins review identity submissions and applicants resubmit after rejection', function (): void {
    Storage::fake('local');

    $applicant = User::factory()->create(['role' => 'applicant']);
    $admin = User::factory()->create(['role' => 'admin']);
    $applicantToken = $applicant->createToken('applicant')->plainTextToken;
    $adminToken = $admin->createToken('admin')->plainTextToken;

    $this->withToken($applicantToken)->postJson('/api/applicant/identity-verification', [
        'document' => fakeIdentityPdf(),
    ])->assertCreated();

    $verification = IdentityVerification::where('user_id', $applicant->id)->firstOrFail();
    $firstDocument = $verification->document_path;

    $this->withToken($applicantToken)->getJson('/api/admin/identity-verifications')
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)->getJson('/api/admin/identity-verifications')
        ->assertOk()
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonMissingPath('data.0.document_path');

    $this->withToken($adminToken)->postJson("/api/admin/identity-verifications/{$verification->id}/review", [
        'status' => 'rejected',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('rejection_reason');

    $this->withToken($adminToken)->postJson("/api/admin/identity-verifications/{$verification->id}/review", [
        'status' => 'rejected',
        'rejection_reason' => 'The image is unreadable.',
    ])->assertOk()
        ->assertJsonPath('status', 'rejected');

    expect($verification->refresh()->reviewed_by)->toBe($admin->id)
        ->and($verification->reviewed_at)->not->toBeNull();

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->postJson('/api/applicant/identity-verification', [
        'document' => fakeIdentityPdf(),
    ])->assertCreated();

    $verification->refresh();
    Storage::disk('local')->assertMissing($firstDocument);
    Storage::disk('local')->assertExists($verification->document_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)->postJson("/api/admin/identity-verifications/{$verification->id}/review", [
        'status' => 'verified',
    ])->assertOk();

    expect($verification->refresh()->status)->toBe('verified')
        ->and($verification->reviewed_by)->toBe($admin->id)
        ->and($verification->expires_at)->not->toBeNull();

    $this->withToken($adminToken)->postJson("/api/admin/identity-verifications/{$verification->id}/review", [
        'status' => 'rejected',
        'rejection_reason' => 'A second review must not overwrite the first.',
    ])->assertStatus(409);

    $this->app['auth']->forgetGuards();
    $this->withToken($applicantToken)->getJson("/api/admin/identity-verifications/{$verification->id}/document")
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)->get("/api/admin/identity-verifications/{$verification->id}/document")
        ->assertOk()
        ->assertHeader('content-disposition');
});

it('allows admins to activate and deactivate accounts without changing roles', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $target = User::factory()->create(['role' => 'employer']);
    $adminToken = $admin->createToken('admin')->plainTextToken;
    $targetToken = $target->createToken('target')->plainTextToken;

    $this->withToken($targetToken)->getJson('/api/admin/users')
        ->assertForbidden();

    $this->app['auth']->forgetGuards();
    $this->withToken($adminToken)->patchJson("/api/admin/users/{$target->id}/status", [
        'account_status' => 'deactivated',
        'role' => 'admin',
    ])->assertOk()
        ->assertJsonPath('user.account_status', 'deactivated');

    expect($target->refresh()->role)->toBe('employer')
        ->and($target->account_status)->toBe('deactivated');

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $target->id,
        'name' => 'target',
    ]);

    $this->withToken($adminToken)->patchJson("/api/admin/users/{$target->id}/status", [
        'account_status' => 'active',
    ])->assertOk()
        ->assertJsonPath('user.account_status', 'active');
});

it('blocks protected routes for deactivated accounts even if a token remains', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('still-valid')->plainTextToken;

    $user->forceFill(['account_status' => 'deactivated'])->save();

    $this->withToken($token)->getJson('/api/user')
        ->assertForbidden()
        ->assertJsonPath('code', 'account_deactivated');
});

it('enforces the application eligibility middleware on direct API requests', function (): void {
    Route::middleware(['auth:sanctum', 'applicant.eligible'])
        ->post('/__test/application', fn () => response()->json(['submitted' => true]));

    $this->postJson('/__test/application')->assertUnauthorized();

    $applicant = User::factory()->create(['role' => 'applicant']);
    $token = $applicant->createToken('applicant')->plainTextToken;

    $this->withToken($token)->postJson('/__test/application')
        ->assertForbidden()
        ->assertJsonPath('code', 'application_ineligible');

    IdentityVerification::create([
        'user_id' => $applicant->id,
        'document_path' => null,
        'status' => 'verified',
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/__test/application')
        ->assertOk()
        ->assertJsonPath('submitted', true);

    $employer = User::factory()->create(['role' => 'employer']);
    $employerToken = $employer->createToken('employer')->plainTextToken;

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->postJson('/__test/application')
        ->assertForbidden()
        ->assertJsonPath('code', 'application_ineligible');
});

it('allows an administrator to trigger an eligible password reset without disclosing codes', function (): void {
    Mail::fake();

    $admin = User::factory()->create(['role' => 'admin']);
    $target = User::factory()->create();
    $adminToken = $admin->createToken('admin')->plainTextToken;

    $this->withToken($adminToken)->postJson("/api/admin/users/{$target->id}/password-reset")
        ->assertOk()
        ->assertJsonMissingPath('code');

    Mail::assertSent(OtpCodeMail::class);
    expect(OtpCode::where('email', $target->email)
        ->where('purpose', 'password_reset')
        ->exists())->toBeTrue();
});

it('rejects expired password reset codes and does not reuse a consumed code', function (): void {
    $user = User::factory()->create();
    $code = '456789';

    OtpCode::create([
        'email' => $user->email,
        'purpose' => 'password_reset',
        'code_hash' => Hash::make($code),
        'expires_at' => now()->subSecond(),
    ]);

    $payload = [
        'email' => $user->email,
        'code' => $code,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ];

    $this->postJson('/api/reset-password', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    OtpCode::where('email', $user->email)
        ->where('purpose', 'password_reset')
        ->update(['expires_at' => now()->addMinutes(10)]);

    $this->postJson('/api/reset-password', $payload)->assertOk();
    $this->postJson('/api/reset-password', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');
});

it('prunes expired identity documents while retaining documents before their deadline', function (): void {
    Storage::fake('local');

    $expiredPath = fakeIdentityPdf()->store('identity-verification', 'local');
    $retainedPath = fakeIdentityPdf()->store('identity-verification', 'local');
    $expired = IdentityVerification::create([
        'user_id' => User::factory()->create()->id,
        'document_path' => $expiredPath,
        'status' => 'verified',
        'expires_at' => now()->subSecond(),
    ]);
    $retained = IdentityVerification::create([
        'user_id' => User::factory()->create()->id,
        'document_path' => $retainedPath,
        'status' => 'verified',
        'expires_at' => now()->addDay(),
    ]);

    Artisan::call('app:prune-identity-documents');

    Storage::disk('local')->assertMissing($expiredPath);
    Storage::disk('local')->assertExists($retainedPath);
    expect($expired->refresh()->document_path)->toBeNull()
        ->and($retained->refresh()->document_path)->toBe($retainedPath);
});
