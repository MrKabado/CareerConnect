<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $credentials = [
            'name' => 'System Administrator',
            'email' => 'admin@gmail.com',
            'password' => 'Password123?',
        ];

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
