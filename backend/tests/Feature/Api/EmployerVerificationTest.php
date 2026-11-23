<?php

use App\Models\Category;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Models\User;
use App\Models\VerificationDocument;
use App\Services\CloudinaryMediaGateway;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

uses(LazilyRefreshDatabase::class)->group('api');

beforeEach(function (): void {
    Config::set('careerconnect.media_storage_disk', 'local');
});

it('allows employers to manage their company profile, logo, and verification status', function (): void {
    Storage::fake('local');
    Storage::fake('public');

    $employer = User::factory()->create(['role' => 'employer']);
    $token = $employer->createToken('test')->plainTextToken;
    $category = Category::create(['name' => 'Information Technology', 'is_active' => true]);

    $this->withToken($token)->putJson('/api/employer/company', [
        'name' => 'Acme Tech',
        'category_id' => $category->id,
        'company_size' => '11-50',
        'address' => '123 Main St',
        'country' => 'PH',
        'city' => 'Cebu City',
        'industry' => 'Information Technology',
        'website' => 'https://acmetech.test',
        'description' => 'A growing software company that builds reliable digital products, supports local businesses, and provides practical technology services to communities.',
        'contact_name' => 'Jane Doe',
        'contact_phone' => '+639171234567',
        'contact_email' => 'jane@acmetech.test',
        'hires_jobs' => true,
        'hires_ojt' => true,
        'open_to_moa' => true,
        'accepted_courses' => ['BSIT', 'BSCS'],
    ])->assertOk();

    $company = Company::query()->where('user_id', $employer->id)->firstOrFail();
    expect($company->is_verified)->toBeFalse();

    $this->withToken($token)->postJson('/api/employer/company/logo', [
        'logo' => UploadedFile::fake()->create('logo.png', 120, 'image/png'),
    ])->assertOk();

    $this->withToken($token)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('company_profile_complete', true)
        ->assertJsonPath('profile_strength.percent', 100)
        ->assertJsonPath('profile_strength.missing', []);

    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('registration.pdf', 2048, 'application/pdf'),
    ])->assertCreated();

    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_permit',
        'document' => UploadedFile::fake()->create('permit.pdf', 2048, 'application/pdf'),
    ])->assertCreated();

    $this->withToken($token)->postJson('/api/employer/verification/submit')->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/employer/verification/submit')
        ->assertConflict()
        ->assertJsonPath('message', 'Company verification is already pending approval.');

    $verification = CompanyVerification::query()->where('company_id', $company->id)->firstOrFail();
    expect($verification->status)->toBe('pending')
        ->and($verification->submitted_at)->not->toBeNull();

    $this->withToken($token)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'pending');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/logout')->assertOk();
    $newToken = $employer->createToken('employer-after-logout')->plainTextToken;

    $this->app['auth']->forgetGuards();
    $this->withToken($newToken)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'pending');
    $this->app['auth']->forgetGuards();
    $this->withToken($newToken)->postJson('/api/employer/verification/submit')
        ->assertConflict()
        ->assertJsonPath('message', 'Company verification is already pending approval.');
});

it('rejects invalid company countries and phone numbers', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $token = $employer->createToken('employer')->plainTextToken;

    $this->withToken($token)->putJson('/api/employer/company', [
        'name' => 'Invalid Company',
        'country' => 'Philippines1',
        'contact_phone' => '+63 not-a-number',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['country', 'contact_phone']);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/employer/company', [
        'name' => 'Valid Company',
        'country' => 'PH',
        'contact_phone' => '+63 (917) 123-4567',
    ])->assertOk();

    $this->assertDatabaseHas('companies', [
        'user_id' => $employer->id,
        'country' => 'PH',
        'contact_phone' => '+63 (917) 123-4567',
    ]);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->putJson('/api/employer/company', [
        'name' => 'Valid Company',
        'country' => 'GB',
    ])->assertOk();

    $this->assertDatabaseHas('companies', [
        'user_id' => $employer->id,
        'country' => 'GB',
    ]);
});

