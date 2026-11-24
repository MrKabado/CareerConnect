<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PhilippineLocationService;
use Illuminate\Http\JsonResponse;

class PhilippineLocationController extends Controller
{
    public function __construct(private readonly PhilippineLocationService $locations) {}

    public function regions(): JsonResponse
    {
        return response()->json(['data' => $this->locations->regions()]);
    }

    public function provinces(string $region): JsonResponse
    {
        return response()->json(['data' => $this->locations->provinces($region)]);
    }

    public function regionLocalities(string $region): JsonResponse
    {
        return response()->json(['data' => $this->locations->regionLocalities($region)]);
    }

    public function provinceLocalities(string $province): JsonResponse
    {
        return response()->json(['data' => $this->locations->provinceLocalities($province)]);
    }

    public function barangays(string $locality): JsonResponse
    {
        return response()->json(['data' => $this->locations->barangays($locality)]);
    }
}
