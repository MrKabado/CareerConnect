<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\CompanyVerification;
use App\Models\IdentityVerification;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function adminActivity(): JsonResponse
    {
        $logs = ActivityLog::query()
            ->with(['user:id,name,email', 'actor:id,name,email'])
            ->latest('created_at')
            ->limit(10)
            ->get();

        $data = $logs->map(function (ActivityLog $log): array {
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

        return response()->json(['data' => $data]);
    }

    public function admin(): JsonResponse
    {
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

        return response()->json([
            'data' => [
                'total_job_listings' => $listings?->count() ?? 0,
                'active_job_listings' => $listings?->where('status', 'open')->count() ?? 0,
                'total_applications' => $company === null ? 0 : (clone $applications)->count(),
                'pending_applications' => $company === null ? 0 : (clone $applications)->where('status', 'pending')->count(),
            ],
        ]);
    }

    public function applicant(Request $request): JsonResponse
    {
        $applications = $request->user()->applications();

        return response()->json([
            'data' => [
                'total_applications' => (clone $applications)->count(),
                'pending_applications' => (clone $applications)->where('status', 'pending')->count(),
                'accepted_applications' => (clone $applications)->where('status', 'hired')->count(),
                'rejected_applications' => (clone $applications)->where('status', 'rejected')->count(),
            ],
        ]);
    }
}
