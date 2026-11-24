<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Mail\RoleNotificationMail;
use App\Models\ActivityLog;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OtpCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
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
            ->with('identityVerification:id,user_id,status,rejection_reason,created_at')
            ->with([
                'company:id,user_id,name',
                'company.verification:id,company_id,status,rejection_reason',
            ])
            ->when(isset($validated['role']), fn ($query) => $query->where('role', $validated['role']))
            ->when(isset($validated['status']), fn ($query) => $query->where('account_status', $validated['status']))
            ->when(isset($validated['search']), function ($query) use ($validated): void {
                $query->where(function ($query) use ($validated): void {
                    $query->where('name', 'like', '%'.$validated['search'].'%')
                        ->orWhere('email', 'like', '%'.$validated['search'].'%');
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        $users->getCollection()->each(function (User $user): void {
            $verification = $user->company?->verification;
            $user->setAttribute('company_verification', $verification ? [
                'id' => $verification->id,
                'company_name' => $user->company->name,
                'status' => $verification->status,
                'rejection_reason' => $verification->rejection_reason,
            ] : null);
            $user->unsetRelation('company');
        });

        $response = $users->toArray();
        $response['features'] = [
            'delete_users' => (bool) config('careerconnect.use_delete_users', false),
        ];

        return response()->json($response);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->only([
                'id',
                'name',
                'email',
                'role',
                'account_status',
                'email_verified_at',
                'last_login_at',
                'created_at',
            ]),
        ]);
    }

    public function update(AdminUpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        if ($user->is($request->user()) && isset($validated['role']) && $validated['role'] !== $user->role) {
            return response()->json([
                'message' => 'You cannot change your own administrator role.',
                'code' => 'self_role_change_forbidden',
            ], 422);
        }

        $emailChanged = isset($validated['email']) && $validated['email'] !== $user->email;
        $roleChanged = isset($validated['role']) && $validated['role'] !== $user->role;

        DB::transaction(function () use ($request, $user, $validated, $emailChanged, $roleChanged): void {
            $user->fill($validated);
            if ($emailChanged) {
                $user->email_verified_at = null;
            }
            $user->save();

            ActivityLog::create([
                'user_id' => $user->id,
                'actor_id' => $request->user()->id,
                'action' => 'admin.user_updated',
                'subject_type' => User::class,
                'subject_id' => $user->id,
                'payload' => [
                    'updated_fields' => array_keys($validated),
                    'email_verification_reset' => $emailChanged,
                    'role_changed' => $roleChanged,
                ],
            ]);

            if ($emailChanged || $roleChanged) {
                $user->tokens()->delete();
            }
        });

        return response()->json([
            'message' => 'User updated.',
            'data' => $user->refresh()->only([
                'id',
                'name',
                'email',
                'role',
                'account_status',
                'email_verified_at',
                'last_login_at',
                'created_at',
            ]),
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'account_status' => ['required', Rule::in(['active', 'deactivated'])],
        ]);

        DB::transaction(function () use ($request, $user, $validated): void {
            $user->forceFill(['account_status' => $validated['account_status']])->save();
            ActivityLog::create([
                'user_id' => $user->id,
                'actor_id' => $request->user()->id,
                'action' => 'admin.user_status_updated',
                'subject_type' => User::class,
                'subject_id' => $user->id,
                'payload' => ['account_status' => $user->account_status],
            ]);

            if ($user->account_status === 'deactivated') {
                $user->tokens()->delete();
            }
        });

        $active = $validated['account_status'] === 'active';
        $title = $active ? 'Account access restored' : 'Account access suspended';
        $message = $active
            ? 'Your CareerConnect account is active again.'
            : 'Your CareerConnect account has been suspended by an administrator.';
        app(NotificationService::class)->send(
            $user,
            'account_status_changed',
            $title,
            $message,
            [
                'dedupe_key' => 'account_status-'.$user->id.'-'.$validated['account_status'],
                'account_status' => $validated['account_status'],
            ],
        );
        Mail::to($user->email)->send(new RoleNotificationMail($title, $message, $user->name));

        return response()->json([
            'message' => 'Account status updated.',
            'user' => [
                'id' => $user->id,
                'account_status' => $user->account_status,
            ],
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (! config('careerconnect.use_delete_users', false)) {
            return response()->json(['message' => 'User deletion is disabled.'], 404);
        }

        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'You cannot delete your own administrator account.',
            ], 422);
        }

        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Administrator accounts cannot be deleted.',
            ], 422);
        }

        $request->validate([
            'confirmation_email' => ['required', 'string', Rule::in([$user->email])],
        ]);

        if ($this->hasProtectedData($user)) {
            return response()->json([
                'message' => 'This account has documents, company records, or application history and cannot be permanently deleted. Deactivate it instead.',
            ], 409);
        }

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            $user->notifications()->delete();
            OtpCode::query()->where('email', $user->email)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->delete();
        });

        return response()->json(['message' => 'User account deleted.']);
    }

    private function hasProtectedData(User $user): bool
    {
        return $user->applications()->exists()
            || $user->resumes()->exists()
            || $user->applicantDocuments()->exists()
            || $user->identityVerification()->exists()
            || $user->interviewsAsApplicant()->exists()
            || $user->interviewsAsEmployer()->exists()
            || $user->jobListings()->exists()
            || $user->company()->exists()
            || $user->applicantProfile()->whereNotNull('profile_photo_path')->exists();
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
