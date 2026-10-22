<?php

namespace App\Policies;

use App\Models\IdentityVerification;
use App\Models\User;

class IdentityVerificationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, IdentityVerification $identityVerification): bool
    {
        return $user->hasRole('admin') || (
            $user->hasRole('applicant') && $identityVerification->user_id === $user->id
        );
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('applicant');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, IdentityVerification $identityVerification): bool
    {
        return $user->hasRole('applicant')
            && $identityVerification->user_id === $user->id
            && $identityVerification->status === 'rejected';
    }

    public function review(User $user, IdentityVerification $identityVerification): bool
    {
        return $user->hasRole('admin')
            && $identityVerification->user_id !== $user->id
            && $identityVerification->status === 'pending';
    }
}
