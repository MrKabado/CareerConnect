<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Company;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CompanyRatingController extends Controller
{
    private const REQUIRED_TENURE_MONTHS = 3;

    public function show(string $companySlug): JsonResponse
    {
        $company = $this->companyBySlug($companySlug);
        $user = Auth::guard('sanctum')->user();

        return response()->json($this->ratingSummary($company, $user));
    }

    public function save(Request $request, string $companySlug): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'review' => ['nullable', 'string', 'max:1000'],
        ]);
        $company = $this->companyBySlug($companySlug);

        if ($company === null) {
            abort(404, 'Company not found.');
        }

        /** @var User $applicant */
        $applicant = $request->user();
        [$isEligible, , , $reason] = $this->eligibility($applicant, $company);

        if (! $isEligible) {
            return response()->json([
                'message' => $reason === 'current_employee'
                    ? 'You can rate this company after your employer records that your employment has ended.'
                    : 'Only former employees with at least three months of employment can rate this company.',
                'code' => 'company_rating_not_eligible',
            ], 403);
        }

        $company->ratings()->updateOrCreate(
            ['applicant_id' => $applicant->id],
            [
                'rating' => $validated['rating'],
                'review' => isset($validated['review']) ? trim($validated['review']) : null,
            ],
        );

        return response()->json([
            ...$this->ratingSummary($company, $applicant),
            'message' => 'Your company rating was saved.',
        ]);
    }

    /**
     * @return array{average_rating: ?float, rating_count: int, user_rating: ?array{rating: int, review: ?string}, can_rate: bool, eligible_at: ?string, employment: ?array{status: string, started_at: string, ended_at: ?string, meets_minimum_tenure: bool}, ineligibility_reason: ?string}
     */
    private function ratingSummary(?Company $company, ?User $user): array
    {
        $eligibleApplicantIds = $company === null ? [] : $this->eligibleApplicantIds($company);
        $ratings = $company?->ratings()->whereIn('applicant_id', $eligibleApplicantIds);
        $ratingCount = $ratings?->count() ?? 0;
        $averageRating = $ratingCount > 0 ? round((float) $ratings->avg('rating'), 1) : null;
        [$isEligible, $eligibleAt, $employment, $reason] = $company !== null && $user?->role === 'applicant'
            ? $this->eligibility($user, $company)
            : [false, null, null, null];
        $userRating = $company !== null && $user?->role === 'applicant' && $isEligible
            ? $company->ratings()
                ->whereIn('applicant_id', $eligibleApplicantIds)
                ->where('applicant_id', $user->id)
                ->first()
            : null;

        return [
            'average_rating' => $averageRating,
            'rating_count' => $ratingCount,
            'user_rating' => $userRating === null
                ? null
                : [
                    'rating' => $userRating->rating,
                    'review' => $userRating->review,
                ],
            'can_rate' => $isEligible,
            'eligible_at' => $eligibleAt?->toISOString(),
            'employment' => $employment === null ? null : [
                'status' => $employment->employment_ended_at === null ? 'current' : 'former',
                'started_at' => $employment->hired_at->toISOString(),
                'ended_at' => $employment->employment_ended_at?->toDateString(),
                'meets_minimum_tenure' => $this->hasMinimumTenure($employment),
            ],
            'ineligibility_reason' => $reason,
        ];
    }

    /**
     * @return array{0: bool, 1: ?CarbonImmutable, 2: ?Application, 3: ?string}
     */
    private function eligibility(User $applicant, Company $company): array
    {
        $employments = $this->hiredApplications($company)
            ->where('applicant_id', $applicant->id)
            ->orderByDesc('hired_at')
            ->get(['id', 'applicant_id', 'hired_at', 'employment_ended_at']);

        if ($employments->isEmpty()) {
            return [false, null, null, null];
        }

        $currentEmployment = $employments->first(fn (Application $application): bool => $application->employment_ended_at === null);
        if ($currentEmployment !== null) {
            return [false, null, $currentEmployment, 'current_employee'];
        }

        $qualifyingEmployment = $employments->first(fn (Application $application): bool => $this->hasMinimumTenure($application));
        if ($qualifyingEmployment !== null) {
            $eligibleAt = CarbonImmutable::parse($qualifyingEmployment->employment_ended_at->toDateString(), config('app.timezone'));

            return [true, $eligibleAt, $qualifyingEmployment, null];
        }

        return [false, null, $employments->first(), 'minimum_tenure'];
    }

    /**
     * @return list<int>
     */
    private function eligibleApplicantIds(Company $company): array
    {
        return $this->hiredApplications($company)
            ->get(['id', 'applicant_id', 'hired_at', 'employment_ended_at'])
            ->groupBy('applicant_id')
            ->filter(function ($employments): bool {
                if ($employments->contains(fn (Application $application): bool => $application->employment_ended_at === null)) {
                    return false;
                }

                return $employments->contains(fn (Application $application): bool => $this->hasMinimumTenure($application));
            })
            ->keys()
            ->map(fn ($applicantId): int => (int) $applicantId)
            ->all();
    }

    private function hiredApplications(Company $company): Builder
    {
        return Application::query()
            ->where('status', 'hired')
            ->whereNotNull('hired_at')
            ->whereHas('jobListing', fn (Builder $listing): Builder => $listing->where('company_id', $company->id));
    }

    private function hasMinimumTenure(Application $application): bool
    {
        if ($application->hired_at === null || $application->employment_ended_at === null) {
            return false;
        }

        $minimumEndDate = CarbonImmutable::instance($application->hired_at)
            ->addMonthsNoOverflow(self::REQUIRED_TENURE_MONTHS);
        $employmentEnd = CarbonImmutable::parse($application->employment_ended_at->toDateString(), config('app.timezone'))
            ->endOfDay();

        return $employmentEnd->greaterThanOrEqualTo($minimumEndDate);
    }

    private function companyBySlug(string $slug): ?Company
    {
        return Company::query()
            ->get(['id', 'name'])
            ->first(fn (Company $company): bool => Str::slug($company->name) === Str::slug($slug));
    }
}
