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
        $applicationId = $metadata['application_id'] ?? null;
        $status = $metadata['status'] ?? null;
        $dedupeKey = $metadata['dedupe_key'] ?? null;

        if ($dedupeKey !== null) {
            $existing = $recipient->notifications()
                ->where('type', CareerConnectNotification::class)
                ->get()
                ->first(function (DatabaseNotification $notification) use ($dedupeKey): bool {
                    $metadata = $notification->data['metadata'] ?? [];

                    return ($metadata['dedupe_key'] ?? null) === $dedupeKey;
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
                $this->broadcastUpdates($recipient, $metadata, 'updated');

                return;
            }
        }

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
                $this->broadcastUpdates($recipient, $metadata, 'updated');

                return;
            }
        }

        if ($applicationId !== null && in_array($event, ['application_status_changed', 'applicant_hired'], true)) {
            $existing = $recipient->notifications()
                ->where('type', CareerConnectNotification::class)
                ->get()
                ->first(function (DatabaseNotification $notification) use ($applicationId, $event, $status): bool {
                    $data = $notification->data;
                    $metadata = $data['metadata'] ?? [];

                    return (int) ($metadata['application_id'] ?? 0) === (int) $applicationId
                        && (($event === 'applicant_hired' && ($metadata['status'] ?? null) === 'hired')
                            || ($event === 'application_status_changed'
                                && ($metadata['status'] ?? null) === $status));
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
                $this->broadcastUpdates($recipient, $metadata, 'updated');

                return;
            }
        }

        $recipient->notify(new CareerConnectNotification($event, $title, $message, $metadata));
        $this->broadcastUpdates($recipient, $metadata, 'created');
    }

    private function broadcastUpdates(User $recipient, array $metadata, string $action): void
    {
        $realtime = app(RealtimeUpdateService::class);
        $realtime->user($recipient, 'notifications', $action);

        if (isset($metadata['application_id'])) {
            $realtime->user($recipient, 'applications', $action);
        }

        if (isset($metadata['job_listing_id'])) {
            $realtime->user($recipient, 'job_listings', $action);
        }
    }
}
