<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicantOjtDetail extends Model
{
    protected $fillable = [
        'school',
        'course',
        'education_status',
        'year_level',
        'graduation_year',
        'required_hours',
        'preferred_start_date',
        'allowance_preference',
        'requires_moa',
    ];

    protected function casts(): array
    {
        return [
            'year_level' => 'integer',
            'graduation_year' => 'integer',
            'required_hours' => 'integer',
            'preferred_start_date' => 'date',
            'requires_moa' => 'boolean',
        ];
    }

    public function applicantProfile(): BelongsTo
    {
        return $this->belongsTo(ApplicantProfile::class);
    }
}
