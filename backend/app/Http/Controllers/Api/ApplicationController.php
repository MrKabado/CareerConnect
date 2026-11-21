<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\JobListing;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\ResumeStorage;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApplicationController extends Controller
{
    public function __construct(private readonly ResumeStorage $resumeStorage) {}

    public function store(Request $request, JobListing $jobListing): JsonResponse
    {
        $validated = $request->validate([
            'cover_letter' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'applicant_id' => ['prohibited'],
            'job_listing_id' => ['prohibited'],
            'resume_id' => ['prohibited'],
            'status' => ['prohibited'],
        ]);
        $applicant = $request->user();

        $profile = $applicant->applicantProfile()->firstOrCreate(
            [],
            ['looking_for_jobs' => true, 'looking_for_ojt' => false],
        );
        $lookingForType = $jobListing->listing_type === 'ojt'
            ? $profile->looking_for_ojt
            : $profile->looking_for_jobs;

        if (! $lookingForType) {
            return response()->json([
                'message' => 'Your seeker preferences do not include this listing type.',
                'code' => 'listing_type_ineligible',
            ], 422);
        }

        if ($jobListing->listing_type === 'ojt' && ! $profile->ojtDetails()->exists()) {
            return response()->json([
                'message' => 'OJT details are required before applying to OJT listings.',
                'code' => 'ojt_details_required',
            ], 422);
        }

        [$application, $isReapplication] = DB::transaction(function () use ($applicant, $jobListing, $validated): array {
            User::query()->whereKey($applicant->id)->lockForUpdate()->firstOrFail();
            $listing = JobListing::query()
                ->with(['company.user', 'company.verification', 'category'])
                ->lockForUpdate()
                ->findOrFail($jobListing->id);

            if (! $listing->canReceiveApplications()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'This listing is not currently accepting applications.',
                    'code' => 'listing_not_open',
                ], 422));
            }

            $hasScheduledInterview = Application::query()
                ->where('applicant_id', $applicant->id)
                ->whereHas('jobListing', fn (Builder $query): Builder => $query->where('company_id', $listing->company_id))
                ->whereHas('interviews', fn (Builder $query): Builder => $query->where('status', 'scheduled'))
                ->exists();

            if ($hasScheduledInterview) {
                throw new HttpResponseException(response()->json([
                    'message' => 'You already have an interview scheduled with this company. You can apply again after the interview is cancelled or the application is declined.',
                    'code' => 'company_interview_in_progress',
                ], 409));
            }

            $existingApplication = Application::query()
                ->where('applicant_id', $applicant->id)
                ->where('job_listing_id', $listing->id)
                ->lockForUpdate()
                ->first();
            $canReapplyAfterCancellation = $existingApplication?->status === 'interview'
                && $existingApplication->interviews()->where('status', 'cancelled')->exists()
                && ! $existingApplication->interviews()->where('status', 'scheduled')->exists();
            $canReapply = $existingApplication !== null
                && ($existingApplication->status === 'rejected' || $canReapplyAfterCancellation);

            if ($existingApplication !== null && ! $canReapply) {
                throw new HttpResponseException($this->alreadyApplied());
            }

            $resume = $applicant->resumes()
                ->where('is_current', true)
                ->lockForUpdate()
                ->first();
            if ($resume === null) {
                throw ValidationException::withMessages([
                    'resume' => ['Upload a resume before applying.'],
                ]);
            }

            $previousStatus = $existingApplication?->status;
            $application = $existingApplication ?? new Application;
            $application->fill([
                'resume_id' => $resume->id,
                'status' => 'pending',
                'resume_original_filename' => $resume->original_filename,
                'resume_mime_type' => $resume->mime_type,
                'resume_file_size' => $resume->file_size,
                'cover_letter' => isset($validated['cover_letter'])
                    ? trim($validated['cover_letter'])
                    : null,
                'applied_at' => now(),
            ]);
            $application->applicant()->associate($applicant);
            $application->jobListing()->associate($listing);
            $application->save();

            $application->statusHistories()->create([
                'previous_status' => $previousStatus,
                'new_status' => 'pending',
                'actor_id' => $applicant->id,
                'public_reason' => null,
                'internal_reason' => null,
                'created_at' => now(),
            ]);

            return [$application, $existingApplication !== null];
        });

        $application->loadMissing(['jobListing.company.user']);
        $employer = $application->jobListing?->company?->user;
        if ($employer !== null) {
            app(NotificationService::class)->send(
                $employer,
                'application_submitted',
                'New application received',
                'A new applicant applied to '.$application->jobListing->title.'.',
                [
                    'application_id' => $application->id,
                    'job_listing_id' => $application->job_listing_id,
                    'job_listing_title' => $application->jobListing->title,
                ],
            );
        }

        return response()->json([
            'message' => $isReapplication ? 'Application resubmitted.' : 'Application submitted.',
            'data' => $this->applicantApplicationData($application->load([
                'jobListing.company',
                'resume',
                'statusHistories',
            ])),
        ], $isReapplication ? 200 : 201);
    }

    public function applicantIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(Application::STATUSES)],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $applications = $request->user()->applications()
            ->with(['jobListing.company', 'resume', 'statusHistories'])
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->orderByDesc('applied_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'data' => $applications->getCollection()
                ->map(fn (Application $application): array => $this->applicantApplicationData($application))
                ->values(),
            'links' => $applications->linkCollection(),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    public function applicantShow(Request $request, int $application): JsonResponse
    {
        $application = $request->user()->applications()
            ->with(['jobListing.company', 'resume', 'statusHistories'])
            ->findOrFail($application);

        return response()->json(['data' => $this->applicantApplicationData($application)]);
    }

    public function applicantStatusHistory(Request $request, int $application): JsonResponse
    {
        $application = $request->user()->applications()->findOrFail($application);

        return response()->json([
            'data' => $application->statusHistories()
                ->get()
                ->map(fn (ApplicationStatusHistory $history): array => [
                    'previous_status' => $history->previous_status,
                    'status' => $history->new_status,
                    'public_reason' => $history->public_reason,
                    'created_at' => $history->created_at?->toISOString(),
                ]),
        ]);
    }

    public function applicantResume(Request $request, int $application): StreamedResponse
    {
        $application = $request->user()->applications()
            ->with('resume')
            ->findOrFail($application);

        return $this->downloadApplicationResume($application);
    }

    public function employerIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'listing_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(Application::STATUSES)],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $company = $request->user()->company;
        if ($company === null) {
            return response()->json(['data' => [], 'meta' => ['total' => 0]]);
        }

        if (isset($filters['listing_id']) && ! $company->jobListings()->whereKey($filters['listing_id'])->exists()) {
            abort(404);
        }

        $applications = Application::query()
            ->whereHas('jobListing', fn (Builder $query): Builder => $query->where('company_id', $company->id))
            ->with(['applicant.applicantProfile.skills', 'applicant.applicantProfile.categories', 'jobListing', 'resume', 'statusHistories'])
            ->when(isset($filters['listing_id']), fn (Builder $query): Builder => $query->where('job_listing_id', $filters['listing_id']))
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->orderByDesc('applied_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'data' => $applications->getCollection()
                ->map(fn (Application $application): array => $this->employerApplicationData($application))
                ->values(),
            'links' => $applications->linkCollection(),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    public function employerShow(Request $request, int $application): JsonResponse
    {
        $application = $this->employerApplicationQuery($request->user())
            ->with(['applicant.applicantProfile.skills', 'applicant.applicantProfile.categories', 'jobListing', 'resume', 'statusHistories'])
            ->findOrFail($application);

        return response()->json(['data' => $this->employerApplicationData($application)]);
    }

    public function updateStatus(Request $request, int $application): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Application::STATUSES)],
            'public_reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'internal_reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $updated = DB::transaction(function () use ($request, $application, $validated): array {
            $application = $this->employerApplicationQuery($request->user())
                ->lockForUpdate()
                ->findOrFail($application);
            $previousStatus = $application->status;
            $newStatus = $validated['status'];

            if ($newStatus === $previousStatus) {
                return [$application, false];
            }

            if (! in_array($newStatus, Application::TRANSITIONS[$previousStatus] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => ['This application status transition is not allowed.'],
                ]);
            }

            $changedAt = now();
            $application->status = $newStatus;
            if ($newStatus === 'hired') {
                $application->hired_at = $changedAt;
            }
            $application->save();
            $application->statusHistories()->create([
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'actor_id' => $request->user()->id,
                'public_reason' => isset($validated['public_reason'])
                    ? trim($validated['public_reason'])
                    : null,
                'internal_reason' => isset($validated['internal_reason'])
                    ? trim($validated['internal_reason'])
                    : null,
                'created_at' => $changedAt,
            ]);

            return [$application, true];
        });

        if ($updated[1]) {
            $updated[0]->loadMissing(['applicant', 'jobListing']);
            app(NotificationService::class)->send(
                $updated[0]->applicant,
                'application_status_changed',
                'Application status updated',
                'Your application for '.$updated[0]->jobListing->title.' is now '.$updated[0]->status.'.',
                [
                    'application_id' => $updated[0]->id,
                    'job_listing_id' => $updated[0]->job_listing_id,
                    'job_listing_title' => $updated[0]->jobListing->title,
                    'status' => $updated[0]->status,
                    'public_reason' => $validated['public_reason'] ?? null,
                ],
            );
        }

        return response()->json([
            'message' => $updated[1] ? 'Application status updated.' : 'Application status is unchanged.',
            'data' => $this->employerApplicationData($updated[0]->load([
                'applicant.applicantProfile.skills',
                'applicant.applicantProfile.categories',
                'jobListing',
                'resume',
                'statusHistories',
            ])),
        ]);
    }

    public function endEmployment(Request $request, int $application): JsonResponse
    {
        $validated = $request->validate([
            'employment_ended_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
        ]);
        $endedAt = CarbonImmutable::parse($validated['employment_ended_at'], config('app.timezone'));

        $updatedApplication = DB::transaction(function () use ($request, $application, $endedAt): Application {
            $application = $this->employerApplicationQuery($request->user())
                ->lockForUpdate()
                ->findOrFail($application);

            if ($application->status !== 'hired' || $application->hired_at === null) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Only hired applications with a recorded start date can be marked as former employees.',
                    'code' => 'employment_not_active',
                ], 409));
            }

            if ($application->employment_ended_at !== null) {
                throw new HttpResponseException(response()->json([
                    'message' => 'The employment end date has already been recorded.',
                    'code' => 'employment_already_ended',
                ], 409));
            }

            if ($endedAt->toDateString() < $application->hired_at->toDateString()) {
                throw ValidationException::withMessages([
                    'employment_ended_at' => ['The employment end date cannot be before the hired date.'],
                ]);
            }

            $application->employment_ended_at = $endedAt;
            $application->employment_ended_by = $request->user()->id;
            $application->save();

            return $application;
        });

        $updatedApplication->load(['applicant', 'jobListing']);
        app(NotificationService::class)->send(
            $updatedApplication->applicant,
            'employment_ended',
            'Employment record updated',
            'Your employment end date for '.$updatedApplication->jobListing->title.' was recorded.',
            [
                'application_id' => $updatedApplication->id,
                'job_listing_id' => $updatedApplication->job_listing_id,
                'job_listing_title' => $updatedApplication->jobListing->title,
                'employment_ended_at' => $updatedApplication->employment_ended_at?->toDateString(),
            ],
        );

        return response()->json([
            'message' => 'Employment end date recorded.',
            'data' => $this->employerApplicationData($updatedApplication->load([
                'applicant.applicantProfile.skills',
                'applicant.applicantProfile.categories',
                'jobListing',
                'resume',
                'statusHistories',
            ])),
        ]);
    }

    public function employerResume(Request $request, int $application): StreamedResponse
    {
        $application = $this->employerApplicationQuery($request->user())
            ->with('resume')
            ->findOrFail($application);

        return $this->downloadApplicationResume($application);
    }

    private function employerApplicationQuery(User $employer): Builder
    {
        return Application::query()->whereHas(
            'jobListing.company',
            fn (Builder $query): Builder => $query->where('user_id', $employer->id),
        );
    }

    private function applicantApplicationData(Application $application): array
    {
        return [
            'id' => $application->id,
            'status' => $application->status,
            'cover_letter' => $application->cover_letter,
            'resume' => [
                'original_filename' => $application->resume_original_filename,
                'mime_type' => $application->resume_mime_type,
                'file_size' => $application->resume_file_size,
            ],
            'applied_at' => $application->applied_at?->toISOString(),
            'hired_at' => $application->hired_at?->toISOString(),
            'employment_ended_at' => $application->employment_ended_at?->toDateString(),
            'listing' => $this->listingSummary($application->jobListing),
            'status_history' => $application->statusHistories
                ->map(fn (ApplicationStatusHistory $history): array => [
                    'previous_status' => $history->previous_status,
                    'status' => $history->new_status,
                    'public_reason' => $history->public_reason,
                    'created_at' => $history->created_at?->toISOString(),
                ])->values(),
        ];
    }

    private function employerApplicationData(Application $application): array
    {
        $profile = $application->applicant?->applicantProfile;

        return [
            'id' => $application->id,
            'status' => $application->status,
            'cover_letter' => $application->cover_letter,
            'applied_at' => $application->applied_at?->toISOString(),
            'hired_at' => $application->hired_at?->toISOString(),
            'employment_ended_at' => $application->employment_ended_at?->toDateString(),
            'listing' => $this->listingSummary($application->jobListing),
            'applicant' => $application->applicant ? [
                'id' => $application->applicant->id,
                'name' => $application->applicant->name,
                'city' => $profile?->city,
                'phone' => $profile?->phone,
                'skills' => $profile?->skills->pluck('name')->values() ?? [],
                'interests' => $profile?->categories->map(fn ($category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                ])->values() ?? [],
            ] : null,
            'resume' => [
                'original_filename' => $application->resume_original_filename,
                'mime_type' => $application->resume_mime_type,
                'file_size' => $application->resume_file_size,
            ],
            'status_history' => $application->statusHistories
                ->map(fn (ApplicationStatusHistory $history): array => [
                    'previous_status' => $history->previous_status,
                    'status' => $history->new_status,
                    'public_reason' => $history->public_reason,
                    'internal_reason' => $history->internal_reason,
                    'created_at' => $history->created_at?->toISOString(),
                ])->values(),
        ];
    }

    private function listingSummary(?JobListing $listing): ?array
    {
        if ($listing === null) {
            return null;
        }

        return [
            'id' => $listing->id,
            'title' => $listing->title,
            'listing_type' => $listing->listing_type,
            'location' => $listing->location,
            'work_setup' => $listing->work_setup,
            'status' => $listing->status,
            'company_name' => $listing->company?->name,
        ];
    }

    private function downloadApplicationResume(Application $application): StreamedResponse
    {
        $resume = $application->resume;

        if ($resume === null
            || $resume->applicant_id !== $application->applicant_id) {
            abort(404, 'The resume file is unavailable.');
        }

        return $this->resumeStorage->download(
            $resume,
            $application->resume_original_filename,
            $application->resume_mime_type,
        );
    }

    private function alreadyApplied(): JsonResponse
    {
        return response()->json([
            'message' => 'You have already applied to this listing.',
            'code' => 'already_applied',
        ], 409);
    }
}
