<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IdentityVerificationController;
use App\Http\Controllers\Api\OtpController;
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

Route::middleware(['auth:sanctum', 'account.active', 'throttle:60,1'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);

    Route::middleware('role:applicant')->prefix('applicant')->group(function (): void {
        Route::get('/identity-verification', [IdentityVerificationController::class, 'status']);
        Route::post('/identity-verification', [IdentityVerificationController::class, 'store']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/identity-verifications', [IdentityVerificationController::class, 'index']);
        Route::get('/identity-verifications/{identityVerification}/document', [IdentityVerificationController::class, 'document']);
        Route::post('/identity-verifications/{identityVerification}/review', [IdentityVerificationController::class, 'review']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus']);
        Route::post('/users/{user}/password-reset', [AdminUserController::class, 'sendPasswordReset'])
            ->middleware('throttle:5,1');
    });
});
