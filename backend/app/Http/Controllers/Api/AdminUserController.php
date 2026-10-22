<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function __construct(private readonly OtpCodeService $otpCodes) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['sometimes', Rule::in(['admin', 'employer', 'applicant'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'deactivated'])],
            'search' => ['sometimes', 'string', 'max:255'],
        ]);

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'account_status', 'email_verified_at', 'created_at'])
            ->when(isset($validated['role']), fn ($query) => $query->where('role', $validated['role']))
            ->when(isset($validated['status']), fn ($query) => $query->where('account_status', $validated['status']))
            ->when(isset($validated['search']), function ($query) use ($validated): void {
                $query->where(function ($query) use ($validated): void {
                    $query->where('name', 'like', '%'.$validated['search'].'%')
                        ->orWhere('email', 'like', '%'.$validated['search'].'%');
                });
            })
            ->orderBy('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        return response()->json($users);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'account_status' => ['required', Rule::in(['active', 'deactivated'])],
        ]);

        $user->forceFill(['account_status' => $validated['account_status']])->save();

        if ($user->account_status === 'deactivated') {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Account status updated.',
            'user' => [
                'id' => $user->id,
                'account_status' => $user->account_status,
            ],
        ]);
    }

    public function sendPasswordReset(User $user): JsonResponse
    {
        if (! $user->isActive() || $user->email_verified_at === null) {
            return response()->json([
                'message' => 'This account is not eligible for a password reset.',
                'code' => 'account_not_eligible',
            ], 422);
        }

        $this->otpCodes->send($user->email, 'password_reset');

        return response()->json([
            'message' => 'A password reset code has been sent to the account email.',
        ]);
    }
}
