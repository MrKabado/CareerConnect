<?php

namespace App\Console\Commands;

use App\Models\IdentityVerification;
use App\Services\MediaStorage;
use Illuminate\Console\Command;

class PruneIdentityDocuments extends Command
{
    public function __construct(private readonly MediaStorage $mediaStorage)
    {
        parent::__construct();
    }

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
                    $this->mediaStorage->delete(
                        $verification->storage_disk,
                        $verification->document_path,
                        $verification->cloudinary_asset_id,
                        'raw',
                        'authenticated',
                    );

                    $verification->update([
                        'document_path' => null,
                        'storage_disk' => 'local',
                        'cloudinary_asset_id' => null,
                        'document_mime_type' => null,
                    ]);
                    $deleted++;
                }
            });

        $this->info("Deleted {$deleted} expired identity document(s).");

        return self::SUCCESS;
    }
}
