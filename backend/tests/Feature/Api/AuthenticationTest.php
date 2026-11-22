<?php

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('registers applicant and employer accounts with email verification codes', function (string $role): void {
    Mail::fake();

    $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'new-user@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => $role,
    ])->assertCreated()
        ->assertJsonPath('user.role', $role)
        ->assertJsonPath('user.account_status', 'active')
        ->assertJsonMissingPath('token');

    $user = User::where('email', 'new-user@example.com')->firstOrFail();
    $otp = OtpCode::where('email', $user->email)
        ->where('purpose', 'email_verification')
        ->firstOrFail();
    $mail = Mail::sent(OtpCodeMail::class)->first();

    expect($mail->code)->toMatch('/^\d{6}$/');
    expect(Hash::check($mail->code, $otp->code_hash))->toBeTrue();
    expect($otp->code_hash)->not->toBe($mail->code);

    $this->postJson('/api/otp/verify', [
        'email' => $user->email,
        'code' => $mail->code,
    ])->assertOk()
        ->assertJsonPath('user.role', $role)
        ->assertJsonStructure(['token_type', 'token']);

    expect($user->refresh()->email_verified_at)->not->toBeNull();
    $this->assertDatabaseMissing('otp_codes', [
        'email' => $user->email,
        'purpose' => 'email_verification',
    ]);
})->with([
    'applicant' => 'applicant',
    'employer' => 'employer',
]);

it('defaults registration to applicant', function (): void {
    Mail::fake();

    $this->postJson('/api/register', [
        'name' => 'Default Applicant',
        'email' => 'applicant@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertCreated()
        ->assertJsonPath('user.role', 'applicant');
});

it('issues a limited resume upload token for new applicants and revokes it after verification', function (): void {
    Mail::fake();
    Storage::fake('local');
    Config::set('careerconnect.media_storage_disk', 'local');

    $registration = $this->postJson('/api/register', [
        'name' => 'Resume Applicant',
        'email' => 'resume-applicant@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'applicant',
    ])->assertCreated()
        ->assertJsonStructure(['onboarding_token'])
        ->assertJsonMissingPath('token');

    $user = User::where('email', 'resume-applicant@example.com')->firstOrFail();
    $token = $registration->json('onboarding_token');

    $this->withToken($token)->post('/api/onboarding/resume', [
        'resume' => UploadedFile::fake()->createWithContent(
            'resume.pdf',
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
        ),
    ])->assertCreated()
        ->assertJsonPath('data.original_filename', 'resume.pdf');

    $this->withToken($token)->getJson('/api/user')->assertForbidden();

    $code = Mail::sent(OtpCodeMail::class)->first()->code;
    $this->postJson('/api/otp/verify', [
        'email' => $user->email,
        'code' => $code,
    ])->assertOk()
        ->assertJsonStructure(['token']);

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $user->id,
        'name' => 'careerconnect-onboarding-resume',
    ]);
    Auth::forgetGuards();
    $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
});

it('resumes verification for an existing unverified applicant without changing account details', function (): void {
    Mail::fake();
    $user = User::factory()->unverified()->create([
        'name' => 'Original Applicant',
        'email' => 'pending-applicant@example.com',
    ]);

    $this->postJson('/api/register', [
        'name' => 'Replacement Name',
        'email' => $user->email,
        'password' => 'DifferentPassword123!',
        'password_confirmation' => 'DifferentPassword123!',
        'role' => 'applicant',
    ])->assertOk()
        ->assertJsonPath('resume_verification', true)
        ->assertJsonMissingPath('onboarding_token')
        ->assertJsonMissingPath('user');

    expect($user->refresh()->name)->toBe('Original Applicant');
    expect(Hash::check('password', $user->password))->toBeTrue();
    expect(OtpCode::where('email', $user->email)
        ->where('purpose', 'email_verification')
        ->exists())->toBeTrue();
    Mail::assertSent(OtpCodeMail::class);
});

