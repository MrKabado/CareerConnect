<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicantProfile;
use App\Models\Category;
use App\Models\Skill;
use App\Services\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ApplicantProfileController extends Controller
{
    public function __construct(private readonly MediaStorage $mediaStorage) {}

    private const EXPERIENCE_LEVELS = ['fresh_graduate', '1_3_years', '3_5_years', '5_plus_years'];

    private const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'];

    private const WORK_SETUPS = ['onsite', 'hybrid', 'remote'];

    private const ALLOWANCE_PREFERENCES = ['paid_only', 'unpaid_ok', 'no_preference'];

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->profileData($this->profileFor($request)),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'role' => ['prohibited'],
            'email' => ['prohibited'],
            'account_status' => ['prohibited'],
            'email_verified_at' => ['prohibited'],
            'password' => ['prohibited'],
            'looking_for_jobs' => ['prohibited'],
            'looking_for_ojt' => ['prohibited'],
        ]);

        $profile = $this->profileFor($request);

        DB::transaction(function () use ($validated, $request, $profile): void {
            if (array_key_exists('name', $validated)) {
                $request->user()->update([
                    'name' => mb_convert_case(trim($validated['name']), MB_CASE_TITLE, 'UTF-8'),
                ]);
            }

            $profile->fill(array_intersect_key($validated, array_flip(['phone', 'city'])));
            $profile->save();
        });

        return response()->json([
            'message' => 'Applicant profile updated.',
            'data' => $this->profileData($profile->fresh()),
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $profile = $this->profileFor($request);
        $file = $request->file('photo');
        $stored = $this->mediaStorage->storePublicImage(
            $file,
            'applicant-photos/'.$request->user()->id,
            'career-connect/users/'.$request->user()->id.'/profile-photos',
        );
        $oldPath = $profile->profile_photo_path;
        $oldDisk = $profile->profile_photo_disk;
        $oldAssetId = $profile->profile_photo_asset_id;
        try {
            $profile->profile_photo_path = $stored['path'];
            $profile->profile_photo_disk = $stored['disk'];
            $profile->profile_photo_asset_id = $stored['asset_id'];
            $profile->save();
        } catch (\Throwable $exception) {
            try {
                $this->mediaStorage->delete(
                    $stored['disk'],
                    $stored['path'],
                    $stored['asset_id'],
                    'image',
                    'upload',
                );
            } catch (\Throwable $cleanupException) {
                throw new RuntimeException('The failed applicant photo upload could not be cleaned up.', previous: $cleanupException);
            }
            throw $exception;
        }

        if ($oldPath !== null) {
            $this->mediaStorage->delete($oldDisk, $oldPath, $oldAssetId, 'image', 'upload');
        }

        return response()->json([
            'message' => 'Profile photo uploaded.',
            'photo_url' => $this->mediaStorage->publicImageUrl($stored['disk'], $stored['path']),
        ], 201);
    }

    public function deletePhoto(Request $request): JsonResponse
    {
        $profile = $this->profileFor($request);

        if ($profile->profile_photo_path !== null) {
            $this->mediaStorage->delete(
                $profile->profile_photo_disk,
                $profile->profile_photo_path,
                $profile->profile_photo_asset_id,
                'image',
                'upload',
            );

            $profile->profile_photo_path = null;
            $profile->profile_photo_disk = 'public';
            $profile->profile_photo_asset_id = null;
            $profile->save();
        }

        return response()->json([
            'message' => 'Profile photo deleted.',
            'data' => $this->profileData($profile->fresh()),
        ]);
    }

    public function onboarding(Request $request): JsonResponse
    {
        $profile = $this->profileFor($request);

        return response()->json([
            'data' => $this->profileData($profile),
            'onboarding' => $this->onboardingStatus($profile),
        ]);
    }

    public function saveOnboardingProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'goal' => ['required', Rule::in(['job-seeker', 'ojt-seeker'])],
            'job_categories' => ['required_if:goal,job-seeker', 'array', 'min:1', 'max:5'],
            'job_categories.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'training_fields' => ['required_if:goal,ojt-seeker', 'array', 'min:1', 'max:3'],
            'training_fields.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'desired_titles' => ['required_if:goal,job-seeker', 'array', 'min:1', 'max:3'],
            'desired_titles.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'skills' => ['required', 'array', 'min:1', 'max:30'],
            'skills.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'experience_level' => ['nullable', Rule::in(['Fresh graduate', '1–3 years', '3–5 years', '5+ years'])],
            'employment_types' => ['required_if:goal,job-seeker', 'array', 'min:1', 'max:3'],
            'employment_types.*' => ['required', Rule::in(['Full-time', 'Part-time', 'Contract']), 'distinct'],
            'minimum_salary' => ['nullable', 'integer', 'min:0'],
            'maximum_salary' => ['nullable', 'integer', 'min:0'],
            'work_setup' => ['required', Rule::in(['Onsite', 'Hybrid', 'Remote'])],
            'preferred_locations' => ['required', 'array', 'min:1', 'max:10'],
            'preferred_locations.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'school' => ['required_if:goal,ojt-seeker', 'nullable', 'string', 'max:255'],
            'course' => ['required_if:goal,ojt-seeker', 'nullable', 'string', 'max:255'],
            'year_level' => ['required_if:goal,ojt-seeker', 'nullable', Rule::in(['1st year', '2nd year', '3rd year', '4th year', '5th year'])],
            'required_ojt_hours' => ['required_if:goal,ojt-seeker', 'nullable', 'integer', 'between:1,2000'],
            'requires_moa' => ['nullable', 'boolean'],
            'preferred_start_date' => ['required_if:goal,ojt-seeker', 'nullable', 'date', 'after_or_equal:today'],
            'allowance_preference' => ['required_if:goal,ojt-seeker', 'nullable', Rule::in(['Required', 'Preferred', 'Not required'])],
        ]);

        $categoryNames = $validated['goal'] === 'job-seeker'
            ? $validated['job_categories']
            : $validated['training_fields'];
        $categoriesByName = Category::query()
            ->where('is_active', true)
            ->get(['id', 'name'])
            ->keyBy(fn (Category $category): string => mb_strtolower(trim($category->name)));
        $categoryIds = [];
        $otherCategories = [];

        foreach ($categoryNames as $categoryName) {
            $category = $categoriesByName->get(mb_strtolower(trim($categoryName)));
            if ($category === null) {
                $otherCategories[] = trim($categoryName);
            } else {
                $categoryIds[] = $category->id;
            }
        }

        if (count($otherCategories) > 5) {
            throw ValidationException::withMessages([
                'job_categories' => ['Too many selected categories are not available in the category list.'],
            ]);
        }

        $experienceLevels = [
            'Fresh graduate' => 'fresh_graduate',
            '1–3 years' => '1_3_years',
            '3–5 years' => '3_5_years',
            '5+ years' => '5_plus_years',
        ];
        $employmentTypes = [
            'Full-time' => 'full_time',
            'Part-time' => 'part_time',
            'Contract' => 'contract',
        ];
        $allowancePreferences = [
            'Required' => 'paid_only',
            'Preferred' => 'no_preference',
            'Not required' => 'unpaid_ok',
        ];

        if (($validated['minimum_salary'] ?? null) !== null
            && ($validated['maximum_salary'] ?? null) !== null
            && (int) $validated['maximum_salary'] < (int) $validated['minimum_salary']) {
            throw ValidationException::withMessages([
                'maximum_salary' => ['Maximum salary must be at least the minimum.'],
            ]);
        }

        $profile = $this->profileFor($request);

        DB::transaction(function () use (
            $profile,
            $validated,
            $categoryIds,
            $otherCategories,
            $experienceLevels,
            $employmentTypes,
            $allowancePreferences,
        ): void {
            $this->saveInterests($profile, [
                'category_ids' => $categoryIds,
                'other_categories' => $otherCategories,
                'skills' => $validated['skills'],
            ]);

            $profile->fill([
                'looking_for_jobs' => $validated['goal'] === 'job-seeker',
                'looking_for_ojt' => $validated['goal'] === 'ojt-seeker',
                'desired_titles' => $validated['desired_titles'] ?? [],
                'experience_level' => isset($validated['experience_level'])
                    ? $experienceLevels[$validated['experience_level']]
                    : null,
                'employment_types' => array_map(
                    fn (string $type): string => $employmentTypes[$type],
                    $validated['employment_types'] ?? [],
                ),
                'work_setups' => [mb_strtolower($validated['work_setup'])],
                'preferred_locations' => $validated['preferred_locations'],
                'salary_min' => $validated['minimum_salary'] ?? null,
                'salary_max' => $validated['maximum_salary'] ?? null,
                'other_categories' => $otherCategories,
                'onboarding_step' => 'review',
            ]);
            $profile->save();

            if ($validated['goal'] === 'ojt-seeker') {
                $profile->ojtDetails()->updateOrCreate([], [
                    'school' => trim($validated['school']),
                    'course' => trim($validated['course']),
                    'education_status' => 'undergraduate',
                    'year_level' => (int) $validated['year_level'][0],
                    'required_hours' => $validated['required_ojt_hours'],
                    'preferred_start_date' => $validated['preferred_start_date'],
                    'allowance_preference' => $allowancePreferences[$validated['allowance_preference']],
                    'requires_moa' => $validated['requires_moa'] ?? null,
                ]);
            }

            $this->recalculateOnboarding($profile);
        });

        return $this->updatedResponse($profile);
    }

    public function updateSeekerTypes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'looking_for_jobs' => ['sometimes', 'boolean'],
            'looking_for_ojt' => ['sometimes', 'boolean'],
        ]);

        $profile = $this->profileFor($request);
        $lookingForJobs = $validated['looking_for_jobs'] ?? $profile->looking_for_jobs;
        $lookingForOjt = $validated['looking_for_ojt'] ?? $profile->looking_for_ojt;

        if (! $lookingForJobs && ! $lookingForOjt) {
            throw ValidationException::withMessages([
                'looking_for_jobs' => ['At least one seeker type must remain enabled.'],
                'looking_for_ojt' => ['At least one seeker type must remain enabled.'],
            ]);
        }

        $profile->update([
            'looking_for_jobs' => $lookingForJobs,
            'looking_for_ojt' => $lookingForOjt,
            'onboarding_step' => 'type',
        ]);
        $this->recalculateOnboarding($profile);

        return response()->json([
            'message' => 'Seeker types updated.',
            'data' => $this->profileData($profile->fresh()),
            'onboarding' => $this->onboardingStatus($profile->fresh()),
        ]);
    }

    public function updateInterests(Request $request): JsonResponse
    {
        $validated = $request->validate($this->interestRules());
        $profile = $this->profileFor($request);

        DB::transaction(function () use ($profile, $validated): void {
            $this->saveInterests($profile, $validated);
            $profile->onboarding_step = 'interests';
            $profile->save();
            $this->recalculateOnboarding($profile);
        });

        return $this->updatedResponse($profile);
    }

    public function updateWorkPreferences(Request $request): JsonResponse
    {
        $validated = $request->validate($this->workPreferenceRules());
        $profile = $this->profileFor($request);
        $this->saveProfileFields($profile, $this->normalizeProfileFields($validated), 'work');

        return $this->updatedResponse($profile);
    }

    public function updateJobPreferences(Request $request): JsonResponse
    {
        $validated = $request->validate($this->jobPreferenceRules());
        $profile = $this->profileFor($request);
        $this->validateMergedSalaryRange($profile, $validated);
        $this->saveProfileFields($profile, $this->normalizeProfileFields($validated), 'job_details');

        return $this->updatedResponse($profile);
    }

    public function updateOjtDetails(Request $request): JsonResponse
    {
        $validated = $request->validate($this->ojtDetailRules());
        $profile = $this->profileFor($request);

        DB::transaction(function () use ($profile, $validated): void {
            if ($validated !== []) {
                $details = $profile->ojtDetails()->firstOrNew();
                $details->fill($validated);
                $details->save();
            }

            $profile->onboarding_step = 'ojt_details';
            $profile->save();
            $this->recalculateOnboarding($profile);
        });

        return $this->updatedResponse($profile);
    }

    public function completeOnboarding(Request $request): JsonResponse
    {
        $profile = $this->profileFor($request);
        $status = $this->onboardingStatus($profile);

        if (! $status['can_complete']) {
            return response()->json([
                'message' => 'Complete the required onboarding information before finishing.',
                'code' => 'onboarding_incomplete',
                'missing_fields' => $status['missing_fields'],
            ], 422);
        }

        $profile->onboarding_completed_at ??= now();
        $profile->onboarding_step = 'review';
        $profile->save();

        return response()->json([
            'message' => 'Onboarding completed.',
            'data' => $this->profileData($profile->fresh()),
            'onboarding' => $this->onboardingStatus($profile->fresh()),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate(array_merge(
            $this->interestRules(),
            $this->seekerTypeRules(),
            $this->workPreferenceRules(),
            $this->jobPreferenceRules(),
            ['ojt_details' => [
                'sometimes',
                'array:school,course,education_status,year_level,graduation_year,required_hours,preferred_start_date,allowance_preference,requires_moa',
            ]],
            [
                'name' => ['sometimes', 'string', 'max:255'],
                'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
                'city' => ['sometimes', 'nullable', 'string', 'max:100'],
                'profile_links' => ['sometimes', 'nullable', 'array'],
                'profile_links.portfolio' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'profile_links.github' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'profile_links.linkedin' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'profile_links.other' => ['sometimes', 'nullable', 'array'],
                'profile_links.other.label' => ['required_with:profile_links.other', 'string', 'max:100'],
                'profile_links.other.url' => ['required_with:profile_links.other', 'string', 'max:2048'],
            ],
            $this->nestedOjtDetailRules(),
        ));
        $profile = $this->profileFor($request);
        $lookingForJobs = $validated['looking_for_jobs'] ?? $profile->looking_for_jobs;
        $lookingForOjt = $validated['looking_for_ojt'] ?? $profile->looking_for_ojt;

        if (! $lookingForJobs && ! $lookingForOjt) {
            throw ValidationException::withMessages([
                'looking_for_jobs' => ['At least one seeker type must remain enabled.'],
                'looking_for_ojt' => ['At least one seeker type must remain enabled.'],
            ]);
        }

        $fields = $this->normalizeProfileFields($validated);
        $this->validateMergedSalaryRange($profile, $fields);

        DB::transaction(function () use ($profile, $validated, $fields, $lookingForJobs, $lookingForOjt): void {
            $this->saveInterests($profile, $validated);
            $profile->fill($fields);
            $profile->fill(array_intersect_key(
                $validated,
                array_flip(['phone', 'city']),
            ));
            $profile->looking_for_jobs = $lookingForJobs;
            $profile->looking_for_ojt = $lookingForOjt;
            $profile->save();

            if (array_key_exists('name', $validated)) {
                $profile->user()->update([
                    'name' => mb_convert_case(trim($validated['name']), MB_CASE_TITLE, 'UTF-8'),
                ]);
            }

            if (isset($validated['ojt_details'])) {
                $details = $profile->ojtDetails()->firstOrNew();
                $details->fill($validated['ojt_details']);
                $details->save();
            }

            $this->recalculateOnboarding($profile);
        });

        return $this->updatedResponse($profile);
    }

    public function finishOjt(Request $request): JsonResponse
    {
        $profile = $this->profileFor($request);
        $profile->update([
            'looking_for_jobs' => true,
            'looking_for_ojt' => false,
        ]);
        $this->recalculateOnboarding($profile);

        return response()->json([
            'message' => 'OJT seeking has been disabled.',
            'data' => $this->profileData($profile->fresh()),
            'onboarding' => $this->onboardingStatus($profile->fresh()),
        ]);
    }

    private function profileFor(Request $request): ApplicantProfile
    {
        return $request->user()->applicantProfile()->firstOrCreate(
            [],
            ['looking_for_jobs' => true, 'looking_for_ojt' => false],
        );
    }

    private function profileData(ApplicantProfile $profile): array
    {
        $profile->loadMissing(['user:id,name,email', 'categories:id,name', 'skills:id,name', 'ojtDetails']);

        return [
            'id' => $profile->id,
            'name' => $profile->user->name,
            'email' => $profile->user->email,
            'phone' => $profile->phone,
            'city' => $profile->city,
            'profile_links' => $profile->profile_links ?? [],
            'other_categories' => $profile->other_categories ?? [],
            'profile_photo_path' => $profile->profile_photo_path,
            'profile_photo_url' => $profile->profile_photo_path
                ? $this->mediaStorage->publicImageUrl($profile->profile_photo_disk, $profile->profile_photo_path)
                : null,
            'looking_for_jobs' => $profile->looking_for_jobs,
            'looking_for_ojt' => $profile->looking_for_ojt,
            'interests' => $profile->categories->map(fn ($category): array => [
                'id' => $category->id,
                'name' => $category->name,
            ])->values(),
            'skills' => $profile->skills->map(fn (Skill $skill): string => $skill->name)->values(),
            'work_setups' => $profile->work_setups,
            'preferred_locations' => $profile->preferred_locations,
            'desired_titles' => $profile->desired_titles,
            'experience_level' => $profile->experience_level,
            'employment_types' => $profile->employment_types,
            'salary_min' => $profile->salary_min,
            'salary_max' => $profile->salary_max,
            'ojt_details' => $profile->ojtDetails?->only([
                'school',
                'course',
                'education_status',
                'year_level',
                'graduation_year',
                'required_hours',
                'preferred_start_date',
                'allowance_preference',
                'requires_moa',
            ]),
            'onboarding_step' => $profile->onboarding_step,
            'onboarding_completed_at' => $profile->onboarding_completed_at?->toISOString(),
        ];
    }

    private function onboardingStatus(ApplicantProfile $profile): array
    {
        $details = $profile->ojtDetails;
        $missing = [];

        if (! $profile->looking_for_jobs && ! $profile->looking_for_ojt) {
            $missing[] = 'seeker_type';
        }

        if ($profile->looking_for_ojt) {
            foreach (['school', 'course', 'required_hours'] as $field) {
                if ($details === null || blank($details->{$field})) {
                    $missing[] = 'ojt_details.'.$field;
                }
            }

            $educationStatus = $details?->education_status
                ?? (filled($details?->year_level) ? 'undergraduate' : null);

            if (blank($educationStatus)) {
                $missing[] = 'ojt_details.education_status';
            } elseif ($educationStatus === 'undergraduate' && blank($details?->year_level)) {
                $missing[] = 'ojt_details.year_level';
            } elseif ($educationStatus === 'graduated' && blank($details?->graduation_year)) {
                $missing[] = 'ojt_details.graduation_year';
            }
        }

        return [
            'completed' => $profile->onboarding_completed_at !== null && $missing === [],
            'completed_at' => $missing === [] ? $profile->onboarding_completed_at?->toISOString() : null,
            'step' => $profile->onboarding_step,
            'can_complete' => $missing === [],
            'missing_fields' => $missing,
        ];
    }

    private function updatedResponse(ApplicantProfile $profile): JsonResponse
    {
        $profile->refresh();

        return response()->json([
            'message' => 'Applicant preferences updated.',
            'data' => $this->profileData($profile),
            'onboarding' => $this->onboardingStatus($profile),
        ]);
    }

    private function interestRules(): array
    {
        return [
            'category_ids' => ['sometimes', 'array', 'max:5'],
            'category_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('categories', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'skills' => ['sometimes', 'array', 'max:30'],
            'skills.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'other_categories' => ['sometimes', 'array', 'max:5'],
            'other_categories.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
        ];
    }

    private function seekerTypeRules(): array
    {
        return [
            'looking_for_jobs' => ['sometimes', 'boolean'],
            'looking_for_ojt' => ['sometimes', 'boolean'],
        ];
    }

    private function workPreferenceRules(): array
    {
        return [
            'work_setups' => ['sometimes', 'array', 'max:3'],
            'work_setups.*' => ['required', 'string', Rule::in(self::WORK_SETUPS), 'distinct'],
            'preferred_locations' => ['sometimes', 'array', 'max:10'],
            'preferred_locations.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
        ];
    }

    private function jobPreferenceRules(): array
    {
        return [
            'desired_titles' => ['sometimes', 'array', 'max:3'],
            'desired_titles.*' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'experience_level' => ['sometimes', 'nullable', Rule::in(self::EXPERIENCE_LEVELS)],
            'employment_types' => ['sometimes', 'array', 'max:3'],
            'employment_types.*' => ['required', 'string', Rule::in(self::EMPLOYMENT_TYPES), 'distinct'],
            'salary_min' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'salary_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }

    private function ojtDetailRules(): array
    {
        return [
            'school' => ['sometimes', 'nullable', 'string', 'max:255'],
            'course' => ['sometimes', 'nullable', 'string', 'max:255'],
            'education_status' => ['sometimes', 'nullable', Rule::in(['undergraduate', 'graduated'])],
            'year_level' => ['sometimes', 'nullable', 'integer', 'between:1,6'],
            'graduation_year' => ['sometimes', 'nullable', 'integer', 'between:1900,2100'],
            'required_hours' => ['sometimes', 'nullable', 'integer', 'between:1,2000'],
            'preferred_start_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
            'allowance_preference' => ['sometimes', 'nullable', Rule::in(self::ALLOWANCE_PREFERENCES)],
            'requires_moa' => ['sometimes', 'nullable', 'boolean'],
        ];
    }

    private function nestedOjtDetailRules(): array
    {
        $nested = [];

        foreach ($this->ojtDetailRules() as $field => $fieldRules) {
            $nested['ojt_details.'.$field] = $fieldRules;
        }

        return $nested;
    }

    private function saveInterests(ApplicantProfile $profile, array $validated): void
    {
        if (array_key_exists('category_ids', $validated)) {
            $profile->categories()->sync($validated['category_ids']);
        }

        if (array_key_exists('skills', $validated)) {
            $skills = collect($validated['skills'])
                ->map(fn (string $name): array => [
                    'name' => trim($name),
                    'normalized_name' => mb_strtolower(trim($name)),
                ])
                ->filter(fn (array $skill): bool => $skill['name'] !== '')
                ->unique('normalized_name')
                ->map(fn (array $skill): int => Skill::firstOrCreate(
                    ['normalized_name' => $skill['normalized_name']],
                    ['name' => $skill['name']],
                )->id)
                ->all();

            $profile->skills()->sync($skills);
        }
    }

    private function saveProfileFields(ApplicantProfile $profile, array $fields, string $step): void
    {
        DB::transaction(function () use ($profile, $fields, $step): void {
            $profile->fill($fields);
            $profile->onboarding_step = $step;
            $profile->save();
            $this->recalculateOnboarding($profile);
        });
    }

    private function normalizeProfileFields(array $fields): array
    {
        foreach (['desired_titles', 'preferred_locations', 'other_categories'] as $key) {
            if (array_key_exists($key, $fields) && is_array($fields[$key])) {
                $fields[$key] = collect($fields[$key])
                    ->map(fn (string $value): string => trim($value))
                    ->filter()
                    ->unique(fn (string $value): string => mb_strtolower($value))
                    ->values()
                    ->all();
            }
        }

        return $fields;
    }

    private function validateMergedSalaryRange(ApplicantProfile $profile, array $fields): void
    {
        $minimum = array_key_exists('salary_min', $fields) ? $fields['salary_min'] : $profile->salary_min;
        $maximum = array_key_exists('salary_max', $fields) ? $fields['salary_max'] : $profile->salary_max;

        if ($minimum !== null && $maximum !== null && (int) $maximum < (int) $minimum) {
            throw ValidationException::withMessages([
                'salary_max' => ['The maximum salary must be at least the minimum salary.'],
            ]);
        }
    }

    private function recalculateOnboarding(ApplicantProfile $profile): void
    {
        if ($profile->onboarding_completed_at !== null
            && ! $this->onboardingStatus($profile)['can_complete']) {
            $profile->onboarding_completed_at = null;
            $profile->save();
        }
    }
}
