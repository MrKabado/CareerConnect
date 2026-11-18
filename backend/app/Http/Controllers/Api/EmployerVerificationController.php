<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use App\Models\VerificationDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use RuntimeException;
use Throwable;

class EmployerVerificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['incomplete', 'pending', 'verified', 'rejected'])],
        ]);

        $verifications = CompanyVerification::query()
            ->with(['company.user:id,name,email'])
            ->when(isset($validated['status']), fn ($query, string $status) => $query->where('status', $status))
            ->latest('updated_at')
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        return response()->json([
            'data' => $verifications->getCollection()->map(fn (CompanyVerification $verification): array => [
                'id' => $verification->id,
                'company' => [
                    'id' => $verification->company->id,
                    'name' => $verification->company->name,
                    'owner' => [
                        'id' => $verification->company->user->id,
                        'name' => $verification->company->user->name,
                        'email' => $verification->company->user->email,
                    ],
                ],
                'status' => $verification->status,
                'rejection_reason' => $verification->rejection_reason,
                'rejection_note' => $verification->rejection_note,
                'reviewed_at' => $verification->reviewed_at?->toISOString(),
                'submitted_at' => $verification->submitted_at?->toISOString(),
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

    public function status(Request $request): JsonResponse
    {
        $company = $request->user()->company()->with('verification')->first();

        $verification = $company?->verification;

        return response()->json([
            'status' => $verification?->status ?? 'incomplete',
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'is_verified' => $company->is_verified,
            ] : null,
            'rejection_reason' => $verification?->rejection_reason,
            'rejection_note' => $verification?->rejection_note,
            'reviewed_at' => $verification?->reviewed_at?->toISOString(),
        ]);
    }

    public function show(CompanyVerification $companyVerification): JsonResponse
    {
        $companyVerification->load([
            'company.user:id,name,email',
            'company.category:id,name',
            'documents',
        ]);
        $company = $companyVerification->company;

        return response()->json([
            'data' => [
                'id' => $companyVerification->id,
                'status' => $companyVerification->status,
                'rejection_reason' => $companyVerification->rejection_reason,
                'rejection_note' => $companyVerification->rejection_note,
                'submitted_at' => $companyVerification->submitted_at?->toISOString(),
                'reviewed_at' => $companyVerification->reviewed_at?->toISOString(),
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'category' => $company->category?->name,
                    'company_size' => $company->company_size,
                    'address' => $company->address,
                    'city' => $company->city,
                    'website' => $company->website,
                    'description' => $company->description,
                    'contact_name' => $company->contact_name,
                    'contact_phone' => $company->contact_phone,
                    'contact_email' => $company->contact_email,
                    'owner' => [
                        'id' => $company->user->id,
                        'name' => $company->user->name,
                        'email' => $company->user->email,
                    ],
                ],
                'documents' => $companyVerification->documents->map(fn (VerificationDocument $document): array => [
                    'id' => $document->id,
                    'type' => $document->type,
                    'original_filename' => $document->original_filename,
                    'mime_type' => $document->mime_type,
                    'size_bytes' => $document->size_bytes,
                ])->values(),
            ],
        ]);
    }

    public function adminDocument(
        CompanyVerification $companyVerification,
        VerificationDocument $document,
    ): StreamedResponse {
        if ($document->company_verification_id !== $companyVerification->id
            || ! Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'The verification document is unavailable.');
        }

        return Storage::disk('local')->download($document->file_path, $document->original_filename, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function company(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($request->isMethod('get')) {
            $company = $user->company;

            return response()->json([
                'company' => $company ? $this->companyData($company) : null,
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'company_size' => ['nullable', Rule::in(['1-10', '11-50', '51-200', '201-500', '500+'])],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url'],
            'description' => ['nullable', 'string', 'max:1000'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'hires_jobs' => ['nullable', 'boolean'],
            'hires_ojt' => ['nullable', 'boolean'],
            'open_to_moa' => ['nullable', 'boolean'],
            'accepted_courses' => ['nullable', 'array'],
            'accepted_courses.*' => ['string', 'max:100'],
        ]);

        $company = $user->company()->firstOrNew();
        $company->fill($validated);
        $company->user_id = $user->id;
        $company->save();

        $this->syncVerificationStatus($company);

        return response()->json([
            'message' => 'Company profile saved.',
            'company' => $this->companyData($company),
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $company = $request->user()->company;
        if ($company === null) {
            return response()->json([
                'message' => 'Create your company profile before uploading a logo.',
                'code' => 'company_profile_required',
            ], 422);
        }

        $file = $request->file('logo');
        $path = $file->storePubliclyAs(
            'company-logos',
            Str::uuid().'.'.$file->extension(),
            'public',
        );
        if ($path === false) {
            throw new RuntimeException('The company logo could not be stored.');
        }

        $oldPath = $company->logo_path;
        try {
            $company->logo_path = $path;
            $company->save();
        } catch (Throwable $exception) {
            if (! Storage::disk('public')->delete($path)) {
                throw new RuntimeException('The failed company logo upload could not be cleaned up.', previous: $exception);
            }
            throw $exception;
        }

        if ($oldPath !== null && ! Storage::disk('public')->delete($oldPath)) {
            throw new RuntimeException('The previous company logo could not be removed.');
        }
        $this->syncVerificationStatus($company);

        return response()->json([
            'message' => 'Company logo uploaded.',
            'logo_url' => Storage::disk('public')->url($path),
        ]);
    }

    public function deleteLogo(Request $request): JsonResponse
    {
        $company = $request->user()->company()->firstOrFail();
        $path = $company->logo_path;

        if ($path !== null && ! Storage::disk('public')->delete($path)) {
            throw new RuntimeException('The company logo could not be removed.');
        }

        $company->logo_path = null;
        $company->save();

        return response()->json([
            'message' => 'Company logo removed.',
            'company' => $this->companyData($company->fresh()),
        ]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', Rule::in(['business_registration', 'business_permit', 'supporting'])],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'extensions:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $company = $request->user()->company()->firstOrFail();
        $verification = $this->getOrCreateVerification($company);
        $file = $request->file('document');
        $path = $file->storeAs(
            'employer-verifications/'.$company->id,
            Str::uuid().'.'.$file->extension(),
            'local',
        );
        if ($path === false) {
            throw new RuntimeException('The verification document could not be stored.');
        }

        $previousPath = null;
        try {
            $document = DB::transaction(function () use ($verification, $company, $request, $file, $path, &$previousPath): VerificationDocument {
                $lockedVerification = CompanyVerification::query()
                    ->lockForUpdate()
                    ->findOrFail($verification->id);
                $this->ensureVerificationCanBeChanged($lockedVerification);

                $type = $request->string('type')->toString();
                $document = in_array($type, ['business_registration', 'business_permit'], true)
                    ? $lockedVerification->documents()->where('type', $type)->lockForUpdate()->first()
                    : null;

                if ($document === null) {
                    $document = new VerificationDocument;
                    $document->company_verification_id = $lockedVerification->id;
                } else {
                    $previousPath = $document->file_path;
                }

                $document->fill([
                    'type' => $type,
                    'file_path' => $path,
                    'original_filename' => $this->safeOriginalFilename($file),
                    'mime_type' => $file->getMimeType(),
                    'size_bytes' => $file->getSize(),
                ]);
                $document->save();

                $lockedVerification->forceFill([
                    'status' => 'incomplete',
                    'submitted_at' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                    'rejection_reason' => null,
                    'rejection_note' => null,
                ])->save();
                $company->forceFill(['is_verified' => false, 'verified_at' => null])->save();

                return $document;
            });
        } catch (Throwable $exception) {
            if (! Storage::disk('local')->delete($path)) {
                throw new RuntimeException('The failed verification upload could not be cleaned up.', previous: $exception);
            }
            throw $exception;
        }

        if ($previousPath !== null && ! Storage::disk('local')->delete($previousPath)) {
            throw new RuntimeException('The replaced verification document could not be removed.');
        }

        return response()->json([
            'message' => $previousPath === null ? 'Document uploaded.' : 'Document replaced.',
            'status' => $verification->fresh()->status,
            'document' => $this->verificationDocumentData($document),
        ], $previousPath === null ? 201 : 200);
    }

    public function documents(Request $request): JsonResponse
    {
        $verification = $request->user()->company?->verification;

        return response()->json([
            'data' => $verification?->documents()
                ->orderBy('id')
                ->get()
                ->map(fn (VerificationDocument $document): array => $this->verificationDocumentData($document))
                ->values() ?? collect(),
        ]);
    }

    public function deleteDocument(Request $request, VerificationDocument $verificationDocument): JsonResponse
    {
        $verification = $request->user()->company?->verification;
        if ($verification === null || $verificationDocument->company_verification_id !== $verification->id) {
            abort(404);
        }

        $path = DB::transaction(function () use ($verification, $verificationDocument): string {
            $lockedVerification = CompanyVerification::query()
                ->lockForUpdate()
                ->findOrFail($verification->id);
            $this->ensureVerificationCanBeChanged($lockedVerification);
            $document = $lockedVerification->documents()
                ->lockForUpdate()
                ->findOrFail($verificationDocument->id);
            $path = $document->file_path;
            $document->delete();

            $lockedVerification->forceFill([
                'status' => 'incomplete',
                'submitted_at' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'rejection_reason' => null,
                'rejection_note' => null,
            ])->save();
            $lockedVerification->company()->update(['is_verified' => false, 'verified_at' => null]);

            return $path;
        });

        if (! Storage::disk('local')->delete($path)) {
            throw new RuntimeException('The verification document record was removed, but its file could not be deleted.');
        }

        return response()->json(['message' => 'Verification document deleted.']);
    }

    public function downloadDocument(Request $request, VerificationDocument $verificationDocument): StreamedResponse
    {
        $verification = $request->user()->company?->verification;
        if ($verification === null || $verificationDocument->company_verification_id !== $verification->id) {
            abort(404);
        }

        $expectedPrefix = 'employer-verifications/'.$request->user()->company->id.'/';
        if (! str_starts_with($verificationDocument->file_path, $expectedPrefix)
            || preg_match('#^employer-verifications/[0-9]+/[a-f0-9-]+\.(pdf|jpg|jpeg|png)$#i', $verificationDocument->file_path) !== 1
            || ! Storage::disk('local')->exists($verificationDocument->file_path)) {
            abort(404, 'The verification document is unavailable.');
        }

        return Storage::disk('local')->download(
            $verificationDocument->file_path,
            $verificationDocument->original_filename,
            ['Content-Type' => $verificationDocument->mime_type, 'X-Content-Type-Options' => 'nosniff'],
        );
    }

    public function submit(Request $request): JsonResponse
    {
        $company = $request->user()->company()->firstOrFail();
        $verification = $this->getOrCreateVerification($company);

        if (! $this->isProfileComplete($company)) {
            return response()->json([
                'message' => 'Complete the company profile before submitting for verification.',
                'code' => 'incomplete_profile',
            ], 422);
        }

        if (! $this->hasRequiredDocuments($verification)) {
            return response()->json([
                'message' => 'Business registration and permit documents are required before submitting.',
                'code' => 'verification_incomplete',
            ], 422);
        }

        $verification->status = 'pending';
        $verification->submitted_at = now();
        $verification->authorization_confirmed_at = now();
        $verification->rejection_reason = null;
        $verification->rejection_note = null;
        $verification->save();

        return response()->json([
            'message' => 'Company verification submitted for review.',
            'status' => 'pending',
        ]);
    }

    public function review(Request $request, CompanyVerification $companyVerification): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['verified', 'rejected'])],
            'rejection_reason' => [
                Rule::requiredIf($request->input('status') === 'rejected'),
                'nullable',
                'string',
                'max:255',
            ],
            'rejection_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($companyVerification->status !== 'pending') {
            throw new ConflictHttpException('Only pending company verifications can be reviewed.');
        }

        DB::transaction(function () use ($companyVerification, $request, $validated): void {
            $verification = CompanyVerification::query()
                ->lockForUpdate()
                ->findOrFail($companyVerification->id);
            if ($verification->status !== 'pending') {
                throw new ConflictHttpException('Only pending company verifications can be reviewed.');
            }

            $verification->status = $validated['status'];
            $verification->reviewed_by = $request->user()->id;
            $verification->reviewed_at = now();
            $verification->rejection_reason = $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null;
            $verification->rejection_note = $validated['status'] === 'rejected' ? ($validated['rejection_note'] ?? null) : null;
            $verification->save();

            $company = $verification->company()->lockForUpdate()->firstOrFail();
            $company->is_verified = $validated['status'] === 'verified';
            $company->verified_at = $validated['status'] === 'verified' ? now() : null;
            $company->save();

            ActivityLog::create([
                'user_id' => $company->user_id,
                'actor_id' => $request->user()->id,
                'action' => 'admin.company_verification_reviewed',
                'subject_type' => CompanyVerification::class,
                'subject_id' => $verification->id,
                'payload' => [
                    'status' => $verification->status,
                    'rejection_reason' => $verification->rejection_reason,
                    'rejection_note' => $verification->rejection_note,
                ],
            ]);
        });

        return response()->json([
            'message' => 'Company verification review recorded.',
            'status' => $companyVerification->fresh()->status,
            'rejection_reason' => $companyVerification->fresh()->rejection_reason,
            'rejection_note' => $companyVerification->fresh()->rejection_note,
        ]);
    }

    public function documentDownload(VerificationDocument $document): StreamedResponse
    {
        $user = auth()->user();
        $company = $document->companyVerification->company;

        if ($user->role === 'admin' || $user->id === $company->user_id) {
            return Storage::disk('local')->download($document->file_path, $document->original_filename);
        }

        abort(403);
    }

    protected function getOrCreateVerification(Company $company): CompanyVerification
    {
        $verification = $company->verification()->first();

        if ($verification !== null) {
            return $verification;
        }

        return $company->verification()->create([
            'status' => 'incomplete',
        ]);
    }

    protected function isProfileComplete(Company $company): bool
    {
        return $company->name !== null
            && trim((string) $company->name) !== ''
            && $company->category_id !== null
            && $company->company_size !== null
            && $company->address !== null
            && $company->city !== null
            && $company->contact_name !== null
            && $company->contact_phone !== null
            && $company->contact_email !== null
            && $company->description !== null;
    }

    protected function hasRequiredDocuments(CompanyVerification $verification): bool
    {
        $requiredTypes = ['business_registration', 'business_permit'];
        $uploadedTypes = $verification->documents()
            ->pluck('type')
            ->filter(fn ($type) => in_array($type, $requiredTypes, true))
            ->all();

        foreach ($requiredTypes as $requiredType) {
            if (! in_array($requiredType, $uploadedTypes, true)) {
                return false;
            }
        }

        return true;
    }

    protected function statusForVerification(Company $company, CompanyVerification $verification): string
    {
        if ($verification->status === 'verified' && $company->is_verified) {
            return 'verified';
        }

        if ($verification->status === 'pending'
            && $verification->submitted_at !== null
            && $this->isProfileComplete($company)
            && $this->hasRequiredDocuments($verification)) {
            return 'pending';
        }

        return 'incomplete';
    }

    protected function syncVerificationStatus(Company $company): void
    {
        $verification = $company->verification()->first();
        if ($verification === null) {
            return;
        }

        $verification->status = $this->statusForVerification($company, $verification);
        $verification->save();
    }

    protected function companyData(Company $company): array
    {
        return [
            'id' => $company->id,
            'user_id' => $company->user_id,
            'name' => $company->name,
            'category_id' => $company->category_id,
            'company_size' => $company->company_size,
            'address' => $company->address,
            'city' => $company->city,
            'website' => $company->website,
            'description' => $company->description,
            'contact_name' => $company->contact_name,
            'contact_phone' => $company->contact_phone,
            'contact_email' => $company->contact_email,
            'logo_path' => $company->logo_path,
            'logo_url' => $company->logo_path ? Storage::disk('public')->url($company->logo_path) : null,
            'hires_jobs' => $company->hires_jobs,
            'hires_ojt' => $company->hires_ojt,
            'open_to_moa' => $company->open_to_moa,
            'accepted_courses' => $company->accepted_courses,
            'is_verified' => $company->is_verified,
        ];
    }

    private function ensureVerificationCanBeChanged(CompanyVerification $verification): void
    {
        if (in_array($verification->status, ['pending', 'verified'], true)) {
            throw new ConflictHttpException('Submitted verification documents cannot be changed while under review or after approval.');
        }
    }

    private function verificationDocumentData(VerificationDocument $document): array
    {
        return [
            'id' => $document->id,
            'type' => $document->type,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'size_bytes' => $document->size_bytes,
            'created_at' => $document->created_at?->toISOString(),
        ];
    }

    private function safeOriginalFilename(UploadedFile $file): string
    {
        $filename = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $filename = preg_replace('/[^\pL\pN._ -]/u', '_', $filename) ?: 'document';

        return mb_substr($filename, 0, 255);
    }
}
