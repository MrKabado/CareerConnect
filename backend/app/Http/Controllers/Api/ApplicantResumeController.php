<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\ApplicantFileValidator;
use App\Services\ResumeStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ApplicantResumeController extends Controller
{
    public function __construct(
        private readonly ResumeStorage $resumeStorage,
        private readonly ApplicantFileValidator $fileValidator,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $resume = $request->user()->resumes()->where('is_current', true)->first();

        return response()->json([
            'data' => $resume ? $this->resumeData($resume) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'resume' => ['required', 'file', 'max:'.config('careerconnect.resume_max_size_kb', 5120)],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('resume');
        [$extension, $mimeType] = $this->fileValidator->validatePdfOrDocx($file, 'resume');
        $user = $request->user();
        $stored = $this->resumeStorage->store($file, $user->id, $extension);

        try {
            [$resume, $previous] = DB::transaction(function () use ($user, $file, $stored, $mimeType): array {
                $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                $previous = $user->resumes()->where('is_current', true)->lockForUpdate()->first();
                $previous?->update(['is_current' => false]);

                $resume = $user->resumes()->create([
                    ...$stored,
                    'original_filename' => $this->safeOriginalFilename($file),
                    'mime_type' => $mimeType,
                    'file_size' => $file->getSize(),
                    'is_current' => true,
                ]);

                return [$resume, $previous];
            });
        } catch (Throwable $exception) {
            try {
                $this->resumeStorage->deleteStored(
                    $stored['storage_disk'],
                    $stored['storage_path'],
                    $stored['cloudinary_asset_id'],
                );
            } catch (Throwable $cleanupException) {
                throw new RuntimeException('The failed resume upload could not be cleaned up.', previous: $cleanupException);
            }

            throw $exception;
        }

        if ($previous !== null && ! $previous->applications()->exists()) {
            $this->resumeStorage->delete($previous);
            $previous->delete();
        }

        return response()->json([
            'message' => $previous === null ? 'Resume uploaded.' : 'Resume replaced.',
            'data' => $this->resumeData($resume),
        ], $previous === null ? 201 : 200);
    }

    public function destroy(Request $request): JsonResponse
    {
        $result = DB::transaction(function () use ($request): ?JsonResponse {
            $user = $request->user();
            $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $resume = $user->resumes()->where('is_current', true)->lockForUpdate()->first();

            if ($resume === null) {
                return response()->json(['message' => 'No current resume was found.'], 404);
            }

            if ($resume->applications()->exists()) {
                return response()->json([
                    'message' => 'This resume is attached to an application and cannot be deleted.',
                    'code' => 'resume_in_use',
                ], 409);
            }

            $this->resumeStorage->delete($resume);
            $resume->delete();

            return null;
        });

        return $result ?? response()->json(['message' => 'Resume deleted.']);
    }

    public function download(Request $request): StreamedResponse
    {
        $resume = $request->user()->resumes()->where('is_current', true)->firstOrFail();

        return $this->resumeStorage->download($resume, $resume->original_filename, $resume->mime_type);
    }

    private function resumeData(Resume $resume): array
    {
        return [
            'id' => $resume->id,
            'original_filename' => $resume->original_filename,
            'mime_type' => $resume->mime_type,
            'file_size' => $resume->file_size,
            'is_current' => $resume->is_current,
            'created_at' => $resume->created_at?->toISOString(),
        ];
    }

    private function safeOriginalFilename(UploadedFile $file): string
    {
        $filename = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $filename = preg_replace('/[^\pL\pN._ -]/u', '_', $filename) ?: 'resume';

        return mb_substr($filename, 0, 255);
    }
}
