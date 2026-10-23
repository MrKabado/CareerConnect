<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobListing extends Model
{
    protected $fillable = [
        'company_id',
        'category_id',
        'listing_type',
        'title',
        'description',
        'responsibilities',
        'requirements',
        'location',
        'work_setup',
        'employment_type',
        'salary_min',
        'salary_max',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function ojtDetails(): HasOne
    {
        return $this->hasOne(OjtListingDetail::class);
    }

    public function adminActions(): HasMany
    {
        return $this->hasMany(JobListingAdminAction::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query
            ->where('status', 'open')
            ->whereNotNull('published_at')
            ->whereHas('category', fn (Builder $category): Builder => $category->where('is_active', true))
            ->whereHas('company', function (Builder $company): void {
                $company
                    ->where('is_verified', true)
                    ->whereHas('user', fn (Builder $user): Builder => $user->where('account_status', 'active'))
                    ->whereHas('verification', fn (Builder $verification): Builder => $verification->where('status', 'verified'));
            });
    }

    public function canReceiveApplications(): bool
    {
        return $this->status === 'open'
            && $this->published_at !== null
            && $this->company?->is_verified === true
            && $this->company?->user?->account_status === 'active'
            && $this->company?->verification?->status === 'verified'
            && $this->category?->is_active === true;
    }
}
