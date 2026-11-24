<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PublicJobListingsChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $action = 'updated',
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('public.job-listings')];
    }

    public function broadcastAs(): string
    {
        return 'public.job-listings.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'occurred_at' => now()->toISOString(),
        ];
    }
}
