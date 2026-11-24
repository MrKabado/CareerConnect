<?php

use App\Events\UserDataChanged;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;

uses(LazilyRefreshDatabase::class)->group('api');

it('authorizes private realtime channels only for their owning user', function (): void {
    Config::set('broadcasting.default', 'reverb');
    Config::set('broadcasting.connections.reverb.key', 'realtime-test-key');
    Config::set('broadcasting.connections.reverb.secret', 'realtime-test-secret');
    Config::set('broadcasting.connections.reverb.app_id', 'realtime-test');
    require base_path('routes/channels.php');

    $owner = User::factory()->create(['role' => 'applicant']);
    $otherUser = User::factory()->create(['role' => 'applicant']);
    $ownerToken = $owner->createToken('realtime-test')->plainTextToken;
    $otherToken = $otherUser->createToken('realtime-test')->plainTextToken;

    $this->withToken($ownerToken)->postJson('/broadcasting/auth', [
        'socket_id' => '123.456',
        'channel_name' => 'private-users.'.$owner->id,
    ])->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('user.id', $otherUser->id);
    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->postJson('/broadcasting/auth', [
        'socket_id' => '123.456',
        'channel_name' => 'private-users.'.$owner->id,
    ])->assertForbidden();
});

it('broadcasts notification and related data invalidations to only the recipient channel', function (): void {
    Event::fake([UserDataChanged::class]);
    $recipient = User::factory()->create(['role' => 'employer']);

    app(NotificationService::class)->send(
        $recipient,
        'application_submitted',
        'New application received',
        'A new applicant applied.',
        ['application_id' => 12, 'job_listing_id' => 34],
    );

    Event::assertDispatched(UserDataChanged::class, fn (UserDataChanged $event): bool => $event->userId === $recipient->id
        && $event->resource === 'notifications'
        && $event->action === 'created');
    Event::assertDispatched(UserDataChanged::class, fn (UserDataChanged $event): bool => $event->userId === $recipient->id
        && $event->resource === 'applications');
    Event::assertDispatched(UserDataChanged::class, fn (UserDataChanged $event): bool => $event->userId === $recipient->id
        && $event->resource === 'job_listings');
});
