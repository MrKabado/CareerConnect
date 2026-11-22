<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RoleNotificationMail;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use App\Models\VerificationDocument;
use App\Services\MediaStorage;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Throwable;

class EmployerVerificationController extends Controller
{
    private const REAUTHENTICATION_ABILITY = 'company-verification:reauthenticate';

    private const ADDITIONAL_ISO_COUNTRY_CODES = 'BG BH EG GB GD GE';

    private const ISO_COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EH ER ES ET FI FJ FK FM FO FR GA GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW';

    public function __construct(private readonly MediaStorage $mediaStorage) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['incomplete', 'pending', 'verified', 'rejected'])],
        ]);

        $verifications = CompanyVerification::query()
            ->with(['company.user:id,name,email'])
            ->when(
                isset($validated['status']),
                fn ($query) => $query->where('status', $validated['status']),
            )
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
                'registration_date' => $verification->company->user->created_at?->toISOString(),
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
        $accessToken = $request->user()->currentAccessToken();
        $tokenAbilities = $accessToken?->abilities ?? [];
        $profileStrength = $company !== null
            ? $this->profileStrength($company)
            : ['percent' => 0, 'missing' => ['Company profile']];

        return response()->json([
            'status' => $verification?->status ?? 'incomplete',
            'company_profile_complete' => $company !== null && $this->isProfileComplete($company),
            'profile_strength' => $profileStrength,
            'requires_reauthentication' => $verification?->status === 'verified'
                && (
                    in_array(self::REAUTHENTICATION_ABILITY, $tokenAbilities, true)
                    || (
                        $verification->reviewed_at !== null
                        && $accessToken?->created_at !== null
                        && $accessToken->created_at->lt($verification->reviewed_at)
                    )
                ),
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
                'registration_date' => $company->user->created_at?->toISOString(),
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'category' => $company->category?->name,
                    'company_size' => $company->company_size,
                    'address' => $company->address,
                    'country' => $company->country,
                    'city' => $company->city,
                    'industry' => $company->industry,
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
            || ($document->storage_disk === 'cloudinary'
                && ! $this->validDocumentPath($companyVerification->company_id, $document->file_path))) {
            abort(404, 'The verification document is unavailable.');
        }

        return $this->mediaStorage->privateDownload(
            $document->storage_disk,
            $document->file_path,
            $document->cloudinary_asset_id,
            $document->original_filename,
            $document->mime_type,
        );
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

        if ($request->filled('website')) {
            $website = trim((string) $request->input('website'));
            if (! preg_match('/^https?:\/\//i', $website)) {
                $request->merge(['website' => 'https://'.$website]);
            }
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'company_size' => ['nullable', Rule::in(['1-10', '11-50', '51-200', '201-500', '500+', '501-1000', '1000+'])],
            'address' => ['nullable', 'string', 'max:255'],
            'country' => [
                'nullable',
                'string',
                'size:2',
                Rule::in(self::isoCountryCodes()),
            ],
            'city' => ['nullable', 'string', 'max:100'],
            'industry' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url'],
            'description' => ['nullable', 'string', 'max:1000'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => [
                'nullable',
                'string',
                'max:30',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $this->isValidPhoneNumber((string) $value)) {
                        $fail('Enter a valid phone number with 7 to 15 digits.');
                    }
                },
            ],
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

        $this->getOrCreateVerification($company);
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
        $stored = $this->mediaStorage->storePublicImage(
            $file,
            'company-logos',
            'career-connect/employers/'.$company->id.'/logos',
        );

        $oldPath = $company->logo_path;
        $oldDisk = $company->logo_disk;
        $oldAssetId = $company->logo_asset_id;
        try {
            $company->logo_path = $stored['path'];
            $company->logo_disk = $stored['disk'];
            $company->logo_asset_id = $stored['asset_id'];
            $company->save();
        } catch (Throwable $exception) {
            try {
                $this->mediaStorage->delete(
                    $stored['disk'],
                    $stored['path'],
                    $stored['asset_id'],
                    'image',
                    'upload',
                );
            } catch (Throwable $cleanupException) {
                throw new RuntimeException('The failed company logo upload could not be cleaned up.', previous: $cleanupException);
            }
            throw $exception;
        }

        if ($oldPath !== null) {
            $this->mediaStorage->delete($oldDisk, $oldPath, $oldAssetId, 'image', 'upload');
        }
        $this->syncVerificationStatus($company);

        return response()->json([
            'message' => 'Company logo uploaded.',
            'logo_url' => $this->mediaStorage->publicImageUrl($stored['disk'], $stored['path']),
        ]);
    }

    public function deleteLogo(Request $request): JsonResponse
    {
        $company = $request->user()->company()->first();
        if ($company === null) {
            return response()->json([
                'message' => 'No company profile or logo was found.',
                'company' => null,
            ]);
        }

        $path = $company->logo_path;

        if ($path !== null) {
            $this->mediaStorage->delete(
                $company->logo_disk,
                $path,
                $company->logo_asset_id,
                'image',
                'upload',
            );
        }

        $company->logo_path = null;
        $company->logo_disk = 'public';
        $company->logo_asset_id = null;
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

        $company = $request->user()->company()->firstOrCreate(
            [],
            [
                'name' => 'Pending Company Profile',
                'contact_name' => $request->user()->name,
                'contact_email' => $request->user()->email,
            ],
        );
        $verification = $this->getOrCreateVerification($company);
        $file = $request->file('document');
        $stored = $this->mediaStorage->storePrivateFile(
            $file,
            'employer-verifications/'.$company->id,
            'career-connect/employers/'.$company->id.'/verification-documents',
            $file->extension(),
        );

        $previousStorage = null;
        try {
            $document = DB::transaction(function () use ($verification, $company, $request, $file, $stored, &$previousStorage): VerificationDocument {
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
                    $previousStorage = [
                        'disk' => $document->storage_disk,
                        'path' => $document->file_path,
                        'asset_id' => $document->cloudinary_asset_id,
                    ];
                }

                $document->fill([
                    'type' => $type,
                    'file_path' => $stored['path'],
                    'storage_disk' => $stored['disk'],
                    'cloudinary_asset_id' => $stored['asset_id'],
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
            try {
                $this->mediaStorage->delete(
                    $stored['disk'],
                    $stored['path'],
                    $stored['asset_id'],
                    'raw',
                    'authenticated',
                );
            } catch (Throwable $cleanupException) {
                throw new RuntimeException('The failed verification upload could not be cleaned up.', previous: $cleanupException);
            }
            throw $exception;
        }

        if ($previousStorage !== null) {
            $this->mediaStorage->delete(
                $previousStorage['disk'],
                $previousStorage['path'],
                $previousStorage['asset_id'],
                'raw',
                'authenticated',
            );
        }

        return response()->json([
            'message' => $previousStorage === null ? 'Document uploaded.' : 'Document replaced.',
            'status' => $verification->fresh()->status,
            'document' => $this->verificationDocumentData($document),
        ], $previousStorage === null ? 201 : 200);
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

        $stored = DB::transaction(function () use ($verification, $verificationDocument): array {
            $lockedVerification = CompanyVerification::query()
                ->lockForUpdate()
                ->findOrFail($verification->id);
            $this->ensureVerificationCanBeChanged($lockedVerification);
            $document = $lockedVerification->documents()
                ->lockForUpdate()
                ->findOrFail($verificationDocument->id);
            $stored = [
                'disk' => $document->storage_disk,
                'path' => $document->file_path,
                'asset_id' => $document->cloudinary_asset_id,
            ];
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

            return $stored;
        });

        $this->mediaStorage->delete(
            $stored['disk'],
            $stored['path'],
            $stored['asset_id'],
            'raw',
            'authenticated',
        );

        return response()->json(['message' => 'Verification document deleted.']);
    }

    public function downloadDocument(Request $request, VerificationDocument $verificationDocument): StreamedResponse
    {
        $verification = $request->user()->company?->verification;
        if ($verification === null || $verificationDocument->company_verification_id !== $verification->id) {
            abort(404);
        }

        if (! $this->validDocumentPath($request->user()->company->id, $verificationDocument->file_path)) {
            abort(404, 'The verification document is unavailable.');
        }

        return $this->mediaStorage->privateDownload(
            $verificationDocument->storage_disk,
            $verificationDocument->file_path,
            $verificationDocument->cloudinary_asset_id,
            $verificationDocument->original_filename,
            $verificationDocument->mime_type,
        );
    }

    public function submit(Request $request): JsonResponse
    {
        $company = $request->user()->company()->firstOrFail();
        $verification = $this->getOrCreateVerification($company);

        $result = DB::transaction(function () use ($request, $company, $verification): string {
            $lockedCompany = Company::query()->lockForUpdate()->findOrFail($company->id);
            $lockedVerification = CompanyVerification::query()
                ->lockForUpdate()
                ->findOrFail($verification->id);

            if (in_array($lockedVerification->status, ['pending', 'verified'], true)) {
                throw new ConflictHttpException(
                    $lockedVerification->status === 'pending'
                        ? 'Company verification is already pending approval.'
                        : 'This company has already been verified.',
                );
            }

            if (! $this->isProfileComplete($lockedCompany)) {
                return 'incomplete_profile';
            }

            if (! $this->hasRequiredDocuments($lockedVerification)) {
                return 'verification_incomplete';
            }

            $lockedVerification->status = 'pending';
            $lockedVerification->submitted_at = now();
            $lockedVerification->authorization_confirmed_at = now();
            $lockedVerification->rejection_reason = null;
            $lockedVerification->rejection_note = null;
            $lockedVerification->save();

            ActivityLog::create([
                'user_id' => $lockedCompany->user_id,
                'actor_id' => $request->user()->id,
                'action' => 'employer.verification_submitted',
                'subject_type' => CompanyVerification::class,
                'subject_id' => $lockedVerification->id,
                'payload' => [
                    'description' => sprintf('%s submitted company verification documents', $lockedCompany->name),
                    'company_name' => $lockedCompany->name,
                ],
            ]);

            return 'pending';
        });

        if ($result === 'incomplete_profile') {
            return response()->json([
                'message' => 'Complete the company profile before submitting for verification.',
                'code' => 'incomplete_profile',
            ], 422);
        }

        if ($result === 'verification_incomplete') {
            return response()->json([
                'message' => 'Business registration and permit documents are required before submitting.',
                'code' => 'verification_incomplete',
            ], 422);
        }

        foreach (User::query()->where('role', 'admin')->get(['id', 'name', 'email']) as $admin) {
            app(NotificationService::class)->send(
                $admin,
                'employer_verification_submitted',
                'Employer verification submitted',
                sprintf('%s submitted company verification documents for review.', $company->name),
                [
                    'dedupe_key' => 'employer_verification-'.$verification->id,
                    'company_id' => $company->id,
                    'company_name' => $company->name,
                    'verification_status' => 'pending',
                ],
            );
        }

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
        if ($validated['status'] === 'verified'
            && (! $this->hasRequiredDocuments($companyVerification->load('documents')))) {
            throw new ConflictHttpException('Required verification documents must be submitted before approval.');
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

            if ($validated['status'] === 'verified') {
                $this->markExistingTokensForReauthentication($company);
            }

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

        $reviewedVerification = $companyVerification->fresh(['company.user']);
        $employer = $reviewedVerification?->company?->user;
        if ($reviewedVerification !== null && $employer !== null) {
            $approved = $reviewedVerification->status === 'verified';
            $title = $approved ? 'Company verification approved' : 'Company verification needs changes';
            $message = $approved
                ? 'Congratulations! '.$reviewedVerification->company->name.' was approved. You can now access your employer account.'
                : 'Your company verification was rejected: '.$reviewedVerification->rejection_reason;
            app(NotificationService::class)->send(
                $employer,
                'employer_verification_'.$reviewedVerification->status,
                $title,
                $message,
                [
                    'dedupe_key' => 'employer_verification_review-'.$reviewedVerification->id,
                    'company_id' => $reviewedVerification->company_id,
                    'company_name' => $reviewedVerification->company->name,
                    'verification_status' => $reviewedVerification->status,
                ],
            );
            Mail::to($employer->email)->send(new RoleNotificationMail(
                $title,
                $message,
                $employer->name,
            ));
        }

        return response()->json([
            'message' => 'Company verification review recorded.',
            'status' => $reviewedVerification?->status,
            'rejection_reason' => $reviewedVerification?->rejection_reason,
            'rejection_note' => $reviewedVerification?->rejection_note,
        ]);
    }

    public function documentDownload(Request $request, VerificationDocument $document): StreamedResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(401);
        }

        $company = $document->companyVerification->company;

        if ($user->role === 'admin' || $user->id === $company->user_id) {
            if (! $this->validDocumentPath($company->id, $document->file_path)) {
                abort(404, 'The verification document is unavailable.');
            }

            return $this->mediaStorage->privateDownload(
                $document->storage_disk,
                $document->file_path,
                $document->cloudinary_asset_id,
                $document->original_filename,
                $document->mime_type,
            );
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

    protected function profileStrength(Company $company): array
    {
        $fields = [
            'Company name' => trim((string) $company->name) !== '',
            'Company description' => trim((string) $company->description) !== '' && strlen(trim((string) $company->description)) >= 100,
            'Industry' => trim((string) $company->industry) !== '',
            'Company size' => trim((string) $company->company_size) !== '',
            'Location' => trim((string) $company->address) !== ''
                && trim((string) $company->city) !== ''
                && in_array($company->country, self::isoCountryCodes(), true),
            'Website' => filter_var($company->website, FILTER_VALIDATE_URL) !== false,
            'Company logo' => trim((string) $company->logo_path) !== '',
            'Contact information' => trim((string) $company->contact_name) !== ''
                && filter_var($company->contact_email, FILTER_VALIDATE_EMAIL) !== false
                && $company->contact_phone !== null
                && $this->isValidPhoneNumber($company->contact_phone),
        ];

        $weights = [
            'Company name' => 15,
            'Company description' => 15,
            'Industry' => 10,
            'Company size' => 10,
            'Location' => 15,
            'Website' => 10,
            'Company logo' => 15,
            'Contact information' => 10,
        ];

        $percent = 0;
        $missing = [];
        foreach ($fields as $label => $complete) {
            if ($complete) {
                $percent += $weights[$label];
            } else {
                $missing[] = $label;
            }
        }

        return [
            'percent' => $percent,
            'missing' => $missing,
        ];
    }

    protected function isProfileComplete(Company $company): bool
    {
        return $company->name !== null
            && trim((string) $company->name) !== ''
            && $company->company_size !== null
            && in_array($company->country, self::isoCountryCodes(), true)
            && $company->address !== null
            && $company->city !== null
            && $company->contact_name !== null
            && $company->contact_phone !== null
            && $this->isValidPhoneNumber($company->contact_phone)
            && $company->contact_email !== null
            && $company->description !== null
            && trim((string) $company->description) !== ''
            && $company->industry !== null
            && trim((string) $company->industry) !== '';
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

        if (in_array($verification->status, ['pending', 'verified', 'rejected'], true)) {
            return;
        }

        $verification->status = 'incomplete';
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
            'country' => $company->country,
            'city' => $company->city,
            'industry' => $company->industry,
            'website' => $company->website,
            'description' => $company->description,
            'contact_name' => $company->contact_name,
            'contact_phone' => $company->contact_phone,
            'contact_email' => $company->contact_email,
            'logo_path' => $company->logo_path,
            'logo_url' => $company->logo_path
                ? $this->mediaStorage->publicImageUrl($company->logo_disk, $company->logo_path)
                : null,
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

    private static function isoCountryCodes(): array
    {
        return array_merge(
            explode(' ', self::ISO_COUNTRY_CODES),
            explode(' ', self::ADDITIONAL_ISO_COUNTRY_CODES),
        );
    }

    private function markExistingTokensForReauthentication(Company $company): void
    {
        $tokens = DB::table('personal_access_tokens')
            ->where('tokenable_type', $company->user->getMorphClass())
            ->where('tokenable_id', $company->user_id)
            ->lockForUpdate()
            ->get(['id', 'abilities']);

        foreach ($tokens as $token) {
            $abilities = json_decode((string) $token->abilities, true);
            if (! is_array($abilities)) {
                throw new RuntimeException('Unable to mark the employer session for reauthentication.');
            }
            if (in_array(self::REAUTHENTICATION_ABILITY, $abilities, true)) {
                continue;
            }

            $abilities[] = self::REAUTHENTICATION_ABILITY;
            DB::table('personal_access_tokens')
                ->where('id', $token->id)
                ->update(['abilities' => json_encode($abilities, JSON_THROW_ON_ERROR)]);
        }
    }

    private function isValidPhoneNumber(string $phone): bool
    {
        $phone = trim($phone);
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (
            ! preg_match('/^\+?[0-9][0-9\s().-]*[0-9]$/', $phone)
            || strlen($digits) < 7
            || strlen($digits) > 15
            || preg_match('/\(\s*\)/', $phone)
        ) {
            return false;
        }

        $depth = 0;
        foreach (str_split($phone) as $character) {
            if ($character === '(') {
                if ($depth !== 0) {
                    return false;
                }
                $depth++;
            } elseif ($character === ')') {
                $depth--;
                if ($depth < 0) {
                    return false;
                }
            }
        }

        return $depth === 0;
    }

    private function validDocumentPath(int $companyId, string $path): bool
    {
        return str_starts_with($path, 'employer-verifications/'.$companyId.'/')
            && preg_match('#^employer-verifications/[0-9]+/[a-f0-9-]+\.(pdf|jpg|jpeg|png)$#i', $path) === 1;
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
