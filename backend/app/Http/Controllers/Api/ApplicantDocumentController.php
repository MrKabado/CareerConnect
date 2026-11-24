<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicantDocument;
use App\Models\User;
use App\Services\ApplicantFileValidator;
use App\Services\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ApplicantDocumentController extends Controller
{
    private const DOCUMENT_TYPES = ['cover_letter', 'certificate', 'education', 'other'];

    public function __construct(
        private readonly MediaStorage $mediaStorage,
        private readonly ApplicantFileValidator $fileValidator,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $documents = $request->user()->applicantDocuments()
            ->where('is_current', true)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $documents->map(fn (ApplicantDocument $document): array => $this->documentData($document))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => ['required', Rule::in(self::DOCUMENT_TYPES)],
            'document' => [
                'required',
                'file',
                'mimes:pdf,docx',
                'extensions:pdf,docx',
                'max:'.config('careerconnect.resume_max_size_kb', 5120),
            ],
        ]);

        $file = $request->file('document');
        [$extension, $mimeType] = $this->fileValidator->validatePdfOrDocx($file, 'document');
        $contentHash = hash_file('sha256', $file->getRealPath());
        if (! is_string($contentHash)) {
            throw new RuntimeException('The uploaded document could not be checked.');
        }

        $stored = null;
        try {
            [$document, $created] = DB::transaction(function () use (
                $request,
                $file,
                $validated,
                $extension,
                $mimeType,
                $contentHash,
                &$stored,
            ): array {
                $applicant = User::query()->lockForUpdate()->findOrFail($request->user()->id);
                $document = $applicant->applicantDocuments()
                    ->where('document_type', $validated['document_type'])
                    ->where('content_hash', $contentHash)
                    ->lockForUpdate()
                    ->first();

                if ($document !== null) {
                    if ($validated['document_type'] === 'cover_letter' && ! $document->is_current) {
                        $applicant->applicantDocuments()
                            ->where('document_type', 'cover_letter')
                            ->where('is_current', true)
                            ->update(['is_current' => false]);
                        $document->update(['is_current' => true]);
                    }

                    return [$document->fresh(), false];
                }

                if ($validated['document_type'] === 'cover_letter') {
                    $applicant->applicantDocuments()
                        ->where('document_type', 'cover_letter')
                        ->where('is_current', true)
                        ->update(['is_current' => false]);
                }

                $stored = $this->mediaStorage->storePrivateFile(
                    $file,
                    'applicant-documents/'.$applicant->id,
                    'career-connect/users/'.$applicant->id.'/documents',
                    $extension,
                );

                $document = $applicant->applicantDocuments()->create([
                    'document_type' => $validated['document_type'],
                    'storage_disk' => $stored['disk'],
                    'storage_path' => $stored['path'],
                    'cloudinary_asset_id' => $stored['asset_id'],
                    'original_filename' => $this->safeOriginalFilename($file),
                    'mime_type' => $mimeType,
                    'file_size' => $file->getSize(),
                    'content_hash' => $contentHash,
                    'is_current' => true,
                ]);

                return [$document, true];
            });
        } catch (Throwable $exception) {
            if ($stored !== null) {
                try {
                    $this->mediaStorage->delete(
                        $stored['disk'],
                        $stored['path'],
                        $stored['asset_id'],
                        'raw',
                        'authenticated',
                    );
                } catch (Throwable $cleanupException) {
                    throw new RuntimeException('The failed document upload could not be cleaned up.', previous: $cleanupException);
                }
            }

            throw $exception;
        }

        return response()->json([
            'message' => $created ? 'Document uploaded.' : 'This document is already saved.',
            'data' => $this->documentData($document),
        ], $created ? 201 : 200);
    }

    public function download(Request $request, int $document): StreamedResponse
    {
        $document = $request->user()->applicantDocuments()->findOrFail($document);

        return $this->downloadDocument($document);
    }

    public function destroy(Request $request, int $document): JsonResponse
    {
        $document = $request->user()->applicantDocuments()->findOrFail($document);

        if ($document->applications()->exists()) {
            return response()->json([
                'message' => 'This document is attached to an application and cannot be deleted.',
                'code' => 'document_in_use',
            ], 409);
        }

        DB::transaction(function () use ($request, $document): void {
            User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $lockedDocument = ApplicantDocument::query()
                ->where('applicant_id', $document->applicant_id)
                ->lockForUpdate()
                ->findOrFail($document->id);

            if ($lockedDocument->applications()->exists()) {
                abort(409, 'This document is attached to an application and cannot be deleted.');
            }

            $this->mediaStorage->delete(
                $lockedDocument->storage_disk,
                $lockedDocument->storage_path,
                $lockedDocument->cloudinary_asset_id,
                'raw',
                'authenticated',
            );
            $lockedDocument->delete();
        });

        return response()->json(['message' => 'Document deleted.']);
    }

    public function downloadDocument(ApplicantDocument $document): StreamedResponse
    {
        $expectedPrefix = 'applicant-documents/'.$document->applicant_id.'/';
        $path = $document->storage_path;

        if (! str_starts_with($path, $expectedPrefix)
            || preg_match('#^applicant-documents/[0-9]+/[a-f0-9-]+\.(pdf|docx)$#i', $path) !== 1) {
            abort(404, 'The document is no longer available.');
        }

        return $this->mediaStorage->privateDownload(
            $document->storage_disk,
            $path,
            $document->cloudinary_asset_id,
            $document->original_filename,
            $document->mime_type,
        );
    }

    private function documentData(ApplicantDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'is_current' => $document->is_current,
            'created_at' => $document->created_at?->toISOString(),
        ];
    }

    private function safeOriginalFilename(UploadedFile $file): string
    {
        $filename = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $filename = preg_replace('/[^\pL\pN._ -]/u', '_', $filename) ?: 'document';

        return mb_substr($filename, 0, 255);
    }
}
