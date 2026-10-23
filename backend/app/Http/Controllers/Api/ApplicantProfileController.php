<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicantProfile;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ApplicantProfileController extends Controller
{
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
                $request->user()->update(['name' => trim($validated['name'])]);
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
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $profile = $this->profileFor($request);
        $path = $request->file('photo')->storePublicly(
            'applicant-photos/'.$request->user()->id,
            'public',
        );

        if (! $path) {
            throw new RuntimeException('The applicant photo could not be stored.');
        }

        $oldPath = $profile->profile_photo_path;
        $profile->profile_photo_path = $path;
        $profile->save();

        if ($oldPath !== null && ! Storage::disk('public')->delete($oldPath)) {
            throw new RuntimeException('The previous applicant photo could not be removed.');
        }

        return response()->json([
            'message' => 'Profile photo uploaded.',
            'photo_url' => Storage::disk('public')->url($path),
        ], 201);
    }

    public function deletePhoto(Request $request): JsonResponse
    {
        $profile = $this->profileFor($request);

        if ($profile->profile_photo_path !== null) {
            if (! Storage::disk('public')->delete($profile->profile_photo_path)) {
                throw new RuntimeException('The applicant photo could not be removed.');
            }

            $profile->profile_photo_path = null;
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
                'array:school,course,year_level,required_hours,preferred_start_date,allowance_preference,requires_moa',
            ]],
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
            $profile->looking_for_jobs = $lookingForJobs;
            $profile->looking_for_ojt = $lookingForOjt;
            $profile->save();

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
            'profile_photo_path' => $profile->profile_photo_path,
            'profile_photo_url' => $profile->profile_photo_path
                ? Storage::disk('public')->url($profile->profile_photo_path)
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
                'year_level',
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
            foreach (['school', 'course', 'year_level', 'required_hours'] as $field) {
                if ($details === null || blank($details->{$field})) {
                    $missing[] = 'ojt_details.'.$field;
                }
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
            'year_level' => ['sometimes', 'nullable', 'integer', 'between:1,6'],
            'required_hours' => ['sometimes', 'nullable', 'integer', 'between:1,2000'],
            'preferred_start_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
            'allowance_preference' => ['sometimes', Rule::in(self::ALLOWANCE_PREFERENCES)],
            'requires_moa' => ['sometimes', 'boolean'],
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
        foreach (['desired_titles', 'preferred_locations'] as $key) {
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
