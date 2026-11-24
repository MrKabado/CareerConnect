<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaStorage
{
    public function __construct(private readonly CloudinaryMediaGateway $cloudinary) {}

    /**
     * @return array{disk: string, path: string, asset_id: ?string}
     */
    public function storePublicImage(UploadedFile $file, string $localDirectory, string $assetFolder): array
    {
        if ($this->configuredDisk() === 'cloudinary') {
            $asset = $this->cloudinary->uploadImage($file, $assetFolder);

            return [
                'disk' => 'cloudinary',
                'path' => $asset['public_id'],
                'asset_id' => $asset['asset_id'],
            ];
        }

        $path = $file->storePublicly($localDirectory, 'public');
        if (! is_string($path)) {
            throw new RuntimeException('The image could not be stored.');
        }

        return [
            'disk' => 'public',
            'path' => $path,
            'asset_id' => null,
        ];
    }

    /**
     * @return array{disk: string, path: string, asset_id: ?string}
     */
    public function storePrivateFile(
        UploadedFile $file,
        string $localDirectory,
        string $assetFolder,
        string $extension,
    ): array {
        $filename = Str::uuid().'.'.$extension;

        if ($this->configuredDisk() === 'cloudinary') {
            $asset = $this->cloudinary->upload(
                $file,
                $localDirectory.'/'.$filename,
                $assetFolder,
            );

            return [
                'disk' => 'cloudinary',
                'path' => $asset['public_id'],
                'asset_id' => $asset['asset_id'],
            ];
        }

        $path = $file->storeAs($localDirectory, $filename, 'local');
        if (! is_string($path)) {
            throw new RuntimeException('The private file could not be stored.');
        }

        return [
            'disk' => 'local',
            'path' => $path,
            'asset_id' => null,
        ];
    }

    public function delete(string $disk, string $path, ?string $assetId, string $resourceType, string $deliveryType): void
    {
        if ($disk === 'cloudinary') {
            if ($assetId === null || $assetId === '') {
                throw new RuntimeException('The Cloudinary asset identifier is missing.');
            }

            $this->cloudinary->delete($path, $resourceType, $deliveryType);

            return;
        }

        if (! in_array($disk, ['local', 'public'], true) || ! Storage::disk($disk)->delete($path)) {
            throw new RuntimeException('The file could not be removed from storage.');
        }
    }

    public function privateDownload(
        string $disk,
        string $path,
        ?string $assetId,
        string $filename,
        string $mimeType,
        string $resourceType = 'raw',
    ): StreamedResponse {
        if ($disk === 'cloudinary') {
            if ($assetId === null || $assetId === '') {
                abort(404, 'The file is unavailable.');
            }

            return $this->cloudinary->download(
                $path,
                pathinfo($path, PATHINFO_EXTENSION),
                $filename,
                $mimeType,
                $resourceType,
            );
        }

        if ($disk !== 'local' || ! Storage::disk('local')->exists($path)) {
            abort(404, 'The file is unavailable.');
        }

        return Storage::disk('local')->download($path, $filename, [
            'Content-Type' => $mimeType,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function publicImageUrl(string $disk, string $path): string
    {
        if ($disk === 'cloudinary') {
            return $this->cloudinary->imageUrl($path);
        }

        if ($disk !== 'public') {
            throw new RuntimeException('A public image must use public storage.');
        }

        return Storage::disk('public')->url($path);
    }

    private function configuredDisk(): string
    {
        $disk = config('careerconnect.media_storage_disk', 'local');
        if (! in_array($disk, ['local', 'cloudinary'], true)) {
            throw new RuntimeException('MEDIA_STORAGE_DISK must be either local or cloudinary.');
        }

        return $disk;
    }
}