it('creates a company shell when an employer uploads documents before completing company information', function (): void {
    Storage::fake('local');
    $owner = User::factory()->create([
        'role' => 'employer',
        'name' => 'Pending Employer',
        'email' => 'pending-employer@example.com',
    ]);
    $ownerToken = $owner->createToken('owner')->plainTextToken;

    expect(Company::query()->where('user_id', $owner->id)->exists())->toBeFalse();

    $this->withToken($ownerToken)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ])->assertCreated();

    $company = Company::query()->where('user_id', $owner->id)->firstOrFail();
    expect($company->name)->toBe('Pending Company Profile')
        ->and($company->contact_name)->toBe('Pending Employer')
        ->and($company->contact_email)->toBe('pending-employer@example.com');
});

it('keeps employer verification documents private and supports replacement and removal', function (): void {
    Storage::fake('local');
    $owner = User::factory()->create(['role' => 'employer']);
    $other = User::factory()->create(['role' => 'employer']);
    $ownerToken = $owner->createToken('owner')->plainTextToken;
    $otherToken = $other->createToken('other')->plainTextToken;

    $this->withToken($ownerToken)->putJson('/api/employer/company', [
        'name' => 'Private Docs Ltd',
    ])->assertOk();
    $company = Company::query()->where('user_id', $owner->id)->firstOrFail();

    $this->app['auth']->forgetGuards();
    $firstUpload = $this->withToken($ownerToken)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ])->assertCreated()
        ->assertJsonMissingPath('document.file_path')
        ->assertJsonMissingPath('document.storage_path');
    $documentId = $firstUpload->json('document.id');
    $document = VerificationDocument::query()->findOrFail($documentId);
    $firstPath = $document->file_path;
    Storage::disk('local')->assertExists($firstPath);

    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('updated-registration.pdf', 120, 'application/pdf'),
    ])->assertOk()
        ->assertJsonPath('document.id', $documentId)
        ->assertJsonPath('document.original_filename', 'updated-registration.pdf');
    $document->refresh();
    expect($document->file_path)->not->toBe($firstPath);
    Storage::disk('local')->assertMissing($firstPath);
    Storage::disk('local')->assertExists($document->file_path);

    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->getJson(
        "/api/employer/verification/documents/{$documentId}/download",
    )->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->get(
        "/api/employer/verification/documents/{$documentId}/download",
    )->assertOk()
        ->assertHeader('content-disposition', 'attachment; filename=updated-registration.pdf');

    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->deleteJson(
        "/api/employer/verification/documents/{$documentId}",
    )->assertOk();
    Storage::disk('local')->assertMissing($document->file_path);
    $this->assertDatabaseMissing('verification_documents', ['id' => $documentId]);
    $this->assertDatabaseHas('companies', ['id' => $company->id, 'is_verified' => false]);
});

