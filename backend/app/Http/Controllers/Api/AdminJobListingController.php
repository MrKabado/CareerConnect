<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeactivateJobListingRequest;
use App\Http\Resources\JobListingResource;
use App\Models\JobListing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminJobListingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['draft', 'open', 'closed', 'deactivated'])],
            'listing_type' => ['sometimes', Rule::in(['job', 'ojt'])],
            'keyword' => ['sometimes', 'string', 'max:120'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $listings = JobListing::query()
            ->with($this->listingRelations())
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->when(isset($filters['listing_type']), fn (Builder $query): Builder => $query->where('listing_type', $filters['listing_type']))
            ->when(isset($filters['keyword']), function (Builder $query) use ($filters): void {
                $keyword = '%'.$filters['keyword'].'%';
                $query->where(fn (Builder $search): Builder => $search
                    ->where('title', 'like', $keyword)
                    ->orWhere('location', 'like', $keyword));
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return JobListingResource::collection($listings);
    }

    public function show(JobListing $jobListing): JobListingResource
    {
        return new JobListingResource($jobListing->load($this->listingRelations(true)));
    }

    public function deactivate(DeactivateJobListingRequest $request, JobListing $jobListing): JsonResponse
    {
        if ($jobListing->status === 'deactivated') {
            return response()->json([
                'message' => 'This listing is already deactivated.',
                'code' => 'listing_already_deactivated',
            ], 409);
        }

        DB::transaction(function () use ($jobListing, $request): void {
            $jobListing->status = 'deactivated';
            $jobListing->save();
            $jobListing->adminActions()->create([
                'admin_user_id' => $request->user()->id,
                'action' => 'deactivated',
                'reason' => $request->validated('reason'),
            ]);
        });

        return response()->json([
            'message' => 'Listing deactivated.',
            'listing' => new JobListingResource($jobListing->refresh()->load($this->listingRelations(true))),
        ]);
    }

    public function restore(Request $request, JobListing $jobListing): JsonResponse
    {
        Gate::authorize('restore', $jobListing);
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($jobListing->status !== 'deactivated') {
            throw new HttpException(409, 'Only deactivated listings can be restored.');
        }

        DB::transaction(function () use ($jobListing, $request, $validated): void {
            $jobListing->status = 'closed';
            $jobListing->save();
            $jobListing->adminActions()->create([
                'admin_user_id' => $request->user()->id,
                'action' => 'restored',
                'reason' => $validated['reason'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Listing restored as closed.',
            'listing' => new JobListingResource($jobListing->refresh()->load($this->listingRelations(true))),
        ]);
    }

    private function listingRelations(bool $includeAdminActions = false): array
    {
        $relations = [
            'category:id,name',
            'company:id,name,city,logo_path',
            'ojtDetails:job_listing_id,duration_hours,allowance_type,allowance_amount,slots,accepted_courses,moa_accepted',
        ];

        if ($includeAdminActions) {
            $relations['adminActions'] = fn ($query) => $query
                ->orderBy('created_at')
                ->with('admin:id,name');
        }

        return $relations;
    }
}
