<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\CareerConnectNotification;

class NotificationService
{
    public function send(User $recipient, string $event, string $title, string $message, array $metadata = []): void
    {
        $recipient->notify(new CareerConnectNotification($event, $title, $message, $metadata));
    }
}
