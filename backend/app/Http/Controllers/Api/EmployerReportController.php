<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\EmployerReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployerReportController extends Controller
{
    public function store(Request $request, string $companySlug): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', Rule::in([
                'abusive_behavior',
                'unpaid_salary',
                'fraud_or_scam',
                'unsafe_workplace',
                'other',
            ])],
            'details' => ['required', 'string', 'min:20', 'max:5000'],
        ]);

        $company = Company::query()
            ->with('user:id,role')
            ->get(['id', 'name', 'user_id'])
            ->first(fn (Company $record): bool => Str::slug($record->name) === $companySlug);

        abort_if($company === null || $company->user?->role !== 'employer', 404);

        $report = EmployerReport::query()->create([
            'reporter_id' => $request->user()->id,
            'employer_id' => $company->user_id,
            'company_id' => $company->id,
            'reason' => $validated['reason'],
            'details' => $validated['details'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Your report has been sent to CareerConnect Admin for review.',
            'data' => ['id' => $report->id, 'status' => $report->status],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['all', 'pending', 'investigating', 'resolved', 'dismissed'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $reports = EmployerReport::query()
            ->with([
                'reporter:id,name,email',
                'employer:id,name,email,account_status',
                'company:id,name',
                'reviewer:id,name',
            ])
            ->when(
                isset($filters['status']) && $filters['status'] !== 'all',
                fn (Builder $query): Builder => $query->where('status', $filters['status']),
            )
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'investigating' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return response()->json($reports);
    }

    public function review(Request $request, EmployerReport $employerReport): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['investigating', 'resolved', 'dismissed'])],
            'decision' => ['sometimes', Rule::in(['deactivate_employer', 'no_action'])],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        if (isset($validated['decision']) && $validated['status'] !== 'resolved') {
            return response()->json([
                'message' => 'A decision can only be recorded when resolving a report.',
            ], 422);
        }

        if ($employerReport->status === 'dismissed' || $employerReport->status === 'resolved') {
            return response()->json([
                'message' => 'This report has already been closed.',
            ], 409);
        }

        if (($validated['decision'] ?? null) === 'deactivate_employer'
            && $employerReport->employer?->role !== 'employer') {
            return response()->json([
                'message' => 'The reported account is no longer an employer account.',
            ], 409);
        }

        DB::transaction(function () use ($request, $employerReport, $validated): void {
            $isClosed = in_array($validated['status'], ['resolved', 'dismissed'], true);
            $employerReport->fill([
                'status' => $validated['status'],
                'decision' => $validated['decision'] ?? null,
                'admin_notes' => $validated['admin_notes'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => $isClosed ? now() : null,
            ])->save();

            if (($validated['decision'] ?? null) === 'deactivate_employer') {
                $employer = User::query()->whereKey($employerReport->employer_id)->lockForUpdate()->firstOrFail();
                $employer->forceFill(['account_status' => 'deactivated'])->save();
                $employer->tokens()->delete();

                ActivityLog::query()->create([
                    'user_id' => $employer->id,
                    'actor_id' => $request->user()->id,
                    'action' => 'admin.employer_deactivated_after_report',
                    'subject_type' => EmployerReport::class,
                    'subject_id' => $employerReport->id,
                    'payload' => [
                        'report_id' => $employerReport->id,
                        'admin_notes' => $validated['admin_notes'] ?? null,
                    ],
                ]);
            }
        });

        return response()->json([
            'message' => 'Employer report review saved.',
            'data' => $employerReport->fresh()->only(['id', 'status', 'decision', 'admin_notes', 'reviewed_at']),
        ]);
    }
}
