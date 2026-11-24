<?php

namespace App\Services;

use App\Models\Interview;
use App\Models\InterviewAvailability;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class InterviewAvailabilityService
{
    public function validateSchedule(array $schedule): void
    {
        if ($schedule['start_time'] >= $schedule['end_time']) {
            throw ValidationException::withMessages([
                'end_time' => ['The end time must be after the start time.'],
            ]);
        }

        $breakStart = $schedule['break_start_time'] ?? null;
        $breakEnd = $schedule['break_end_time'] ?? null;
        if (($breakStart === null) !== ($breakEnd === null)) {
            throw ValidationException::withMessages([
                'break_start_time' => ['Provide both break start and end times, or leave both empty.'],
            ]);
        }

        if ($breakStart !== null
            && ($breakStart >= $breakEnd
                || $breakStart < $schedule['start_time']
                || $breakEnd > $schedule['end_time'])) {
            throw ValidationException::withMessages([
                'break_start_time' => ['The break must be inside the available working hours and end after it starts.'],
            ]);
        }

        $timezone = $schedule['timezone'];
        $today = CarbonImmutable::now($timezone)->toDateString();
        foreach ($schedule['availability_dates'] as $date) {
            if ($date < $today) {
                throw ValidationException::withMessages([
                    'availability_dates' => ['Available interview dates cannot be in the past.'],
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Interview>  $busyInterviews
     * @return array<int, array{start_time: string, end_time: string}>
     */
    public function slotsFor(
        InterviewAvailability $availability,
        string $timezone,
        Collection $busyInterviews,
    ): array {
        $startMinute = $this->minutes($availability->start_time);
        $endMinute = $this->minutes($availability->end_time);
        $duration = $availability->duration_minutes;
        $step = $duration + $availability->buffer_minutes;
        $breakStart = $availability->break_start_time === null
            ? null
            : $this->minutes($availability->break_start_time);
        $breakEnd = $availability->break_end_time === null
            ? null
            : $this->minutes($availability->break_end_time);
        $date = $availability->available_date->toDateString();
        $slots = [];

        for ($minute = $startMinute; $minute + $duration <= $endMinute; $minute += $step) {
            $slotEndMinute = $minute + $duration;
            if ($breakStart !== null
                && $breakEnd !== null
                && $minute < $breakEnd
                && $slotEndMinute > $breakStart) {
                continue;
            }

            $startTime = $this->time($minute);
            $endTime = $this->time($slotEndMinute);
            $start = $this->localDateTime($date, $startTime, $timezone);
            if ($start === null || ! $start->isFuture()) {
                continue;
            }
            $end = $start->addMinutes($duration);
            $startUtc = $start->utc();
            $endUtc = $end->utc();

            $conflicts = $busyInterviews->contains(function (Interview $busy) use ($availability, $startUtc, $endUtc): bool {
                if ($busy->scheduled_at === null) {
                    return false;
                }

                $busyDate = $busy->scheduled_at->setTimezone($busy->timezone)->toDateString();
                $busyAvailability = $busy->availability->first(
                    fn (InterviewAvailability $item): bool => $item->available_date->toDateString() === $busyDate,
                );
                $buffer = max(
                    $availability->buffer_minutes,
                    (int) ($busyAvailability?->buffer_minutes ?? 0),
                );
                $busyStart = $busy->scheduled_at->utc()->subMinutes($buffer);
                $busyEnd = ($busy->end_at ?? $busy->scheduled_at->addHour())->utc()->addMinutes($buffer);

                return $startUtc->lessThan($busyEnd) && $endUtc->greaterThan($busyStart);
            });

            if (! $conflicts) {
                $slots[] = [
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                ];
            }
        }

        return $slots;
    }

    public function localDateTime(string $date, string $time, string $timezone): ?CarbonImmutable
    {
        $dateTime = CarbonImmutable::parse($date.' '.$time, $timezone);

        return $dateTime->format('Y-m-d H:i') === $date.' '.$time
            ? $dateTime
            : null;
    }

    private function minutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', substr($time, 0, 5)));

        return ($hours * 60) + $minutes;
    }

    private function time(int $minute): string
    {
        return sprintf('%02d:%02d', intdiv($minute, 60), $minute % 60);
    }
}
