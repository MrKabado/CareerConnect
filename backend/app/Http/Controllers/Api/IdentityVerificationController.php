<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdentityVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class IdentityVerificationController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $verification = $request->user()->identityVerification;

        return response()->json([
            'verification' => $verification === null ? null : [
                'status' => $verification->status,
                'rejection_reason' => $verification->rejection_reason,
                'submitted_at' => $verification->created_at?->toISOString(),
                'reviewed_at' => $verification->reviewed_at?->toISOString(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $oldPath = DB::transaction(function () use ($request): ?string {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $verification = IdentityVerification::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($verification !== null && $verification->status !== 'rejected') {
                throw new ConflictHttpException(
                    'A verification is already pending or has been approved.',
                );
            }

            if ($verification === null) {
                Gate::forUser($user)->authorize('create', IdentityVerification::class);
            } else {
                Gate::forUser($user)->authorize('update', $verification);
            }

            $oldPath = $verification?->document_path;
            $path = $request->file('document')->store('identity-verification', 'local');

            if ($path === false) {
                throw new RuntimeException('The identity document could not be stored.');
            }

            $attributes = [
                'document_path' => $path,
                'status' => 'pending',
                'rejection_reason' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'expires_at' => null,
            ];

            if ($verification === null) {
                IdentityVerification::create([
                    ...$attributes,
                    'user_id' => $user->id,
                ]);

                return null;
            }

            $verification->update($attributes);

            return $oldPath;
        });

        if ($oldPath !== null) {
            Storage::disk('local')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Identity documents submitted for review.',
            'status' => 'pending',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', IdentityVerification::class);

        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'verified', 'rejected'])],
        ]);

        $verifications = IdentityVerification::query()
            ->with(['user:id,name,email'])
            ->when(
                $validated['status'] ?? 'pending',
                fn ($query, string $status) => $query->where('status', $status),
            )
            ->latest()
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        return response()->json([
            'data' => $verifications->getCollection()->map(fn (IdentityVerification $verification): array => [
                'id' => $verification->id,
                'applicant' => [
                    'id' => $verification->user->id,
                    'name' => $verification->user->name,
                    'email' => $verification->user->email,
                ],
                'status' => $verification->status,
                'rejection_reason' => $verification->rejection_reason,
                'submitted_at' => $verification->created_at?->toISOString(),
                'reviewed_at' => $verification->reviewed_at?->toISOString(),
            ]),
            'links' => $verifications->linkCollection(),
            'meta' => [
                'current_page' => $verifications->currentPage(),
                'last_page' => $verifications->lastPage(),
                'per_page' => $verifications->perPage(),
                'total' => $verifications->total(),
            ],
        ]);
    }

    public function document(IdentityVerification $identityVerification): StreamedResponse
    {
        Gate::authorize('view', $identityVerification);

        if ($identityVerification->document_path === null || ! Storage::disk('local')->exists($identityVerification->document_path)) {
            abort(404, 'The identity document is no longer available.');
        }

        return Storage::disk('local')->download($identityVerification->document_path, 'identity-document');
    }

    public function review(Request $request, IdentityVerification $identityVerification): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['verified', 'rejected'])],
            'rejection_reason' => [
                Rule::requiredIf($request->input('status') === 'rejected'),
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $reviewedVerification = DB::transaction(function () use ($identityVerification, $request, $validated): IdentityVerification {
            $verification = IdentityVerification::query()
                ->lockForUpdate()
                ->findOrFail($identityVerification->id);

            if ($verification->status !== 'pending') {
                throw new ConflictHttpException('This verification has already been reviewed.');
            }

            Gate::forUser($request->user())->authorize('review', $verification);

            $verification->update([
                'status' => $validated['status'],
                'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'expires_at' => now()->addDays(config('careerconnect.identity_document_retention_days')),
            ]);

            return $verification;
        });

        return response()->json([
            'message' => 'Identity verification review recorded.',
            'status' => $reviewedVerification->status,
        ]);
    }
}
