# CareerConnect backend

Laravel 12 JSON API using MySQL and Sanctum bearer tokens. Public registration supports applicants and employers; administrator accounts are provisioned only by the explicit admin seeder.

## Local setup

1. Copy `.env.example` to `.env`, set a unique `DB_PASSWORD` and `DB_ROOT_PASSWORD`, and keep `.env` out of version control.
2. Generate the application key with `docker compose run --rm backend php artisan key:generate`.
3. Start MySQL, Laravel, the queue worker, and the Reverb WebSocket server from this directory with `docker compose up --build -d`. The backend runs pending migrations on startup.
4. Configure `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and `ADMIN_SEED_PASSWORD` in `.env`, then create the bootstrap admin with `docker compose exec -T backend php artisan db:seed --class=AdminUserSeeder --force`.
5. In `frontend`, copy `.env.example` to `.env`, install dependencies with `npm install`, and start Vite with `npm run dev`. Set `HOST=localhost` for local-only use, or set it to this computer's LAN IP (for example, `HOST=192.168.254.125`) to access the app from another device. `VITE_API_BASE_URL` is built from `HOST`; the API will be reached at port 8000 on that same host.
6. Open `http://localhost:5173` locally, or `http://<HOST>:5173` from a device on the same network. The backend CORS configuration permits the Vite dev server on private IPv4 addresses. For a different frontend origin, configure `FRONTEND_URL` in `backend/.env`.

To clear the entire database and recreate only the configured admin bootstrap, run `docker compose exec -T backend php artisan migrate:fresh --seed --force` from this directory. This permanently deletes all database records and reruns every migration; do not run it against data you need.

Required local environment values are `APP_KEY`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` in `backend/.env`; in `frontend/.env`, set `HOST` and keep `VITE_API_BASE_URL` pointing to the backend on the same host. `DB_DATABASE` and `DB_USERNAME` have Compose defaults. `USE_DELETE_USERS` controls the temporary admin account-deletion action; it defaults to `false` and should only be enabled for testing. Use unique local database passwords; do not commit either `.env` file.

To stop Vite, press `Ctrl+C` in its terminal. To stop the Docker services, run `docker compose down` from `backend`. The named `mysql_data` volume and backend `storage` bind mount persist across stop/start and container recreation. **Do not use `docker compose down -v`** unless you intentionally want to delete the local database volume.

## Job location maps

Job addresses are geocoded once when an employer creates or updates a listing, then the returned latitude and longitude are stored with that listing and served by the existing job API. Address lookups use OpenStreetMap's Nominatim service with response caching and a one-request-per-second limit; addresses are not geocoded when applicants open a listing. Nominatim results that identify only a city, town, or other broad area are not saved as coordinates, so the applicant modal shows the address with a “Map location is unavailable” fallback rather than a misleading pin. Existing listings need to be saved again by their employer to attempt geocoding.

The submitted business address is sent to Nominatim for the lookup. The default identifying User-Agent can be overridden with `OPENSTREETMAP_USER_AGENT`. The interactive map uses OpenStreetMap tiles and displays the required contributor attribution.

## Philippine address selection

Applicant profiles, employer company addresses, job workplaces, and on-site interview addresses use the shared searchable Region → Province → City/Municipality → Barangay selector. PSGC Cloud supplies authoritative names and parent-child relationships; the Laravel API caches each response for 24 hours and returns an explicit 503 if PSGC is unavailable. The public option routes are `GET /api/locations/regions`, `GET /api/locations/regions/{region}/provinces`, `GET /api/locations/regions/{region}/localities`, `GET /api/locations/provinces/{province}/localities`, and `GET /api/locations/localities/{locality}/barangays`.

The backend validates submitted PSGC codes and their hierarchy before saving. Locality ZIP codes are suggested only when PSGC provides a valid four-digit value; ZIP codes remain editable and are never inferred from PSGC codes. Configure `PSGC_API_BASE_URL` or `PSGC_USER_AGENT` only when using a compatible PSGC endpoint or a custom identifying User-Agent. Apply pending database migrations with the normal backend startup or `php artisan migrate`; added structured address columns are nullable and preserve existing address values.

## Local file storage

Private resumes and verification documents are stored on Laravel's `local` disk under `storage/app/private` and are available only through authorized download endpoints. Company logos and applicant profile photos use the `public` disk under `storage/app/public`; Docker creates the `public/storage` link at startup. The backend bind mount includes `storage`, so local uploads persist across container restarts. For non-Docker development, run `php artisan storage:link` once.

To store new applicant and employer uploads in Cloudinary, set `MEDIA_STORAGE_DISK=cloudinary` and provide `CLOUDINARY_URL` in `backend/.env` (the value has the `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` format). Keep the URL secret on the backend; do not add it to the frontend environment. New assets are grouped in Cloudinary's Media Library under `career-connect/users/{user_id}/resumes`, `career-connect/users/{user_id}/profile-photos`, `career-connect/users/{user_id}/identity-verification`, `career-connect/employers/{company_id}/logos`, and `career-connect/employers/{company_id}/verification-documents`. Resumes and verification documents are uploaded as authenticated raw assets and are downloaded through the existing authorized API endpoints using a short-lived URL that is never sent to the browser; profile photos and logos remain publicly deliverable images. Existing local files remain readable after switching storage. `RESUME_STORAGE_DISK` is still accepted as a fallback for existing deployments, but `MEDIA_STORAGE_DISK` is the preferred setting. The frontend already uploads and downloads files through the backend API, so no Cloudinary credentials or direct browser upload are needed.

The example environment uses Laravel's `log` mailer. Configure `MAIL_MAILER` and the related `MAIL_*` values to deliver verification and password-reset codes by email.

The API uses `Authorization: Bearer <token>` and JSON responses. Sensitive endpoints (login, registration, OTP, and password reset) are rate limited. Email codes are hashed at rest, expire after ten minutes, and are deleted after use.

## Real-time updates

Laravel Reverb and Laravel Echo provide self-hosted real-time updates without a paid realtime provider. The Docker Compose setup starts Reverb on port `6001` and a queue worker; the worker is required to deliver queued broadcasts. Notifications, application changes, and public job-listing changes are sent as small invalidation events, and each user-specific channel is authenticated with that user's Sanctum token.

In `frontend/.env`, set `VITE_REVERB_APP_KEY` to the same public `REVERB_APP_KEY` in `backend/.env`; set the browser-facing host, port, and scheme as appropriate. Never place `REVERB_APP_SECRET` in the frontend. Restart Vite after changing its environment. In production, use unique Reverb credentials, expose the WebSocket server through TLS, and run both Reverb and a queue worker; hosting and server resources may still cost money even though the software is free.

## Admin bootstrap

The default database seeder creates only the configured administrator; it does not add demo users, companies, listings, or applications. Set `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and `ADMIN_SEED_PASSWORD` in `.env` before seeding.

