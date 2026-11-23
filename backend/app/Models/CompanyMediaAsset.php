<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyMediaAsset extends Model
{
    protected $fillable = [
        'company_id',
        'storage_disk',
        'file_path',
        'cloudinary_asset_id',
        'original_filename',
        'mime_type',
        'size_bytes',
        'alt_text',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
