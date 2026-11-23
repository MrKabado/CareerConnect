<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RoleNotificationMail;
use App\Models\ActivityLog;
use App\Models\IdentityVerification;
use App\Models\User;
use App\Services\MediaStorage;
use App\Services\NotificationService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class IdentityVerificationController extends Controller
{
    public function __construct(private readonly MediaStorage $mediaStorage) {}

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
            'status' => ['prohibited'],
            'rejection_reason' => ['prohibited'],
            'document' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'extensions:jpg,jpeg,png,webp',
                'max:5120',
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $value instanceof UploadedFile || @getimagesize($value->getRealPath()) === false) {
                        $fail('The document must be a readable image file.');
                    }
                },
            ],
        ]);

        $file = $request->file('document');
        $stored = $this->mediaStorage->storePrivateFile(
            $file,
            'applicant-verifications/'.$request->user()->id,
            'career-connect/users/'.$request->user()->id.'/identity-verification',
            $file->extension(),
        );

        try {
            $oldStorage = DB::transaction(function () use ($request, $file, $stored): ?array {
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

                $oldStorage = $verification === null ? null : [
                    'disk' => $verification->storage_disk,
                    'path' => $verification->document_path,
                    'asset_id' => $verification->cloudinary_asset_id,
                ];

                $attributes = [
                    'document_path' => $stored['path'],
                    'storage_disk' => $stored['disk'],
                    'cloudinary_asset_id' => $stored['asset_id'],
                    'document_mime_type' => $file->getMimeType(),
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

                return $oldStorage;
            });
        } catch (\Throwable $exception) {
            try {
                $this->mediaStorage->delete(
                    $stored['disk'],
                    $stored['path'],
                    $stored['asset_id'],
                    'raw',
                    'authenticated',
                );
            } catch (\Throwable $cleanupException) {
                throw new \RuntimeException('The failed identity document upload could not be cleaned up.', previous: $cleanupException);
            }

            throw $exception;
        }

        if ($oldStorage !== null && $oldStorage['path'] !== null) {
            $this->mediaStorage->delete(
                $oldStorage['disk'],
                $oldStorage['path'],
                $oldStorage['asset_id'],
                'raw',
                'authenticated',
            );
        }

        foreach (User::query()->where('role', 'admin')->get(['id', 'name', 'email']) as $admin) {
            app(NotificationService::class)->send(
                $admin,
                'applicant_identity_submitted',
                'Applicant verification submitted',
                sprintf('%s submitted identity verification documents for review.', $request->user()->name),
                [
                    'dedupe_key' => 'applicant_identity-'.$request->user()->id,
                    'applicant_id' => $request->user()->id,
                    'applicant_name' => $request->user()->name,
                ],
            );
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
            'status' => ['sometimes', Rule::in(['all', 'pending', 'verified', 'rejected'])],
        ]);

        $verifications = IdentityVerification::query()
            ->with(['user:id,name,email'])
            ->when(
                ($validated['status'] ?? 'pending') !== 'all',
                fn ($query) => $query->where('status', $validated['status'] ?? 'pending'),
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

        if ($identityVerification->document_path === null
            || ! str_starts_with($identityVerification->document_path, 'applicant-verifications/'.$identityVerification->user_id.'/')
            || preg_match('#^applicant-verifications/[0-9]+/[a-f0-9-]+\.(pdf|jpg|jpeg|png|webp)$#i', $identityVerification->document_path) !== 1) {
            abort(404, 'The identity document is no longer available.');
        }

        return $this->mediaStorage->privateDownload(
            $identityVerification->storage_disk,
            $identityVerification->document_path,
            $identityVerification->cloudinary_asset_id,
            'identity-document.'.pathinfo($identityVerification->document_path, PATHINFO_EXTENSION),
            $identityVerification->document_mime_type ?? 'application/octet-stream',
        );
    }

    public function show(IdentityVerification $identityVerification): JsonResponse
    {
        $identityVerification->load('user.applicantProfile');
        $applicant = $identityVerification->user;
        $profile = $applicant->applicantProfile;

        return response()->json([
            'data' => [
                'id' => $identityVerification->id,
                'status' => $identityVerification->status,
                'rejection_reason' => $identityVerification->rejection_reason,
                'submitted_at' => $identityVerification->created_at?->toISOString(),
                'reviewed_at' => $identityVerification->reviewed_at?->toISOString(),
                'applicant' => [
                    'id' => $applicant->id,
                    'name' => $applicant->name,
                    'email' => $applicant->email,
                    'city' => $profile?->city,
                    'phone' => $profile?->phone,
                ],
            ],
        ]);
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

        [$reviewedVerification, $reviewEventId] = DB::transaction(function () use ($identityVerification, $request, $validated): array {
            $verification = IdentityVerification::query()
                ->lockForUpdate()
                ->findOrFail($identityVerification->id);

            if ($verification->status !== 'pending') {
                throw new ConflictHttpException('This verification has already been reviewed.');
            }

            Gate::forUser($request->user())->authorize('review', $verification);

            if ($validated['status'] === 'verified' && ! $this->hasValidSelfieDocument($verification)) {
                throw ValidationException::withMessages([
                    'status' => ['A valid selfie photo showing the applicant with their own ID is required before approval.'],
                ]);
            }

            $verification->update([
                'status' => $validated['status'],
                'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'expires_at' => now()->addDays(config('careerconnect.identity_document_retention_days')),
            ]);

            $reviewEvent = ActivityLog::create([
                'user_id' => $verification->user_id,
                'actor_id' => $request->user()->id,
                'action' => 'admin.identity_verification_reviewed',
                'subject_type' => IdentityVerification::class,
                'subject_id' => $verification->id,
                'payload' => [
                    'status' => $verification->status,
                    'rejection_reason' => $verification->rejection_reason,
                ],
            ]);

            return [$verification, $reviewEvent->id];
        });

        $reviewedVerification->loadMissing('user');
        $applicant = $reviewedVerification->user;
        if ($applicant !== null) {
            $approved = $reviewedVerification->status === 'verified';
            $title = $approved ? 'Identity verification approved' : 'Identity verification needs changes';
            $message = $approved
                ? 'Congratulations! Your identity verification was approved.'
                : 'Your identity verification was rejected: '.$reviewedVerification->rejection_reason;
            app(NotificationService::class)->send(
                $applicant,
                'applicant_identity_'.$reviewedVerification->status,
                $title,
                $message,
                [
                    'dedupe_key' => 'applicant_identity_review-'.$reviewEventId,
                    'identity_verification_id' => $reviewedVerification->id,
                    'verification_status' => $reviewedVerification->status,
                ],
            );
            Mail::to($applicant->email)->send(new RoleNotificationMail(
                $title,
                $message,
                $applicant->name,
            ));
        }

        return response()->json([
            'message' => 'Identity verification review recorded.',
            'status' => $reviewedVerification->status,
        ]);
    }

    private function hasValidSelfieDocument(IdentityVerification $verification): bool
    {
        $path = $verification->document_path;
        if ($path === null
            || ! in_array(strtolower($verification->document_mime_type ?? ''), [
                'image/jpeg',
                'image/png',
                'image/webp',
            ], true)
            || ! in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), [
                'jpg',
                'jpeg',
                'png',
                'webp',
            ], true)) {
            return false;
        }

        return match ($verification->storage_disk) {
            'local' => Storage::disk('local')->exists($path),
            'cloudinary' => is_string($verification->cloudinary_asset_id)
                && $verification->cloudinary_asset_id !== '',
            default => false,
        };
    }
}
