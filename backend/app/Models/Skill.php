<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Skill extends Model
{
    protected $fillable = [
        'name',
        'normalized_name',
    ];

    public function applicantProfiles(): BelongsToMany
    {
        return $this->belongsToMany(ApplicantProfile::class, 'applicant_profile_skill')
            ->withTimestamps();
    }
}
