<?php

namespace App\Http\Middleware;

use App\Models\JobListing;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureListingAcceptsApplications
{
    public function handle(Request $request, Closure $next): Response
    {
        $jobListing = $request->route('jobListing');

        if (! $jobListing instanceof JobListing && is_numeric($jobListing)) {
            $jobListing = JobListing::query()->findOrFail((int) $jobListing);
        }

        if (! $jobListing instanceof JobListing || ! $jobListing->canReceiveApplications()) {
            return response()->json([
                'message' => 'This listing is not currently accepting applications.',
                'code' => 'listing_not_open',
            ], 422);
        }

        return $next($request);
    }
}
