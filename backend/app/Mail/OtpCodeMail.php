<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $purpose,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->purpose === 'email_verification'
            ? 'Verify your CareerConnect email'
            : 'Reset your CareerConnect password';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $purposeLabel = $this->purpose === 'email_verification'
            ? 'verify your email address'
            : 'reset your password';

        return new Content(
            view: 'emails.otp-code',
            with: [
                'code' => $this->code,
                'purposeLabel' => $purposeLabel,
            ],
        );
    }
}
