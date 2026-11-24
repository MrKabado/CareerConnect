<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ApplicantNoteMail;
use App\Mail\RoleNotificationMail;
use App\Models\ActivityLog;
use App\Models\ApplicantDocument;
use App\Models\ApplicantOjtDetail;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\JobListing;
use App\Models\User;
use App\Services\ApplicantApplicationEligibility;
use App\Services\ApplicantJobMatcher;
use App\Services\MediaStorage;
use App\Services\NotificationService;
use App\Services\RealtimeUpdateService;
use App\Services\ResumeStorage;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApplicationController extends Controller
{
    public function __construct(
        private readonly ResumeStorage $resumeStorage,
        private readonly MediaStorage $mediaStorage,
        private readonly ApplicantJobMatcher $applicantJobMatcher,
        private readonly ApplicantApplicationEligibility $applicationEligibility,
    ) {}

    public function eligibility(Request $request): JsonResponse
    {
        $user = $request->user();
        $verification = $this->applicationEligibility->currentVerification($user);
        $reason = $user->email_verified_at === null
            ? 'Verify your email address before submitting applications.'
            : $this->applicationEligibility->verificationReason($verification);

        return response()->json([
            'can_apply' => $reason === null,
            'reason' => $reason,
            'identity_verification_status' => $verification?->status ?? 'unverified',
            'identity_verification_rejection_reason' => $verification?->rejection_reason,
        ]);
    }

    public function store(Request $request, JobListing $jobListing): JsonResponse
    {
        $validated = $request->validate([
            'cover_letter' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'cover_letter_document_id' => ['sometimes', 'nullable', 'integer'],
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
        $ojtDetails = $profile->ojtDetails;
        $hasCompleteOjtDetails = $this->hasCompleteOjtDetails($ojtDetails);
        $lookingForType = $jobListing->listing_type === 'ojt'
            ? $profile->looking_for_ojt
            : $profile->looking_for_jobs;

        if (! $lookingForType && ! ($jobListing->listing_type === 'ojt' && $hasCompleteOjtDetails)) {
            return response()->json([
                'message' => 'Your seeker preferences do not include this listing type.',
                'code' => 'listing_type_ineligible',
            ], 422);
        }

        if ($jobListing->listing_type === 'ojt' && ! $hasCompleteOjtDetails) {
            return response()->json([
                'message' => 'Complete your school, course, education status, academic year or graduation year, and required OJT hours before applying.',
                'code' => 'ojt_details_required',
            ], 422);
        }

        [$application, $isReapplication, $fullReached] = DB::transaction(function () use ($applicant, $jobListing, $validated): array {
            $fullReached = false;
            User::query()->whereKey($applicant->id)->lockForUpdate()->firstOrFail();
            $verification = $this->applicationEligibility->currentVerification($applicant, true);
            $verificationReason = $this->applicationEligibility->verificationReason($verification);
            if ($verificationReason !== null) {
                throw new HttpResponseException(response()->json([
                    'message' => $verificationReason,
                    'code' => 'identity_verification_required',
                    'identity_verification_status' => $verification?->status ?? 'unverified',
                    'rejection_reason' => $verification?->rejection_reason,
                ], 403));
            }

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

            $coverLetterDocumentId = $validated['cover_letter_document_id'] ?? null;
            if ($coverLetterDocumentId !== null) {
                $coverLetterDocument = $applicant->applicantDocuments()
                    ->whereKey($coverLetterDocumentId)
                    ->where('document_type', 'cover_letter')
                    ->where('is_current', true)
                    ->lockForUpdate()
                    ->first();

                if ($coverLetterDocument === null) {
                    throw ValidationException::withMessages([
                        'cover_letter_document_id' => ['Choose a current cover letter from your documents.'],
                    ]);
                }
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
            $applicantLimit = $listing->applicant_limit
                ?? ($listing->listing_type === 'ojt' ? $listing->ojtDetails?->slots : null);
            $applicationCount = $listing->applications()->count();
            if ($existingApplication === null
                && $applicantLimit !== null
                && $applicationCount >= (int) $applicantLimit) {
                $listing->status = 'full';
                $listing->save();
                throw new HttpResponseException(response()->json([
                    'message' => 'This listing has reached its applicant limit.',
                    'code' => 'listing_full',
                ], 422));
            }
            $canReapplyAfterCancellation = $existingApplication?->status === 'interview'
                && $existingApplication->interviews()->where('status', 'cancelled')->exists()
                && ! $existingApplication->interviews()->where('status', 'scheduled')->exists();
            $rejectedAt = $existingApplication?->status === 'rejected'
                ? $this->rejectionDate($existingApplication)
                : null;
            $reapplyAvailableAt = $rejectedAt?->addDays(30);

            if ($reapplyAvailableAt !== null && now()->lt($reapplyAvailableAt)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'You can apply to this listing again on '.$reapplyAvailableAt->toDateString().'.',
                    'code' => 'reapplication_cooldown',
                    'rejected_at' => $rejectedAt?->toISOString(),
                    'reapply_available_at' => $reapplyAvailableAt->toISOString(),
                ], 409));
            }

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
                'cover_letter_document_id' => $coverLetterDocumentId,
                'cover_letter' => isset($validated['cover_letter'])
                    ? trim($validated['cover_letter'])
                    : null,
                'applied_at' => now(),
            ]);
            $application->applicant()->associate($applicant);
            $application->jobListing()->associate($listing);
            $application->save();

            $newApplicationCount = $listing->applications()->count();
            if ($listing->status === 'open'
                && $applicantLimit !== null
                && $newApplicationCount >= (int) $applicantLimit) {
                $listing->status = 'full';
                $listing->save();
                $fullReached = true;
            }

            $application->statusHistories()->create([
                'previous_status' => $previousStatus,
                'new_status' => 'pending',
                'actor_id' => $applicant->id,
                'public_reason' => null,
                'internal_reason' => null,
                'created_at' => now(),
            ]);

            ActivityLog::create([
                'user_id' => $applicant->id,
                'actor_id' => $applicant->id,
                'action' => 'application.submitted',
                'subject_type' => Application::class,
                'subject_id' => $application->id,
                'payload' => [
                    'description' => sprintf('%s applied to %s', $applicant->name, $listing->title),
                    'listing_title' => $listing->title,
                ],
            ]);

            return [$application, $existingApplication !== null, $fullReached];
        });

        $application->loadMissing(['jobListing.company.user']);
        app(RealtimeUpdateService::class)->user(
            $applicant,
            'applications',
            $isReapplication ? 'updated' : 'created',
        );
        if ($fullReached) {
            app(RealtimeUpdateService::class)->publicJobListings();
        }
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
            Mail::to($employer->email)->send(new RoleNotificationMail(
                'New application received',
                'A new applicant applied to '.$application->jobListing->title.'.',
                $employer->name,
            ));
            if ($fullReached) {
                app(NotificationService::class)->send(
                    $employer,
                    'listing_full',
                    'Job listing reached applicant limit',
                    $application->jobListing->title.' has reached its applicant limit and is now full.',
                    [
                        'job_listing_id' => $application->job_listing_id,
                        'job_listing_title' => $application->jobListing->title,
                        'status' => 'full',
                    ],
                );
            }
        }

        return response()->json([
            'message' => $isReapplication ? 'Application resubmitted.' : 'Application submitted.',
            'data' => $this->applicantApplicationData($application->load([
                'jobListing.company',
                'resume',
                'statusHistories',
                'coverLetterDocument',
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
            ->with(['jobListing.company', 'resume', 'coverLetterDocument', 'statusHistories', 'interviews.availability'])
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

    public function applicantListingStatuses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'listing_ids' => ['required', 'array', 'min:1', 'max:100'],
            'listing_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
        ]);

        $applications = $request->user()->applications()
            ->whereIn('job_listing_id', $validated['listing_ids'])
            ->with(['statusHistories' => fn (HasMany $query): HasMany => $query
                ->orderBy('created_at')
                ->orderBy('id')])
            ->orderBy('job_listing_id')
            ->get(['id', 'job_listing_id', 'status', 'updated_at']);

        return response()->json([
            'data' => $applications->map(function (Application $application): array {
                $rejectedAt = $this->rejectionDate($application);
                $reapplyAvailableAt = $rejectedAt?->addDays(30);

                return [
                    'listing_id' => $application->job_listing_id,
                    'status' => $application->status,
                    'rejected_at' => $rejectedAt?->toISOString(),
                    'reapply_available_at' => $reapplyAvailableAt?->toISOString(),
                    'reapplication_allowed' => $reapplyAvailableAt !== null
                        && now()->greaterThanOrEqualTo($reapplyAvailableAt),
                ];
            })->values(),
        ]);
    }

    public function applicantShow(Request $request, int $application): JsonResponse
    {
        $application = $request->user()->applications()
            ->with(['jobListing.company', 'resume', 'coverLetterDocument', 'statusHistories', 'interviews'])
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
            return response()->json([
                'data' => [],
                'links' => ['first' => null, 'last' => null, 'prev' => null, 'next' => null],
                'meta' => [
                    'current_page' => $filters['page'] ?? 1,
                    'last_page' => 1,
                    'per_page' => $filters['per_page'] ?? 15,
                    'total' => 0,
                ],
            ]);
        }

        if (isset($filters['listing_id']) && ! $company->jobListings()->whereKey($filters['listing_id'])->exists()) {
            abort(404);
        }

        $applications = Application::query()
            ->whereHas('jobListing', fn (Builder $query): Builder => $query->where('company_id', $company->id))
            ->with([
                'applicant.applicantProfile.skills',
                'applicant.applicantProfile.categories',
                'applicant.applicantProfile.ojtDetails',
                'jobListing.category',
                'jobListing.company',
                'resume',
                'coverLetterDocument',
                'statusHistories',
            ])
            ->when(isset($filters['listing_id']), fn (Builder $query): Builder => $query->where('job_listing_id', $filters['listing_id']))
            ->when(isset($filters['status']), fn (Builder $query): Builder => $query->where('status', $filters['status']))
            ->orderByDesc('applied_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Application $application): array => [
                'application' => $application,
                'match_score' => $this->applicantJobMatcher
                    ->match($application->applicant?->applicantProfile, $application->jobListing)['score'],
            ])
            ->sort(function (array $left, array $right): int {
                $scoreOrder = $right['match_score'] <=> $left['match_score'];
                if ($scoreOrder !== 0) {
                    return $scoreOrder;
                }

                $leftAppliedAt = $left['application']->applied_at?->getTimestamp() ?? 0;
                $rightAppliedAt = $right['application']->applied_at?->getTimestamp() ?? 0;

                return ($rightAppliedAt <=> $leftAppliedAt)
                    ?: ($right['application']->id <=> $left['application']->id);
            })
            ->values();

        $perPage = $filters['per_page'] ?? 15;
        $currentPage = $filters['page'] ?? 1;
        $pagedApplications = new LengthAwarePaginator(
            $applications->forPage($currentPage, $perPage)->values(),
            $applications->count(),
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return response()->json([
            'data' => $pagedApplications->getCollection()
                ->map(fn (array $row): array => $this->employerApplicationData($row['application']))
                ->values(),
            'links' => $pagedApplications->linkCollection(),
            'meta' => [
                'current_page' => $pagedApplications->currentPage(),
                'last_page' => $pagedApplications->lastPage(),
                'per_page' => $pagedApplications->perPage(),
                'total' => $pagedApplications->total(),
            ],
        ]);
    }

    public function sendNote(Request $request, int $application): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['required', 'string', 'min:1', 'max:5000'],
        ]);

        $applicationRecord = $this->employerApplicationQuery($request->user())
            ->with(['applicant', 'jobListing.company'])
            ->findOrFail($application);
        $applicant = $applicationRecord->applicant;

        if ($applicant === null || blank($applicant->email)) {
            throw ValidationException::withMessages([
                'note' => ['The applicant’s registered email address is unavailable.'],
            ]);
        }

        $note = trim($validated['note']);
        $companyName = $applicationRecord->jobListing?->company?->name
            ?? $request->user()->company?->name
            ?? 'CareerConnect employer';
        $jobTitle = $applicationRecord->jobListing?->title ?? 'this position';

        Mail::to($applicant->email)->send(new ApplicantNoteMail(
            applicantName: $applicant->name,
            employerName: $request->user()->name,
            companyName: $companyName,
            jobTitle: $jobTitle,
            note: $note,
        ));

        app(NotificationService::class)->send(
            $applicant,
            'applicant_note',
            'Message from '.$companyName,
            $note,
            [
                'application_id' => $applicationRecord->id,
                'job_listing_id' => $applicationRecord->job_listing_id,
                'job_listing_title' => $jobTitle,
                'company_name' => $companyName,
            ],
        );

        return response()->json([
            'message' => 'Note sent to the applicant.',
        ]);
    }

    public function employerShow(Request $request, int $application): JsonResponse
    {
        $application = $this->employerApplicationQuery($request->user())
            ->with([
                'applicant.applicantProfile.skills',
                'applicant.applicantProfile.categories',
                'applicant.applicantProfile.ojtDetails',
                'jobListing.category',
                'jobListing.company',
                'resume',
                'coverLetterDocument',
                'statusHistories',
            ])
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
            $updated[0]->loadMissing(['applicant', 'jobListing.company']);
            app(RealtimeUpdateService::class)->user($request->user(), 'applications');
            $companyName = $updated[0]->jobListing?->company?->name ?? 'the company';
            $jobTitle = $updated[0]->jobListing?->title ?? 'this position';

            if ($updated[0]->status === 'hired') {
                app(NotificationService::class)->send(
                    $updated[0]->applicant,
                    'applicant_hired',
                    'Congratulations! You have been hired',
                    'Congratulations! You have been hired for '.$jobTitle.' by '.$companyName.'.',
                    [
                        'application_id' => $updated[0]->id,
                        'job_listing_id' => $updated[0]->job_listing_id,
                        'job_listing_title' => $jobTitle,
                        'company_name' => $companyName,
                        'status' => 'hired',
                        'public_reason' => $validated['public_reason'] ?? null,
                    ],
                );
            } else {
                app(NotificationService::class)->send(
                    $updated[0]->applicant,
                    'application_status_changed',
                    'Application status updated',
                    'Your application for '.$jobTitle.' is now '.$updated[0]->status.'.',
                    [
                        'application_id' => $updated[0]->id,
                        'job_listing_id' => $updated[0]->job_listing_id,
                        'job_listing_title' => $jobTitle,
                        'company_name' => $companyName,
                        'status' => $updated[0]->status,
                        'public_reason' => $validated['public_reason'] ?? null,
                    ],
                );
            }

            $notificationTitle = $updated[0]->status === 'hired'
                ? 'Congratulations! You have been hired'
                : 'Application status updated';
            $notificationMessage = $updated[0]->status === 'hired'
                ? 'Congratulations! You have been hired for '.$jobTitle.' by '.$companyName.'.'
                : 'Your application for '.$jobTitle.' is now '.$updated[0]->status.'.';
            if ($updated[0]->applicant?->email) {
                Mail::to($updated[0]->applicant->email)->send(new RoleNotificationMail(
                    $notificationTitle,
                    $notificationMessage,
                    $updated[0]->applicant->name,
                ));
            }
        }

        return response()->json([
            'message' => $updated[1] ? 'Application status updated.' : 'Application status is unchanged.',
            'data' => $this->employerApplicationData($updated[0]->load([
                'applicant.applicantProfile.skills',
                'applicant.applicantProfile.categories',
                'applicant.applicantProfile.ojtDetails',
                'jobListing.category',
                'jobListing.company',
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

    public function employerResumeUrls(Request $request, int $application): JsonResponse
    {
        $application = $this->employerApplicationQuery($request->user())
            ->with('resume')
            ->findOrFail($application);
        $resume = $application->resume;

        if ($resume === null || $resume->applicant_id !== $application->applicant_id) {
            abort(404, 'The resume file is unavailable.');
        }

        return response()->json([
            'data' => $this->resumeStorage->downloadUrls(
                $resume,
                $application->resume_original_filename,
            ),
        ]);
    }

    public function employerCoverLetter(Request $request, int $application): StreamedResponse
    {
        $application = $this->employerApplicationQuery($request->user())
            ->with('coverLetterDocument')
            ->findOrFail($application);
        $document = $application->coverLetterDocument;

        if ($document === null || $document->applicant_id !== $application->applicant_id) {
            abort(404);
        }

        return $this->downloadApplicantDocument($document);
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
        $rejectedAt = $this->rejectionDate($application);
        $interview = $application->relationLoaded('interviews')
            ? $application->interviews
                ->sortByDesc('id')
                ->first()
            : $application->interviews()
                ->orderByDesc('id')
                ->first();

        return [
            'id' => $application->id,
            'status' => $application->status,
            'cover_letter' => $application->cover_letter,
            'cover_letter_document' => $application->coverLetterDocument
                ? $this->applicantDocumentData($application->coverLetterDocument)
                : null,
            'resume' => [
                'original_filename' => $application->resume_original_filename,
                'mime_type' => $application->resume_mime_type,
                'file_size' => $application->resume_file_size,
            ],
            'applied_at' => $application->applied_at?->toISOString(),
            'rejected_at' => $rejectedAt?->toISOString(),
            'reapply_available_at' => $rejectedAt?->addDays(30)->toISOString(),
            'reapplication_allowed' => $rejectedAt !== null
                && now()->greaterThanOrEqualTo($rejectedAt->addDays(30)),
            'hired_at' => $application->hired_at?->toISOString(),
            'employment_ended_at' => $application->employment_ended_at?->toDateString(),
            'interview' => $interview ? [
                'id' => $interview->id,
                'status' => $interview->status,
                'scheduled_at' => $interview->scheduled_at?->toISOString(),
                'end_at' => $interview->end_at?->toISOString(),
                'timezone' => $interview->timezone,
                'mode' => $interview->mode,
                'location' => $interview->location,
                'meeting_url' => $interview->meeting_url,
                'meeting_instructions' => $interview->meeting_instructions,
                'applicant_notes' => $interview->applicant_notes,
                'availability' => $interview->availability
                    ->map(fn ($availability): array => [
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
            ] : null,
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

    private function rejectionDate(Application $application): ?CarbonImmutable
    {
        if ($application->status !== 'rejected') {
            return null;
        }

        if ($application->relationLoaded('statusHistories')) {
            $rejection = $application->statusHistories
                ->where('new_status', 'rejected')
                ->last();
        } else {
            $rejection = $application->statusHistories()
                ->where('new_status', 'rejected')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->first();
        }

        $date = $rejection?->created_at ?? $application->updated_at ?? now();

        return CarbonImmutable::instance($date);
    }

    private function employerApplicationData(Application $application): array
    {
        $profile = $application->applicant?->applicantProfile;
        $match = $this->applicantJobMatcher->match($profile, $application->jobListing);

        return [
            'id' => $application->id,
            'status' => $application->status,
            'match_score' => $match['score'],
            'match_reasons' => $match['reasons'],
            'cover_letter' => $application->cover_letter,
            'cover_letter_document' => $application->coverLetterDocument
                ? $this->applicantDocumentData($application->coverLetterDocument)
                : null,
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

    private function hasCompleteOjtDetails(?ApplicantOjtDetail $details): bool
    {
        if ($details === null
            || blank($details->school)
            || blank($details->course)
            || blank($details->required_hours)) {
            return false;
        }

        $educationStatus = $details->education_status
            ?? (filled($details->year_level) ? 'undergraduate' : null);

        return match ($educationStatus) {
            'undergraduate' => ! blank($details->year_level),
            'graduated' => ! blank($details->graduation_year),
            default => false,
        };
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

    private function applicantDocumentData(ApplicantDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'created_at' => $document->created_at?->toISOString(),
        ];
    }

    private function downloadApplicantDocument(ApplicantDocument $document): StreamedResponse
    {
        $expectedPrefix = 'applicant-documents/'.$document->applicant_id.'/';
        $path = $document->storage_path;

        if (! str_starts_with($path, $expectedPrefix)
            || preg_match('#^applicant-documents/[0-9]+/[a-f0-9-]+\.(pdf|docx)$#i', $path) !== 1) {
            abort(404, 'The cover letter is unavailable.');
        }

        return $this->mediaStorage->privateDownload(
            $document->storage_disk,
            $path,
            $document->cloudinary_asset_id,
            $document->original_filename,
            $document->mime_type,
        );
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
