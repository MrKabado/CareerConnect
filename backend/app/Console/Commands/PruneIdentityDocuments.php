<?php

namespace App\Console\Commands;

use App\Models\IdentityVerification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class PruneIdentityDocuments extends Command
{
    protected $signature = 'app:prune-identity-documents';

    protected $description = 'Delete identity documents past their retention period';

    public function handle(): int
    {
        $deleted = 0;

        IdentityVerification::query()
            ->whereNotNull('document_path')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->chunkById(100, function ($verifications) use (&$deleted): void {
                foreach ($verifications as $verification) {
                    if (! Storage::disk('local')->delete($verification->document_path)) {
                        throw new RuntimeException('An expired identity document could not be deleted.');
                    }

                    $verification->update(['document_path' => null]);
                    $deleted++;
                }
            });

        $this->info("Deleted {$deleted} expired identity document(s).");

        return self::SUCCESS;
    }
}
