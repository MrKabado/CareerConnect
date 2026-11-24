<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewAvailability extends Model
{
    protected $fillable = [
        'available_date',
        'start_time',
        'end_time',
        'break_start_time',
        'break_end_time',
        'duration_minutes',
        'buffer_minutes',
    ];

    protected function casts(): array
    {
        return [
            'available_date' => 'date:Y-m-d',
            'duration_minutes' => 'integer',
            'buffer_minutes' => 'integer',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
