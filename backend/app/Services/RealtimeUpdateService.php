<?php

namespace App\Services;

use App\Events\PublicJobListingsChanged;
use App\Events\UserDataChanged;
use App\Models\User;

class RealtimeUpdateService
{
    public function user(User $user, string $resource, string $action = 'updated'): void
    {
        UserDataChanged::dispatch((int) $user->getKey(), $resource, $action);
    }

    public function publicJobListings(string $action = 'updated'): void
    {
        PublicJobListingsChanged::dispatch($action);
    }
}
