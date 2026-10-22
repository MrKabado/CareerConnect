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
