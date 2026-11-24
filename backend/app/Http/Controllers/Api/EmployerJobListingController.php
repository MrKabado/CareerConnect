<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobListingRequest;
use App\Http\Requests\UpdateJobListingStatusRequest;
use App\Http\Resources\JobListingResource;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Company;
use App\Models\JobListing;
use App\Services\JobLocationGeocoder;
use App\Services\NotificationService;
use App\Services\PhilippineLocationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EmployerJobListingController extends Controller
{
    public function __construct(
        private JobLocationGeocoder $jobLocationGeocoder,
        private PhilippineLocationService $locations,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'in:draft,open,closed,full,expired,deactivated'],
            'listing_type' => ['sometimes', 'in:job,ojt'],
            'keyword' => ['sometimes', 'string', 'max:120'],
            'location' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $company = $request->user()->company()->firstOrFail();
        $company->jobListings()
            ->where('status', 'open')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired']);
        $company->jobListings()
            ->where('status', 'open')
            ->withCount('applications')
            ->get()
            ->each(function (JobListing $listing): void {
                $limit = $listing->applicant_limit
                    ?? ($listing->listing_type === 'ojt' ? $listing->ojtDetails?->slots : null);
                if ($limit !== null && $listing->applications_count >= (int) $limit) {
                    $listing->status = 'full';
                    $listing->save();
                }
            });
        $listings = $company->jobListings()
            ->with($this->listingRelations())
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->when(isset($filters['listing_type']), fn (Builder $query): Builder => $query->where('listing_type', $filters['listing_type']))
            ->when(isset($filters['keyword']), fn (Builder $query): Builder => $query->where('title', 'like', '%'.$filters['keyword'].'%'))
            ->when(isset($filters['location']), fn (Builder $query): Builder => $query->where('location', 'like', '%'.$filters['location'].'%'))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return JobListingResource::collection($listings);
    }

    public function show(Request $request, int $jobListing): JobListingResource
    {
        $listing = $request->user()->company()->firstOrFail()->jobListings()
            ->with($this->listingRelations())
            ->findOrFail($jobListing);

        Gate::authorize('view', $listing);

        return new JobListingResource($listing);
    }

    public function store(JobListingRequest $request): JsonResponse
    {
        Gate::authorize('create', JobListing::class);
        $company = $request->user()->company()->firstOrFail();
        $validated = $request->validated();
        $validated = $this->resolveLocation($validated);
        $validated = $this->resolveCategory($validated);
        $coordinates = $this->jobLocationGeocoder->geocode($validated['location'] ?? null);

        $listing = DB::transaction(function () use ($company, $validated, $coordinates): JobListing {
            $customCategory = isset($validated['custom_category_name'])
                ? Category::find($validated['category_id'])
                : null;
            $approvalStatus = $customCategory !== null
                ? ($customCategory->is_active ? 'approved' : 'pending')
                : 'not_required';
            $listing = $company->jobListings()->create([
                ...$this->listingAttributes($validated),
                'latitude' => $coordinates['latitude'] ?? null,
                'longitude' => $coordinates['longitude'] ?? null,
                'status' => 'draft',
                'published_at' => null,
                'approval_status' => $approvalStatus,
                'approval_reason' => null,
                'approval_reviewed_at' => null,
            ]);

            if ($validated['listing_type'] === 'ojt') {
                $listing->ojtDetails()->create($this->ojtAttributes($validated));
            }

            return $listing;
        });

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'actor_id' => $request->user()->id,
            'action' => 'job_listing.created',
            'subject_type' => JobListing::class,
            'subject_id' => $listing->id,
            'payload' => [
                'description' => sprintf('%s created the %s listing', $company->name, $listing->title),
                'company_name' => $company->name,
                'listing_title' => $listing->title,
            ],
        ]);

        return (new JobListingResource($listing->load($this->listingRelations())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(JobListingRequest $request, int $jobListing): JobListingResource
    {
        $listing = $request->user()->company()->firstOrFail()->jobListings()->findOrFail($jobListing);
        Gate::authorize('update', $listing);
        $validated = $request->validated();
        $validated = $this->resolveLocation($validated);
        $validated = $this->resolveCategory($validated);
        $location = $validated['location'] ?? $listing->location;
        $locationChanged = trim((string) $location) !== trim((string) $listing->location);
        $coordinates = $locationChanged || $listing->latitude === null || $listing->longitude === null
            ? $this->jobLocationGeocoder->geocode($location)
            : ['latitude' => $listing->latitude, 'longitude' => $listing->longitude];

        DB::transaction(function () use ($listing, $validated, $coordinates): void {
            $listing->fill($this->listingAttributes($validated));
            $listing->latitude = $coordinates['latitude'] ?? null;
            $listing->longitude = $coordinates['longitude'] ?? null;
            $listing->save();
            if (($validated['save_as_draft'] ?? false) === true) {
                $listing->status = 'draft';
                $listing->published_at = null;
                $listing->save();
            }
            if ($listing->status === 'open'
                && $listing->listing_type === 'job'
                && ($listing->salary_min === null
                    || $listing->salary_max === null
                    || $listing->salary_max < $listing->salary_min)) {
                throw ValidationException::withMessages([
                    'salary_min' => [$listing->salary_min === null || $listing->salary_max === null
                        ? 'Salary information is required before publishing this job listing.'
                        : 'The minimum salary must be lower than the maximum salary.'],
                    'salary_max' => [$listing->salary_min === null || $listing->salary_max === null
                        ? 'Salary information is required before publishing this job listing.'
                        : 'The maximum salary must be higher than the minimum salary.'],
                ]);
            }

            if (isset($validated['custom_category_name'])) {
                $category = Category::find($validated['category_id']);
                if ($category?->is_active) {
                    $listing->approval_status = 'approved';
                    $listing->approval_reason = null;
                    $listing->approval_reviewed_at = now();
                } else {
                    $listing->approval_status = 'pending';
                    $listing->approval_reason = null;
                    $listing->approval_reviewed_at = null;
                }
            } else {
                $listing->approval_status = 'not_required';
                $listing->approval_reason = null;
                $listing->approval_reviewed_at = null;
            }
            $listing->save();

            if ($validated['listing_type'] === 'ojt') {
                $listing->ojtDetails()->updateOrCreate([], $this->ojtAttributes($validated));
            } else {
                $listing->ojtDetails()->delete();
            }
        });

        return new JobListingResource($listing->refresh()->load($this->listingRelations()));
    }

    public function updateStatus(UpdateJobListingStatusRequest $request, int $jobListing): JsonResponse
    {
        $listing = $request->user()->company()->firstOrFail()->jobListings()->findOrFail($jobListing);
        Gate::authorize('update', $listing);
        $status = $request->validated('status');
        $transitions = [
            'draft' => ['open'],
            'open' => ['closed', 'draft', 'full'],
            'closed' => ['open', 'draft'],
            'full' => ['open', 'closed'],
            'expired' => ['open', 'closed', 'draft'],
            'deactivated' => [],
        ];

        if ($status !== $listing->status && ! in_array($status, $transitions[$listing->status], true)) {
            return response()->json([
                'message' => 'This listing status transition is not allowed.',
                'code' => 'invalid_status_transition',
            ], 422);
        }

        if ($status === 'open' && ! $this->hasRequiredPublishDetails($listing)) {
            throw ValidationException::withMessages($this->missingPublishDetails($listing));
        }

        if ($status === 'open' && ! $this->companyCanPublish($listing->company()->with('verification')->firstOrFail())) {
            return response()->json([
                'message' => 'Your company must be approved before publishing a listing.',
                'code' => 'company_not_verified',
            ], 403);
        }
        if ($status === 'open'
            && $listing->listing_type === 'job'
            && ($listing->salary_min === null
                || $listing->salary_max === null
                || $listing->salary_max < $listing->salary_min)) {
            throw ValidationException::withMessages([
                'salary_min' => [$listing->salary_min === null || $listing->salary_max === null
                    ? 'Salary information is required before publishing this job listing.'
                    : 'The minimum salary cannot be higher than the maximum salary.'],
                'salary_max' => [$listing->salary_min === null || $listing->salary_max === null
                    ? 'Salary information is required before publishing this job listing.'
                    : 'The minimum salary cannot be higher than the maximum salary.'],
            ]);
        }
        if ($status === 'open' && ! $listing->category?->is_active) {
            return response()->json([
                'message' => 'Custom categories must be approved by an administrator before publishing.',
                'code' => 'category_pending_approval',
            ], 422);
        }
        if ($status === 'open'
            && ($listing->approval_status === 'pending' || $listing->approval_status === 'rejected')) {
            return response()->json([
                'message' => $listing->approval_status === 'rejected'
                    ? 'This listing was rejected for custom-category approval: '.$listing->approval_reason
                    : 'This listing is awaiting custom-category approval.',
                'code' => 'listing_category_approval_required',
                'approval_status' => $listing->approval_status,
                'approval_reason' => $listing->approval_reason,
            ], 422);
        }

        if ($status === 'open' && $listing->expires_at !== null && $listing->expires_at->isPast()) {
            return response()->json([
                'message' => 'This listing has expired and cannot be reopened.',
                'code' => 'listing_expired',
            ], 422);
        }

        if ($status === 'open') {
            $applicantLimit = $listing->applicant_limit
                ?? ($listing->listing_type === 'ojt' ? $listing->ojtDetails?->slots : null);
            $applicationCount = $listing->applications()->count();
            if ($applicantLimit !== null && $applicationCount >= (int) $applicantLimit) {
                $status = 'full';
            }
        }

        $listing->status = $status;
        $listing->published_at = match ($status) {
            'open' => $status === $listing->getOriginal('status') ? $listing->published_at : now(),
            'draft' => null,
            default => $listing->published_at,
        };
        $listing->save();

        app(NotificationService::class)->send(
            $request->user(),
            'listing_status_changed',
            'Listing status updated',
            sprintf('%s is now %s.', $listing->title, $status),
            [
                'dedupe_key' => 'listing_status-'.$listing->id.'-'.$status,
                'job_listing_id' => $listing->id,
                'job_listing_title' => $listing->title,
                'listing_status' => $status,
            ],
        );

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'actor_id' => $request->user()->id,
            'action' => 'job_listing.status_changed',
            'subject_type' => JobListing::class,
            'subject_id' => $listing->id,
            'payload' => [
                'description' => sprintf('%s changed to %s', $listing->title, $status),
                'listing_title' => $listing->title,
                'status' => $status,
            ],
        ]);

        return response()->json([
            'message' => 'Listing status updated.',
            'listing' => new JobListingResource($listing->load($this->listingRelations())),
        ]);
    }

    public function destroy(Request $request, int $jobListing): JsonResponse
    {
        $listing = $request->user()->company()->firstOrFail()->jobListings()->findOrFail($jobListing);
        Gate::authorize('delete', $listing);

        $listing->status = 'closed';
        $listing->save();

        return response()->json([
            'message' => 'Listing archived.',
            'status' => $listing->status,
        ]);
    }

    private function listingAttributes(array $validated): array
    {
        $attributes = Arr::only($validated, [
            'category_id',
            'listing_type',
            'title',
            'description',
            'responsibilities',
            'requirements',
            'location',
            'street_address',
            'region_code',
            'region_name',
            'province_code',
            'province_name',
            'city_municipality_code',
            'city_municipality_name',
            'barangay_code',
            'barangay_name',
            'zip_code',
            'work_setup',
            'employment_type',
            'salary_min',
            'salary_max',
            'applicant_limit',
            'expires_at',
            'custom_category_name',
        ]);

        if ($validated['listing_type'] === 'job') {
            $attributes['required_skills'] = array_values($validated['required_skills'] ?? []);
            if (array_key_exists('experience_required', $validated)) {
                $attributes['experience_required'] = (bool) $validated['experience_required'];
                $attributes['minimum_experience_years'] = $attributes['experience_required']
                    ? (isset($validated['minimum_experience_years']) ? (int) $validated['minimum_experience_years'] : null)
                    : null;
            } elseif (array_key_exists('minimum_experience_years', $validated)) {
                $attributes['minimum_experience_years'] = $validated['minimum_experience_years'];
            }
        }

        return $attributes;
    }

    private function ojtAttributes(array $validated): array
    {
        return Arr::only($validated, [
            'duration_hours',
            'allowance_type',
            'allowance_amount',
            'slots',
            'accepted_courses',
            'moa_accepted',
        ]);
    }

    private function listingRelations(): array
    {
        return [
            'category:id,name',
            'company:id,name,city,logo_path,logo_disk',
            'ojtDetails:job_listing_id,duration_hours,allowance_type,allowance_amount,slots,accepted_courses,moa_accepted',
        ];
    }

    private function resolveLocation(array $validated): array
    {
        $addressKeys = [
            'region_code',
            'province_code',
            'city_municipality_code',
            'barangay_code',
            'street_address',
            'zip_code',
        ];
        if (count(array_intersect($addressKeys, array_keys($validated))) === 0) {
            return $validated;
        }

        $isDraft = (bool) ($validated['save_as_draft'] ?? false);
        $requiresPhysicalAddress = ! $isDraft
            && in_array($validated['work_setup'] ?? null, ['onsite', 'hybrid'], true);
        $address = $this->locations->resolveAddress(
            $validated,
            required: ! $isDraft,
            requireBarangay: $requiresPhysicalAddress,
        );
        if ($requiresPhysicalAddress && blank($address['street_address'])) {
            throw ValidationException::withMessages([
                'street_address' => ['Enter the street address for this physical workplace.'],
            ]);
        }
        $validated = [...$validated, ...$address];

        if ($address['city_municipality_name'] !== null) {
            $validated['location'] = $this->locations->formatAddress($address);
        }

        return $validated;
    }

    private function resolveCategory(array $validated): array
    {
        $customName = trim((string) ($validated['custom_category_name'] ?? ''));
        if ($customName === '') {
            $validated['custom_category_name'] = null;

            return $validated;
        }

        $normalized = mb_strtolower(preg_replace('/\s+/', ' ', $customName));
        $category = Category::query()
            ->get(['id', 'name', 'is_active', 'is_custom'])
            ->first(fn (Category $item): bool => mb_strtolower(preg_replace('/\s+/', ' ', trim($item->name))) === $normalized);

        if ($category === null) {
            $category = Category::create([
                'name' => mb_convert_case($customName, MB_CASE_TITLE, 'UTF-8'),
                'description' => 'Custom category submitted by an employer.',
                'is_active' => false,
                'is_custom' => true,
            ]);
        }

        $validated['category_id'] = $category->id;
        $validated['custom_category_name'] = $customName;

        return $validated;
    }

    private function companyCanPublish(Company $company): bool
    {
        return $company->is_verified && $company->verification?->status === 'verified';
    }

    private function hasRequiredPublishDetails(JobListing $listing): bool
    {
        $fields = $this->missingPublishDetails($listing);

        return $fields === [];
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function missingPublishDetails(JobListing $listing): array
    {
        $required = [
            'title' => $listing->title,
            'category_id' => $listing->category_id,
            'description' => $listing->description,
            'responsibilities' => $listing->responsibilities,
            'requirements' => $listing->requirements,
            'location' => $listing->location,
            'work_setup' => $listing->work_setup,
        ];
        if ($listing->listing_type === 'job') {
            $required['employment_type'] = $listing->employment_type;
            $required['salary_min'] = $listing->salary_min;
            $required['salary_max'] = $listing->salary_max;
        } else {
            $details = $listing->ojtDetails;
            $required['duration_hours'] = $details?->duration_hours;
            $required['allowance_type'] = $details?->allowance_type;
            $required['slots'] = $details?->slots;
            if ($details?->allowance_type === 'paid') {
                $required['allowance_amount'] = $details->allowance_amount;
            }
        }

        $missing = [];
        foreach ($required as $field => $value) {
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $missing[$field] = ["The {$field} field is required before publishing."];
            }
        }

        return $missing;
    }
}
