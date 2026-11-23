<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CloudinaryMediaGateway
{
    private ?Cloudinary $cloudinary = null;

    /**
     * @return array{asset_id: string, public_id: string}
     */
    public function upload(UploadedFile $file, string $publicId, string $assetFolder): array
    {
        $result = $this->client()->uploadApi()->upload($file->getRealPath(), [
            'resource_type' => 'raw',
            'type' => 'authenticated',
            'public_id' => $publicId,
            'asset_folder' => $assetFolder,
            'overwrite' => false,
            'use_filename' => false,
            'unique_filename' => false,
            'headers' => ['X-Robots-Tag: noindex'],
        ]);

        $assetId = $result['asset_id'] ?? null;
        $storedPublicId = $result['public_id'] ?? null;

        if (! is_string($assetId) || ! is_string($storedPublicId)) {
            throw new RuntimeException('Cloudinary did not return the uploaded file asset identifiers.');
        }

        return [
            'asset_id' => $assetId,
            'public_id' => $storedPublicId,
        ];
    }

    /**
     * @return array{asset_id: string, public_id: string}
     */
    public function uploadImage(UploadedFile $file, string $assetFolder): array
    {
        $result = $this->client()->uploadApi()->upload($file->getRealPath(), [
            'resource_type' => 'image',
            'type' => 'upload',
            'public_id' => (string) Str::uuid(),
            'asset_folder' => $assetFolder,
            'overwrite' => false,
            'use_filename' => false,
            'unique_filename' => false,
        ]);
        $assetId = $result['asset_id'] ?? null;
        $publicId = $result['public_id'] ?? null;

        if (! is_string($assetId) || ! is_string($publicId)) {
            throw new RuntimeException('Cloudinary did not return the image asset identifiers.');
        }

        return [
            'asset_id' => $assetId,
            'public_id' => $publicId,
        ];
    }

    public function delete(string $publicId, string $resourceType = 'raw', string $deliveryType = 'authenticated'): void
    {
        $result = $this->client()->uploadApi()->destroy($publicId, [
            'resource_type' => $resourceType,
            'type' => $deliveryType,
            'invalidate' => true,
        ]);

        if (($result['result'] ?? null) !== 'ok') {
            throw new RuntimeException('The Cloudinary file could not be removed.');
        }
    }

    public function download(
        string $publicId,
        string $extension,
        string $filename,
        string $mimeType,
        string $resourceType = 'raw',
    ): StreamedResponse {
        $url = $this->privateDownloadUrl($publicId, $extension, $filename, $resourceType);
        $cloudinaryResponse = Http::withOptions(['stream' => true])->get($url);
        if (! $cloudinaryResponse->successful()) {
            throw new RuntimeException('Cloudinary file download failed with HTTP status '.$cloudinaryResponse->status().'.');
        }

        $stream = $cloudinaryResponse->toPsrResponse()->getBody();

        return response()->streamDownload(
            static function () use ($stream): void {
                while (! $stream->eof()) {
                    echo $stream->read(8192);
                }
            },
            $filename,
            [
                'Content-Type' => $mimeType,
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store',
            ],
        );
    }

    public function privateDownloadUrl(
        string $publicId,
        string $extension,
        string|false $attachment,
        string $resourceType = 'raw',
    ): string {
        return $this->client()->uploadApi()->privateDownloadUrl($publicId, $extension, [
            'resource_type' => $resourceType,
            'type' => 'authenticated',
            'attachment' => $attachment,
            'expires_at' => now()->addMinutes(5)->timestamp,
        ]);
    }

    public function imageUrl(string $publicId): string
    {
        return $this->client()->image($publicId)->toUrl();
    }

    private function client(): Cloudinary
    {
        if ($this->cloudinary !== null) {
            return $this->cloudinary;
        }

        $url = config('services.cloudinary.url');
        if (! is_string($url) || trim($url) === '') {
            throw new RuntimeException('CLOUDINARY_URL must be configured when Cloudinary storage is enabled.');
        }

        return $this->cloudinary = new Cloudinary($url);
    }
}
