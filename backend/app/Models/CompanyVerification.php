<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyVerification extends Model
{
    protected $fillable = [
        'company_id',
        'status',
        'authorization_confirmed_at',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'rejection_note',
    ];

    protected function casts(): array
    {
        return [
            'authorization_confirmed_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(VerificationDocument::class);
    }
}
