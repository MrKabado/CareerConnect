<?php

return [
    'identity_document_retention_days' => max(30, (int) env('IDENTITY_DOCUMENT_RETENTION_DAYS', 730)),
    'admin_seed' => [
        'name' => env('ADMIN_SEED_NAME'),
        'email' => env('ADMIN_SEED_EMAIL'),
        'password' => env('ADMIN_SEED_PASSWORD'),
    ],
];
