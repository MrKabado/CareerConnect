<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpCodeService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly OtpCodeService $otpCodes) {}

    public function register(Request $request): JsonResponse
    {
        return $this->registerForRole($request, null);
    }

    public function registerApplicant(Request $request): JsonResponse
    {
        return $this->registerForRole($request, 'applicant');
    }

    public function registerEmployer(Request $request): JsonResponse
    {
        return $this->registerForRole($request, 'employer');
    }

    private function registerForRole(Request $request, ?string $forcedRole): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->letters()->mixedCase()->numbers()->symbols()],
            'role' => [
                'sometimes',
                Rule::in($forcedRole === null ? ['applicant', 'employer'] : [$forcedRole]),
            ],
        ]);

        $validated['role'] = $forcedRole ?? ($validated['role'] ?? 'applicant');

        try {
            $user = User::create($validated);
        } catch (QueryException $exception) {
            if (User::where('email', $validated['email'])->exists()) {
                throw ValidationException::withMessages([
                    'email' => ['The email has already been taken.'],
                ]);
            }

            throw $exception;
        }

        $user->refresh();
        $this->otpCodes->send($user->email, 'email_verification');

        return response()->json([
            'message' => 'A verification code has been sent to your email address.',
            'user' => $this->userData($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
        }

        if ($user->account_status !== 'active') {
            return response()->json(['message' => 'This account is not active.'], 403);
        }

        if ($user->email_verified_at === null) {
            return response()->json(['message' => 'Verify your email address before logging in.'], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return $this->tokenResponse($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userData($request->user())]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = $validated['password'];
        $user->save();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password changed. Please log in again.']);
    }

    private function tokenResponse(User $user): JsonResponse
    {
        return response()->json([
            'token_type' => 'Bearer',
            'token' => $user->createToken('careerconnect-api')->plainTextToken,
            'user' => $this->userData($user),
        ]);
    }

    /**
     * @return array{id: int, name: string, email: string, role: string, account_status: string, email_verified_at: ?string}
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'account_status' => $user->account_status,
            'email_verified_at' => $user->email_verified_at?->toISOString(),
        ];
    }
}
