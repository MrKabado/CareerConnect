<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class JobListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'employer';
    }

    public function rules(): array
    {
        return [
            'listing_type' => ['required', Rule::in(['job', 'ojt'])],
            'title' => ['required', 'string', 'max:255'],
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'description' => ['required', 'string', 'max:10000'],
            'responsibilities' => ['required', 'string', 'max:10000'],
            'requirements' => ['required', 'string', 'max:10000'],
            'location' => ['required', 'string', 'max:255'],
            'work_setup' => ['required', Rule::in(['onsite', 'hybrid', 'remote'])],
            'employment_type' => [
                'exclude_unless:listing_type,job',
                'required_if:listing_type,job',
                'string',
                Rule::in(['full_time', 'part_time', 'contract']),
            ],
            'salary_min' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'integer', 'min:0'],
            'salary_max' => ['exclude_unless:listing_type,job', 'sometimes', 'nullable', 'integer', 'min:0'],
            'duration_hours' => [
                'exclude_unless:listing_type,ojt',
                'required_if:listing_type,ojt',
                'integer',
                'min:1',
                'max:65535',
            ],
            'allowance_type' => [
                'exclude_unless:listing_type,ojt',
                'required_if:listing_type,ojt',
                Rule::in(['paid', 'unpaid']),
            ],
            'allowance_amount' => [
                'exclude_unless:listing_type,ojt',
                'required_if:allowance_type,paid',
                'nullable',
                'integer',
                'min:0',
            ],
            'slots' => [
                'exclude_unless:listing_type,ojt',
                'required_if:listing_type,ojt',
                'integer',
                'min:1',
                'max:65535',
            ],
            'accepted_courses' => ['exclude_unless:listing_type,ojt', 'sometimes', 'nullable', 'array', 'max:100'],
            'accepted_courses.*' => ['string', 'max:100', 'distinct'],
            'moa_accepted' => [
                'exclude_unless:listing_type,ojt',
                'required_if:listing_type,ojt',
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
            if ($this->input('listing_type') === 'job'
                && $this->filled('salary_min')
                && $this->filled('salary_max')
                && (int) $this->input('salary_max') < (int) $this->input('salary_min')) {
                $validator->errors()->add('salary_max', 'The maximum salary must be at least the minimum salary.');
            }

            if ($this->input('listing_type') === 'ojt'
                && $this->input('allowance_type') === 'unpaid'
                && $this->filled('allowance_amount')) {
                $validator->errors()->add('allowance_amount', 'An unpaid listing cannot have an allowance amount.');
            }
        });
    }
}
