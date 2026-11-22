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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class EmployerJobListingController extends Controller
{
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
        $validated = $this->resolveCategory($validated);

        $listing = DB::transaction(function () use ($company, $validated): JobListing {
            $customCategory = isset($validated['custom_category_name'])
                ? Category::find($validated['category_id'])
                : null;
            $approvalStatus = $customCategory !== null
                ? ($customCategory->is_active ? 'approved' : 'pending')
                : 'not_required';
            $listing = $company->jobListings()->create([
                ...$this->listingAttributes($validated),
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
        $validated = $this->resolveCategory($validated);

        DB::transaction(function () use ($listing, $validated): void {
            $listing->fill($this->listingAttributes($validated))->save();

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

        if ($status === 'open' && ! $this->companyCanPublish($listing->company()->with('verification')->firstOrFail())) {
            return response()->json([
                'message' => 'Your company must be approved before publishing a listing.',
                'code' => 'company_not_verified',
            ], 403);
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
            $attributes['experience_required'] = (bool) ($validated['experience_required'] ?? false);
            $attributes['minimum_experience_years'] = $attributes['experience_required']
                ? (int) $validated['minimum_experience_years']
                : null;
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
}