## Phase 1 API

- `POST /api/register/applicant`, `POST /api/register/employer` (the compatibility `POST /api/register` is also available)
- `POST /api/login`, `POST /api/logout`, `GET /api/user`
- `POST /api/otp/request`, `POST /api/otp/verify`
- `POST /api/forgot-password`, `POST /api/reset-password`, `PUT /api/change-password`
- `GET|POST /api/applicant/identity-verification`
- `GET /api/applicant/application-eligibility`
- Admin-only `GET /api/admin/identity-verifications`, `GET /api/admin/identity-verifications/{id}/document`, and `POST /api/admin/identity-verifications/{id}/review`
- Admin-only `GET /api/admin/users`, `PATCH /api/admin/users/{id}/status`, and `POST /api/admin/users/{id}/password-reset`

## Phase 3 job listings

- Public visitors can browse `GET /api/jobs` and `GET /api/jobs/{id}`; supported filters include `keyword`, category, location, listing type, employment type, work setup, salary bounds, and allowance bounds. Results are paginated with `page` and `per_page` (maximum 50).
- Active employers can manage their listings through `GET /api/employer/jobs`, `GET /api/employer/jobs/{id}`, `POST /api/jobs`, `PUT /api/jobs/{id}`, `PATCH /api/jobs/{id}/status`, and `DELETE /api/jobs/{id}`. Employer deletion archives as `closed`.
- Drafts may be saved before company approval. Only an active employer with both `company.is_verified = true` and `company_verifications.status = verified` can open or reopen a listing.
- Admins use `GET /api/admin/jobs`, `GET /api/admin/jobs/{id}`, `POST /api/admin/jobs/{id}/deactivate`, and `POST /api/admin/jobs/{id}/restore`. Deactivation requires a reason and each moderation action is recorded; restoration returns listings to `closed`.
- Job salary fields are stored on `job_listings`; OJT hours, allowance, slots, courses, and MOA details are stored separately in `ojt_listing_details`.

