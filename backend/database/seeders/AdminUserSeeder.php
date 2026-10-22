<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $credentials = config('careerconnect.admin_seed');

        if (! is_string($credentials['name']) || trim($credentials['name']) === ''
            || ! is_string($credentials['email']) || trim($credentials['email']) === ''
            || ! is_string($credentials['password']) || strlen($credentials['password']) < 12) {
            throw new InvalidArgumentException(
                'Set ADMIN_SEED_NAME, ADMIN_SEED_EMAIL, and a 12-character ADMIN_SEED_PASSWORD before seeding an admin.',
            );
        }

        $user = User::firstOrNew(['email' => $credentials['email']]);

        if ($user->exists && $user->role !== 'admin') {
            throw new InvalidArgumentException('The admin seed email already belongs to a non-admin account.');
        }

        $user->forceFill([
            'name' => $credentials['name'],
            'password' => Hash::make($credentials['password']),
            'role' => 'admin',
            'email_verified_at' => $user->email_verified_at ?? now(),
            'account_status' => 'active',
        ])->save();
    }
}
