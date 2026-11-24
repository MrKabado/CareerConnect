<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApplicantDocument extends Model
{
    protected $fillable = [
        'document_type',
        'storage_disk',
        'storage_path',
        'cloudinary_asset_id',
        'original_filename',
        'mime_type',
        'file_size',
        'content_hash',
        'is_current',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'is_current' => 'boolean',
        ];
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'cover_letter_document_id');
    }
}
