# CareerConnect — Backend Specification

Job portal and applicant tracking system (ATS) that connects **job seekers** and **OJT (on-the-job training) seekers** with verified employers, and recommends listings based on preferences collected during onboarding.

**Stack:** React + TypeScript · Laravel 12 (REST API) · MySQL 8.4 · Docker Compose

> This README is the working specification for building the backend. It consolidates the project proposal, the features document, and the Figma prompts for seeker onboarding, flexible seeker types, and employer registration. Where it disagrees with the earlier system design draft, **this document wins**.

## Contents

1. [Overview](#1-overview)
2. [Core concepts](#2-core-concepts)
3. [Features](#3-features)
4. [User flows](#4-user-flows)
5. [Business rules](#5-business-rules)
6. [Database schema](#6-database-schema)
7. [Recommendation algorithm](#7-recommendation-algorithm)
8. [REST API](#8-rest-api)
9. [Authentication, authorization and files](#9-authentication-authorization-and-files)
10. [Notifications](#10-notifications)
11. [Backend structure](#11-backend-structure)
12. [Docker and environment](#12-docker-and-environment)
13. [Build order](#13-build-order)
14. [Open decisions](#14-open-decisions)

---

## 1. Overview

Employers register a company, submit verification documents, and, once an admin approves them, post **job** or **OJT** listings. Applicants choose what they are looking for during onboarding (jobs, OJT, or both), state their preferences, and get a ranked "For You" feed. They apply with a resume and an optional cover letter, then track the application through a hiring pipeline. Admins verify employers, manage users and categories, and monitor platform activity.

```
Browser
 ├── http://localhost:5173  →  React + TypeScript (Vite dev server)
 └── http://localhost:8000  →  Nginx → PHP-FPM (Laravel API) → MySQL (Docker-internal)
```

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite), a separate app that calls the API from the browser |
| Backend | Laravel 12 on PHP 8.4, JSON REST API under `/api` |
| Auth | Laravel Sanctum personal access tokens (`Authorization: Bearer`) |
| Database | MySQL 8.4 |
| Files | Laravel filesystem: private disk for documents, public disk for logos and photos |
| Infrastructure | Docker Compose: `app`, `web`, `db`, `frontend`, and `phpmyadmin` (tools file) |

The browser calls the API directly, so the API base URL in React is `http://localhost:8000/api`, never a Docker service name.

---

## 2. Core concepts

### 2.1 Roles

| Role | How it is created | Purpose |
|---|---|---|
| `applicant` | Public registration (onboarding) | Looks for jobs and/or OJT |
| `employer` | Public registration (employer flow) | Posts listings once the company is verified |
| `admin` | **Seeded only**, never self-registered | Verifies employers; manages users, categories, listings; sees reports |

### 2.2 Seeker types are flags, not roles

Every seeker has the `applicant` role. Two independent booleans on the applicant profile describe what they are looking for right now:

- `looking_for_jobs`
- `looking_for_ojt`

A user can have either or both turned on, but never both off. OJT-specific information (school, course, required hours) lives in its own table, which stays empty until the student fills it in. Turning a flag off hides that type; it never deletes saved answers. A student who finishes their OJT hours uses an "I've finished my OJT" action that turns OJT off and jobs on.

### 2.3 Listing types

Employers publish two kinds of listing. Both live in the `job_listings` table and are told apart by `listing_type`:

- `job`: has an employment type and a salary range.
- `ojt`: has hours offered, allowance, slots, accepted courses, and a MOA flag (stored in `ojt_listing_details`).

### 2.4 Enum reference

Store enums as strings and back them with PHP enums.

| Enum | Values |
|---|---|
| UserRole | `admin`, `employer`, `applicant` |
| ListingType | `job`, `ojt` |
| ListingStatus | `draft`, `open`, `closed` |
| WorkSetup | `onsite`, `hybrid`, `remote` |
| EmploymentType | `full_time`, `part_time`, `contract` |
| ApplicationStatus | `applied`, `under_review`, `shortlisted`, `interview_scheduled`, `hired`, `rejected` |
| InterviewMode | `onsite`, `video`, `phone` |
| InterviewStatus | `scheduled`, `completed`, `cancelled` |
| VerificationStatus | `draft`, `pending`, `approved`, `rejected` |
| DocumentType | `business_registration`, `business_permit`, `supporting` |
| RejectionReason | `document_unreadable`, `name_mismatch`, `expired_permit`, `other` |
| ExperienceLevel | `fresh_graduate`, `1_3_years`, `3_5_years`, `5_plus_years` |
| AllowancePreference | `paid_only`, `unpaid_ok`, `no_preference` |
| AllowanceType | `paid`, `unpaid` |
| CompanySize | `1-10`, `11-50`, `51-200`, `201-500`, `500+` |
| MatchTier | `strong`, `good`, `fair` |

> **Status naming:** this spec uses **`hired`** as the positive end state, matching the features document. The earlier design draft and slide deck say "accepted".

---

## 3. Features

**Priority:** *Core* = in the features document's core list. *Optional* = in its optional list. *Added* = introduced afterwards (onboarding, OJT, flexible seeker types, recommendations) and needs your confirmation as capstone scope.

### Applicant

| Feature | Priority | Notes |
|---|---|---|
| Register, log in/out, forgot password, email verification | Core | Authentication |
| Onboarding: choose Job, OJT, or both; interests, skills, work preferences; save and finish later | Added | §4.1 |
| Edit preferences, toggle seeker types, "I've finished my OJT" | Added | §4.2 |
| Profile: personal info and photo | Core | |
| Resume upload (PDF/DOCX) and optional cover letter | Core | |
| Browse, search and filter listings (keyword, category, location, listing type, employment type, work setup, salary) | Core | |
| Personalized "For You" feed with match score and reasons | Added | §7 |
| Apply, view own applications, track status | Core | |
| View interview schedule | Core | |
| In-app notifications with unread count | Core | §10 |
| Save listings | Optional | |
| Withdraw an application | Optional | |
| Education, work experience, certifications | Optional | In the features document, but not in its core list |

### Employer

| Feature | Priority | Notes |
|---|---|---|
| Register a company account and submit verification documents | Core | §4.3 |
| Track verification status; fix and resubmit after a rejection | Core | |
| Company profile and logo | Core | |
| Post, edit, open/close, and delete **job** listings | Core | |
| Post **OJT** listings (hours, allowance, slots, accepted courses, MOA) | Added | |
| Review applicants and download resumes | Core | |
| Move applicants through the pipeline | Core | §4.6 |
| Schedule, reschedule, and cancel interviews; add notes | Core | |
| Dashboard summary (active listings, applicants, open positions, hired) | Core | |

### Admin

| Feature | Priority | Notes |
|---|---|---|
| Verify employers (approve, or reject with a reason) | Core | §4.4 |
| Manage users: activate/deactivate, trigger a password reset | Core | |
| Manage categories (create, edit, deactivate) | Core | Listings, companies, and onboarding all depend on them |
| View, deactivate, and remove listings | Core | |
| Approve listings before they go live | Optional | Not specified here; verified employers publish directly |
| Reports: totals, most applied listings, hiring statistics | Core | |
| Dashboard charts | Optional | |
| Activity logs, login history, audit trail | Optional | |

### System

| Feature | Priority | Notes |
|---|---|---|
| In-app (database) notifications | Core | |
| Email notifications | Optional | |
| Resume skill extraction | Added | Stretch goal, see open decision 6 |

---

## 4. User flows

### 4.1 Applicant onboarding

Step keys are stored in `applicant_profiles.onboarding_step` (the last completed step).

| Step key | Applies to | Data | Endpoint |
|---|---|---|---|
| `type` | all | `looking_for_jobs`, `looking_for_ojt` (at least one) | Held in the client, sent with `account` |
| `account` | all | name, email, password, confirmation, terms | `POST /api/register`: creates the user and applicant profile, returns a token |
| `interests` | all | up to 5 `category_ids`, `skills` (names) | `PATCH /api/applicant/profile` |
| `work` | all | `work_setups`, `preferred_locations` | `PATCH /api/applicant/profile` |
| `job_details` | jobs on | up to 3 `desired_titles`, `experience_level`, `employment_types`, `salary_min`, `salary_max` | `PATCH /api/applicant/profile` |
| `ojt_details` | OJT on | school, course, year level, required hours, preferred start date, allowance preference, requires MOA | `PUT /api/applicant/ojt-details` |
| `resume` | all, optional | PDF/DOCX file | `POST /api/resumes` |
| `review` | all | none | `POST /api/applicant/onboarding/complete` |

Behaviour:

- The account is created at the end of `account`. After that, every step saves immediately, so "Save & finish later" needs no extra endpoint. The client resumes from `onboarding_step`.
- Only `type` and `account` are required. Every later step can be skipped. Completing onboarding sets `onboarding_completed_at`.
- The progress bar shows 7 steps for one seeker type and 8 when both are on (`job_details` and `ojt_details` both appear).
- Preferences stay editable afterwards through the same endpoints.

### 4.2 Switching seeker types

- Toggle `looking_for_jobs` or `looking_for_ojt` with `PATCH /api/applicant/profile`. The server rejects any request that would leave both false.
- Enabling a type without its data is allowed. The user can browse that type but sees no match score, and cannot apply to OJT listings until OJT details exist (R6).
- `POST /api/applicant/finish-ojt` sets `looking_for_ojt = false` and `looking_for_jobs = true`.
- Turning a type off keeps its saved answers.

### 4.3 Employer registration and verification

| Step | Data | Endpoint |
|---|---|---|
| 1 Account | name, position, email, phone (+63), password, terms | `POST /api/register` with `role = employer`: creates the user and employer profile, sends the verification email, returns a token |
| 2 Company | company name, industry (`category_id`), size, address, city, website, description | `PUT /api/employer/company` |
| 2b Logo (optional) | image | `POST /api/employer/company/logo` |
| 3 Hiring | `hires_jobs`, `hires_ojt` (at least one), `open_to_moa`, `accepted_courses` | `PUT /api/employer/company` |
| 4 Documents | business registration (DTI or SEC) and business/Mayor's permit, both required; one supporting document, optional | `POST /api/employer/verification/documents` (one file per call) |
| 5 Review and submit | `authorization_confirmed = true` | `POST /api/employer/verification/submit` |

Verification lifecycle:

```
draft ──submit──▶ pending ──approve──▶ approved      (company.is_verified = true)
                     │
                     └──reject (reason required)──▶ rejected ──resubmit──▶ new draft ──▶ pending …
```

- Uploaded documents attach to the employer's current `draft` verification. Submitting moves it to `pending`.
- Every resubmission creates a **new** `company_verifications` row and copies the previous documents into it, so the employer replaces only the flagged ones and the history stays intact.
- An employer may submit before verifying their email, but the admin queue only shows submissions from users with `email_verified_at` set (R14).
- Registration progress is **derived**, not stored: step 2 is done when the company has a name, step 3 when `hires_jobs` or `hires_ojt` is true, step 4 when the draft holds both required documents, step 5 when a verification exists with status other than `draft`. `GET /api/employer/registration` returns the current step and a checklist, which drives "Finish setting up your company" and the status tracker (account created → email verified → documents submitted → under admin review → verified).

### 4.4 Admin review

1. The queue lists verifications by status (Pending, Approved, Rejected) with search. Rows flag resubmissions (`is_resubmission`).
2. The reviewer opens a submission, previews each document, and decides.
3. **Approve:** status `approved`, `reviewed_by` and `reviewed_at` set, `companies.is_verified = true`, `verified_at` set. The employer is notified.
4. **Reject:** `rejection_reason` (a code) is required and `rejection_note` is optional and shown to the employer. The employer is notified.
5. Both decisions are written to the activity log. The review screen shows the company's full decision history.

### 4.5 Posting a listing

Only an employer whose company is verified can create listings (R8). The form has a Job | OJT toggle.

- Both types: title, `category_id`, skills, `work_setup`, location, description, requirements.
- `job` adds `employment_type`, `salary_min`, `salary_max`.
- `ojt` adds `duration_hours`, `allowance_type` (plus `allowance_amount` when paid), `slots`, `accepted_courses`, `moa_accepted`.

Listing `status` moves `draft` → `open` → `closed`. Activate/deactivate toggles `open` and `closed`. Admins can force a listing to `closed` or remove it (soft delete).

### 4.6 Applying and the hiring pipeline

1. The applicant applies to an `open` listing with a resume and an optional cover letter. The application starts as `applied`, and the employer is notified.
2. The employer moves the application through the pipeline. Every change notifies the applicant.

| From | Allowed next status |
|---|---|
| `applied` | `under_review`, `rejected` |
| `under_review` | `shortlisted`, `rejected` |
| `shortlisted` | `interview_scheduled`, `rejected` |
| `interview_scheduled` | `hired`, `rejected` |
| `hired`, `rejected` | none (final) |

- `interview_scheduled` is only reachable by scheduling an interview (`POST /api/applications/{id}/interview`), which is allowed from `shortlisted`.
- Rescheduling updates the same interview row. Cancelling sets the interview's status to `cancelled`; the application stays `interview_scheduled` until the employer reschedules or rejects.
- A completed interview does not change the application status. The employer then moves it to `hired` or `rejected`.

---

## 5. Business rules

Enforce these on the server. The UI only mirrors them. Write one feature test per rule.

| ID | Rule | Failure |
|---|---|---|
| R1 | Registration accepts only `applicant` or `employer`. Admins come from a seeder using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment. | 422 |
| R2 | `looking_for_jobs` or `looking_for_ojt` must be true at all times. | 422 |
| R3 | At most 5 interest categories and 3 desired titles per applicant. | 422 |
| R4 | One application per applicant per listing. | 409 `already_applied` |
| R5 | Applications go only to `open`, non-deleted listings whose company is verified. | 422 `listing_not_open` |
| R6 | Applying to an `ojt` listing requires an `applicant_ojt_details` row. | 422 `ojt_details_required` |
| R7 | A course not on a listing's `accepted_courses` never blocks an application; it only lowers the match score. | none |
| R8 | Creating a listing requires a verified company (latest verification `approved`). | 403 `company_not_verified` |
| R9 | Employers read and change only their own listings and the applications to them. | 403 |
| R10 | Status changes follow the transition table in §4.6. | 422 `invalid_status_transition` |
| R11 | Resumes and cover letters are visible to the owner and to employers who received an application containing them. Verification documents are visible to admins and the owning employer. Nothing private is served from a public URL. | 403 |
| R12 | A category in use cannot be deleted; set `is_active = false` instead. Inactive categories leave selection lists but remain on existing records. | 409 `category_in_use` |
| R13 | Deactivated users (`is_active = false`) cannot authenticate, and their tokens are revoked. | 403 `account_deactivated` |
| R14 | The admin queue includes only verifications whose employer has a verified email. | none |
| R15 | Rejection requires a `rejection_reason`. Submissions, approvals, and rejections are never overwritten. | 422 |
| R16 | `job` listings require `employment_type`. `ojt` listings require `duration_hours`, `allowance_type`, `slots`, and `allowance_amount` when paid. `salary_max` is not below `salary_min`. | 422 |
| R17 | An application needs a resume: an existing `resume_id` owned by the applicant, or an upload in the same request. | 422 |
| R18 | File limits: resumes, cover letters, and verification documents up to 5 MB; verification documents PDF/JPG/PNG; resumes and cover letters PDF/DOCX; logos and photos JPG/PNG/WEBP up to 2 MB. | 422 |
| R19 | A resume referenced by an application cannot be deleted. | 409 `resume_in_use` |

---

## 6. Database schema

```
users ─┬─ applicant_profiles ─┬─ applicant_ojt_details
       │                      ├─ applicant_profile_category ── categories
       │                      ├─ applicant_profile_skill ───── skills
       │                      └─ educations / experiences / certifications (optional)
       ├─ employer_profiles
       ├─ companies ─┬─ company_verifications ── verification_documents
       │             └─ job_listings ─┬─ ojt_listing_details
       │                              ├─ job_listing_skill ── skills
       │                              └─ applications ── interviews
       ├─ resumes   (referenced by applications)
       ├─ saved_listings   (optional)
       ├─ notifications    (Laravel built-in)
       └─ activity_logs
```

> **Naming conflict:** Laravel's default migrations already create a table called `jobs` (the database queue, because `.env` has `QUEUE_CONNECTION=database`). Job and OJT listings therefore use **`job_listings`** (model `JobListing`) and the foreign key `job_listing_id`. Public URLs can still say `/api/jobs`.

Conventions: `id` is an auto-increment bigint primary key and every table has `created_at` and `updated_at` unless noted. Money is PHP, per month. Foreign keys are real constraints: `cascadeOnDelete` for profile rows owned by a user, `restrictOnDelete` for categories and resumes, `nullOnDelete` for `activity_logs.user_id`.

### users

Extends Laravel's default table. Add the new columns in a new migration (or edit the default one and run `migrate:fresh` while still in development).

| Column | Type | Notes |
|---|---|---|
| name | string(255) | |
| email | string(255), unique | |
| password | string | Hashed |
| role | string(20), indexed | UserRole |
| is_active | boolean, default true | Admin can deactivate |
| email_verified_at | timestamp, null | Laravel default |
| terms_accepted_at | timestamp, null | Consent record |

### applicant_profiles

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users, unique | |
| phone | string(30), null | |
| city | string(100), null | |
| profile_photo_path | string, null | Public disk |
| looking_for_jobs | boolean, default false | See §2.2 |
| looking_for_ojt | boolean, default false | See §2.2 |
| experience_level | string, null | ExperienceLevel |
| desired_titles | json, null | Up to 3 strings |
| employment_types | json, null | EmploymentType values |
| work_setups | json, null | WorkSetup values |
| preferred_locations | json, null | Strings |
| salary_min, salary_max | unsigned int, null | PHP per month |
| onboarding_step | string(20), null | Last completed step key |
| onboarding_completed_at | timestamp, null | |

### applicant_ojt_details

One row per student, created only when they fill in OJT information.

| Column | Type | Notes |
|---|---|---|
| applicant_profile_id | FK → applicant_profiles, unique | |
| school | string(255) | |
| course | string(255) | |
| year_level | unsigned tinyint | 1 to 6 |
| required_hours | unsigned smallint | Hours the school requires |
| preferred_start_date | date, null | |
| allowance_preference | string, default `no_preference` | AllowancePreference |
| requires_moa | boolean, default false | School needs a MOA with the company |

### Pivots

| Table | Columns | Notes |
|---|---|---|
| applicant_profile_category | applicant_profile_id, category_id | Unique pair; maximum 5 per applicant (validation) |
| applicant_profile_skill | applicant_profile_id, skill_id | Unique pair |
| job_listing_skill | job_listing_id, skill_id | Unique pair |

### Profile extras (optional)

| Table | Columns |
|---|---|
| applicant_educations | applicant_profile_id, school, degree_course, start_year, end_year (null) |
| applicant_experiences | applicant_profile_id, company, title, start_date, end_date (null), description (null) |
| applicant_certifications | applicant_profile_id, name, issuer (null), issued_on (null) |

### employer_profiles

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users, unique | |
| position | string(100) | For example HR Manager |
| phone | string(30) | |

### categories

One list drives job categories, company industries, and applicant interests. Admins manage it.

| Column | Type | Notes |
|---|---|---|
| name | string(100), unique | |
| is_active | boolean, default true | R12 |

### skills

| Column | Type | Notes |
|---|---|---|
| name | string(60), unique | Trim and normalize before saving. Created on the fly from tag inputs. |

### companies

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users, unique | One company per employer account in v1 |
| name | string(255) | |
| category_id | FK → categories, null | Industry |
| size | string(10), null | CompanySize |
| address | string(255), null | |
| city | string(100), null | |
| website | string, null | |
| description | text, null | |
| logo_path | string, null | Public disk |
| hires_jobs | boolean, default false | |
| hires_ojt | boolean, default false | |
| open_to_moa | boolean, default false | Default for new OJT listings |
| accepted_courses | json, null | Default for new OJT listings |
| is_verified | boolean, default false | **Cached flag**, true only after an approval |
| verified_at | timestamp, null | |

### company_verifications

| Column | Type | Notes |
|---|---|---|
| company_id | FK → companies | Index on (company_id, status) |
| status | string(20), default `draft` | VerificationStatus |
| authorization_confirmed_at | timestamp, null | Employer's confirmation checkbox |
| submitted_at | timestamp, null | |
| reviewed_by | FK → users, null | Admin |
| reviewed_at | timestamp, null | |
| rejection_reason | string(30), null | RejectionReason |
| rejection_note | text, null | Shown to the employer |

### verification_documents

| Column | Type | Notes |
|---|---|---|
| company_verification_id | FK → company_verifications, cascade | |
| type | string(30) | DocumentType |
| file_path | string | Private disk |
| original_filename | string | |
| mime_type | string(100) | |
| size_bytes | unsigned int | |

### job_listings

| Column | Type | Notes |
|---|---|---|
| company_id | FK → companies | |
| category_id | FK → categories | |
| listing_type | string(10) | ListingType |
| title | string(255) | |
| description | text | |
| requirements | text | |
| location | string(255) | |
| work_setup | string(10) | WorkSetup |
| employment_type | string(20), null | `job` listings only |
| salary_min, salary_max | unsigned int, null | `job` listings only |
| status | string(10), default `draft` | ListingStatus |
| deleted_at | timestamp, null | Soft delete, so applications keep their history |

Indexes: `(status, listing_type)`, `category_id`, `company_id`.

### ojt_listing_details

One row per `ojt` listing.

| Column | Type | Notes |
|---|---|---|
| job_listing_id | FK → job_listings, unique | |
| duration_hours | unsigned smallint | Hours the company can host |
| allowance_type | string(10) | AllowanceType |
| allowance_amount | unsigned int, null | Required when `paid` |
| slots | unsigned smallint | |
| accepted_courses | json, null | Empty means any course |
| moa_accepted | boolean, default false | |

`available_slots` is computed: `slots` minus the number of `hired` applications for the listing (minimum 0).

### resumes

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users | |
| file_path | string | Private disk |
| original_filename | string | |
| mime_type | string(100) | |
| size_bytes | unsigned int | |

### applications

| Column | Type | Notes |
|---|---|---|
| job_listing_id | FK → job_listings | |
| applicant_id | FK → users | |
| resume_id | FK → resumes, restrict | |
| cover_letter_path | string, null | Private disk |
| status | string(25), default `applied` | ApplicationStatus; indexed |
| applied_at | timestamp | |
| withdrawn_at | timestamp, null | Optional feature |

Unique constraint on `(job_listing_id, applicant_id)`.

### interviews

| Column | Type | Notes |
|---|---|---|
| application_id | FK → applications, unique | One interview per application |
| scheduled_at | datetime | |
| mode | string(10) | InterviewMode |
| status | string(15), default `scheduled` | InterviewStatus |
| notes | text, null | |

### saved_listings (optional)

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users | |
| job_listing_id | FK → job_listings | Unique pair with `user_id` |

### notifications

Use Laravel's built-in table (`php artisan make:notifications-table`): uuid `id`, `type`, `notifiable_type`, `notifiable_id`, `data` (json), `read_at`. See §10.

### activity_logs

| Column | Type | Notes |
|---|---|---|
| user_id | FK → users, null | Null for system actions |
| action | string(60) | For example `auth.login`, `verification.approved` |
| ip_address | string(45), null | |
| user_agent | string(255), null | |
| meta | json, null | Context such as record ids |
| created_at | timestamp | No `updated_at`; index on `(action, created_at)` |

Login history is the `auth.login` rows of this table.

### Tables Laravel already provides

`password_reset_tokens`, `sessions`, `cache`, `jobs`, `job_batches`, `failed_jobs`, and `personal_access_tokens` (added by `install:api`).

---

## 7. Recommendation algorithm

A rule-based weighted score, with no machine learning. It compares what the applicant said they want against the same fields on each listing, and works the same way for both listing types.

**Flow**

1. Query candidates in SQL: `open`, not deleted, company verified, `listing_type` matching the requested type. Cap the pool at the newest 500.
2. Score each candidate with `MatchScorer`.
3. Drop scores below the minimum, sort by score descending (ties: newest first), paginate.
4. Return each listing with a `match` object.

### Weights

**Job listings** (the applicant needs `looking_for_jobs`)

| Component | Weight | Full credit when |
|---|---|---|
| Category | 25 | Listing category is one of the applicant's interests |
| Skills | 25 | Proportional: matched listing skills ÷ listing skills |
| Desired title | 15 | A desired title shares a keyword or phrase with the listing title (case-insensitive) |
| Work setup | 10 | Listing `work_setup` is in the applicant's `work_setups` |
| Location | 10 | Listing is remote, or its location contains a preferred location (case-insensitive) |
| Employment type | 5 | Listing `employment_type` is in the applicant's `employment_types` |
| Salary | 10 | Listing range and applicant range overlap |

**OJT listings** (the applicant needs `looking_for_ojt` and an `applicant_ojt_details` row)

| Component | Weight | Full credit when |
|---|---|---|
| Category (training field) | 25 | Listing category is one of the applicant's interests |
| Skills | 15 | Proportional, as above |
| Course | 15 | `accepted_courses` is empty, or contains the student's course (normalized) |
| MOA | 10 | The school does not require a MOA, or the listing has `moa_accepted` |
| Hours | 10 | `duration_hours` is at least `required_hours`; otherwise proportional |
| Work setup | 10 | As above |
| Location | 10 | As above |
| Allowance | 5 | Preference is `paid_only` and the listing is paid, or the preference is anything else |

### Scoring

- `score = round(earned ÷ possible × 100)`, where *possible* is the sum of the weights of components that can be evaluated (both the applicant's value and the listing's value exist). Components that cannot be evaluated are skipped, so a partly filled profile is not punished for blanks.
- If *possible* is below 40, there is not enough information: `score = null` and `unavailable = "profile_incomplete"`.
- **Tiers:** `strong` at 75 or more, `good` at 50 to 74, `fair` at 30 to 49. Below 30 a listing is left out of the Recommended feed (it still appears under All listings).
- **Reasons:** for each component that earned credit from a value the applicant supplied, build a short string. Return the top 3 by weight. Examples: `Interest: Information Technology`, `Skills in common: React, JavaScript`, `Work setup: Hybrid`, `Location: Cebu City`, `Course accepted: BSIT`. Never produce a reason for a field the applicant left blank.
- Keep weights, tier thresholds, the minimum score, and the 40-point guard in `config/matching.php`.

### The `match` object

```json
{ "score": 82, "tier": "strong", "reasons": ["Interest: Information Technology", "Skills in common: React, JavaScript", "Work setup: Hybrid"], "unavailable": null }
```

`unavailable` is `null`, `type_not_enabled`, `ojt_details_missing`, or `profile_incomplete`. When it is not null, `score` and `tier` are null and `reasons` is empty; the frontend shows a prompt such as "Add your OJT details to see your match".

### Not scored

`experience_level` and `preferred_start_date` are stored and shown to employers, but listings have no matching field, so they cannot be compared. Add `experience_level` or a start date to listings if you want them scored.

### Performance

Compute on demand: for the returned page on search, and for the candidate pool on recommendations. Eager-load category, skills, and company to avoid N+1 queries. If it gets slow, cache per applicant (key includes the profile's `updated_at`) or add a `listing_matches` table refreshed when a profile or listing changes. Unit-test `MatchScorer` with fixed fixtures: a full match, an empty profile, and an OJT listing with a MOA mismatch.

---

## 8. REST API

### 8.1 Conventions

- Base path `/api`. JSON in and out; send `Accept: application/json`.
- Authenticated routes need `Authorization: Bearer {token}`.
- Lists are paginated with `?page=` and `?per_page=` (default 15, maximum 50) and return Laravel's `data`, `links`, and `meta`.
- Validation errors: `422` with `{ "message": "...", "errors": { "field": ["..."] } }`.
- Business-rule errors: `{ "message": "...", "code": "snake_case_code" }`.
- Return API Resources, never raw Eloquent models. Dates are ISO 8601 in UTC.
- Authenticated applicants also receive `is_saved` and `match` on listings.

| Code | HTTP | Meaning |
|---|---|---|
| `ojt_details_required` | 422 | Applying to OJT without OJT details (R6) |
| `listing_not_open` | 422 | Listing is closed, a draft, removed, or its company is unverified (R5) |
| `already_applied` | 409 | Duplicate application (R4) |
| `company_not_verified` | 403 | Creating a listing before approval (R8) |
| `invalid_status_transition` | 422 | Pipeline move not allowed (R10) |
| `account_deactivated` | 403 | Deactivated user (R13) |
| `category_in_use` | 409 | Deleting a category that is referenced (R12) |
| `resume_in_use` | 409 | Deleting a resume attached to an application (R19) |
| `seeker_type_disabled` | 422 | Recommendations requested for a type that is turned off |

### 8.2 Endpoints

**Authentication and account**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | Public | `role` is `applicant` or `employer` |
| POST | `/login` | Public | Returns a token |
| POST | `/logout` | Auth | Deletes the current token |
| GET | `/user` | Auth | Current user, role, flags, onboarding step, and for employers the verification status |
| POST | `/email/verification-notification` | Auth | Resend the verification email |
| GET | `/email/verify/{id}/{hash}` | Signed link | Verifies, then redirects to `FRONTEND_URL` |
| POST | `/forgot-password` | Public | |
| POST | `/reset-password` | Public | |

**Reference data**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/categories` | Public | Active categories only |
| GET | `/skills?q=` | Public | Autocomplete for tag inputs |

**Applicant**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/applicant/profile` | Applicant | Full profile, preferences, OJT details, skills, categories |
| PATCH | `/applicant/profile` | Applicant | Partial update, including the seeker flags and `onboarding_step` |
| POST | `/applicant/profile/photo` | Applicant | Upload photo |
| PUT | `/applicant/ojt-details` | Applicant | Create or update OJT details |
| POST | `/applicant/onboarding/complete` | Applicant | Sets `onboarding_completed_at` |
| POST | `/applicant/finish-ojt` | Applicant | OJT off, jobs on |
| GET | `/recommendations?type=` | Applicant | `type` is `job` or `ojt`; ranked, with `match` |
| GET | `/saved-listings` | Applicant | Optional |
| POST, DELETE | `/jobs/{id}/save` | Applicant | Optional; idempotent |
| GET, POST, PUT, DELETE | `/applicant/educations`, `/applicant/experiences`, `/applicant/certifications` | Applicant | Optional profile extras |

**Resumes**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/resumes` | Applicant | Upload PDF or DOCX |
| GET | `/resumes` | Applicant | Own resumes |
| GET | `/resumes/{id}/download` | Owner, or employer with an application using it | Streams the file |
| DELETE | `/resumes/{id}` | Owner | Blocked when in use (R19) |

**Listings**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/jobs` | Public | Search and filter open listings (see 8.4) |
| GET | `/jobs/{id}` | Public | Listing detail |
| GET | `/companies/{id}` | Public | Verified companies only |
| GET | `/employer/jobs` | Employer | Own listings, filter by `status` and `listing_type` |
| POST | `/jobs` | Employer | Create (R8, R16) |
| PUT | `/jobs/{id}` | Employer, owner | Update |
| PATCH | `/jobs/{id}/status` | Employer, owner | `open` or `closed` |
| DELETE | `/jobs/{id}` | Employer, owner | Soft delete |

**Applications and interviews**

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/jobs/{id}/apply` | Applicant | Multipart: `resume_id` or `resume` file, optional `cover_letter` (R4 to R6, R17) |
| GET | `/applications` | Applicant, Employer | Applicant: own. Employer: to own listings. Filters: `status`, `listing_type`, `job_id` |
| GET | `/applications/{id}` | Owner or listing owner | Detail |
| PATCH | `/applications/{id}/status` | Employer | Pipeline move (R10); never to `interview_scheduled` |
| POST | `/applications/{id}/withdraw` | Applicant | Optional |
| GET | `/applications/{id}/cover-letter` | Owner or listing owner | Download |
| POST | `/applications/{id}/interview` | Employer | Schedule; sets `interview_scheduled` |
| PUT | `/interviews/{id}` | Employer | Reschedule, edit notes, mark `completed` or `cancelled` |
| GET | `/interviews` | Applicant, Employer | Own, upcoming first |

**Employer registration and verification**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET, PATCH | `/employer/profile` | Employer | Position and phone |
| PUT | `/employer/company` | Employer | Company details and hiring defaults |
| POST | `/employer/company/logo` | Employer | |
| GET | `/employer/registration` | Employer | Derived current step and checklist |
| GET | `/employer/verification` | Employer | Current verification and history |
| POST | `/employer/verification/documents` | Employer | Upload one document to the draft |
| DELETE | `/employer/verification/documents/{id}` | Employer | Draft documents only |
| POST | `/employer/verification/submit` | Employer | Needs both required documents and `authorization_confirmed` |
| POST | `/employer/verification/resubmit` | Employer | After a rejection: new draft with documents carried over |
| GET | `/verification-documents/{id}/download` | Admin, owning employer | Streams the file |
| GET | `/employer/dashboard` | Employer | Active listings, total applicants, open positions, hired count, recent applications |

**Notifications**

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/notifications` | Auth | Paginated; `meta.unread_count` for the bell |
| POST | `/notifications/{id}/read` | Auth | |
| POST | `/notifications/read-all` | Auth | |

**Admin** (all require `role:admin`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/verifications?status=&search=` | Queue, with `is_resubmission` per row |
| GET | `/admin/verifications/{id}` | Company, contact, documents, decision history |
| POST | `/admin/verifications/{id}/approve` | R14 and R15 apply |
| POST | `/admin/verifications/{id}/reject` | Body: `reason`, `note` |
| GET | `/admin/users?role=&status=&search=` | |
| PATCH | `/admin/users/{id}/status` | Activate or deactivate (R13) |
| POST | `/admin/users/{id}/password-reset` | Sends a reset link; admins never set passwords |
| GET | `/admin/jobs` | All listings |
| PATCH | `/admin/jobs/{id}/status` | Force `closed` |
| DELETE | `/admin/jobs/{id}` | Soft delete |
| GET, POST, PUT, DELETE | `/admin/categories`, `/admin/categories/{id}` | Delete blocked when in use (R12) |
| GET | `/admin/reports` | Totals (applicants, employers verified and pending, open listings, applications); top 10 most applied listings; hired count and hire rate (hired ÷ applications). Optional chart data: applications per month, status distribution, listings by category, active companies |
| GET | `/admin/activity-logs` | Filter by user, action, date |

### 8.3 Example payloads

Register an applicant who wants both:

```json
POST /api/register
{
  "role": "applicant",
  "name": "Maria Santos",
  "email": "maria@example.com",
  "password": "a-strong-password",
  "password_confirmation": "a-strong-password",
  "terms_accepted": true,
  "looking_for_jobs": true,
  "looking_for_ojt": true
}
```

```json
201
{
  "token": "1|xxxxxxxx",
  "user": { "id": 12, "name": "Maria Santos", "email": "maria@example.com", "role": "applicant", "email_verified": false },
  "profile": { "looking_for_jobs": true, "looking_for_ojt": true, "onboarding_step": "account", "onboarding_completed_at": null }
}
```

An employer registers with the same endpoint, adding `"role": "employer"`, `"position"`, and `"phone"`.

Save the interests and work steps:

```json
PATCH /api/applicant/profile
{
  "category_ids": [1, 4],
  "skills": ["React", "JavaScript", "Laravel"],
  "work_setups": ["hybrid", "remote"],
  "preferred_locations": ["Cebu City"],
  "onboarding_step": "work"
}
```

An OJT listing as an applicant sees it:

```json
{
  "id": 41,
  "listing_type": "ojt",
  "title": "Web Development Intern",
  "company": { "id": 7, "name": "Acme Tech", "is_verified": true },
  "category": { "id": 1, "name": "Information Technology" },
  "location": "Cebu City",
  "work_setup": "hybrid",
  "ojt": { "duration_hours": 486, "allowance_type": "paid", "allowance_amount": 3000, "slots": 3, "available_slots": 2, "accepted_courses": ["BSIT", "BSCS"], "moa_accepted": true },
  "is_saved": false,
  "match": { "score": 82, "tier": "strong", "reasons": ["Interest: Information Technology", "Skills in common: React, JavaScript", "Work setup: Hybrid"], "unavailable": null }
}
```

Applying to an OJT listing without OJT details:

```json
422
{ "message": "Add your school details to apply for OJT listings.", "code": "ojt_details_required" }
```

Reject a verification:

```json
POST /api/admin/verifications/15/reject
{ "reason": "expired_permit", "note": "The permit expired in June 2026. Please upload the renewed one." }
```

### 8.4 Query parameters for `GET /jobs`

| Parameter | Meaning |
|---|---|
| `q` | Keyword in title, company name, or description |
| `listing_type` | `job` or `ojt`; omit for both |
| `category_id` | Category |
| `location` | Location contains this text |
| `employment_type` | `job` listings |
| `work_setup` | `onsite`, `hybrid`, or `remote` |
| `salary_min`, `salary_max` | Overlaps the listing's range (`job` listings) |

Only `open`, non-deleted listings of verified companies are returned.

### 8.5 Validation reference

Write these as Form Requests.

```
register (all)        role in:applicant,employer
                      name required|string|max:255
                      email required|email|unique:users
                      password required|min:8|confirmed
                      terms_accepted accepted
register (applicant)  looking_for_jobs, looking_for_ojt boolean; at least one true
register (employer)   position required|string|max:100
                      phone required|string|max:30

PATCH applicant/profile (every field "sometimes")
                      looking_for_jobs, looking_for_ojt boolean; both false is rejected after merging
                      category_ids array|max:5, each exists in active categories
                      skills array|max:30, each string|max:60
                      desired_titles array|max:3, each string|max:100
                      experience_level in ExperienceLevel
                      employment_types, work_setups arrays of enum values
                      preferred_locations array|max:10, each string|max:100
                      salary_min integer|min:0; salary_max integer|gte:salary_min
                      onboarding_step in the step keys of §4.1

PUT applicant/ojt-details
                      school, course required|string|max:255
                      year_level required|integer|between:1,6
                      required_hours required|integer|between:1,2000
                      preferred_start_date nullable|date|after_or_equal:today
                      allowance_preference in AllowancePreference
                      requires_moa boolean

PUT employer/company  name required|string|max:255
                      category_id nullable|exists:categories,id
                      size in CompanySize
                      address max:255; city max:100; website nullable|url
                      description nullable|string|max:1000
                      hires_jobs, hires_ojt, open_to_moa boolean
                      accepted_courses array of strings
                      (step 3 requires hires_jobs or hires_ojt true)

POST jobs             listing_type, title, category_id, work_setup, location,
                      description, requirements required
                      skills array of names
                      job: employment_type required; salary_min, salary_max nullable|integer
                      ojt: duration_hours required|integer; allowance_type required;
                           allowance_amount required_if:allowance_type,paid;
                           slots required|integer|min:1; accepted_courses array;
                           moa_accepted boolean

POST jobs/{id}/apply  resume_id (owned by the user) or resume file (pdf,docx, max 5 MB) required
                      cover_letter nullable|file|mimes:pdf,docx|max:5120

POST applications/{id}/interview
                      scheduled_at required|date|after:now
                      mode in InterviewMode
                      notes nullable|string|max:1000

POST admin/verifications/{id}/reject
                      reason required|in RejectionReason
                      note nullable|string|max:500
```