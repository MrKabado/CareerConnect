<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Company extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'category_id',
        'company_size',
        'address',
        'city',
        'website',
        'description',
        'contact_name',
        'contact_phone',
        'contact_email',
        'logo_path',
        'hires_jobs',
        'hires_ojt',
        'open_to_moa',
        'accepted_courses',
        'is_verified',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'hires_jobs' => 'boolean',
            'hires_ojt' => 'boolean',
            'open_to_moa' => 'boolean',
            'is_verified' => 'boolean',
            'accepted_courses' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function verification(): HasOne
    {
        return $this->hasOne(CompanyVerification::class);
    }

    public function jobListings(): HasMany
    {
        return $this->hasMany(JobListing::class);
    }
}
