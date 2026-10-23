<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    public const STATUSES = ['pending', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected'];

    public const TRANSITIONS = [
        'pending' => ['reviewing', 'rejected'],
        'reviewing' => ['shortlisted', 'interview', 'rejected'],
        'shortlisted' => ['interview', 'hired', 'rejected'],
        'interview' => ['hired', 'rejected'],
        'hired' => [],
        'rejected' => [],
    ];

    protected $fillable = [
        'resume_id',
        'status',
        'resume_original_filename',
        'resume_mime_type',
        'resume_file_size',
        'cover_letter',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'resume_file_size' => 'integer',
            'applied_at' => 'datetime',
        ];
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_id');
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(ApplicationStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }
}
