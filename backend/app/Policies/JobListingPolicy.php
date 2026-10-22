<?php

namespace App\Policies;

use App\Models\JobListing;
use App\Models\User;

class JobListingPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'employer'], true);
    }

    public function view(User $user, JobListing $jobListing): bool
    {
        return $user->role === 'admin'
            || ($user->role === 'employer' && $user->company?->id === $jobListing->company_id);
    }

    public function create(User $user): bool
    {
        return $user->role === 'employer';
    }

    public function update(User $user, JobListing $jobListing): bool
    {
        return $user->role === 'employer'
            && $user->company?->id === $jobListing->company_id
            && $jobListing->status !== 'deactivated';
    }

    public function delete(User $user, JobListing $jobListing): bool
    {
        return $this->update($user, $jobListing);
    }

    public function restore(User $user, JobListing $jobListing): bool
    {
        return $user->role === 'admin';
    }
}
