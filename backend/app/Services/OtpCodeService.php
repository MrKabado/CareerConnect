<?php

namespace App\Services;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class OtpCodeService
{
    public function send(string $email, string $purpose): void
    {
        $code = (string) random_int(100000, 999999);

        OtpCode::updateOrCreate(
            ['email' => $email, 'purpose' => $purpose],
            [
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(10),
            ],
        );

        Mail::to($email)->send(new OtpCodeMail($code, $purpose));
    }
}
