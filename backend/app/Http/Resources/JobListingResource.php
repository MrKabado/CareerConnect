<?php

namespace App\Http\Resources;

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
            'category' => $this->whenLoaded('category', fn (): array => [
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
                'logo_path' => $this->company->logo_path,
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
