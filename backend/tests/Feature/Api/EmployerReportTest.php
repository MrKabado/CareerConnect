<?php

use App\Models\Company;
use App\Models\EmployerReport;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

uses(LazilyRefreshDatabase::class)->group('api');

function employerReportToken(TestCase $test, User $user): string
{
    Auth::forgetGuards();

    return $user->createToken('employer-report-test')->plainTextToken;
}

it('allows applicants to submit an employer report for investigation', function (): void {
    $applicant = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'JohnTech',
        'is_verified' => true,
    ]);

    $this->withToken(employerReportToken($this, $applicant))
        ->postJson('/api/companies/johntech/reports', [
            'reason' => 'unpaid_salary',
            'details' => 'The employer has not paid wages for the last two months.',
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending');

    $this->assertDatabaseHas('employer_reports', [
        'reporter_id' => $applicant->id,
        'employer_id' => $employer->id,
        'company_id' => $company->id,
        'reason' => 'unpaid_salary',
        'status' => 'pending',
    ]);
});

it('restricts employer reports to authenticated applicants', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    Company::create([
        'user_id' => $employer->id,
        'name' => 'JohnTech',
        'is_verified' => true,
    ]);

    $this->postJson('/api/companies/johntech/reports', [
        'reason' => 'other',
        'details' => 'This report contains sufficient descriptive detail.',
    ])->assertUnauthorized();

    $this->withToken(employerReportToken($this, $employer))
        ->postJson('/api/companies/johntech/reports', [
            'reason' => 'other',
            'details' => 'This report contains sufficient descriptive detail.',
        ])
        ->assertForbidden();
});

it('lets admins investigate and deactivate a reported employer account', function (): void {
    $reporter = User::factory()->create(['role' => 'applicant']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'JohnTech',
        'is_verified' => true,
    ]);
    $report = EmployerReport::query()->create([
        'reporter_id' => $reporter->id,
        'employer_id' => $employer->id,
        'company_id' => $company->id,
        'reason' => 'abusive_behavior',
        'details' => 'The employer sent abusive messages after the interview.',
    ]);
    $admin = User::factory()->create(['role' => 'admin']);
    $employer->createToken('employer-session');

    $this->withToken(employerReportToken($this, $admin))
        ->getJson('/api/admin/employer-reports?status=pending')
        ->assertOk()
        ->assertJsonPath('data.0.id', $report->id)
        ->assertJsonPath('data.0.employer.id', $employer->id);

    $this->app['auth']->forgetGuards();
    $this->withToken(employerReportToken($this, $admin))
        ->patchJson("/api/admin/employer-reports/{$report->id}", [
            'status' => 'resolved',
            'decision' => 'deactivate_employer',
            'admin_notes' => 'Evidence reviewed; employer account deactivated.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'resolved')
        ->assertJsonPath('data.decision', 'deactivate_employer');

    expect($employer->fresh()->account_status)->toBe('deactivated')
        ->and($employer->tokens()->count())->toBe(0);
    $this->assertDatabaseHas('activity_logs', [
        'action' => 'admin.employer_deactivated_after_report',
        'subject_id' => $report->id,
    ]);
});