it('rejects registration for an already verified applicant without sending a code', function (): void {
    Mail::fake();
    $user = User::factory()->create([
        'email' => 'verified-applicant@example.com',
    ]);

    $this->postJson('/api/register', [
        'name' => 'Another Name',
        'email' => $user->email,
        'password' => 'DifferentPassword123!',
        'password_confirmation' => 'DifferentPassword123!',
        'role' => 'applicant',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    expect($user->refresh()->name)->not->toBe('Another Name');
    Mail::assertNothingSent();
});

it('resumes verification for an existing unverified employer and rejects a verified employer', function (): void {
    Mail::fake();
    $employer = User::factory()->unverified()->create([
        'name' => 'Pending Employer',
        'email' => 'pending-employer@example.com',
        'role' => 'employer',
    ]);

    $this->postJson('/api/register', [
        'name' => 'Replacement Employer',
        'email' => $employer->email,
        'password' => 'DifferentPassword123!',
        'password_confirmation' => 'DifferentPassword123!',
        'role' => 'employer',
    ])->assertOk()
        ->assertJsonPath('resume_verification', true);

    Mail::assertSent(OtpCodeMail::class);

    $employer->forceFill(['email_verified_at' => now()])->save();
    Mail::fake();

    $this->postJson('/api/register', [
        'name' => 'Another Employer',
        'email' => $employer->email,
        'password' => 'DifferentPassword123!',
        'password_confirmation' => 'DifferentPassword123!',
        'role' => 'employer',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    Mail::assertNothingSent();
});

it('resends an email-verification code without exposing it in the response', function (): void {
    $user = User::factory()->unverified()->create();
    Mail::fake();

    $this->postJson('/api/otp/request', [
        'email' => $user->email,
        'purpose' => 'email_verification',
    ])->assertOk()
        ->assertJsonMissingPath('code');

    Mail::assertSent(OtpCodeMail::class);
    expect(OtpCode::where('email', $user->email)
        ->where('purpose', 'email_verification')
        ->exists())->toBeTrue();
});

it('returns 422 when public registration requests the admin role', function (): void {
    Mail::fake();

    $this->postJson('/api/register', [
        'name' => 'Unauthorized Admin',
        'email' => 'admin@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'admin',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('role');

    $this->assertDatabaseMissing('users', ['email' => 'admin@example.com']);
    Mail::assertNothingSent();
});

it('authenticates verified users of every role with a bearer token', function (string $role): void {
    $user = User::factory()->create(['role' => $role]);

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('user.role', $role)
        ->assertJsonStructure(['token_type', 'token']);

    $this->withToken($response->json('token'))
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id);

    expect($user->refresh()->last_login_at)->not->toBeNull();
})->with([
    'applicant' => 'applicant',
    'employer' => 'employer',
    'admin' => 'admin',
]);

it('returns 403 when an unverified user attempts to log in', function (): void {
    $user = User::factory()->unverified()->create();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertForbidden()
        ->assertJsonPath('message', 'Verify your email address before logging in.');
});

it('returns 401 when login credentials are incorrect', function (): void {
    $user = User::factory()->create();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'incorrect-password',
    ])->assertUnauthorized()
        ->assertJsonPath('message', 'The provided credentials are incorrect.');
});

it('returns 403 when an inactive user attempts to log in', function (): void {
    $user = User::factory()->create(['account_status' => 'inactive']);

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertForbidden()
        ->assertJsonPath('message', 'This account is not active.');
});

it('returns 401 when a protected endpoint has no bearer token', function (): void {
    $this->getJson('/api/user')->assertUnauthorized();
});

it('sends a password-reset code and revokes existing tokens after reset', function (): void {
    Mail::fake();
    $user = User::factory()->create();
    $token = $user->createToken('existing')->plainTextToken;

    $this->postJson('/api/forgot-password', ['email' => $user->email])
        ->assertOk();

    $otp = OtpCode::where('email', $user->email)
        ->where('purpose', 'password_reset')
        ->firstOrFail();
    $mail = Mail::sent(OtpCodeMail::class)->first();

    expect(Hash::check($mail->code, $otp->code_hash))->toBeTrue();

    $this->postJson('/api/reset-password', [
        'email' => $user->email,
        'code' => $mail->code,
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertOk();

    $this->postJson('/api/reset-password', [
        'email' => $user->email,
        'code' => $mail->code,
        'password' => 'AnotherPassword123!',
        'password_confirmation' => 'AnotherPassword123!',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    expect(Hash::check('NewPassword123!', $user->refresh()->password))->toBeTrue();
    $this->assertDatabaseMissing('otp_codes', [
        'email' => $user->email,
        'purpose' => 'password_reset',
    ]);
    $this->withToken($token)->getJson('/api/user')->assertUnauthorized();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'NewPassword123!',
    ])->assertOk();
});

it('rejects an expired OTP code', function (): void {
    $user = User::factory()->unverified()->create();
    OtpCode::create([
        'email' => $user->email,
        'purpose' => 'email_verification',
        'code_hash' => Hash::make('123456'),
        'expires_at' => now()->subSecond(),
    ]);

    $this->postJson('/api/otp/verify', [
        'email' => $user->email,
        'code' => '123456',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    expect($user->refresh()->email_verified_at)->toBeNull();
});

it('changes password and revokes all existing tokens', function (): void {
    $user = User::factory()->create();
    $accessToken = $user->createToken('existing');

    $this->withToken($accessToken->plainTextToken)->putJson('/api/change-password', [
        'current_password' => 'password',
        'password' => 'ChangedPassword123!',
        'password_confirmation' => 'ChangedPassword123!',
    ])->assertOk();

    expect(Hash::check('ChangedPassword123!', $user->refresh()->password))->toBeTrue();
    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('revokes the current token on logout', function (): void {
    $user = User::factory()->create();
    $accessToken = $user->createToken('logout');

    $this->withToken($accessToken->plainTextToken)->postJson('/api/logout')->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $accessToken->accessToken->id,
    ]);
});
