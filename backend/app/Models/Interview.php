<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Interview extends Model
{
    public const MODES = ['onsite', 'online', 'phone'];

    public const STATUSES = ['scheduled', 'completed', 'cancelled'];

    protected $fillable = [
        'scheduled_at',
        'end_at',
        'timezone',
        'mode',
        'location',
        'meeting_url',
        'meeting_instructions',
        'internal_notes',
        'applicant_notes',
        'status',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'immutable_datetime',
            'end_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(InterviewHistory::class)->orderBy('created_at')->orderBy('id');
    }
}
