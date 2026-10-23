<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ApplicantProfile extends Model
{
    protected $fillable = [
        'phone',
        'city',
        'profile_photo_path',
        'looking_for_jobs',
        'looking_for_ojt',
        'experience_level',
        'desired_titles',
        'employment_types',
        'work_setups',
        'preferred_locations',
        'salary_min',
        'salary_max',
        'onboarding_step',
        'onboarding_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'looking_for_jobs' => 'boolean',
            'looking_for_ojt' => 'boolean',
            'desired_titles' => 'array',
            'employment_types' => 'array',
            'work_setups' => 'array',
            'preferred_locations' => 'array',
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'onboarding_completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'applicant_profile_category')
            ->withTimestamps();
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'applicant_profile_skill')
            ->withTimestamps();
    }

    public function ojtDetails(): HasOne
    {
        return $this->hasOne(ApplicantOjtDetail::class);
    }
}
