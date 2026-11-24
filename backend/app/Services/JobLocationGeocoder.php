<?php

namespace App\Services;

use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class JobLocationGeocoder
{
    private const PRECISE_PLACE_TYPES = [
        'house',
        'building',
        'office',
        'commercial',
        'industrial',
        'retail',
        'university',
        'college',
        'school',
        'hospital',
        'clinic',
        'company',
        'factory',
        'warehouse',
        'restaurant',
        'hotel',
        'bank',
        'library',
        'supermarket',
        'shop',
        'government',
        'station',
        'airport',
    ];

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public function geocode(?string $location): ?array
    {
        $address = Str::squish($location ?? '');
        if ($address === '') {
            return null;
        }

        $cacheKey = 'job-location-geocode:'.hash('sha256', Str::lower($address));
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return ($cached['found'] ?? false) === true
                ? ['latitude' => (float) $cached['latitude'], 'longitude' => (float) $cached['longitude']]
                : null;
        }

        try {
            $response = $this->search($address);
        } catch (ConnectionException|LockTimeoutException $exception) {
            Log::warning('Job location geocoding failed.', [
                'address_hash' => hash('sha256', Str::lower($address)),
                'exception' => $exception::class,
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('Job location geocoding returned an unsuccessful response.', [
                'address_hash' => hash('sha256', Str::lower($address)),
                'status' => $response->status(),
            ]);

            return null;
        }

        $results = $response->json();
        $result = is_array($results) ? ($results[0] ?? null) : null;
        if (! is_array($result)) {
            Cache::put($cacheKey, ['found' => false], now()->addDay());

            return null;
        }

        $latitude = filter_var($result['lat'] ?? null, FILTER_VALIDATE_FLOAT);
        $longitude = filter_var($result['lon'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($latitude === false || $longitude === false
            || $latitude < -90 || $latitude > 90
            || $longitude < -180 || $longitude > 180) {
            Log::warning('Job location geocoding returned invalid coordinates.', [
                'address_hash' => hash('sha256', Str::lower($address)),
            ]);

            return null;
        }

        if (! in_array(Str::lower((string) ($result['type'] ?? '')), self::PRECISE_PLACE_TYPES, true)) {
            Cache::put($cacheKey, ['found' => false], now()->addDay());

            return null;
        }

        $coordinates = [
            'found' => true,
            'latitude' => (float) $latitude,
            'longitude' => (float) $longitude,
        ];
        Cache::put($cacheKey, $coordinates, now()->addMonths(6));

        return [
            'latitude' => $coordinates['latitude'],
            'longitude' => $coordinates['longitude'],
        ];
    }

    private function search(string $address): \Illuminate\Http\Client\Response
    {
        $sendRequest = function () use ($address): \Illuminate\Http\Client\Response {
            $lastRequestAt = Cache::get('openstreetmap-nominatim-last-request-at');
            if (is_numeric($lastRequestAt)) {
                $waitMicroseconds = 1_000_000 - (int) ((microtime(true) - (float) $lastRequestAt) * 1_000_000);
                if ($waitMicroseconds > 0) {
                    usleep($waitMicroseconds);
                }
            }

            try {
                return Http::acceptJson()
                    ->withUserAgent(config('services.openstreetmap.user_agent'))
                    ->timeout(5)
                    ->get('https://nominatim.openstreetmap.org/search', [
                        'q' => $address,
                        'format' => 'jsonv2',
                        'limit' => 1,
                        'countrycodes' => 'ph',
                    ]);
            } finally {
                Cache::put('openstreetmap-nominatim-last-request-at', microtime(true), now()->addMinute());
            }
        };

        if (app()->environment('testing')) {
            return $sendRequest();
        }

        return Cache::lock('openstreetmap-nominatim-request', 10)->block(10, $sendRequest);
    }
}
