<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PhilippineLocationUnavailable extends RuntimeException
{
    public function render(Request $request): JsonResponse
    {
        Log::warning('PSGC Cloud location data is unavailable.', [
            'exception' => $this->getPrevious()?->getMessage(),
        ]);

        return response()->json([
            'message' => 'Philippine location data is temporarily unavailable. Please try again.',
        ], 503);
    }
}
