<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApplicantNoteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $applicantName,
        public string $employerName,
        public string $companyName,
        public string $jobTitle,
        public string $note,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf('Note from %s about your %s application', $this->companyName, $this->jobTitle),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.applicant-note');
    }
}
