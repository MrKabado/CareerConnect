<?php

namespace App\Services;

use App\Models\ApplicantProfile;
use App\Models\JobListing;

class ApplicantJobMatcher
{
    /**
     * @return array{score: int, reasons: array<int, string>}
     */
    public function match(?ApplicantProfile $profile, JobListing $listing): array
    {
        if ($profile === null) {
            return ['score' => 0, 'reasons' => []];
        }

        $profile->loadMissing(['skills', 'categories', 'ojtDetails']);
        $listing->loadMissing('category');

        $factors = [];
        $reasons = [];
        $interests = $profile->categories->pluck('name')
            ->concat($profile->other_categories ?? [])
            ->values()
            ->all();
        $factors[] = [
            'label' => 'job category',
            'score' => $this->bestOverlap($interests, $listing->category?->name ?? ''),
        ];

        $requiredSkills = $listing->required_skills ?? [];
        if ($requiredSkills !== []) {
            $applicantSkills = array_map(fn (string $skill): string => $this->normalize($skill), $profile->skills->pluck('name')->all());
            $matchedSkills = count(array_filter(
                $requiredSkills,
                fn (string $skill): bool => in_array($this->normalize($skill), $applicantSkills, true),
            ));
            $factors[] = [
                'label' => 'required skills',
                'score' => $matchedSkills / count($requiredSkills),
            ];
        }

        if ($listing->experience_required) {
            $experienceYears = match ($profile->experience_level) {
                '1_3_years' => 1,
                '3_5_years' => 3,
                '5_plus_years' => 5,
                'fresh_graduate' => 0,
                default => 0,
            };
            $factors[] = [
                'label' => 'required experience',
                'score' => min(1, $experienceYears / max(1, $listing->minimum_experience_years ?? 1)),
            ];
        }

        $requirements = (string) $listing->requirements;
        if (preg_match('/\b(bachelor|degree|diploma|master|university|college)\b/i', $requirements) === 1) {
            $course = $profile->ojtDetails?->course ?? '';
            $courseTerms = $this->terms($course);
            $requirementTerms = $this->terms($requirements);
            $courseMatches = $courseTerms !== []
                && count(array_diff($courseTerms, $requirementTerms)) === 0;
            $requiresGraduation = preg_match('/\b(bachelor|degree|diploma|master)\b/i', $requirements) === 1
                && preg_match('/\b(undergraduate|currently pursuing|student)\b/i', $requirements) !== 1;
            $hasRequiredEducationStatus = ! $requiresGraduation
                || $profile->ojtDetails?->education_status === 'graduated';
            $factors[] = [
                'label' => 'education',
                'score' => $courseMatches && $hasRequiredEducationStatus ? 1 : 0,
            ];
        }

        if (($profile->desired_titles ?? []) !== []) {
            $factors[] = [
                'label' => 'desired role',
                'score' => $this->bestOverlap($profile->desired_titles, $listing->title),
            ];
        }

        if (($profile->preferred_locations ?? []) !== []) {
            $factors[] = [
                'label' => 'preferred location',
                'score' => $this->bestOverlap($profile->preferred_locations, $listing->location),
            ];
        }

        if (($profile->work_setups ?? []) !== []) {
            $factors[] = [
                'label' => 'work setup',
                'score' => in_array($this->normalize($listing->work_setup), array_map(
                    fn (string $setup): string => $this->normalize($setup),
                    $profile->work_setups,
                ), true) ? 1 : 0,
            ];
        }

        if (($profile->employment_types ?? []) !== []) {
            $factors[] = [
                'label' => 'employment type',
                'score' => in_array($this->normalize((string) $listing->employment_type), array_map(
                    fn (string $type): string => $this->normalize($type),
                    $profile->employment_types,
                ), true) ? 1 : 0,
            ];
        }

        if ($profile->salary_min !== null
            && $profile->salary_max !== null
            && $listing->salary_min !== null
            && $listing->salary_max !== null) {
            $factors[] = [
                'label' => 'salary range',
                'score' => max($profile->salary_min, $listing->salary_min)
                    <= min($profile->salary_max, $listing->salary_max) ? 1 : 0,
            ];
        }

        foreach ($factors as $factor) {
            if ($factor['score'] > 0) {
                $reasons[] = $factor['label'];
            }
        }

        $score = (int) round(array_sum(array_column($factors, 'score')) / count($factors) * 100);

        return [
            'score' => max(0, min(100, $score)),
            'reasons' => $reasons,
        ];
    }

    /**
     * @param  array<int, string>  $values
     */
    private function bestOverlap(array $values, string $target): float
    {
        $score = 0.0;
        foreach ($values as $value) {
            $score = max($score, $this->overlap($value, $target));
        }

        return $score;
    }

    private function overlap(string $left, string $right): float
    {
        $leftTerms = $this->terms($left);
        $rightTerms = $this->terms($right);
        if ($leftTerms === [] || $rightTerms === []) {
            return 0;
        }

        $shared = count(array_intersect($leftTerms, $rightTerms));
        $union = count(array_unique([...$leftTerms, ...$rightTerms]));

        return $shared / $union;
    }

    /**
     * @return array<int, string>
     */
    private function terms(string $value): array
    {
        preg_match_all('/[a-z0-9]+/i', mb_strtolower($value), $matches);

        return array_values(array_unique($matches[0]));
    }

    private function normalize(string $value): string
    {
        return str_replace('on site', 'onsite', implode(' ', $this->terms($value)));
    }
}
