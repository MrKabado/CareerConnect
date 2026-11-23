<?php

namespace App\Http\Resources;

use App\Services\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobListingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'listing_type' => $this->listing_type,
            'title' => $this->title,
            'description' => $this->description,
            'responsibilities' => $this->responsibilities,
            'requirements' => $this->requirements,
            'required_skills' => $this->required_skills ?? [],
            'experience_required' => $this->experience_required ?? false,
            'minimum_experience_years' => $this->minimum_experience_years,
            'applicant_limit' => $this->applicant_limit,
            'applicant_count' => $this->applications_count
                ?? ($this->relationLoaded('applications') ? $this->applications->count() : $this->applications()->count()),
            'applications_count' => $this->applications_count ?? null,
            'expires_at' => $this->expires_at?->toISOString(),
            'custom_category_name' => $this->custom_category_name,
            'approval_status' => $this->approval_status ?? 'not_required',
            'approval_reason' => $this->approval_reason,
            'approval_reviewed_at' => $this->approval_reviewed_at?->toISOString(),
            'category' => $this->whenLoaded('category', fn (): ?array => $this->category === null ? null : [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'location' => $this->location,
            'work_setup' => $this->work_setup,
            'employment_type' => $this->employment_type,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'ojt' => $this->whenLoaded('ojtDetails', fn (): ?array => $this->ojtDetails === null ? null : [
                'duration_hours' => $this->ojtDetails->duration_hours,
                'allowance_type' => $this->ojtDetails->allowance_type,
                'allowance_amount' => $this->ojtDetails->allowance_amount,
                'slots' => $this->ojtDetails->slots,
                'accepted_courses' => $this->ojtDetails->accepted_courses,
                'moa_accepted' => $this->ojtDetails->moa_accepted,
            ]),
            'status' => $this->status,
            'published_at' => $this->published_at?->toISOString(),
            'company' => $this->whenLoaded('company', fn (): array => [
                'name' => $this->company->name,
                'city' => $this->company->city,
                'employer' => $this->company->relationLoaded('user') && $this->company->user ? [
                    'id' => $this->company->user->id,
                    'name' => $this->company->user->name,
                    'email' => $this->company->user->email,
                ] : null,
                'logo_path' => $this->company->logo_path,
                'logo_url' => $this->company->logo_path
                    ? app(MediaStorage::class)->publicImageUrl($this->company->logo_disk, $this->company->logo_path)
                    : null,
            ]),
            'admin_actions' => $this->whenLoaded('adminActions', fn (): array => $this->adminActions
                ->map(fn ($action): array => [
                    'action' => $action->action,
                    'reason' => $action->reason,
                    'created_at' => $action->created_at?->toISOString(),
                    'admin' => $action->admin ? [
                        'id' => $action->admin->id,
                        'name' => $action->admin->name,
                    ] : null,
                ])->all()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
