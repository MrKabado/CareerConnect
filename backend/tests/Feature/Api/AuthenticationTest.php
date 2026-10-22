<?php

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

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
