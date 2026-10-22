<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OtpController extends Controller
{
    public function __construct(private readonly OtpCodeService $otpCodes) {}

    public function requestCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'purpose' => ['required', Rule::in(['email_verification', 'password_reset'])],
        ]);

        $this->sendCodeForEligibleUser($validated['email'], $validated['purpose']);

        return response()->json([
            'message' => 'If the account is eligible, a code has been sent to the email address.',
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $otp = $this->validOtp($validated['email'], 'email_verification', $validated['code']);
            $user = User::where('email', $validated['email'])->lockForUpdate()->first();

            if ($user === null || $user->account_status !== 'active') {
                throw ValidationException::withMessages([
                    'code' => ['The verification code is invalid or expired.'],
                ]);
            }

            $user->forceFill(['email_verified_at' => now()])->save();
            $otp->delete();

            return $user;
        });

        return response()->json([
            'message' => 'Email verified successfully.',
            'token_type' => 'Bearer',
            'token' => $user->createToken('careerconnect-api')->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'account_status' => $user->account_status,
                'email_verified_at' => $user->email_verified_at?->toISOString(),
            ],
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $this->sendCodeForEligibleUser($validated['email'], 'password_reset');

        return response()->json([
            'message' => 'If the account is eligible, a password reset code has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        DB::transaction(function () use ($validated): void {
            $otp = $this->validOtp($validated['email'], 'password_reset', $validated['code']);
            $user = User::where('email', $validated['email'])->lockForUpdate()->first();

            if ($user === null || $user->email_verified_at === null || $user->account_status !== 'active') {
                throw ValidationException::withMessages([
                    'code' => ['The reset code is invalid or expired.'],
                ]);
            }

            $user->password = $validated['password'];
            $user->save();
            $user->tokens()->delete();
            $otp->delete();
        });

        return response()->json([
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ]);
    }

    private function sendCodeForEligibleUser(string $email, string $purpose): void
    {
        $user = User::where('email', $email)->first();

        if ($user === null || $user->account_status !== 'active') {
            return;
        }

        if ($purpose === 'email_verification' && $user->email_verified_at !== null) {
            return;
        }

        if ($purpose === 'password_reset' && $user->email_verified_at === null) {
            return;
        }

        $this->otpCodes->send($email, $purpose);
    }

    private function validOtp(string $email, string $purpose, string $code): OtpCode
    {
        $otp = OtpCode::where('email', $email)
            ->where('purpose', $purpose)
            ->lockForUpdate()
            ->first();

        if ($otp === null || $otp->expires_at->isPast() || ! Hash::check($code, $otp->code_hash)) {
            throw ValidationException::withMessages([
                'code' => ['The code is invalid or expired.'],
            ]);
        }

        return $otp;
    }
}
