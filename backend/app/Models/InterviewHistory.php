<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'event_type',
        'previous_schedule',
        'new_schedule',
        'actor_id',
        'reason',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_schedule' => 'array',
            'new_schedule' => 'array',
            'created_at' => 'immutable_datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
