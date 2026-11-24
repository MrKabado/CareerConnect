<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OjtListingDetail extends Model
{
    protected $fillable = [
        'duration_hours',
        'allowance_type',
        'allowance_amount',
        'slots',
        'accepted_courses',
        'moa_accepted',
    ];

    protected function casts(): array
    {
        return [
            'allowance_amount' => 'integer',
            'accepted_courses' => 'array',
            'moa_accepted' => 'boolean',
        ];
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }
}
