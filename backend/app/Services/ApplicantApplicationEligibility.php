<?php

namespace App\Services;

use App\Models\IdentityVerification;
use App\Models\User;

class ApplicantApplicationEligibility
{
    public function currentVerification(User $applicant, bool $lockForUpdate = false): ?IdentityVerification
    {
        $query = IdentityVerification::query()
            ->where('user_id', $applicant->id);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->first();
    }

    public function verificationReason(?IdentityVerification $verification): ?string
    {
        return match ($verification?->status ?? 'unverified') {
            'verified' => null,
            'pending' => 'Your identity verification is awaiting Admin review. Applications are available after approval.',
            'rejected' => 'Your identity verification was rejected'
                .($verification?->rejection_reason ? ': '.$verification->rejection_reason : '.')
                .' Please resubmit your documents before applying.',
            default => 'Submit your identity verification and wait for Admin approval before applying.',
        };
    }
}
