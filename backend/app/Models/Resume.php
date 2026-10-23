<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    protected $fillable = [
        'storage_path',
        'original_filename',
        'mime_type',
        'file_size',
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
        return $this->hasMany(Application::class);
    }
}
