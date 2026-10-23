# CareerConnect backend

Laravel 12 JSON API using MySQL and Sanctum bearer tokens. Public registration supports applicants and employers; administrator accounts are provisioned only by the explicit admin seeder.

## Local setup

1. Copy `.env.example` to `.env` and set unique `APP_KEY`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` values. Keep `.env` out of version control.
2. Generate the app key with `php artisan key:generate`.
3. Start the backend and MySQL with `docker compose up --build`.
4. For local non-Docker development, configure `DB_HOST=127.0.0.1` and run `php artisan migrate`.
5. To create the initial administrator, set `ADMIN_SEED_NAME`, `ADMIN_SEED_EMAIL`, and a strong `ADMIN_SEED_PASSWORD` in `.env`, then run `php artisan db:seed --class=AdminUserSeeder`.
6. Set `FRONTEND_URL` in `backend/.env` and `VITE_API_BASE_URL` in `frontend/.env` to the browser-accessible frontend/API origins.

The example environment uses Laravel's `log` mailer. Configure `MAIL_MAILER` and the related `MAIL_*` values to deliver verification and password-reset codes by email.

The API uses `Authorization: Bearer <token>` and JSON responses. Sensitive endpoints (login, registration, OTP, and password reset) are rate limited. Email codes are hashed at rest, expire after ten minutes, and are deleted after use.

## Phase 1 API

- `POST /api/register/applicant`, `POST /api/register/employer` (the compatibility `POST /api/register` is also available)
- `POST /api/login`, `POST /api/logout`, `GET /api/user`
- `POST /api/otp/request`, `POST /api/otp/verify`
- `POST /api/forgot-password`, `POST /api/reset-password`, `PUT /api/change-password`
- `GET|POST /api/applicant/identity-verification`
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

- Applicants manage resume metadata and private files through `GET|POST|DELETE /api/applicant/resume`; `GET /api/applicant/resume/download` streams the current resume after authentication. Uploads accept validated PDF and DOCX files up to `RESUME_MAX_SIZE_KB` (5120 by default) and use Laravel's private `local` disk.
- Apply with `POST /api/jobs/{jobListing}/applications`. Applications require an active applicant with verified email and identity, an open eligible listing, matching seeker preferences, required OJT details for OJT listings, and a current resume. Optional cover letters are text, up to 10,000 characters.
- Applicant history is available from `GET /api/applicant/applications` and `GET /api/applicant/applications/{application}`. Status history and the resume snapshot for an owned application are available through `GET /api/applicant/applications/{application}/status-history` and `GET /api/applicant/applications/{application}/resume`.
- Employers review only applications to their own listings through `GET /api/employer/applications`, `GET /api/employer/applications/{application}`, and `PATCH /api/employer/applications/{application}/status`. The associated submitted resume is streamed securely from `GET /api/employer/applications/{application}/resume`.
- Application statuses are `pending`, `reviewing`, `shortlisted`, `interview`, `hired`, and `rejected`. Transitions are recorded with separate applicant-visible and internal reasons; `hired` and `rejected` are terminal. Unique application constraints prevent duplicate submissions, and historical resume versions remain attached to their submitted applications.

## Phase 6 interview scheduling

- Employers schedule interviews for shortlisted applications through `POST /api/employer/applications/{application}/interviews`; the application moves to `interview` in the same transaction. The single interview record per application uses UTC timestamps and stores the supplied IANA timezone for display.
- Interview modes are `onsite`, `online`, and `phone`. Onsite interviews require a location; online interviews require a meeting URL or joining instructions. The schedule includes optional end time, applicant-facing notes, and private employer notes.
- Employers can list and view interviews, reschedule scheduled interviews with `PUT /api/employer/interviews/{interview}`, cancel them with `POST /api/employer/interviews/{interview}/cancel`, and mark past interviews completed with `PATCH /api/employer/interviews/{interview}/status`. Rescheduling and cancellation events preserve schedule history. Cancelled interviews cannot be reopened or rescheduled; a cancellation leaves the application in `interview`.
- Applicants retrieve their own interviews through `GET /api/applicant/interviews`, with `filter=upcoming|past|cancelled`, or the `/upcoming` and `/past` shortcuts. Applicant responses include only applicant-facing notes and hide internal employer notes.

## Phase 7 notifications

- Notifications use Laravel's database notification table and are scoped to the authenticated recipient: `GET /api/notifications?per_page=15`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/{notification}/read`, and `PATCH /api/notifications/read-all`.
- Notification list responses contain `data` items with `id`, `event`, `title`, `message`, `metadata`, `read_at`, and `created_at`, plus pagination links and metadata. Unread count returns `{"count": 2}`; marking all read returns the number updated.
- Employers are notified after an application is submitted to their listing. Applicants receive notifications for meaningful application status changes and interview scheduling, rescheduling, and cancellation. Notifications are written only after the respective database operation succeeds; unchanged transitions and repeated cancellation/reschedule requests do not create duplicates.
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

Identity documents are stored on Laravel's private local disk, never returned in general API responses, and streamed only through an authorized endpoint. Reviewed documents are deleted after `IDENTITY_DOCUMENT_RETENTION_DAYS` (730 by default); rejected documents are replaced on resubmission. The scheduler must run for automatic retention cleanup:

```sh
php artisan schedule:work
```

The `app:prune-identity-documents` command can also be run directly.

The `applicant.eligible` middleware is the authorization foundation for Phase 2 application submission. Attach it to application-creation routes; it returns `403` unless the account is an active applicant with verified email and approved identity verification. Job browsing routes should remain public.

For future application submission, attach `listing.accepting-applications` alongside `applicant.eligible`; it rejects closed, deactivated, unpublished, or otherwise ineligible listings at submission time. The application workflow itself is not part of Phase 3.

## Tests

```sh
php artisan test
```
