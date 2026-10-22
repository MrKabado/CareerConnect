<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobListingRequest;
use App\Http\Requests\UpdateJobListingStatusRequest;
use App\Http\Resources\JobListingResource;
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
            'status' => ['sometimes', 'in:draft,open,closed,deactivated'],
            'listing_type' => ['sometimes', 'in:job,ojt'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $company = $request->user()->company()->firstOrFail();
        $listings = $company->jobListings()
            ->with($this->listingRelations())
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->when(isset($filters['listing_type']), fn (Builder $query): Builder => $query->where('listing_type', $filters['listing_type']))
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

        $listing = DB::transaction(function () use ($company, $validated): JobListing {
            $listing = $company->jobListings()->create([
                ...$this->listingAttributes($validated),
                'status' => 'draft',
                'published_at' => null,
            ]);

            if ($validated['listing_type'] === 'ojt') {
                $listing->ojtDetails()->create($this->ojtAttributes($validated));
            }

            return $listing;
        });

        return (new JobListingResource($listing->load($this->listingRelations())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(JobListingRequest $request, int $jobListing): JobListingResource
    {
        $listing = $request->user()->company()->firstOrFail()->jobListings()->findOrFail($jobListing);
        Gate::authorize('update', $listing);
        $validated = $request->validated();

        DB::transaction(function () use ($listing, $validated): void {
            $listing->fill($this->listingAttributes($validated))->save();

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
            'open' => ['closed', 'draft'],
            'closed' => ['open', 'draft'],
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

        $listing->status = $status;
        $listing->published_at = match ($status) {
            'open' => $status === $listing->getOriginal('status') ? $listing->published_at : now(),
            'draft' => null,
            default => $listing->published_at,
        };
        $listing->save();

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
        return Arr::only($validated, [
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
        ]);
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
            'company:id,name,city,logo_path',
            'ojtDetails:job_listing_id,duration_hours,allowance_type,allowance_amount,slots,accepted_courses,moa_accepted',
        ];
    }

    private function companyCanPublish(Company $company): bool
    {
        return $company->is_verified && $company->verification?->status === 'verified';
    }
}