it('organizes Cloudinary employer logos and private verification documents by company', function (): void {
    Config::set('careerconnect.media_storage_disk', 'cloudinary');
    $owner = User::factory()->create(['role' => 'employer']);
    $token = $owner->createToken('cloud-employer')->plainTextToken;

    $this->withToken($token)->putJson('/api/employer/company', ['name' => 'Cloud Employer'])
        ->assertOk();
    $company = Company::query()->where('user_id', $owner->id)->firstOrFail();
    $gateway = Mockery::mock(CloudinaryMediaGateway::class);
    $gateway->shouldReceive('uploadImage')
        ->once()
        ->withArgs(fn (UploadedFile $file, string $folder): bool => $folder === 'career-connect/employers/'.$company->id.'/logos'
        )
        ->andReturn(['asset_id' => 'logo-asset-1', 'public_id' => 'cloud-logo']);
    $gateway->shouldReceive('upload')
        ->once()
        ->withArgs(fn (UploadedFile $file, string $publicId, string $folder): bool => str_starts_with($publicId, 'employer-verifications/'.$company->id.'/')
            && str_ends_with($publicId, '.pdf')
            && $folder === 'career-connect/employers/'.$company->id.'/verification-documents'
        )
        ->andReturnUsing(fn (UploadedFile $file, string $publicId, string $folder): array => [
            'asset_id' => 'verification-asset-1',
            'public_id' => $publicId,
        ]);
    $gateway->shouldReceive('imageUrl')->once()
        ->with('cloud-logo')
        ->andReturn('https://res.cloudinary.com/demo/image/upload/cloud-logo');
    $gateway->shouldReceive('download')
        ->once()
        ->withArgs(fn (string $path, string $extension, string $filename, string $mimeType, string $resourceType): bool => str_starts_with($path, 'employer-verifications/'.$company->id.'/')
            && $extension === 'pdf'
            && $filename === 'registration.pdf'
            && $mimeType === 'application/pdf'
            && $resourceType === 'raw'
        )
        ->andReturnUsing(fn (): StreamedResponse => response()->streamDownload(
            static fn () => print ('%PDF-1.4'),
            'registration.pdf',
            ['Content-Type' => 'application/pdf'],
        ));
    $gateway->shouldReceive('delete')
        ->twice()
        ->withArgs(fn (string $publicId, string $resourceType, string $deliveryType): bool => ($publicId === 'cloud-logo' && $resourceType === 'image' && $deliveryType === 'upload')
            || (str_starts_with($publicId, 'employer-verifications/'.$company->id.'/')
                && $resourceType === 'raw'
                && $deliveryType === 'authenticated')
        );
    $this->app->instance(CloudinaryMediaGateway::class, $gateway);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/employer/company/logo', [
        'logo' => UploadedFile::fake()->create('logo.png', 120, 'image/png'),
    ])->assertOk()
        ->assertJsonPath('logo_url', 'https://res.cloudinary.com/demo/image/upload/cloud-logo');

    $company->refresh();
    expect($company->logo_path)->toBe('cloud-logo')
        ->and($company->logo_disk)->toBe('cloudinary')
        ->and($company->logo_asset_id)->toBe('logo-asset-1');

    $this->app['auth']->forgetGuards();
    $upload = $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
    ])->assertCreated()
        ->assertJsonMissingPath('document.file_path')
        ->assertJsonMissingPath('document.storage_disk');
    $documentId = $upload->json('document.id');
    $document = VerificationDocument::query()->findOrFail($documentId);
    expect($document->storage_disk)->toBe('cloudinary')
        ->and($document->cloudinary_asset_id)->toBe('verification-asset-1');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->get("/api/employer/verification/documents/{$documentId}/download")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertStreamedContent('%PDF-1.4');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson("/api/employer/verification/documents/{$documentId}")
        ->assertOk();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->deleteJson('/api/employer/company/logo')->assertOk();
});

it('stores company gallery photos on the server and restricts photo deletion to the owner', function (): void {
    Storage::fake('public');
    Config::set('careerconnect.media_storage_disk', 'local');
    $owner = User::factory()->create(['role' => 'employer']);
    $ownerToken = $owner->createToken('company-media-owner')->plainTextToken;
    $other = User::factory()->create(['role' => 'employer']);
    $otherToken = $other->createToken('company-media-other')->plainTextToken;

    $this->withToken($ownerToken)->putJson('/api/employer/company', ['name' => 'Media Company'])
        ->assertOk();
    $company = Company::query()->where('user_id', $owner->id)->firstOrFail();

    $upload = $this->withToken($ownerToken)->postJson('/api/employer/company/media', [
        'photo' => UploadedFile::fake()->createWithContent(
            'office.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'),
        ),
        'alt_text' => 'Team workspace',
    ])->assertCreated()
        ->assertJsonPath('media.alt_text', 'Team workspace')
        ->assertJsonPath('media.mime_type', 'image/png');
    $mediaId = $upload->json('media.id');
    $media = $company->mediaAssets()->findOrFail($mediaId);

    Storage::disk('public')->assertExists($media->file_path);
    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->getJson('/api/employer/company')
        ->assertOk()
        ->assertJsonPath('company.media.0.id', $media->id)
        ->assertJsonPath('company.media.0.alt_text', 'Team workspace');

    $this->app['auth']->forgetGuards();
    $this->withToken($otherToken)->deleteJson("/api/employer/company/media/{$mediaId}")
        ->assertNotFound();

    $this->app['auth']->forgetGuards();
    $this->withToken($ownerToken)->deleteJson("/api/employer/company/media/{$mediaId}")
        ->assertOk();
    Storage::disk('public')->assertMissing($media->file_path);
    $this->assertDatabaseMissing('company_media_assets', ['id' => $mediaId]);
});

