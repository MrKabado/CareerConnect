<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationDocument extends Model
{
    protected $fillable = [
        'company_verification_id',
        'type',
        'file_path',
        'original_filename',
        'mime_type',
        'size_bytes',
    ];

    public function companyVerification(): BelongsTo
    {
        return $this->belongsTo(CompanyVerification::class);
    }
}
