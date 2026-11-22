<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\Interview;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function adminActivity(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $logs = ActivityLog::query()
            ->with(['user:id,name,email', 'actor:id,name,email'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        $data = $logs->getCollection()->map(function (ActivityLog $log): array {
            $labels = [
                'admin.user_status_updated' => 'Account access changed',
                'admin.user_updated' => 'User account updated',
                'admin.company_verification_reviewed' => 'Employer verification reviewed',
                'admin.identity_verification_reviewed' => 'Applicant verification reviewed',
                'account.registered' => 'New account registered',
                'employer.verification_submitted' => 'Employer verification submitted',
                'job_listing.created' => 'New job listing created',
                'job_listing.status_changed' => 'Job listing status changed',
                'application.submitted' => 'New job application submitted',
            ];

            $action = (string) $log->action;
            $payload = $log->payload ?? [];

            return [
                'id' => $log->id,
                'action' => $action,
                'title' => $labels[$action] ?? 'Platform activity',
                'description' => is_string($payload['description'] ?? null)
                    ? $payload['description']
                    : 'CareerConnect system update',
                'actor_name' => $log->actor?->name,
                'subject_name' => $log->user?->name
                    ?? (is_string($payload['company_name'] ?? null) ? $payload['company_name'] : null),
                'created_at' => $log->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'links' => $logs->linkCollection(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function admin(): JsonResponse
    {
        $pendingEmployerVerifications = CompanyVerification::query()->where('status', 'pending')->count();
        $pendingApplicantVerifications = IdentityVerification::query()->where('status', 'pending')->count();
        $inactiveListings = JobListing::query()->whereIn('status', ['closed', 'deactivated'])->count();
        $recentApplications = Application::query()->where('applied_at', '>=', now()->subDays(7))->count();
        $recommendations = [];

        if ($pendingEmployerVerifications > 0) {
            $recommendations[] = [
                'id' => 'pending-employer-verifications',
                'title' => $pendingEmployerVerifications.' employer verification'.($pendingEmployerVerifications === 1 ? '' : 's').' awaiting review',
                'message' => 'Prioritize these submissions to keep verified employers able to post jobs.',
                'priority' => 'high',
                'action' => '/admin/verifications',
            ];
        }
        if ($pendingApplicantVerifications > 0) {
            $recommendations[] = [
                'id' => 'pending-applicant-verifications',
                'title' => $pendingApplicantVerifications.' applicant verification'.($pendingApplicantVerifications === 1 ? '' : 's').' awaiting review',
                'message' => 'Review identity submissions that are blocking applicants from the full application flow.',
                'priority' => 'medium',
                'action' => '/admin/verifications',
            ];
        }
        if ($inactiveListings > 0) {
            $recommendations[] = [
                'id' => 'inactive-listings',
                'title' => $inactiveListings.' inactive job listing'.($inactiveListings === 1 ? '' : 's').' detected',
                'message' => 'Check closed or deactivated listings for stale marketplace activity.',
                'priority' => 'low',
                'action' => '/admin/reports',
            ];
        }
        $recommendations[] = [
            'id' => 'application-trend',
            'title' => $recentApplications.' applications submitted in the last 7 days',
            'message' => 'Use the reports overview to monitor application trends and unusual activity.',
            'priority' => 'medium',
            'action' => '/admin/reports',
        ];

        return response()->json([
            'data' => [
                'total_applicants' => User::query()->where('role', 'applicant')->count(),
                'total_employers' => User::query()->where('role', 'employer')->count(),
                'pending_verifications' => [
                    'total' => IdentityVerification::query()->where('status', 'pending')->count()
                        + CompanyVerification::query()->where('status', 'pending')->count(),
                    'applicants' => IdentityVerification::query()->where('status', 'pending')->count(),
                    'employers' => CompanyVerification::query()->where('status', 'pending')->count(),
                ],
                'recommendations' => $recommendations,
                'total_job_listings' => JobListing::query()->count(),
                'active_job_listings' => JobListing::query()->where('status', 'open')->count(),
                'total_applications' => Application::query()->count(),
            ],
        ]);
    }

    public function employer(Request $request): JsonResponse
    {
        $company = $request->user()->company;
        $listings = $company?->jobListings();
        $applications = Application::query()
            ->whereHas('jobListing', fn ($query) => $query->where('company_id', $company?->id));
        $pendingApplications = $company === null
            ? 0
            : (clone $applications)->where('status', 'pending')->count();
        $upcomingInterviews = $company === null
            ? 0
            : Interview::query()
                ->where('status', 'scheduled')
                ->where('scheduled_at', '>=', now())
                ->whereHas('application.jobListing', fn ($query) => $query->where('company_id', $company->id))
                ->count();
        $unclearListings = $company === null
            ? 0
            : $company->jobListings()
                ->where(function ($query): void {
                    $query->whereNull('required_skills')
                        ->orWhereNull('minimum_experience_years');
                })
                ->where('status', 'open')
                ->count();
        $recommendations = [];

        if ($pendingApplications > 0) {
            $recommendations[] = [
                'id' => 'pending-applications',
                'title' => $pendingApplications.' pending application'.($pendingApplications === 1 ? '' : 's'),
                'message' => 'Review candidates with the highest match scores to move promising applicants forward.',
                'priority' => 'high',
                'action' => '/employer/applicants',
            ];
        }
        if ($upcomingInterviews > 0) {
            $recommendations[] = [
                'id' => 'upcoming-interviews',
                'title' => $upcomingInterviews.' upcoming interview'.($upcomingInterviews === 1 ? '' : 's'),
                'message' => 'Confirm meeting links and applicant instructions before each interview.',
                'priority' => 'medium',
                'action' => '/employer/applicants',
            ];
        }
        if ($unclearListings > 0) {
            $recommendations[] = [
                'id' => 'listing-requirements',
                'title' => $unclearListings.' active listing'.($unclearListings === 1 ? '' : 's').' may have incomplete requirements',
                'message' => 'Add required skills and clear experience expectations to improve applicant matching.',
                'priority' => 'medium',
                'action' => '/employer/listings',
            ];
        }
        if ($recommendations === []) {
            $recommendations[] = [
                'id' => 'hiring-progress',
                'title' => 'Hiring progress is up to date',
                'message' => 'No urgent application or interview actions are currently detected.',
                'priority' => 'low',
                'action' => '/employer/applicants',
            ];
        }

        return response()->json([
            'data' => [
                'total_job_listings' => $listings?->count() ?? 0,
                'active_job_listings' => $listings?->where('status', 'open')->count() ?? 0,
                'total_applications' => $company === null ? 0 : (clone $applications)->count(),
                'pending_applications' => $pendingApplications,
                'upcoming_interviews' => $upcomingInterviews,
                'closed_listings' => $company === null ? 0 : (clone $listings)->whereIn('status', ['closed', 'full', 'expired'])->count(),
                'total_applicants' => $company === null ? 0 : (clone $applications)->distinct('applicant_id')->count('applicant_id'),
                'hired_applicants' => $company === null ? 0 : (clone $applications)->where('status', 'hired')->count(),
                'recommendations' => $recommendations,
            ],
        ]);
    }

    public function applicant(Request $request): JsonResponse
    {
        $user = $request->user();
        $applications = $user->applications();
        $profile = $user->applicantProfile()->with(['skills', 'categories', 'ojtDetails'])->first();
        $missingProfile = [];

        if (! $profile?->phone) {
            $missingProfile[] = 'phone number';
        }
        if (! $profile?->city) {
            $missingProfile[] = 'location';
        }
        if ($profile?->skills->isEmpty()) {
            $missingProfile[] = 'skills';
        }
        if (($profile?->categories->isEmpty() ?? true) && empty($profile?->other_categories)) {
            $missingProfile[] = 'job categories';
        }

        $upcomingInterviews = $user->interviewsAsApplicant()
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->count();
        $recommendations = [];

        if ($missingProfile !== []) {
            $recommendations[] = [
                'id' => 'profile-improvements',
                'title' => 'Complete your '.implode(', ', array_slice($missingProfile, 0, 3)),
                'message' => 'Adding these details can improve your eligibility and match percentage.',
                'priority' => 'high',
                'action' => '/profile',
            ];
        }
        if ($upcomingInterviews > 0) {
            $recommendations[] = [
                'id' => 'upcoming-interviews',
                'title' => $upcomingInterviews.' upcoming interview'.($upcomingInterviews === 1 ? '' : 's'),
                'message' => 'Review your interview date, time, and meeting link.',
                'priority' => 'high',
                'action' => '/applications',
            ];
        }

        $activeApplications = (clone $applications)->whereIn('status', ['pending', 'reviewing', 'shortlisted', 'interview'])->count();
        if ($activeApplications > 0) {
            $recommendations[] = [
                'id' => 'active-applications',
                'title' => $activeApplications.' active application'.($activeApplications === 1 ? '' : 's').' to monitor',
                'message' => 'Check application updates and respond promptly to employer invitations.',
                'priority' => 'medium',
                'action' => '/applications',
            ];
        }
        if ($recommendations === []) {
            $recommendations[] = [
                'id' => 'explore-opportunities',
                'title' => 'Explore opportunities that match your profile',
                'message' => 'Open Search Job or Recommendations to find relevant listings.',
                'priority' => 'low',
                'action' => '/job-search',
            ];
        }

        return response()->json([
            'data' => [
                'total_applications' => (clone $applications)->count(),
                'pending_applications' => (clone $applications)->where('status', 'pending')->count(),
                'accepted_applications' => (clone $applications)->where('status', 'hired')->count(),
                'rejected_applications' => (clone $applications)->where('status', 'rejected')->count(),
                'upcoming_interviews' => $upcomingInterviews,
                'recommendations' => $recommendations,
            ],
        ]);
    }
}
