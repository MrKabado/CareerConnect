<?php

namespace App\Http\Middleware;

use App\Services\ApplicantApplicationEligibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplicantCanApply
{
    public function __construct(
        private readonly ApplicantApplicationEligibility $applicationEligibility,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Authentication is required to submit applications.',
                'code' => 'unauthenticated',
            ], 401);
        }

        if ($user->role !== 'applicant' || ! $user->isActive()) {
            return response()->json([
                'message' => 'Only active applicants may submit applications.',
                'code' => 'application_ineligible',
            ], 403);
        }

        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Verify your email address before submitting applications.',
                'code' => 'email_verification_required',
            ], 403);
        }

        $verification = $this->applicationEligibility->currentVerification($user);
        $verificationReason = $this->applicationEligibility->verificationReason($verification);
        if ($verificationReason !== null) {
            return response()->json([
                'message' => $verificationReason,
                'code' => 'identity_verification_required',
                'identity_verification_status' => $verification?->status ?? 'unverified',
                'rejection_reason' => $verification?->rejection_reason,
            ], 403);
        }

        return $next($request);
    }
}
