<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\CareerConnectNotification;
use Illuminate\Notifications\DatabaseNotification;

class NotificationService
{
    public function send(User $recipient, string $event, string $title, string $message, array $metadata = []): void
    {
        $interviewId = $metadata['interview_id'] ?? null;

        if ($interviewId !== null) {
            $existing = $recipient->notifications()
                ->where('type', CareerConnectNotification::class)
                ->get()
                ->first(function (DatabaseNotification $notification) use ($interviewId): bool {
                    $data = $notification->data;

                    return (int) ($data['metadata']['interview_id'] ?? 0) === (int) $interviewId;
                });

            if ($existing !== null) {
                $existing->forceFill([
                    'data' => [
                        'event' => $event,
                        'title' => $title,
                        'message' => $message,
                        'metadata' => $metadata,
                    ],
                    'read_at' => null,
                ])->save();

                return;
            }
        }

        $recipient->notify(new CareerConnectNotification($event, $title, $message, $metadata));
    }
}
