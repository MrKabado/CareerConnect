<?php

use App\Services\PhilippineLocationService;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

beforeEach(function (): void {
    Cache::flush();
    Config::set('services.psgc.base_url', 'https://psgc.test/api');
    Config::set('services.psgc.user_agent', 'CareerConnect tests');
});

function fakePhilippineLocations(): void
{
    Http::fake(function (HttpRequest $request) {
        $path = trim((string) parse_url($request->url(), PHP_URL_PATH), '/');

        return match ($path) {
            'api/regions' => Http::response([
                ['code' => '0100000000', 'name' => 'Region I'],
                ['code' => '1300000000', 'name' => 'NCR'],
            ]),
            'api/regions/0100000000/provinces' => Http::response([
                ['code' => '0102800000', 'name' => 'Ilocos Norte'],
            ]),
            'api/regions/1300000000/provinces' => Http::response([]),
            'api/regions/0100000000/cities-municipalities' => Http::response([]),
            'api/regions/1300000000/cities-municipalities' => Http::response([
                ['code' => '1374040000', 'name' => 'Quezon City', 'type' => 'City', 'zip_code' => '1100'],
            ]),
            'api/provinces/0102800000/cities-municipalities' => Http::response([
                ['code' => '0128010000', 'name' => 'Laoag City', 'type' => 'City', 'zip_code' => '2900'],
            ]),
            'api/cities-municipalities/0128010000/barangays' => Http::response([
                ['code' => '0128010001', 'name' => 'Barangay One'],
            ]),
            'api/cities-municipalities/1374040000/barangays' => Http::response([
                ['code' => '1374040001', 'name' => 'Barangay NCR'],
            ]),
            default => Http::response([], 404),
        };
    });
}

it('serves and caches PSGC location options', function (): void {
    fakePhilippineLocations();

    $this->getJson('/api/locations/regions')->assertOk()
        ->assertJsonPath('data.0.name', 'Region I');
    $this->getJson('/api/locations/regions')->assertOk();

    Http::assertSentCount(1);
});

it('resolves a province address and suggests the locality ZIP code', function (): void {
    fakePhilippineLocations();

    $address = app(PhilippineLocationService::class)->resolveAddress([
        'region_code' => '0100000000',
        'province_code' => '0102800000',
        'city_municipality_code' => '0128010000',
        'barangay_code' => '0128010001',
        'street_address' => '10 Main Street',
    ], required: true, requireBarangay: true);

    expect($address)
        ->toMatchArray([
            'region_name' => 'Region I',
            'province_name' => 'Ilocos Norte',
            'city_municipality_name' => 'Laoag City',
            'barangay_name' => 'Barangay One',
            'zip_code' => '2900',
        ]);
});

it('resolves NCR localities without requiring a province and preserves a manual ZIP code', function (): void {
    fakePhilippineLocations();

    $address = app(PhilippineLocationService::class)->resolveAddress([
        'region_code' => '1300000000',
        'city_municipality_code' => '1374040000',
        'barangay_code' => '1374040001',
        'street_address' => '1 Example Road',
        'zip_code' => '1111',
    ], required: true, requireBarangay: true);

    expect($address)
        ->toMatchArray([
            'region_name' => 'NCR',
            'province_code' => null,
            'city_municipality_name' => 'Quezon City',
            'barangay_name' => 'Barangay NCR',
            'zip_code' => '1111',
        ]);
});

it('rejects mismatched location hierarchy and invalid ZIP codes', function (): void {
    fakePhilippineLocations();
    $service = app(PhilippineLocationService::class);

    expect(fn () => $service->resolveAddress([
        'region_code' => '0100000000',
        'province_code' => '1300000000',
    ]))->toThrow(ValidationException::class);

    expect(fn () => $service->resolveAddress([
        'zip_code' => '12345',
    ]))->toThrow(ValidationException::class);
});

it('returns a clear service-unavailable response when PSGC Cloud fails', function (): void {
    Http::fake(fn () => Http::response([], 503));

    $this->getJson('/api/locations/regions')
        ->assertStatus(503)
        ->assertJsonPath('message', 'Philippine location data is temporarily unavailable. Please try again.');
});
