<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function company(Request $request): JsonResponse
    {
        $user = $request->user();
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
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $company = $request->user()->company()->firstOrNew();
        $file = $request->file('logo');
        $path = $file->storePublicly('company-logos', 'public');

        if ($company->logo_path !== null && Storage::disk('public')->exists($company->logo_path)) {
            Storage::disk('public')->delete($company->logo_path);
        }

        $company->logo_path = $path;
        $company->save();
        $this->syncVerificationStatus($company);

        return response()->json([
            'message' => 'Company logo uploaded.',
            'logo_path' => $path,
        ]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', Rule::in(['business_registration', 'business_permit', 'supporting'])],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $company = $request->user()->company()->firstOrFail();
        $verification = $this->getOrCreateVerification($company);

        $path = $request->file('document')->storeAs(
            'company-verifications/'.$company->id,
            $request->input('type').'-'.time().'.'.$request->file('document')->extension(),
            'local',
        );

        $verification->documents()->create([
            'type' => $request->input('type'),
            'file_path' => $path,
            'original_filename' => $request->file('document')->getClientOriginalName(),
            'mime_type' => $request->file('document')->getMimeType(),
            'size_bytes' => $request->file('document')->getSize(),
        ]);

        $verification->status = $this->statusForVerification($company, $verification);
        $verification->save();

        return response()->json([
            'message' => 'Document uploaded.',
            'status' => $verification->status,
            'document' => [
                'type' => $request->input('type'),
                'file_path' => $path,
            ],
        ], 201);
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

        $companyVerification->status = $validated['status'];
        $companyVerification->reviewed_by = $request->user()->id;
        $companyVerification->reviewed_at = now();
        $companyVerification->rejection_reason = $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null;
        $companyVerification->rejection_note = $validated['status'] === 'rejected' ? ($validated['rejection_note'] ?? null) : null;
        $companyVerification->save();

        $company = $companyVerification->company;
        $company->is_verified = $validated['status'] === 'verified';
        $company->verified_at = $validated['status'] === 'verified' ? now() : null;
        $company->save();

        return response()->json([
            'message' => 'Company verification review recorded.',
            'status' => $companyVerification->status,
            'rejection_reason' => $companyVerification->rejection_reason,
            'rejection_note' => $companyVerification->rejection_note,
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
        if ($this->isProfileComplete($company) && $this->hasRequiredDocuments($verification)) {
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
            'hires_jobs' => $company->hires_jobs,
            'hires_ojt' => $company->hires_ojt,
            'open_to_moa' => $company->open_to_moa,
            'accepted_courses' => $company->accepted_courses,
            'is_verified' => $company->is_verified,
        ];
    }
}
