<?php

namespace App\Services;

use App\Exceptions\PhilippineLocationUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class PhilippineLocationService
{
    private const CACHE_TTL_MINUTES = 1440;

    /**
     * @return array<int, array{code: string, name: string}>
     */
    public function regions(): array
    {
        return $this->normalizeOptions($this->collection('regions'));
    }

    /**
     * @return array<int, array{code: string, name: string}>
     */
    public function provinces(string $regionCode): array
    {
        $this->assertCode($regionCode, 'region_code');

        return $this->normalizeOptions($this->collection("regions/{$regionCode}/provinces"));
    }

    /**
     * Localities that are directly under a region, including independent cities.
     *
     * @return array<int, array{code: string, name: string, type: string, zip_code: ?string}>
     */
    public function regionLocalities(string $regionCode): array
    {
        $this->assertCode($regionCode, 'region_code');

        return $this->normalizeLocalities($this->collection("regions/{$regionCode}/cities-municipalities"));
    }

    /**
     * @return array<int, array{code: string, name: string, type: string, zip_code: ?string}>
     */
    public function provinceLocalities(string $provinceCode): array
    {
        $this->assertCode($provinceCode, 'province_code');

        return $this->normalizeLocalities($this->collection("provinces/{$provinceCode}/cities-municipalities"));
    }

    /**
     * @return array<int, array{code: string, name: string}>
     */
    public function barangays(string $localityCode): array
    {
        $this->assertCode($localityCode, 'city_municipality_code');

        return $this->normalizeOptions(
            $this->collection("cities-municipalities/{$localityCode}/barangays"),
        );
    }

    /**
     * Resolve submitted codes against PSGC and return authoritative names.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, ?string>
     */
    public function resolveAddress(
        array $input,
        bool $required = false,
        bool $requireBarangay = false,
    ): array {
        $regionCode = $this->nullableCode($input['region_code'] ?? null);
        $provinceCode = $this->nullableCode($input['province_code'] ?? null);
        $localityCode = $this->nullableCode($input['city_municipality_code'] ?? null);
        $barangayCode = $this->nullableCode($input['barangay_code'] ?? null);
        $streetAddress = $this->nullableText($input['street_address'] ?? null);
        $zipCode = $this->nullableText($input['zip_code'] ?? null);
        $hasAddressData = $regionCode !== null
            || $provinceCode !== null
            || $localityCode !== null
            || $barangayCode !== null
            || $streetAddress !== null
            || $zipCode !== null;

        if (! $hasAddressData && ! $required) {
            return $this->emptyAddress();
        }

        if ($zipCode !== null && ! preg_match('/^\d{4}$/D', $zipCode)) {
            $this->fail('zip_code', 'The ZIP code must contain exactly four digits.');
        }
        if ($regionCode === null) {
            if ($provinceCode !== null || $localityCode !== null || $barangayCode !== null || $required) {
                $this->fail('region_code', 'Select a region.');
            }

            return [
                ...$this->emptyAddress(),
                'street_address' => $streetAddress,
                'zip_code' => $zipCode,
            ];
        }

        foreach ([
            'region_code' => $regionCode,
            'province_code' => $provinceCode,
            'city_municipality_code' => $localityCode,
            'barangay_code' => $barangayCode,
        ] as $field => $code) {
            if ($code !== null) {
                $this->assertCode($code, $field);
            }
        }

        $region = $this->findByCode($this->regions(), $regionCode);
        if ($region === null) {
            $this->fail('region_code', 'Select a valid Philippine region.');
        }

        $provinces = $this->provinces($regionCode);
        $province = null;
        if ($provinceCode !== null) {
            $province = $this->findByCode($provinces, $provinceCode);
            if ($province === null) {
                $this->fail('province_code', 'The selected province does not belong to the selected region.');
            }
        }

        if ($localityCode === null) {
            if ($barangayCode !== null || $requireBarangay) {
                $this->fail('city_municipality_code', 'Select a city or municipality before choosing a barangay.');
            }
            if ($required) {
                $this->fail('city_municipality_code', 'Select a city or municipality.');
            }

            return [
                'region_code' => $region['code'],
                'region_name' => $region['name'],
                'province_code' => $province['code'] ?? null,
                'province_name' => $province['name'] ?? null,
                'city_municipality_code' => null,
                'city_municipality_name' => null,
                'barangay_code' => null,
                'barangay_name' => null,
                'street_address' => $streetAddress,
                'zip_code' => $zipCode,
            ];
        }

        $localities = $provinceCode === null
            ? $this->regionLocalities($regionCode)
            : $this->provinceLocalities($provinceCode);
        $locality = $this->findByCode($localities, $localityCode);
        if ($locality === null) {
            $this->fail(
                $provinceCode === null ? 'province_code' : 'city_municipality_code',
                $provinceCode === null
                    ? 'Select a province for this city or municipality.'
                    : 'The selected city or municipality does not belong to the selected province.',
            );
        }

        $barangay = null;
        if ($barangayCode !== null || $requireBarangay) {
            if ($barangayCode === null) {
                $this->fail('barangay_code', 'Select a barangay.');
            }

            $barangay = $this->findByCode($this->barangays($localityCode), $barangayCode);
            if ($barangay === null) {
                $this->fail('barangay_code', 'The selected barangay does not belong to the selected city or municipality.');
            }
        }

        $localityZip = $this->normalizeZip($locality['zip_code'] ?? null);

        return [
            'region_code' => $region['code'],
            'region_name' => $region['name'],
            'province_code' => $province['code'] ?? null,
            'province_name' => $province['name'] ?? null,
            'city_municipality_code' => $locality['code'],
            'city_municipality_name' => $locality['name'],
            'barangay_code' => $barangay['code'] ?? null,
            'barangay_name' => $barangay['name'] ?? null,
            'street_address' => $streetAddress,
            'zip_code' => $zipCode ?? $localityZip,
        ];
    }

    /**
     * @param  array<string, ?string>  $address
     */
    public function formatAddress(array $address): string
    {
        $parts = array_filter([
            $address['street_address'] ?? null,
            $address['barangay_name'] ?? null,
            $address['city_municipality_name'] ?? null,
            $address['province_name'] ?? null,
            $address['region_name'] ?? null,
            $address['zip_code'] ?? null,
            'Philippines',
        ], fn (?string $value): bool => $value !== null && trim($value) !== '');
        $formatted = implode(', ', $parts);

        if (mb_strlen($formatted) > 255) {
            throw ValidationException::withMessages([
                'street_address' => ['The selected address is too long. Shorten the street address and try again.'],
            ]);
        }

        return $formatted;
    }

    /**
     * @return array<string, ?string>
     */
    private function emptyAddress(): array
    {
        return [
            'region_code' => null,
            'region_name' => null,
            'province_code' => null,
            'province_name' => null,
            'city_municipality_code' => null,
            'city_municipality_name' => null,
            'barangay_code' => null,
            'barangay_name' => null,
            'street_address' => null,
            'zip_code' => null,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function collection(string $path): array
    {
        return Cache::remember(
            'psgc:'.hash('sha256', $path),
            now()->addMinutes(self::CACHE_TTL_MINUTES),
            function () use ($path): array {
                try {
                    $response = Http::acceptJson()
                        ->withUserAgent((string) config('services.psgc.user_agent'))
                        ->timeout(10)
                        ->get(rtrim((string) config('services.psgc.base_url'), '/').'/'.$path);
                } catch (ConnectionException $exception) {
                    throw new PhilippineLocationUnavailable(
                        'The PSGC Cloud request could not be completed.',
                        previous: $exception,
                    );
                }

                if (! $response->successful()) {
                    throw new PhilippineLocationUnavailable(
                        'The PSGC Cloud API returned HTTP '.$response->status().'.',
                    );
                }

                $data = $response->json();
                if (! is_array($data) || ! array_is_list($data)) {
                    throw new PhilippineLocationUnavailable('The PSGC Cloud response was invalid.');
                }

                return array_values(array_filter($data, 'is_array'));
            },
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array{code: string, name: string}>
     */
    private function normalizeOptions(array $items): array
    {
        return array_values(array_filter(array_map(
            fn (array $item): ?array => isset($item['code'], $item['name'])
                ? ['code' => (string) $item['code'], 'name' => trim((string) $item['name'])]
                : null,
            $items,
        )));
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array{code: string, name: string, type: string, zip_code: ?string}>
     */
    private function normalizeLocalities(array $items): array
    {
        return array_values(array_filter(array_map(
            function (array $item): ?array {
                $type = strtolower(trim((string) ($item['type'] ?? '')));
                if (! in_array($type, ['city', 'mun', 'municipality'], true)
                    || ! isset($item['code'], $item['name'])) {
                    return null;
                }

                return [
                    'code' => (string) $item['code'],
                    'name' => trim((string) $item['name']),
                    'type' => $type === 'city' ? 'city' : 'municipality',
                    'zip_code' => $this->normalizeZip($item['zip_code'] ?? null),
                ];
            },
            $items,
        )));
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     * @return array<string, mixed>|null
     */
    private function findByCode(array $options, string $code): ?array
    {
        foreach ($options as $option) {
            if (($option['code'] ?? null) === $code) {
                return $option;
            }
        }

        return null;
    }

    private function assertCode(string $code, string $field): void
    {
        if (! preg_match('/^\d{10}$/D', $code)) {
            $this->fail($field, 'The selected location code is invalid.');
        }
    }

    private function nullableCode(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function nullableText(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function normalizeZip(mixed $value): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $zip = trim((string) $value);

        return preg_match('/^\d{4}$/D', $zip) ? $zip : null;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
