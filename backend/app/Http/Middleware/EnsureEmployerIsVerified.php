<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployerIsVerified
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->hasRole('employer')) {
            return response()->json([
                'message' => 'Only verified employers may access this resource.',
                'code' => 'forbidden',
            ], 403);
        }

        $company = $user->company;

        if ($company === null || ! $company->is_verified) {
            return response()->json([
                'message' => 'Your company must be verified before you can perform this action.',
                'code' => 'company_not_verified',
            ], 403);
        }

        return $next($request);
    }
}
