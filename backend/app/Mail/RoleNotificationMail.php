<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RoleNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $title,
        public string $notificationMessage,
        public string $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->title.' - CareerConnect');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.role-notification');
    }
}