it('rejects invalid employer verification file types and files above the limit', function (): void {
    Storage::fake('local');
    $employer = User::factory()->create(['role' => 'employer']);
    $token = $employer->createToken('employer')->plainTextToken;
    $this->withToken($token)->putJson('/api/employer/company', ['name' => 'Validation Ltd'])
        ->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('invalid.exe', 100, 'application/octet-stream'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('document');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson('/api/employer/verification/documents', [
        'type' => 'business_registration',
        'document' => UploadedFile::fake()->create('oversized.pdf', 5121, 'application/pdf'),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('document');
});

it('lets admins list company verification submissions', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);
    $employer = User::factory()->create(['role' => 'employer']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Listed Company',
    ]);
    CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->withToken($admin->createToken('admin')->plainTextToken)
        ->getJson('/api/admin/company-verifications')
        ->assertOk()
        ->assertJsonPath('data.0.company.name', 'Listed Company')
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.company.owner.email', $employer->email);
});

it('lets admin review company verification submissions and reject them with reasons', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::create(['name' => 'Healthcare', 'is_active' => true]);

    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'CarePlus',
        'category_id' => $category->id,
        'company_size' => '51-200',
        'address' => '456 Wellness St',
        'city' => 'Davao City',
        'website' => 'https://careplus.test',
        'description' => 'Healthcare services',
        'contact_name' => 'Mia',
        'contact_phone' => '+639991122334',
        'contact_email' => 'mia@careplus.test',
        'hires_jobs' => true,
        'hires_ojt' => false,
    ]);

    $verification = CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'pending',
        'authorization_confirmed_at' => now(),
        'submitted_at' => now(),
    ]);

    $employerToken = $employer->createToken('employer')->plainTextToken;
    $adminToken = $admin->createToken('admin')->plainTextToken;

    $this->withToken($adminToken)->postJson("/api/admin/company-verifications/{$verification->id}/review", [
        'status' => 'rejected',
        'rejection_reason' => 'expired_permit',
        'rejection_note' => 'The permit must be renewed.',
    ])->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($employerToken)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'rejected')
        ->assertJsonPath('rejection_reason', 'expired_permit');
});

it('requires employers with a pre-approval session to sign in again after approval', function (): void {
    $employer = User::factory()->create(['role' => 'employer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $company = Company::create([
        'user_id' => $employer->id,
        'name' => 'Approved Company',
    ]);
    $verification = CompanyVerification::create([
        'company_id' => $company->id,
        'status' => 'pending',
        'submitted_at' => now(),
    ]);
    VerificationDocument::create([
        'company_verification_id' => $verification->id,
        'type' => 'business_registration',
        'file_path' => 'employer-verifications/1/registration.pdf',
        'original_filename' => 'registration.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 100,
        'storage_disk' => 'local',
    ]);
    VerificationDocument::create([
        'company_verification_id' => $verification->id,
        'type' => 'business_permit',
        'file_path' => 'employer-verifications/1/permit.pdf',
        'original_filename' => 'permit.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 100,
        'storage_disk' => 'local',
    ]);
    $oldToken = $employer->createToken('employer-before-approval')->plainTextToken;
    $adminToken = $admin->createToken('admin')->plainTextToken;

    $this->withToken($adminToken)->postJson(
        "/api/admin/company-verifications/{$verification->id}/review",
        ['status' => 'verified'],
    )->assertOk()
        ->assertJsonMissingPath('token');

    $this->app['auth']->forgetGuards();
    $this->withToken($oldToken)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('requires_reauthentication', true);

    $this->app['auth']->forgetGuards();
    $newToken = $employer->createToken('employer-after-approval')->plainTextToken;
    $this->withToken($newToken)->getJson('/api/employer/verification')
        ->assertOk()
        ->assertJsonPath('status', 'verified')
        ->assertJsonPath('requires_reauthentication', false);
});
