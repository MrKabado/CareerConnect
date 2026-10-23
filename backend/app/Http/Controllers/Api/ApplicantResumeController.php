<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;
use ZipArchive;

class ApplicantResumeController extends Controller
{
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
        [$extension, $mimeType] = $this->validatedFileType($file);
        $user = $request->user();
        $path = $file->storeAs(
            'applicant-resumes/'.$user->id,
            Str::uuid().'.'.$extension,
            'local',
        );

        if (! $path) {
            throw new RuntimeException('The resume could not be stored.');
        }

        try {
            [$resume, $previous] = DB::transaction(function () use ($user, $file, $path, $mimeType): array {
                $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                $previous = $user->resumes()->where('is_current', true)->lockForUpdate()->first();
                $previous?->update(['is_current' => false]);

                $resume = $user->resumes()->create([
                    'storage_path' => $path,
                    'original_filename' => $this->safeOriginalFilename($file),
                    'mime_type' => $mimeType,
                    'file_size' => $file->getSize(),
                    'is_current' => true,
                ]);

                return [$resume, $previous];
            });
        } catch (Throwable $exception) {
            if (! Storage::disk('local')->delete($path)) {
                throw new RuntimeException('The failed resume upload could not be cleaned up.', previous: $exception);
            }
            throw $exception;
        }

        if ($previous !== null && ! $previous->applications()->exists()) {
            if (! Storage::disk('local')->delete($previous->storage_path)) {
                throw new RuntimeException('The replaced resume file could not be removed.');
            }
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

            if (! Storage::disk('local')->delete($resume->storage_path)) {
                throw new RuntimeException('The resume file could not be removed.');
            }

            $resume->delete();

            return null;
        });

        return $result ?? response()->json(['message' => 'Resume deleted.']);
    }

    public function download(Request $request)
    {
        $resume = $request->user()->resumes()->where('is_current', true)->firstOrFail();

        return $this->downloadResume($resume);
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

    private function validatedFileType(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'pdf') {
            $handle = fopen($file->getRealPath(), 'rb');
            $signature = $handle === false ? '' : (string) fread($handle, 5);
            if (is_resource($handle)) {
                fclose($handle);
            }

            if ($signature !== '%PDF-' || $file->getMimeType() !== 'application/pdf') {
                throw ValidationException::withMessages([
                    'resume' => ['The resume must be a valid PDF document.'],
                ]);
            }

            return ['pdf', 'application/pdf'];
        }

        if ($extension === 'docx') {
            $archive = new ZipArchive;
            $opened = $archive->open($file->getRealPath());
            $valid = $opened === true
                && $archive->locateName('[Content_Types].xml') !== false
                && $archive->locateName('word/document.xml') !== false;

            if ($opened === true) {
                $archive->close();
            }

            if (! $valid) {
                throw ValidationException::withMessages([
                    'resume' => ['The resume must be a valid DOCX document.'],
                ]);
            }

            return [
                'docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
        }

        throw ValidationException::withMessages([
            'resume' => ['The resume must be a valid PDF or DOCX document.'],
        ]);
    }

    private function safeOriginalFilename(UploadedFile $file): string
    {
        $filename = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $filename = preg_replace('/[^\pL\pN._ -]/u', '_', $filename) ?: 'resume';

        return mb_substr($filename, 0, 255);
    }

    private function downloadResume(Resume $resume)
    {
        $expectedPrefix = 'applicant-resumes/'.$resume->applicant_id.'/';
        $path = $resume->storage_path;

        if (! str_starts_with($path, $expectedPrefix)
            || preg_match('#^applicant-resumes/[0-9]+/[a-f0-9-]+\.(pdf|docx)$#i', $path) !== 1
            || ! Storage::disk('local')->exists($path)) {
            abort(404, 'The resume file is unavailable.');
        }

        return Storage::disk('local')->download($path, $resume->original_filename, [
            'Content-Type' => $resume->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