## Phase 4 applicant profiles and onboarding

- Applicants manage personal information and profile photos through `GET|PUT|PATCH /api/applicant/profile` and `POST|DELETE /api/applicant/profile/photo`.
- Saved onboarding data is available through `GET /api/applicant/onboarding`. Seeker types, interests and skills, work preferences, job preferences, and OJT details are updated through their respective `PUT /api/applicant/onboarding/*` routes.
- `POST /api/applicant/onboarding/complete` only completes onboarding when required details for the selected seeker types are present. Job preferences remain optional; OJT seekers must provide school, course, year level, and required hours.
- `PATCH /api/applicant/preferences` supports partial updates across preference sections. `POST /api/applicant/finish-ojt` disables OJT seeking while preserving saved OJT information.
- Applicant profile, normalized skills, category selections, and OJT details are stored in applicant-owned tables; photos use Laravel's configured `public` disk.

## Phase 5 resumes and applications

- Applicants manage resume metadata and private files through `GET|POST|DELETE /api/applicant/resume`; `GET /api/applicant/resume/download` streams the current resume after authentication. Uploads accept validated PDF and DOCX files up to `RESUME_MAX_SIZE_KB` (5120 by default) and use `MEDIA_STORAGE_DISK` (`local` by default, or authenticated Cloudinary raw storage).
- Employers create or update their company profile through `GET|PUT /api/employer/company`; logo uploads and removal use `POST|DELETE /api/employer/company/logo` and accept JPG, PNG, or WebP images up to 2 MB.
- Employer registration uses `POST /api/register/employer` to save the company name, size, industry, and website selected in Step 1. The company-information step keeps that size and validates ISO country codes and formatted phone numbers.
- Employer verification files are listed, uploaded, replaced, downloaded, and removed through `/api/employer/verification/documents`. Business registration and permit uploads accept PDF, JPG, or PNG files up to 5 MB; these files remain private and downloads are scoped to their owning employer.
- Verification submission requires a complete company profile and both required documents. Duplicate submissions are blocked while approval is pending or after approval; rejected requests can be corrected and resubmitted. Employers must sign in again after approval.
- Applicant profile photos use `POST|DELETE /api/applicant/profile/photo`, accept JPG, PNG, or WebP images up to 2 MB, and are served from the local public disk. Cover-letter uploads and company photo galleries are not supported by the backend and remain browser-local in the frontend.
- Apply with `POST /api/jobs/{jobListing}/applications`. Applications require an active applicant with verified email and Admin-approved identity verification, an open eligible listing, matching seeker preferences, required OJT details for OJT listings, and a current resume. Missing verification records are unverified; pending and rejected applicants cannot apply, and rejection reasons are returned by the eligibility endpoint. Skill matches inform recommendations and ranking, not application eligibility. Applicants who have ever been marked hired cannot submit new applications.
- Applicant history is available from `GET /api/applicant/applications` and `GET /api/applicant/applications/{application}`. Status history and the resume snapshot for an owned application are available through `GET /api/applicant/applications/{application}/status-history` and `GET /api/applicant/applications/{application}/resume`.
- Employers review only applications to their own listings through `GET /api/employer/applications`, `GET /api/employer/applications/{application}`, and `PATCH /api/employer/applications/{application}/status`. The associated submitted resume is streamed securely from `GET /api/employer/applications/{application}/resume`.
- Application statuses are `pending`, `reviewing`, `shortlisted`, `interview`, `hired`, and `rejected`. Transitions are recorded with separate applicant-visible and internal reasons; `hired` and `rejected` are terminal. Unique application constraints prevent duplicate submissions, and historical resume versions remain attached to their submitted applications.

## Phase 6 interview scheduling

