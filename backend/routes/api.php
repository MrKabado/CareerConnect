<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:5,1')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/request', [OtpController::class, 'requestCode']);
    Route::post('/otp/verify', [OtpController::class, 'verifyEmail']);
    Route::post('/forgot-password', [OtpController::class, 'forgotPassword']);
    Route::post('/reset-password', [OtpController::class, 'resetPassword']);
});

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);
});
