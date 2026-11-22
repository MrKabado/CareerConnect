<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OtpCodeService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->letters()->mixedCase()->numbers()->symbols()],
            'role' => [
                'sometimes',
                Rule::in($forcedRole === null ? ['applicant', 'employer'] : [$forcedRole]),
            ],
        ];
        if ($forcedRole === 'employer') {
            $rules += [
                'company_name' => ['required', 'string', 'max:255'],
                'company_size' => ['required', Rule::in([
                    '1-10',
                    '11-50',
                    '51-200',
                    '201-500',
                    '501-1000',
                    '1000+',
                ])],
                'industry' => ['required', 'string', 'max:100'],
                'website' => ['nullable', 'url', 'max:255'],
            ];
        }

        $validated = $request->validate($rules);

        $validated['role'] = $forcedRole ?? ($validated['role'] ?? 'applicant');
        $validated['name'] = mb_convert_case(trim($validated['name']), MB_CASE_TITLE, 'UTF-8');
        $companyData = null;
        if ($forcedRole === 'employer') {
            $companyData = [
                'name' => trim($validated['company_name']),
                'company_size' => $validated['company_size'],
                'industry' => trim($validated['industry']),
                'website' => $validated['website'] ?? null,
                'contact_name' => $validated['name'],
                'contact_email' => $validated['email'],
            ];
            unset(
                $validated['company_name'],
                $validated['company_size'],
                $validated['industry'],
                $validated['website'],
            );
        }
        $existingUser = User::where('email', $validated['email'])->first();

        if ($existingUser !== null) {
            $response = $this->resumeApplicantVerification($existingUser, $validated['role']);

            if ($response !== null) {
                return $response;
            }

            throw ValidationException::withMessages([
                'email' => ['The email has already been taken.'],
            ]);
        }

        try {
            $user = DB::transaction(function () use ($validated, $companyData): User {
                $user = User::create($validated);
                if ($companyData !== null) {
                    $user->company()->create($companyData);
                }

                return $user;
            });
        } catch (QueryException $exception) {
            $existingUser = User::where('email', $validated['email'])->first();

            if ($existingUser !== null) {
                $response = $this->resumeApplicantVerification($existingUser, $validated['role']);

                if ($response !== null) {
                    return $response;
                }

                throw ValidationException::withMessages([
                    'email' => ['The email has already been taken.'],
                ]);
            }

            throw $exception;
        }

        $user->refresh();
        ActivityLog::create([
            'user_id' => $user->id,
            'actor_id' => null,
            'action' => 'account.registered',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'payload' => [
                'description' => sprintf('%s registered as %s', $user->name, $user->role),
                'role' => $user->role,
            ],
        ]);
        foreach (User::query()->where('role', 'admin')->get(['id', 'name', 'email']) as $admin) {
            app(NotificationService::class)->send(
                $admin,
                'account_registered',
                'New account registered',
                sprintf('%s registered as %s.', $user->name, $user->role),
                [
                    'dedupe_key' => 'account_registered-'.$user->id,
                    'user_id' => $user->id,
                    'role' => $user->role,
                ],
            );
        }
        $this->otpCodes->send($user->email, 'email_verification');
        $onboardingToken = $user->role === 'applicant'
            ? $user->createToken(
                'careerconnect-onboarding-resume',
                ['onboarding:resume', 'onboarding:profile'],
                now()->addDays(7),
            )->plainTextToken
            : null;

        return response()->json([
            'message' => 'A verification code has been sent to your email address.',
            'user' => $this->userData($user),
            ...($onboardingToken === null ? [] : ['onboarding_token' => $onboardingToken]),
        ], 201);
    }

    private function resumeApplicantVerification(User $user, string $registrationRole): ?JsonResponse
    {
        if (
            $user->role === $registrationRole
            && $user->account_status === 'active'
            && $user->email_verified_at === null
        ) {
            $this->otpCodes->send($user->email, 'email_verification');

            return response()->json([
                'message' => 'This email needs verification. Continue with the verification code.',
                'resume_verification' => true,
            ]);
        }

        throw ValidationException::withMessages([
            'email' => ['This email is already registered. Log in instead.'],
        ]);
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
