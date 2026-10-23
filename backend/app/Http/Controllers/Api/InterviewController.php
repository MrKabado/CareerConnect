<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Interview;
use App\Models\InterviewHistory;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InterviewController extends Controller
{
    public function store(Request $request, int $application): JsonResponse
    {
        $validated = $request->validate($this->scheduleRules());
        $this->validateOnlineMeetingDetails($request);
        $employer = $request->user();

        $interview = DB::transaction(function () use ($application, $employer, $validated): Interview {
            $application = $this->employerApplications($employer)
                ->lockForUpdate()
                ->findOrFail($application);

            if ($application->status !== 'shortlisted'
                || ! in_array('interview', Application::TRANSITIONS[$application->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'application' => ['An interview can only be scheduled for a shortlisted application.'],
                ]);
            }

            if ($application->interviews()->exists()) {
                throw ValidationException::withMessages([
                    'application' => ['An interview record already exists for this application.'],
                ]);
            }

            $schedule = $this->scheduleAttributes($validated);
            $interview = new Interview([
                ...$schedule,
                'status' => 'scheduled',
            ]);
            $interview->application()->associate($application);
            $interview->applicant_id = $application->applicant_id;
            $interview->employer_id = $employer->id;
            $interview->save();

            $application->status = 'interview';
            $application->save();
            $application->statusHistories()->create([
                'previous_status' => 'shortlisted',
                'new_status' => 'interview',
                'actor_id' => $employer->id,
                'public_reason' => 'An interview has been scheduled.',
                'internal_reason' => null,
                'created_at' => now(),
            ]);

            $interview->histories()->create([
                'event_type' => 'scheduled',
                'previous_schedule' => null,
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $employer->id,
                'created_at' => now(),
            ]);

            return $interview;
        });

        return response()->json([
            'message' => 'Interview scheduled.',
            'data' => $this->interviewData($interview->load(['application.jobListing', 'applicant', 'employer', 'histories']), false),
        ], 201);
    }

    public function applicationIndex(Request $request, int $application): JsonResponse
    {
        $ownedApplication = $this->employerApplications($request->user())->findOrFail($application);

        return response()->json([
            'data' => $ownedApplication->interviews()
                ->with(['application.jobListing', 'applicant', 'employer', 'histories'])
                ->get()
                ->map(fn (Interview $interview): array => $this->interviewData($interview, false)),
        ]);
    }

    public function employerShow(Request $request, int $interview): JsonResponse
    {
        $interview = $this->employerInterviews($request->user())
            ->with(['application.jobListing', 'applicant', 'employer', 'histories'])
            ->findOrFail($interview);

        return response()->json(['data' => $this->interviewData($interview, false)]);
    }

    public function reschedule(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate($this->scheduleRules());
        $this->validateOnlineMeetingDetails($request);
        $interview = DB::transaction(function () use ($request, $interview, $validated): Interview {
            $interview = $this->employerInterviews($request->user())
                ->with('application')
                ->lockForUpdate()
                ->findOrFail($interview);

            if ($interview->status !== 'scheduled') {
                throw ValidationException::withMessages([
                    'interview' => ['Only scheduled interviews can be rescheduled.'],
                ]);
            }

            $previousSchedule = $this->historySchedule($interview);
            $interview->fill($this->scheduleAttributes($validated));
            $interview->save();
            $interview->histories()->create([
                'event_type' => 'rescheduled',
                'previous_schedule' => $previousSchedule,
                'new_schedule' => $this->historySchedule($interview),
                'actor_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            return $interview;
        });

        return response()->json([
            'message' => 'Interview rescheduled.',
            'data' => $this->interviewData($interview->load(['application.jobListing', 'applicant', 'employer', 'histories']), false),
        ]);
    }

    public function cancel(Request $request, int $interview): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        $interview = DB::transaction(function () use ($request, $interview, $validated): Interview {
            $interview = $this->employerInterviews($request->user())
                ->lockForUpdate()
                ->findOrFail($interview);

            if ($interview->status !== 'scheduled') {
                throw ValidationException::withMessages([
                    'interview' => ['Only scheduled interviews can be cancelled.'],
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

            return $interview;
        });

        return response()->json([
            'message' => 'Interview cancelled.',
            'data' => $this->interviewData($interview->load(['application.jobListing', 'applicant', 'employer', 'histories']), false),
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
            'data' => $this->interviewData($interview->load(['application.jobListing', 'applicant', 'employer', 'histories']), false),
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
            ->with(['application.jobListing', 'employer', 'histories'])
            ->findOrFail($interview);

        return response()->json(['data' => $this->interviewData($interview, true)]);
    }

    private function applicantInterviewList(Request $request, ?string $filter, int $perPage = 15): JsonResponse
    {
        $query = $request->user()->interviewsAsApplicant()
            ->with(['application.jobListing', 'employer', 'histories'])
            ->when($filter === 'upcoming', fn (Builder $builder): Builder => $builder
                ->where('status', 'scheduled')
                ->where('scheduled_at', '>=', now()))
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

    private function scheduleRules(): array
    {
        return [
            'scheduled_at' => ['required', 'date'],
            'end_at' => ['sometimes', 'nullable', 'date'],
            'timezone' => ['required', 'string', 'timezone'],
            'mode' => ['required', Rule::in(Interview::MODES)],
            'location' => ['required_if:mode,onsite', 'nullable', 'string', 'max:255'],
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

    private function scheduleAttributes(array $validated): array
    {
        $timezone = $validated['timezone'];
        $scheduledAt = CarbonImmutable::parse($validated['scheduled_at'], $timezone)->utc();
        $endAt = isset($validated['end_at'])
            ? CarbonImmutable::parse($validated['end_at'], $timezone)->utc()
            : null;

        if (! $scheduledAt->isFuture()) {
            throw ValidationException::withMessages([
                'scheduled_at' => ['The interview must be scheduled for a future time in the selected timezone.'],
            ]);
        }

        if ($endAt !== null && ! $endAt->greaterThan($scheduledAt)) {
            throw ValidationException::withMessages([
                'end_at' => ['The interview end time must be after the start time.'],
            ]);
        }

        return [
            'scheduled_at' => $scheduledAt,
            'end_at' => $endAt,
            'timezone' => $timezone,
            'mode' => $validated['mode'],
            'location' => $validated['location'] ?? null,
            'meeting_url' => $validated['meeting_url'] ?? null,
            'meeting_instructions' => $validated['meeting_instructions'] ?? null,
            'internal_notes' => $validated['internal_notes'] ?? null,
            'applicant_notes' => $validated['applicant_notes'] ?? null,
        ];
    }

    private function historySchedule(Interview $interview): array
    {
        return [
            'scheduled_at' => $interview->scheduled_at?->toISOString(),
            'end_at' => $interview->end_at?->toISOString(),
            'timezone' => $interview->timezone,
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
        $data = [
            'id' => $interview->id,
            'application_id' => $interview->application_id,
            'status' => $interview->status,
            'scheduled_at' => $interview->scheduled_at?->utc()->toISOString(),
            'end_at' => $interview->end_at?->utc()->toISOString(),
            'timezone' => $interview->timezone,
            'mode' => $interview->mode,
            'location' => $interview->location,
            'meeting_url' => $interview->meeting_url,
            'meeting_instructions' => $interview->meeting_instructions,
            'applicant_notes' => $interview->applicant_notes,
            'cancellation_reason' => $interview->cancellation_reason,
            'cancelled_at' => $interview->cancelled_at?->toISOString(),
            'created_at' => $interview->created_at?->toISOString(),
            'updated_at' => $interview->updated_at?->toISOString(),
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
}
