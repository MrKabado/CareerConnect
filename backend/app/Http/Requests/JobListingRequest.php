<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class JobListingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $normalized = [];
        foreach (['title', 'location'] as $field) {
            if (is_string($this->input($field))) {
                $normalized[$field] = $this->capitalizeWordStarts($this->input($field));
            }
        }

        foreach (['description', 'responsibilities'] as $field) {
            if (is_string($this->input($field))) {
                $normalized[$field] = $this->capitalizeFirstLetter($this->input($field));
            }
        }

        if (is_string($this->input('requirements'))) {
            $normalized['requirements'] = preg_replace_callback(
                '/(^|\n)([ \t]*)(\p{L})/u',
                fn (array $match): string => $match[1].$match[2].mb_strtoupper($match[3]),
                $this->input('requirements'),
            );
        }

        if (is_array($this->input('required_skills'))) {
            $normalized['required_skills'] = array_map(
                fn (mixed $skill): mixed => is_string($skill) ? $this->capitalizeWordStarts($skill) : $skill,
                $this->input('required_skills'),
            );
        }

        $this->merge($normalized);
    }

    public function authorize(): bool
    {
        return $this->user()?->role === 'employer';
    }

    public function rules(): array
    {
        $isDraft = $this->boolean('save_as_draft');
        $isJob = $this->input('listing_type') === 'job';
        $isOjt = $this->input('listing_type') === 'ojt';

        return [
            'listing_type' => ['required', Rule::in(['job', 'ojt'])],
            'save_as_draft' => ['sometimes', 'boolean'],
            'title' => [Rule::requiredIf(! $isDraft), 'nullable', 'string', 'max:255'],
            'category_id' => [
                Rule::requiredIf(! $isDraft && ! $this->filled('custom_category_name')),
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'custom_category_name' => [
                Rule::requiredIf(! $isDraft && ! $this->filled('category_id')),
                'nullable',
                'string',
                'max:100',
            ],
            'description' => [Rule::requiredIf(! $isDraft), 'nullable', 'string', 'max:10000'],
            'responsibilities' => [Rule::requiredIf(! $isDraft), 'nullable', 'string', 'max:10000'],
            'requirements' => [Rule::requiredIf(! $isDraft), 'nullable', 'string', 'max:10000'],
            'required_skills' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'array', 'max:30'],
            'required_skills.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'location' => [Rule::requiredIf(! $isDraft), 'nullable', 'string', 'max:255'],
            'region_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'province_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'city_municipality_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'barangay_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'street_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'zip_code' => ['sometimes', 'nullable', 'regex:/^\d{4}$/D'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'work_setup' => [
                Rule::requiredIf(! $isDraft),
                'nullable',
                Rule::in(['onsite', 'hybrid', 'remote']),
            ],
            'experience_required' => ['exclude_unless:listing_type,job', 'sometimes', 'boolean'],
            'minimum_experience_years' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'integer', 'min:1', 'max:50'],
            'employment_type' => [
                'exclude_unless:listing_type,job',
                Rule::requiredIf(! $isDraft && $isJob),
                'nullable',
                'string',
                Rule::in(['full_time', 'part_time', 'contract']),
            ],
            'salary_min' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'integer', 'min:0', 'max:999999999'],
            'salary_max' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'integer', 'min:0', 'max:999999999'],
            'applicant_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            'expires_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
            'duration_hours' => [
                'exclude_unless:listing_type,ojt',
                Rule::requiredIf(! $isDraft && $isOjt),
                'nullable',
                'integer',
                'min:1',
                'max:65535',
            ],
            'allowance_type' => [
                'exclude_unless:listing_type,ojt',
                Rule::requiredIf(! $isDraft && $isOjt),
                'nullable',
                Rule::in(['paid', 'unpaid']),
            ],
            'allowance_amount' => [
                'exclude_unless:listing_type,ojt',
                Rule::requiredIf(! $isDraft && $isOjt && $this->input('allowance_type') === 'paid'),
                'nullable',
                'integer',
                'min:0',
                'max:4294967295',
            ],
            'slots' => [
                'exclude_unless:listing_type,ojt',
                Rule::requiredIf(! $isDraft && $isOjt),
                'nullable',
                'integer',
                'min:1',
                'max:65535',
            ],
            'accepted_courses' => ['exclude_unless:listing_type,ojt', 'sometimes', 'nullable', 'array', 'max:100'],
            'accepted_courses.*' => ['string', 'max:100', 'distinct'],
            'moa_accepted' => [
                'exclude_unless:listing_type,ojt',
                Rule::requiredIf(! $isDraft && $isOjt),
                'boolean',
            ],
            'company_id' => ['prohibited'],
            'status' => ['prohibited'],
            'published_at' => ['prohibited'],
            'deactivated_by' => ['prohibited'],
            'deactivated_at' => ['prohibited'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('latitude') !== $this->filled('longitude')) {
                $validator->errors()->add('latitude', 'Provide both map coordinates together.');
            }

            if ($this->boolean('save_as_draft')) {
                $draftFields = collect($this->all())->except([
                    'listing_type',
                    'save_as_draft',
                    '_token',
                    'minimum_experience_years',
                ]);
                $hasDraftContent = $draftFields->contains(function (mixed $value): bool {
                    if (is_array($value)) {
                        return collect($value)->contains(fn (mixed $item): bool => filled($item));
                    }

                    return filled($value);
                });
                if (! $hasDraftContent) {
                    $validator->errors()->add('draft', 'Enter at least one listing detail before saving this draft.');
                }
            }

            if ($this->input('listing_type') === 'job'
                && $this->filled('salary_min')
                && $this->filled('salary_max')
                && (int) $this->input('salary_max') < (int) $this->input('salary_min')) {
                $validator->errors()->add('salary_max', 'The minimum salary cannot be higher than the maximum salary.');
            }

            if ($this->input('listing_type') === 'job') {
                foreach (['salary_min', 'salary_max'] as $field) {
                    if ($this->filled($field) && preg_match('/^\d{10,}$/D', (string) $this->input($field))) {
                        $validator->errors()->add($field, 'Salary values may contain no more than 9 digits.');
                    }
                }
            }

            if ($this->input('listing_type') === 'job'
                && ! $this->boolean('save_as_draft')
                && $this->boolean('experience_required')
                && ! $this->filled('minimum_experience_years')) {
                $validator->errors()->add(
                    'minimum_experience_years',
                    'Enter the minimum years of experience required for this job.',
                );
            }

            if ($this->input('listing_type') === 'ojt'
                && $this->input('allowance_type') === 'unpaid'
                && $this->filled('allowance_amount')) {
                $validator->errors()->add('allowance_amount', 'An unpaid listing cannot have an allowance amount.');
            }
        });
    }

    private function capitalizeWordStarts(string $value): string
    {
        return preg_replace_callback(
            '/(^|[\s.\'-])(\p{L})/u',
            fn (array $match): string => $match[1].mb_strtoupper($match[2]),
            $value,
        ) ?? $value;
    }

    private function capitalizeFirstLetter(string $value): string
    {
        return preg_replace_callback(
            '/^(\s*)(\p{L})/u',
            fn (array $match): string => $match[1].mb_strtoupper($match[2]),
            $value,
            1,
        ) ?? $value;
    }
}
