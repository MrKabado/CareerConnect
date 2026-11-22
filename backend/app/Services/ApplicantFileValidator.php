<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class ApplicantFileValidator
{
    /**
     * @return array{0: string, 1: string}
     */
    public function validatePdfOrDocx(UploadedFile $file, string $field): array
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
                    $field => ['The file must be a valid PDF document.'],
                ]);
            }

            return ['pdf', 'application/pdf'];
        }

        if ($extension === 'docx') {
            $mimeType = $file->getMimeType();
            $allowedMimeTypes = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/zip',
                'application/octet-stream',
            ];
            $archive = new ZipArchive;
            $opened = $archive->open($file->getRealPath());
            $valid = in_array($mimeType, $allowedMimeTypes, true)
                && $opened === true
                && $archive->locateName('[Content_Types].xml') !== false
                && $archive->locateName('word/document.xml') !== false;

            if ($opened === true) {
                $archive->close();
            }

            if (! $valid) {
                throw ValidationException::withMessages([
                    $field => ['The file must be a valid DOCX document.'],
                ]);
            }

            return [
                'docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
        }

        throw ValidationException::withMessages([
            $field => ['The file must be a valid PDF or DOCX document.'],
        ]);
    }
}
