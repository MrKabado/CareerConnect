<?php

namespace App\Services;

use App\Models\Resume;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResumeStorage
{
    public function __construct(private readonly CloudinaryMediaGateway $cloudinary) {}

    /**
     * @return array{storage_disk: string, storage_path: string, cloudinary_asset_id: ?string}
     */
    public function store(UploadedFile $file, int $applicantId, string $extension): array
    {
        $disk = config('careerconnect.media_storage_disk', 'local');
        $path = 'applicant-resumes/'.$applicantId.'/'.Str::uuid().'.'.$extension;

        if ($disk === 'local') {
            $storedPath = $file->storeAs(
                'applicant-resumes/'.$applicantId,
                basename($path),
                'local',
            );

            if (! is_string($storedPath)) {
                throw new RuntimeException('The resume could not be stored.');
            }

            return [
                'storage_disk' => 'local',
                'storage_path' => $storedPath,
                'cloudinary_asset_id' => null,
            ];
        }

        if ($disk !== 'cloudinary') {
            throw new RuntimeException('RESUME_STORAGE_DISK must be either local or cloudinary.');
        }

        $asset = $this->cloudinary->upload(
            $file,
            $path,
            'career-connect/users/'.$applicantId.'/resumes',
        );

        return [
            'storage_disk' => 'cloudinary',
            'storage_path' => $asset['public_id'],
            'cloudinary_asset_id' => $asset['asset_id'],
        ];
    }

    public function delete(Resume $resume): void
    {
        $this->deleteStored(
            $resume->storage_disk,
            $resume->storage_path,
            $resume->cloudinary_asset_id,
        );
    }

    public function deleteStored(
        string $disk,
        string $path,
        ?string $cloudinaryAssetId = null,
        string $resourceType = 'raw',
        string $deliveryType = 'authenticated',
    ): void {
        if ($disk === 'cloudinary') {
            if ($cloudinaryAssetId === null || $cloudinaryAssetId === '') {
                throw new RuntimeException('The Cloudinary resume asset identifier is missing.');
            }

            $this->cloudinary->delete($path, $resourceType, $deliveryType);

            return;
        }

        if ($disk !== 'local' || ! Storage::disk('local')->delete($path)) {
            throw new RuntimeException('The resume file could not be removed.');
        }
    }

    public function download(Resume $resume, string $filename, string $mimeType): StreamedResponse
    {
        $path = $this->validatedStoragePath($resume);

        if ($resume->storage_disk === 'cloudinary') {
            if ($resume->cloudinary_asset_id === null || $resume->cloudinary_asset_id === '') {
                abort(404, 'The resume file is unavailable.');
            }

            return $this->cloudinary->download(
                $path,
                pathinfo($path, PATHINFO_EXTENSION),
                $filename,
                $mimeType,
            );
        }

        if (! Storage::disk('local')->exists($path)) {
            abort(404, 'The resume file is unavailable.');
        }

        return Storage::disk('local')->download($path, $filename, [
            'Content-Type' => $mimeType,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @return array{preview_url: string, download_url: string}|null
     */
    public function downloadUrls(Resume $resume, string $filename): ?array
    {
        $path = $this->validatedStoragePath($resume);

        if ($resume->storage_disk === 'local') {
            return null;
        }

        if ($resume->cloudinary_asset_id === null || $resume->cloudinary_asset_id === '') {
            abort(404, 'The resume file is unavailable.');
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION);

        return [
            'preview_url' => $this->cloudinary->privateDownloadUrl($path, $extension, false),
            'download_url' => $this->cloudinary->privateDownloadUrl($path, $extension, $filename),
        ];
    }

    private function validatedStoragePath(Resume $resume): string
    {
        $expectedPrefix = 'applicant-resumes/'.$resume->applicant_id.'/';
        $path = $resume->storage_path;

        if (! str_starts_with($path, $expectedPrefix)
            || preg_match('#^applicant-resumes/[0-9]+/[a-f0-9-]+\.(pdf|docx)$#i', $path) !== 1) {
            abort(404, 'The resume file is unavailable.');
        }

        if (! in_array($resume->storage_disk, ['local', 'cloudinary'], true)) {
            abort(404, 'The resume file is unavailable.');
        }

        return $path;
    }
}
