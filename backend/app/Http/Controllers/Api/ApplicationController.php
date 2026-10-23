<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ApplicationController extends Controller
{
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

        if (Application::query()
            ->where('applicant_id', $applicant->id)
            ->where('job_listing_id', $jobListing->id)
            ->exists()) {
            return $this->alreadyApplied();
        }

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

        try {
            $application = DB::transaction(function () use ($applicant, $jobListing, $validated): Application {
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

                if (Application::query()
                    ->where('applicant_id', $applicant->id)
                    ->where('job_listing_id', $listing->id)
                    ->exists()) {
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

                $application = new Application([
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
                    'previous_status' => null,
                    'new_status' => 'pending',
                    'actor_id' => $applicant->id,
                    'public_reason' => null,
                    'internal_reason' => null,
                    'created_at' => now(),
                ]);

                return $application;
            });
        } catch (Throwable $exception) {
            if (Application::query()
                ->where('applicant_id', $applicant->id)
                ->where('job_listing_id', $jobListing->id)
                ->exists()) {
                return $this->alreadyApplied();
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'Application submitted.',
            'data' => $this->applicantApplicationData($application->load([
                'jobListing.company',
                'resume',
                'statusHistories',
            ])),
        ], 201);
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

            $application->status = $newStatus;
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
                'created_at' => now(),
            ]);

            return [$application, true];
        });

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
        $expectedPrefix = 'applicant-resumes/'.$application->applicant_id.'/';
        $path = $resume?->storage_path;

        if ($resume === null
            || $resume->applicant_id !== $application->applicant_id
            || $path === null
            || ! str_starts_with($path, $expectedPrefix)
            || preg_match('#^applicant-resumes/[0-9]+/[a-f0-9-]+\.(pdf|docx)$#i', $path) !== 1
            || ! Storage::disk('local')->exists($path)) {
            abort(404, 'The resume file is unavailable.');
        }

        return Storage::disk('local')->download($path, $application->resume_original_filename, [
            'Content-Type' => $application->resume_mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function alreadyApplied(): JsonResponse
    {
        return response()->json([
            'message' => 'You have already applied to this listing.',
            'code' => 'already_applied',
        ], 409);
    }
}