- Employers publish multiple available dates and shared working hours through `POST /api/employer/applications/{application}/interviews`; the application moves to `interview` and an `invited` interview record is created in the same transaction. Dates, working hours, optional breaks, slot duration, buffer, and the IANA timezone are stored in `interview_availabilities`.
- Applicants load available slots from `GET /api/applicant/interviews/{interview}/availability`, then book or reschedule through `POST /api/applicant/interviews/{interview}/schedule`. The server recalculates slots and locks the employer record before confirming a booking, preventing stale or double-booked slots.
- Employers can edit an invitation's availability through `PUT /api/employer/interviews/{interview}/availability`, cancel an interview with `POST /api/employer/interviews/{interview}/cancel`, and mark past interviews completed with `PATCH /api/employer/interviews/{interview}/status`. Editing availability preserves an existing confirmed time even if its date is removed from the new schedule. Direct employer scheduling is disabled.
- Applicants can cancel a confirmed interview with `POST /api/applicant/interviews/{interview}/cancel`. Both parties receive persisted notifications for invitations, bookings, rescheduling, availability changes, and cancellations. Applicant interview responses hide internal employer notes.

## Phase 7 notifications

- Notifications use Laravel's database notification table and are scoped to the authenticated recipient: `GET /api/notifications?per_page=15`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/{notification}/read`, and `PATCH /api/notifications/read-all`.
- Notification list responses contain `data` items with `id`, `event`, `title`, `message`, `metadata`, `read_at`, and `created_at`, plus pagination links and metadata. Unread count returns `{"count": 2}`; marking all read returns the number updated.
- Employers are notified after an application is submitted to their listing and when an applicant books, reschedules, or cancels an interview. Applicants receive notifications for meaningful application status changes and interview invitations, availability changes, bookings, rescheduling, and cancellation. Notifications are written only after the respective database operation succeeds; unchanged operations update/dedupe the existing interview notification.
- Application status notifications include applicant-visible reasons only. Interview notification metadata includes schedule details and joining instructions for the Applicant; internal employer notes are never included.

Example request: `GET /api/notifications?per_page=15`

```json
{
  "data": [
    {
      "id": "notification-uuid",
      "event": "interview_scheduled",
      "title": "Interview scheduled",
      "message": "An interview has been scheduled for your application.",
      "metadata": {
        "application_id": 12,
        "interview_id": 8,
        "scheduled_at": "2026-11-02T09:00:00Z",
        "mode": "online"
      },
      "read_at": null,
      "created_at": "2026-10-23T10:00:00Z"
    }
  ],
  "links": {},
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

Applicant identity submissions require a readable JPG, JPEG, PNG, or WebP selfie image (5 MB maximum) showing the applicant's face with their own valid ID in the same photo. Files are stored privately, never returned in general API responses, and streamed to admins only through the authorized review endpoint. Approval remains a manual admin decision and is rejected if the required image is missing. Reviewed documents are deleted after `IDENTITY_DOCUMENT_RETENTION_DAYS` (730 by default); rejected documents can be replaced on resubmission. The scheduler must run for automatic retention cleanup:

```sh
php artisan schedule:work
```

The `app:prune-identity-documents` command can also be run directly.

The `applicant.eligible` middleware checks active applicant status, verified email, and whether the applicant has ever been hired. The application route also checks listing status and application-specific requirements in the submission transaction. Job browsing routes remain public.

## Core business API additions

- Role-specific dashboard summaries are available at `GET /api/admin/dashboard`, `GET /api/employer/dashboard`, and `GET /api/applicant/dashboard`. Counts are calculated from persisted users, listings, verifications, and applications.
- Admins can view and update users through `GET|PUT /api/admin/users/{id}`. Updates are audited; changing an email clears its verification timestamp, and changing a user's email or role revokes their tokens. Admins cannot change their own role.
- Admin verification review includes applicant detail at `GET /api/admin/identity-verifications/{id}` and company details/documents at `GET /api/admin/company-verifications/{id}` and `GET /api/admin/company-verifications/{id}/documents/{documentId}`. Review decisions are audited and company verification reviews are limited to pending submissions.
- Employer listing queries support `status`, `listing_type`, `keyword`, `location`, `page`, and `per_page`, always scoped to the authenticated employer's company.
- Existing application endpoints enforce applicant ownership, employer listing ownership, unique submissions, eligibility, and valid employer status transitions. Public listing search and pagination remain available through `GET /api/jobs`.

## Tests

```sh
docker compose exec -T backend php artisan test
```

The PHPUnit configuration forces the test environment and an in-memory SQLite database, so this command does not use or refresh the local MySQL database.
