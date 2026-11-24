<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RoleNotificationMail;
use App\Models\Application;
use App\Models\Interview;
use App\Models\InterviewAvailability;
use App\Models\InterviewHistory;
use App\Models\User;
use App\Services\InterviewAvailabilityService;
use App\Services\NotificationService;
use App\Services\PhilippineLocationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InterviewController extends Controller
{
    public function __construct(
        private readonly InterviewAvailabilityService $availabilityService,
        private readonly PhilippineLocationService $locations,
    ) {}

    public function store(Request $request, int $application): JsonResponse
    {
        $validated = $request->validate($this->availabilityRules());
        $validated = $this->resolveOnsiteLocation($validated);
        $this->availabilityService->validateSchedule($validated);
        $this->validateOnlineMeetingDetails($request);
        $employer = $request->user();

        $interview = DB::transaction(function () use ($application, $employer, $validated): Interview {
            $application = $this->employerApplications($employer)
                ->lockForUpdate()
                ->findOrFail($application);

            if (! in_array($application->status, ['shortlisted', 'interview'], true)) {
                throw ValidationException::withMessages([
                    'application' => ['Interview availability can only be published for a shortlisted applicant.'],
                ]);
            }

            if ($application->interviews()->whereIn('status', ['invited', 'scheduled'])->exists()) {
                throw ValidationException::withMessages([
                    'application' => ['This application already has an active interview invitation.'],
                ]);
            }

            $interview = new Interview([
                'timezone' => $validated['timezone'],
                'mode' => $validated['mode'],
                'location' => $validated['location'] ?? null,
                ...$this->interviewAddressAttributes($validated),
                'meeting_url' => $validated['meeting_url'] ?? null,
                'meeting_instructions' => $validated['meeting_instructions'] ?? null,
                'internal_notes' => $validated['internal_notes'] ?? null,
                'applicant_notes' => $validated['applicant_notes'] ?? null,
                'status' => 'invited',
            ]);
            $interview->application()->associate($application);
            $interview->applicant_id = $application->applicant_id;
            $interview->employer_id = $employer->id;
            $interview->save();

            foreach ($validated['availability_dates'] as $date) {
                $interview->availability()->create($this->availabilityAttributes($validated, $date));
            }

            if (! $this->hasAnyFutureSlot($interview)) {
                throw ValidationException::withMessages([
                    'availability_dates' => ['Select at least one date with interview slots that have not passed.'],
                ]);
            }

            if ($application->status === 'shortlisted') {
                $application->status = 'interview';
                $application->save();
                $application->statusHistories()->create([
                    'previous_status' => 'shortlisted',
                    'new_status' => 'interview',
                    'actor_id' => $employer->id,
                    'public_reason' => 'You are invited to choose an interview time.',
                    'internal_reason' => null,
                    'created_at' => now(),
                ]);
            }

            $interview->histories()->create([
                'event_type' => 'invited',
                'previous_schedule' => null,
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $employer->id,
                'created_at' => now(),
            ]);

            return $interview;
        });

        $this->notifyApplicant(
            $interview,
            'interview_invited',
            'Choose an interview time',
            'You are invited to choose an interview time from the employer’s available dates.',
        );

        return response()->json([
            'message' => 'Interview availability published and applicant invited to schedule.',
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), false),
        ], 201);
    }

    public function applicationIndex(Request $request, int $application): JsonResponse
    {
        $ownedApplication = $this->employerApplications($request->user())->findOrFail($application);

        return response()->json([
            'data' => $ownedApplication->interviews()
                ->with(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability'])
                ->get()
                ->map(fn (Interview $interview): array => $this->interviewData($interview, false)),
        ]);
    }

    public function employerShow(Request $request, int $interview): JsonResponse
    {
        $interview = $this->employerInterviews($request->user())
            ->with(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability'])
            ->findOrFail($interview);

        return response()->json(['data' => $this->interviewData($interview, false)]);
    }

    public function reschedule(Request $request, int $interview): JsonResponse
    {
        abort(405, 'Applicants choose their own interview time from the employer availability.');
    }

    public function updateAvailability(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate($this->availabilityRules());
        $validated = $this->resolveOnsiteLocation($validated);
        $this->availabilityService->validateSchedule($validated);
        $this->validateOnlineMeetingDetails($request);

        [$interview, $bookedDatePreserved] = DB::transaction(function () use ($request, $interview, $validated): array {
            $interview = $this->employerInterviews($request->user())
                ->with('availability')
                ->lockForUpdate()
                ->findOrFail($interview);

            if (! in_array($interview->status, ['invited', 'scheduled'], true)) {
                throw ValidationException::withMessages([
                    'interview' => ['Availability can only be changed for an active invitation or scheduled interview.'],
                ]);
            }

            if ($validated['timezone'] !== $interview->timezone) {
                throw ValidationException::withMessages([
                    'timezone' => ['The time zone cannot be changed after this invitation is published.'],
                ]);
            }

            $previousSchedule = $this->historySchedule($interview);
            $interview->fill([
                'mode' => $validated['mode'],
                'location' => $validated['location'] ?? null,
                ...$this->interviewAddressAttributes($validated),
                'meeting_url' => $validated['meeting_url'] ?? null,
                'meeting_instructions' => $validated['meeting_instructions'] ?? null,
                'applicant_notes' => $validated['applicant_notes'] ?? null,
            ])->save();

            $requestedDates = array_fill_keys($validated['availability_dates'], true);
            $bookedDate = $interview->status === 'scheduled' && $interview->scheduled_at !== null
                ? $interview->scheduled_at->setTimezone($interview->timezone)->toDateString()
                : null;
            $bookedDatePreserved = false;
            $existingDates = [];

            foreach ($interview->availability as $availability) {
                $date = $availability->available_date->toDateString();
                $existingDates[$date] = true;
                if ($date === $bookedDate) {
                    $bookedDatePreserved = ! isset($requestedDates[$date])
                        || ! $this->scheduleContainsBookedTime($validated, $interview);
                    if ($bookedDatePreserved) {
                        continue;
                    }
                }

                if (! isset($requestedDates[$date])) {
                    $availability->delete();

                    continue;
                }

                $availability->update($this->availabilityAttributes($validated, $date));
            }

            foreach ($validated['availability_dates'] as $date) {
                if (isset($existingDates[$date]) || $date === $bookedDate && $bookedDatePreserved) {
                    continue;
                }
                $interview->availability()->create($this->availabilityAttributes($validated, $date));
            }

            $interview->load('availability');
            if ($interview->status === 'invited' && ! $this->hasAnyFutureSlot($interview)) {
                throw ValidationException::withMessages([
                    'availability_dates' => ['Keep at least one date with interview slots that have not passed.'],
                ]);
            }

            $interview->histories()->create([
                'event_type' => 'availability_updated',
                'previous_schedule' => $previousSchedule,
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            return [$interview, $bookedDatePreserved];
        });

        $this->notifyApplicant(
            $interview,
            'interview_availability_updated',
            'Interview availability updated',
            $bookedDatePreserved
                ? 'The employer updated interview availability. Your confirmed interview time remains unchanged.'
                : 'The employer updated the available interview times for your invitation.',
        );

        return response()->json([
            'message' => $bookedDatePreserved
                ? 'Availability updated. The booked interview time was preserved.'
                : 'Interview availability updated.',
            'booked_date_preserved' => $bookedDatePreserved,
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), false),
        ]);
    }

    public function applicantAvailability(Request $request, int $interview): JsonResponse
    {
        $interview = $request->user()->interviewsAsApplicant()
            ->with(['availability', 'application.jobListing.company'])
            ->whereIn('status', ['invited', 'scheduled'])
            ->findOrFail($interview);

        return response()->json([
            'data' => [
                'interview_id' => $interview->id,
                'timezone' => $interview->timezone,
                'mode' => $interview->mode,
                'location' => $interview->location,
                ...$this->interviewAddressData($interview),
                'meeting_url' => $interview->meeting_url,
                'meeting_instructions' => $interview->meeting_instructions,
                'listing_title' => $interview->application?->jobListing?->title,
                'company_name' => $interview->application?->jobListing?->company?->name,
                'dates' => $this->availabilityDates($interview),
            ],
        ]);
    }

    public function bookApplicantInterview(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
        ]);

        [$interview, $changed, $eventType] = DB::transaction(function () use ($request, $interview, $validated): array {
            $interview = $request->user()->interviewsAsApplicant()
                ->with(['availability', 'application'])
                ->lockForUpdate()
                ->findOrFail($interview);

            if (! in_array($interview->status, ['invited', 'scheduled'], true)
                || $interview->application?->status !== 'interview') {
                throw ValidationException::withMessages([
                    'interview' => ['This interview invitation is no longer available for scheduling.'],
                ]);
            }

            User::query()->whereKey($interview->employer_id)->lockForUpdate()->firstOrFail();
            $availability = $interview->availability()
                ->whereDate('available_date', $validated['date'])
                ->lockForUpdate()
                ->first();

            if ($availability === null) {
                return $this->unavailableSlot();
            }

            $slots = $this->availableSlots($interview, $availability);
            $slot = collect($slots)->firstWhere('start_time', $validated['start_time']);
            if ($slot === null) {
                return $this->unavailableSlot();
            }

            $start = $this->availabilityService->localDateTime(
                $validated['date'],
                $slot['start_time'],
                $interview->timezone,
            );
            if ($start === null) {
                return $this->unavailableSlot();
            }

            $end = $start->addMinutes($availability->duration_minutes);
            if ($interview->status === 'scheduled'
                && $interview->scheduled_at?->equalTo($start->utc())
                && $interview->end_at?->equalTo($end->utc())) {
                return [$interview, false, null];
            }

            $previousSchedule = $this->historySchedule($interview);
            $wasReschedule = $interview->status === 'scheduled';
            $interview->scheduled_at = $start->utc();
            $interview->end_at = $end->utc();
            $interview->status = 'scheduled';
            $interview->save();
            $interview->histories()->create([
                'event_type' => $wasReschedule ? 'rescheduled' : 'booked',
                'previous_schedule' => $previousSchedule,
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            return [$interview, true, $wasReschedule ? 'rescheduled' : 'booked'];
        });

        if ($changed) {
            $this->notifyApplicant(
                $interview,
                $eventType === 'rescheduled'
                    ? 'interview_rescheduled'
                    : 'interview_scheduled',
                'Interview time confirmed',
                'Your interview time has been confirmed.',
            );
            $this->notifyEmployer(
                $interview,
                $eventType === 'rescheduled'
                    ? 'interview_rescheduled'
                    : 'interview_booked',
                'Applicant selected an interview time',
                'The applicant has selected an available interview time.',
            );
        }

        return response()->json([
            'message' => $changed ? 'Interview time confirmed.' : 'This interview time is already confirmed.',
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), true),
        ]);
    }

    public function applicantCancel(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        $interview = DB::transaction(function () use ($request, $interview, $validated): Interview {
            $interview = $request->user()->interviewsAsApplicant()
                ->lockForUpdate()
                ->findOrFail($interview);

            if ($interview->status !== 'scheduled') {
                throw ValidationException::withMessages([
                    'interview' => ['Only a confirmed interview can be cancelled.'],
                ]);
            }

            User::query()->whereKey($interview->employer_id)->lockForUpdate()->firstOrFail();
            $previousSchedule = $this->historySchedule($interview);
            $interview->status = 'cancelled';
            $interview->cancelled_at = now();
            $interview->cancelled_by = $request->user()->id;
            $interview->cancellation_reason = isset($validated['reason'])
                ? trim($validated['reason'])
                : null;
            $interview->save();
            $interview->histories()->create([
                'event_type' => 'cancelled',
                'previous_schedule' => $previousSchedule,
                'new_schedule' => null,
                'actor_id' => $request->user()->id,
                'reason' => $interview->cancellation_reason,
                'created_at' => now(),
            ]);

            return $interview;
        });

        $this->notifyEmployer(
            $interview,
            'interview_cancelled',
            'Applicant cancelled the interview',
            'The applicant cancelled the confirmed interview.',
        );

        return response()->json([
            'message' => 'Interview cancelled.',
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), true),
        ]);
    }

    public function cancel(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        [$interview, $changed] = DB::transaction(function () use ($request, $interview, $validated): array {
            $interview = $this->employerInterviews($request->user())
                ->lockForUpdate()
                ->findOrFail($interview);

            if (! in_array($interview->status, ['invited', 'scheduled'], true)) {
                if ($interview->status === 'cancelled') {
                    throw ValidationException::withMessages([
                        'interview' => ['This interview has already been cancelled.'],
                    ]);
                }

                throw ValidationException::withMessages([
                    'interview' => ['Only an active interview invitation or scheduled interview can be cancelled.'],
                ]);
            }

            $previousSchedule = $this->historySchedule($interview);
            $interview->status = 'cancelled';
            $interview->cancelled_at = now();
            $interview->cancelled_by = $request->user()->id;
            $interview->cancellation_reason = isset($validated['reason'])
                ? trim($validated['reason'])
                : null;
            $interview->save();
            $interview->histories()->create([
                'event_type' => 'cancelled',
                'previous_schedule' => $previousSchedule,
                'new_schedule' => null,
                'actor_id' => $request->user()->id,
                'reason' => $interview->cancellation_reason,
                'created_at' => now(),
            ]);

            return [$interview, true];
        });

        if ($changed) {
            $this->notifyApplicant(
                $interview,
                'interview_cancelled',
                'Interview cancelled',
                'The employer cancelled your interview invitation.',
            );
        }

        return response()->json([
            'message' => 'Interview cancelled.',
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), false),
        ]);
    }

    public function updateStatus(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['completed'])],
        ]);
        $interview = DB::transaction(function () use ($request, $interview, $validated): Interview {
            $interview = $this->employerInterviews($request->user())
                ->lockForUpdate()
                ->findOrFail($interview);

            if ($interview->status !== 'scheduled'
                || $validated['status'] !== 'completed'
                || $interview->scheduled_at === null
                || $interview->scheduled_at->isFuture()) {
                throw ValidationException::withMessages([
                    'status' => ['Only a scheduled interview whose start time has passed can be completed.'],
                ]);
            }

            $interview->status = 'completed';
            $interview->save();
            $interview->histories()->create([
                'event_type' => 'completed',
                'previous_schedule' => $this->historySchedule($interview),
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            return $interview;
        });

        return response()->json([
            'message' => 'Interview marked as completed.',
            'data' => $this->interviewData($interview->load(['application.jobListing.company', 'applicant', 'employer', 'histories', 'availability']), false),
        ]);
    }

    public function applicantIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'filter' => ['sometimes', Rule::in(['upcoming', 'past', 'cancelled'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        return $this->applicantInterviewList($request, $filters['filter'] ?? null, $filters['per_page'] ?? 15);
    }

    public function applicantUpcoming(Request $request): JsonResponse
    {
        return $this->applicantInterviewList($request, 'upcoming');
    }

    public function applicantPast(Request $request): JsonResponse
    {
        return $this->applicantInterviewList($request, 'past');
    }

    public function applicantShow(Request $request, int $interview): JsonResponse
    {
        $interview = $request->user()->interviewsAsApplicant()
            ->with(['application.jobListing.company', 'employer', 'histories', 'availability'])
            ->findOrFail($interview);

        return response()->json(['data' => $this->interviewData($interview, true)]);
    }

    private function applicantInterviewList(Request $request, ?string $filter, int $perPage = 15): JsonResponse
    {
        $query = $request->user()->interviewsAsApplicant()
            ->with(['application.jobListing.company', 'employer', 'histories', 'availability'])
            ->when($filter === 'upcoming', fn (Builder $builder): Builder => $builder
                ->where(fn (Builder $upcoming): Builder => $upcoming
                    ->where('status', 'invited')
                    ->orWhere(fn (Builder $scheduled): Builder => $scheduled
                        ->where('status', 'scheduled')
                        ->where('scheduled_at', '>=', now()))))
            ->when($filter === 'past', fn (Builder $builder): Builder => $builder
                ->where('status', '!=', 'cancelled')
                ->where('scheduled_at', '<', now()))
            ->when($filter === 'cancelled', fn (Builder $builder): Builder => $builder->where('status', 'cancelled'))
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id');

        $interviews = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $interviews->getCollection()
                ->map(fn (Interview $interview): array => $this->interviewData($interview, true))
                ->values(),
            'links' => $interviews->linkCollection(),
            'meta' => [
                'current_page' => $interviews->currentPage(),
                'last_page' => $interviews->lastPage(),
                'per_page' => $interviews->perPage(),
                'total' => $interviews->total(),
            ],
        ]);
    }

    private function employerApplications(User $employer): Builder
    {
        return Application::query()->whereHas(
            'jobListing.company',
            fn (Builder $query): Builder => $query->where('user_id', $employer->id),
        );
    }

    private function employerInterviews(User $employer): Builder
    {
        return Interview::query()
            ->where('employer_id', $employer->id)
            ->whereHas('application.jobListing.company', fn (Builder $query): Builder => $query
                ->where('user_id', $employer->id));
    }

    private function availabilityRules(): array
    {
        return [
            'availability_dates' => ['required', 'array', 'min:1', 'max:366'],
            'availability_dates.*' => ['required', 'date_format:Y-m-d', 'distinct'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'break_start_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'break_end_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:15', 'max:180'],
            'buffer_minutes' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'timezone' => ['required', 'string', 'timezone'],
            'mode' => ['required', Rule::in(Interview::MODES)],
            'location' => ['required_if:mode,onsite', 'nullable', 'string', 'max:255'],
            'region_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'province_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'city_municipality_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'barangay_code' => ['sometimes', 'nullable', 'regex:/^\d{10}$/D'],
            'street_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'zip_code' => ['sometimes', 'nullable', 'regex:/^\d{4}$/D'],
            'meeting_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'meeting_instructions' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'internal_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'applicant_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    private function validateOnlineMeetingDetails(Request $request): void
    {
        if ($request->input('mode') === 'online'
            && blank($request->input('meeting_url'))
            && blank($request->input('meeting_instructions'))) {
            throw ValidationException::withMessages([
                'meeting_url' => ['Provide a meeting URL or joining instructions for an online interview.'],
            ]);
        }
    }

    private function resolveOnsiteLocation(array $validated): array
    {
        if ($validated['mode'] !== 'onsite') {
            return $validated;
        }

        $addressKeys = [
            'region_code',
            'province_code',
            'city_municipality_code',
            'barangay_code',
            'street_address',
            'zip_code',
        ];
        if (count(array_intersect($addressKeys, array_keys($validated))) === 0) {
            return $validated;
        }

        $address = $this->locations->resolveAddress(
            $validated,
            required: true,
            requireBarangay: true,
        );
        if (blank($address['street_address'])) {
            throw ValidationException::withMessages([
                'street_address' => ['Enter the onsite interview street address.'],
            ]);
        }

        return [
            ...$validated,
            ...$address,
            'location' => $this->locations->formatAddress($address),
        ];
    }

    private function interviewAddressAttributes(array $validated): array
    {
        $fields = [
            'street_address',
            'region_code',
            'region_name',
            'province_code',
            'province_name',
            'city_municipality_code',
            'city_municipality_name',
            'barangay_code',
            'barangay_name',
            'zip_code',
        ];

        return $validated['mode'] === 'onsite'
            ? array_merge(array_fill_keys($fields, null), Arr::only($validated, $fields))
            : array_fill_keys($fields, null);
    }

    private function interviewAddressData(Interview $interview): array
    {
        return [
            'street_address' => $interview->street_address,
            'region_code' => $interview->region_code,
            'region_name' => $interview->region_name,
            'province_code' => $interview->province_code,
            'province_name' => $interview->province_name,
            'city_municipality_code' => $interview->city_municipality_code,
            'city_municipality_name' => $interview->city_municipality_name,
            'barangay_code' => $interview->barangay_code,
            'barangay_name' => $interview->barangay_name,
            'zip_code' => $interview->zip_code,
        ];
    }

    private function availabilityAttributes(array $validated, string $date): array
    {
        return [
            'available_date' => $date,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'break_start_time' => $validated['break_start_time'] ?? null,
            'break_end_time' => $validated['break_end_time'] ?? null,
            'duration_minutes' => $validated['duration_minutes'],
            'buffer_minutes' => $validated['buffer_minutes'] ?? 0,
        ];
    }

    private function hasAnyFutureSlot(Interview $interview): bool
    {
        $busy = $this->busyInterviews($interview);

        return $interview->availability->contains(
            fn (InterviewAvailability $availability): bool => $this->availabilityService
                ->slotsFor($availability, $interview->timezone, $busy) !== [],
        );
    }

    /**
     * @return array<int, array{date: string, slots: array<int, array{start_time: string, end_time: string}>}>
     */
    private function availabilityDates(Interview $interview): array
    {
        $busy = $this->busyInterviews($interview);

        return $interview->availability
            ->map(fn (InterviewAvailability $availability): array => [
                'date' => $availability->available_date->toDateString(),
                'slots' => $this->availabilityService->slotsFor($availability, $interview->timezone, $busy),
            ])
            ->values()
            ->all();
    }

    private function availableSlots(Interview $interview, InterviewAvailability $availability): array
    {
        return $this->availabilityService->slotsFor(
            $availability,
            $interview->timezone,
            $this->busyInterviews($interview),
        );
    }

    /**
     * @return Collection<int, Interview>
     */
    private function busyInterviews(Interview $interview): Collection
    {
        return Interview::query()
            ->with('availability')
            ->where('employer_id', $interview->employer_id)
            ->where('status', 'scheduled')
            ->where('id', '!=', $interview->id)
            ->get();
    }

    private function scheduleContainsBookedTime(array $schedule, Interview $interview): bool
    {
        if ($interview->scheduled_at === null || $interview->end_at === null) {
            return false;
        }

        $bookedStart = $interview->scheduled_at->setTimezone($interview->timezone);
        $bookedEnd = $interview->end_at->setTimezone($interview->timezone);
        $date = $bookedStart->toDateString();
        $bookedDuration = (int) $bookedStart->diffInMinutes($bookedEnd);
        $startMinute = ((int) $bookedStart->format('H') * 60) + (int) $bookedStart->format('i');
        $scheduleStartMinute = ((int) substr($schedule['start_time'], 0, 2) * 60)
            + (int) substr($schedule['start_time'], 3, 2);
        $step = $schedule['duration_minutes'] + ($schedule['buffer_minutes'] ?? 0);
        if (! in_array($date, $schedule['availability_dates'], true)
            || $schedule['start_time'] > $bookedStart->format('H:i')
            || $schedule['end_time'] < $bookedEnd->format('H:i')) {
            return false;
        }
        if ($bookedDuration !== $schedule['duration_minutes']
            || ($startMinute - $scheduleStartMinute) % $step !== 0) {
            return false;
        }

        $breakStart = $schedule['break_start_time'] ?? null;
        $breakEnd = $schedule['break_end_time'] ?? null;

        return $breakStart === null
            || $breakEnd === null
            || $bookedStart->format('H:i') >= $breakEnd
            || $bookedEnd->format('H:i') <= $breakStart;
    }

    private function unavailableSlot(): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'That interview slot is no longer available. Choose another available time.',
            'code' => 'interview_slot_unavailable',
        ], 409));
    }

    private function historySchedule(Interview $interview): array
    {
        return [
            'scheduled_at' => $interview->scheduled_at?->toISOString(),
            'end_at' => $interview->end_at?->toISOString(),
            'timezone' => $interview->timezone,
            'availability' => $interview->availability
                ->map(fn (InterviewAvailability $availability): array => [
                    'date' => $availability->available_date->toDateString(),
                    'start_time' => substr($availability->start_time, 0, 5),
                    'end_time' => substr($availability->end_time, 0, 5),
                    'break_start_time' => $availability->break_start_time === null
                        ? null
                        : substr($availability->break_start_time, 0, 5),
                    'break_end_time' => $availability->break_end_time === null
                        ? null
                        : substr($availability->break_end_time, 0, 5),
                    'duration_minutes' => $availability->duration_minutes,
                    'buffer_minutes' => $availability->buffer_minutes,
                ])
                ->values()
                ->all(),
            'mode' => $interview->mode,
            'location' => $interview->location,
            'meeting_url' => $interview->meeting_url,
            'meeting_instructions' => $interview->meeting_instructions,
            'applicant_notes' => $interview->applicant_notes,
            'internal_notes' => $interview->internal_notes,
        ];
    }

    private function interviewData(Interview $interview, bool $forApplicant): array
    {
        $interview->loadMissing(['availability', 'application.jobListing.company']);
        $data = [
            'id' => $interview->id,
            'application_id' => $interview->application_id,
            'status' => $interview->status,
            'scheduled_at' => $interview->scheduled_at?->utc()->toISOString(),
            'end_at' => $interview->end_at?->utc()->toISOString(),
            'timezone' => $interview->timezone,
            'mode' => $interview->mode,
            'location' => $interview->location,
            ...$this->interviewAddressData($interview),
            'meeting_url' => $interview->meeting_url,
            'meeting_instructions' => $interview->meeting_instructions,
            'applicant_notes' => $interview->applicant_notes,
            'cancellation_reason' => $interview->cancellation_reason,
            'cancelled_at' => $interview->cancelled_at?->toISOString(),
            'created_at' => $interview->created_at?->toISOString(),
            'updated_at' => $interview->updated_at?->toISOString(),
            'availability' => $interview->availability
                ->map(fn (InterviewAvailability $availability): array => [
                    'date' => $availability->available_date->toDateString(),
                    'start_time' => substr($availability->start_time, 0, 5),
                    'end_time' => substr($availability->end_time, 0, 5),
                    'break_start_time' => $availability->break_start_time === null
                        ? null
                        : substr($availability->break_start_time, 0, 5),
                    'break_end_time' => $availability->break_end_time === null
                        ? null
                        : substr($availability->break_end_time, 0, 5),
                    'duration_minutes' => $availability->duration_minutes,
                    'buffer_minutes' => $availability->buffer_minutes,
                ])
                ->values(),
            'application' => $interview->application ? [
                'id' => $interview->application->id,
                'status' => $interview->application->status,
                'listing' => $interview->application->jobListing ? [
                    'id' => $interview->application->jobListing->id,
                    'title' => $interview->application->jobListing->title,
                ] : null,
            ] : null,
            'employer' => $interview->employer ? [
                'id' => $interview->employer->id,
                'name' => $interview->employer->name,
            ] : null,
            'history' => $interview->histories
                ->map(fn (InterviewHistory $history): array => $this->historyData($history))
                ->values(),
        ];

        if (! $forApplicant) {
            $data['applicant'] = $interview->applicant ? [
                'id' => $interview->applicant->id,
                'name' => $interview->applicant->name,
            ] : null;
            $data['internal_notes'] = $interview->internal_notes;
            $data['cancelled_by'] = $interview->cancelled_by;
        }

        return $data;
    }

    private function historyData(InterviewHistory $history): array
    {
        return [
            'event' => $history->event_type,
            'previous_schedule' => $this->publicSchedule($history->previous_schedule),
            'new_schedule' => $this->publicSchedule($history->new_schedule),
            'reason' => $history->reason,
            'created_at' => $history->created_at?->toISOString(),
        ];
    }

    private function publicSchedule(?array $schedule): ?array
    {
        if ($schedule === null) {
            return $schedule;
        }

        unset($schedule['internal_notes']);

        return $schedule;
    }

    private function notifyApplicant(Interview $interview, string $event, string $title, string $message): void
    {
        $interview->loadMissing(['applicant', 'application.jobListing.company', 'availability']);
        $application = $interview->application;
        $listing = $application?->jobListing;

        app(NotificationService::class)->send(
            $interview->applicant,
            $event,
            $title,
            $message,
            [
                'interview_id' => $interview->id,
                'application_id' => $interview->application_id,
                'job_listing_id' => $listing?->id,
                'job_listing_title' => $listing?->title,
                'company_name' => $listing?->company?->name,
                'scheduled_at' => $interview->scheduled_at?->toISOString(),
                'timezone' => $interview->timezone,
                'availability_dates' => $interview->availability
                    ->pluck('available_date')
                    ->map(fn ($date): string => $date->toDateString())
                    ->values()
                    ->all(),
                'mode' => $interview->mode,
                'status' => $interview->status,
                'location' => $interview->location,
                'meeting_url' => $interview->meeting_url,
                'meeting_instructions' => $interview->meeting_instructions,
                'cancellation_reason' => $interview->cancellation_reason,
            ],
        );
        if ($interview->applicant?->email) {
            Mail::to($interview->applicant->email)->send(new RoleNotificationMail(
                $title,
                $message,
                $interview->applicant->name,
            ));
        }
    }

    private function notifyEmployer(Interview $interview, string $event, string $title, string $message): void
    {
        $interview->loadMissing(['employer', 'application.jobListing.company']);
        $listing = $interview->application?->jobListing;

        app(NotificationService::class)->send(
            $interview->employer,
            $event,
            $title,
            $message,
            [
                'interview_id' => $interview->id,
                'application_id' => $interview->application_id,
                'job_listing_id' => $listing?->id,
                'job_listing_title' => $listing?->title,
                'company_name' => $listing?->company?->name,
                'applicant_id' => $interview->applicant_id,
                'scheduled_at' => $interview->scheduled_at?->toISOString(),
                'timezone' => $interview->timezone,
                'mode' => $interview->mode,
                'status' => $interview->status,
            ],
        );
    }
}
