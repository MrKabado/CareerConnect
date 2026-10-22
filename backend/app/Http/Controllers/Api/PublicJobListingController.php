<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobListingResource;
use App\Models\JobListing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PublicJobListingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validator = Validator::make($request->query(), [
            'keyword' => ['sometimes', 'string', 'max:120'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'location' => ['sometimes', 'string', 'max:255'],
            'listing_type' => ['sometimes', Rule::in(['job', 'ojt'])],
            'employment_type' => ['sometimes', Rule::in(['full_time', 'part_time', 'contract'])],
            'work_setup' => ['sometimes', Rule::in(['onsite', 'hybrid', 'remote'])],
            'min_salary' => ['sometimes', 'integer', 'min:0'],
            'max_salary' => ['sometimes', 'integer', 'min:0'],
            'min_allowance' => ['sometimes', 'integer', 'min:0'],
            'max_allowance' => ['sometimes', 'integer', 'min:0'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $validator->after(function ($validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            foreach ([['min_salary', 'max_salary'], ['min_allowance', 'max_allowance']] as [$minimum, $maximum]) {
                if (isset($validator->getData()[$minimum], $validator->getData()[$maximum])
                    && $validator->getData()[$maximum] < $validator->getData()[$minimum]) {
                    $validator->errors()->add($maximum, "The {$maximum} filter must be at least {$minimum}.");
                }
            }
        });

        $filters = $validator->validate();

        $listings = JobListing::query()
            ->publiclyVisible()
            ->with([
                'category:id,name',
                'company:id,name,city,logo_path',
                'ojtDetails:job_listing_id,duration_hours,allowance_type,allowance_amount,slots,accepted_courses,moa_accepted',
            ])
            ->when(isset($filters['keyword']), function (Builder $query) use ($filters): void {
                $keyword = '%'.$filters['keyword'].'%';
                $query->where(function (Builder $search) use ($keyword): void {
                    $search->where('title', 'like', $keyword)
                        ->orWhere('description', 'like', $keyword)
                        ->orWhere('responsibilities', 'like', $keyword)
                        ->orWhere('requirements', 'like', $keyword);
                });
            })
            ->when(isset($filters['category_id']), fn (Builder $query): Builder => $query->where('category_id', $filters['category_id']))
            ->when(isset($filters['location']), fn (Builder $query): Builder => $query->where('location', 'like', '%'.$filters['location'].'%'))
            ->when(isset($filters['listing_type']), fn (Builder $query): Builder => $query->where('listing_type', $filters['listing_type']))
            ->when(isset($filters['employment_type']), fn (Builder $query): Builder => $query->where('employment_type', $filters['employment_type']))
            ->when(isset($filters['work_setup']), fn (Builder $query): Builder => $query->where('work_setup', $filters['work_setup']))
            ->when(isset($filters['min_salary']), fn (Builder $query): Builder => $query
                ->where('listing_type', 'job')
                ->whereNotNull('salary_max')
                ->where('salary_max', '>=', $filters['min_salary']))
            ->when(isset($filters['max_salary']), fn (Builder $query): Builder => $query
                ->where('listing_type', 'job')
                ->whereNotNull('salary_min')
                ->where('salary_min', '<=', $filters['max_salary']))
            ->when(isset($filters['min_allowance']), fn (Builder $query): Builder => $query
                ->where('listing_type', 'ojt')
                ->whereHas('ojtDetails', fn (Builder $details): Builder => $details
                    ->where('allowance_type', 'paid')
                    ->where('allowance_amount', '>=', $filters['min_allowance'])))
            ->when(isset($filters['max_allowance']), fn (Builder $query): Builder => $query
                ->where('listing_type', 'ojt')
                ->whereHas('ojtDetails', fn (Builder $details): Builder => $details
                    ->where('allowance_type', 'paid')
                    ->where('allowance_amount', '<=', $filters['max_allowance'])))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return JobListingResource::collection($listings);
    }

    public function show(int $jobListing): JobListingResource
    {
        $listing = JobListing::query()
            ->publiclyVisible()
            ->with([
                'category:id,name',
                'company:id,name,city,logo_path',
                'ojtDetails:job_listing_id,duration_hours,allowance_type,allowance_amount,slots,accepted_courses,moa_accepted',
            ])
            ->findOrFail($jobListing);

        return new JobListingResource($listing);
    }
}
