<?php

use App\Http\Controllers\Api\AdminJobListingController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\EmployerJobListingController;
use App\Http\Controllers\Api\EmployerVerificationController;
use App\Http\Controllers\Api\IdentityVerificationController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\PublicJobListingController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:5,1')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/register/applicant', [AuthController::class, 'registerApplicant']);
    Route::post('/register/employer', [AuthController::class, 'registerEmployer']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/request', [OtpController::class, 'requestCode']);
    Route::post('/otp/verify', [OtpController::class, 'verifyEmail']);
    Route::post('/forgot-password', [OtpController::class, 'forgotPassword']);
    Route::post('/reset-password', [OtpController::class, 'resetPassword']);
});

Route::get('/categories', [CategoryController::class, 'publicIndex']);
Route::get('/jobs', [PublicJobListingController::class, 'index']);
Route::get('/jobs/{jobListing}', [PublicJobListingController::class, 'show'])
    ->whereNumber('jobListing');

Route::middleware(['auth:sanctum', 'account.active', 'throttle:60,1'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);

    Route::middleware('role:applicant')->prefix('applicant')->group(function (): void {
        Route::get('/identity-verification', [IdentityVerificationController::class, 'status']);
        Route::post('/identity-verification', [IdentityVerificationController::class, 'store']);
    });

    Route::middleware('role:employer')->prefix('employer')->group(function (): void {
        Route::get('/company', [EmployerVerificationController::class, 'company']);
        Route::put('/company', [EmployerVerificationController::class, 'company']);
        Route::post('/company/logo', [EmployerVerificationController::class, 'uploadLogo']);
        Route::post('/verification/documents', [EmployerVerificationController::class, 'uploadDocument']);
        Route::post('/verification/submit', [EmployerVerificationController::class, 'submit']);
        Route::get('/verification', [EmployerVerificationController::class, 'status']);
        Route::get('/jobs', [EmployerJobListingController::class, 'index']);
        Route::get('/jobs/{jobListing}', [EmployerJobListingController::class, 'show'])->whereNumber('jobListing');
    });

    Route::middleware('role:employer')->group(function (): void {
        Route::post('/jobs', [EmployerJobListingController::class, 'store']);
        Route::put('/jobs/{jobListing}', [EmployerJobListingController::class, 'update'])->whereNumber('jobListing');
        Route::patch('/jobs/{jobListing}/status', [EmployerJobListingController::class, 'updateStatus'])->whereNumber('jobListing');
        Route::delete('/jobs/{jobListing}', [EmployerJobListingController::class, 'destroy'])->whereNumber('jobListing');
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/jobs', [AdminJobListingController::class, 'index']);
        Route::get('/jobs/{jobListing}', [AdminJobListingController::class, 'show'])->whereNumber('jobListing');
        Route::post('/jobs/{jobListing}/deactivate', [AdminJobListingController::class, 'deactivate'])->whereNumber('jobListing');
        Route::post('/jobs/{jobListing}/restore', [AdminJobListingController::class, 'restore'])->whereNumber('jobListing');
        Route::get('/identity-verifications', [IdentityVerificationController::class, 'index']);
        Route::get('/identity-verifications/{identityVerification}/document', [IdentityVerificationController::class, 'document']);
        Route::post('/identity-verifications/{identityVerification}/review', [IdentityVerificationController::class, 'review']);
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        Route::get('/company-verifications', [EmployerVerificationController::class, 'index']);
        Route::post('/company-verifications/{companyVerification}/review', [EmployerVerificationController::class, 'review']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus']);
        Route::post('/users/{user}/password-reset', [AdminUserController::class, 'sendPasswordReset'])
            ->middleware('throttle:5,1');
    });
});
