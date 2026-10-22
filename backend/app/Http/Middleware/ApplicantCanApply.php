<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplicantCanApply
{
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

        if ($user->email_verified_at === null || $user->identityVerification?->status !== 'verified') {
            return response()->json([
                'message' => 'Verify your email address and identity before submitting applications.',
                'code' => 'application_ineligible',
            ], 403);
        }

        return $next($request);
    }
}
