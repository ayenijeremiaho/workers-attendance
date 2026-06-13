# Discovery Hub — Technical Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Module Reference](#5-module-reference)
6. [API Endpoints Quick Reference](#6-api-endpoints-quick-reference)
7. [Check-In Flow](#7-check-in-flow)
8. [Automated Absence Marking](#8-automated-absence-marking)
9. [Role & Permission Matrix](#9-role--permission-matrix)
10. [Environment Variables](#10-environment-variables)
11. [Enum Reference](#11-enum-reference)

---

## 1. System Overview

A NestJS REST API that manages church membership, service attendance, workforce scheduling, class enrolment, Sunday
School sessions, Children Church security check-in, and internal announcements for a local church.

**Core design principles:**

- Every church member has one account. Workers are members with an optional `WorkerProfile` attached.
- A single JWT login endpoint serves all member roles: MEMBER and WORKER. Admin portal access is controlled separately
  via the `admins` table.
- There are two distinct frontends: a **mobile app** for members and workers, and an **admin web portal** managed via
  the Admin RBAC system.
- Attendance is tracked per **ServiceSlot**, not per Event. One event can have multiple slots (e.g. first service,
  second service).
- Members are only ever PRESENT or ABSENT. Workers can also be LATE or ON_LEAVE.
- Absentees are marked automatically by a background cron job, not by user action.
- **Sunday School** tracks session-based attendance for permanent class assignments. Both teachers and enrolled students
  can mark attendance; self-mark requires an open window set by staff.
- **Children Church** provides a full security check-in/check-out system for 1000+ children, with per-session
  6-character pickup codes, multiple guardians per child, automatic age-group assignment by date of birth, and pickup
  email notifications to guardians.

---

## 2. Architecture

```
src/
├── auth/             Single login, JWT strategy, refresh tokens
├── member/           Universal identity: Member + WorkerProfile
├── event/            Event + ServiceSlot + EventConfig
├── venue/            Named, reusable venue entities (lat/lon)
├── attendance/       Check-in, history, leaderboard, cron job
├── department/       Departments + leads
├── request-leave/    Worker leave requests
├── classes/          ChurchClass + ClassEnrollment
├── announcement/     Announcements with audience targeting
├── birthday/         Birthday greetings, wish wall (BirthdayWish entity)
├── notes/            Pastoral notes (naming, dedication, marriage)
├── dashboard/        Aggregated dashboards per role
├── sunday-school/    Session-based SS classes, members, sessions, attendance
├── children-church/  Age groups, class groups, child profiles, guardians, check-in/out
├── admin/            Admin RBAC: AdminRole + Admin entities, AdminGuard, seed (@Global module)
└── utility/          Email queue, cache, hashing, pagination, email delivery log
```

**Stack:** NestJS · TypeORM · PostgreSQL · Redis · Bull · ioredis · Argon2 · Passport (JWT + Local) · class-validator · nestjs-schedule ·
@nestjs/throttler · Handlebars · DOMPurify

---

## 3. Data Models

### Member

The universal identity for every person in the system.

| Field                 | Type              | Notes                                                                                                     |
|-----------------------|-------------------|-----------------------------------------------------------------------------------------------------------|
| id                    | UUID              | PK                                                                                                        |
| firstname, lastname   | string            |                                                                                                           |
| email                 | string            | Unique                                                                                                    |
| password              | string            | Argon2 hashed                                                                                             |
| changedPassword       | boolean           | `false` on signup and admin password reset; set to `true` after first change                              |
| deviceId              | string \| null    | Mobile device fingerprint registered on first login; `null` until first mobile login or after admin purge |
| role                  | MemberRoleEnum    | MEMBER \| WORKER (no ADMIN role — admin access is a separate entity)                                      |
| status                | MemberStatusEnum  | ACTIVE \| INACTIVE                                                                                        |
| gender                | GenderEnum        | Optional                                                                                                  |
| dateOfBirth           | date              | Optional; used by birthday scheduler                                                                      |
| maritalStatus         | MaritalStatusEnum | Optional                                                                                                  |
| yearBornAgain         | Date              | Stored as Jan 1 of given year                                                                             |
| yearBaptized          | Date              | Optional                                                                                                  |
| baptizedWithHolyGhost | boolean           | Optional                                                                                                  |
| yearJoinedChurch      | Date              | Optional                                                                                                  |
| workerProfile         | WorkerProfile     | OneToOne, null for plain members                                                                          |
| attendances           | Attendance[]      | OneToMany                                                                                                 |
| enrollments           | ClassEnrollment[] | OneToMany                                                                                                 |

### WorkerProfile

Created when a member is promoted to WORKER. Deleted when revoked.

| Field                 | Type               | Notes                                                                                            |
|-----------------------|--------------------|--------------------------------------------------------------------------------------------------|
| id                    | UUID               | PK                                                                                               |
| member                | Member             | OneToOne                                                                                         |
| department            | Department         | ManyToOne — primary department                                                                   |
| secondaryDepartment   | Department \| null | ManyToOne, nullable — secondary department; HOD can only be assigned from the primary department |
| status                | WorkerStatusEnum   | ACTIVE \| INACTIVE                                                                               |
| profession            | string             | Optional                                                                                         |
| yearJoinedWorkforce   | Date               | Optional                                                                                         |
| completedSOD          | boolean            | School of Disciples                                                                              |
| completedBibleCollege | boolean            |                                                                                                  |

### Event

A church gathering on a specific date.

| Field            | Type             | Notes                                                 |
|------------------|------------------|-------------------------------------------------------|
| id               | UUID             | PK                                                    |
| name             | string           |                                                       |
| description      | string           | Optional                                              |
| eventDate        | Date (date only) |                                                       |
| recurringEventId | UUID             | Groups events in a recurring series                   |
| serviceSlots     | ServiceSlot[]    | OneToMany — at least one slot is required at creation |

### Venue

A named, reusable physical location. Referenced by `EventConfig.defaultVenue` and optionally overridden per slot via
`ServiceSlot.venueOverride`.

| Field     | Type   | Notes           |
|-----------|--------|-----------------|
| id        | UUID   | PK              |
| name      | string | Unique          |
| address   | string | Optional        |
| latitude  | float  | WGS84 latitude  |
| longitude | float  | WGS84 longitude |

Deleting a venue that is set as `defaultVenue` on any `EventConfig` is rejected by the DB FK constraint. Deleting a
venue that is a slot-level `venueOverride` sets that field to `null` (SET NULL).

### ServiceSlot

The actual check-in target within an event. One event can have multiple slots.

| Field             | Type        | Notes                                                             |
|-------------------|-------------|-------------------------------------------------------------------|
| id                | UUID        | PK                                                                |
| event             | Event       | ManyToOne                                                         |
| name              | string      | Default: "Service"                                                |
| startTime         | timestamptz |                                                                   |
| endTime           | timestamptz |                                                                   |
| config            | EventConfig | ManyToOne, nullable                                               |
| venueOverride     | Venue       | ManyToOne, nullable — overrides config.defaultVenue for this slot |
| markedAbsent      | boolean     | Set to true after cron marks absentees                            |
| *Override columns | int         | Per-slot overrides that take priority over EventConfig            |

Override columns: `workerCheckinStartOverride`, `workerLateOverride`, `memberCheckinStartOverride`,
`checkinStopOverride`, `allowedDistanceOverride`

**effectiveVenue:** computed as `slot.venueOverride ?? slot.config.defaultVenue`. Throws 400 if neither is set.

### EventConfig

A reusable timing template assigned to service slots. Venue is now a first-class relation rather than raw lat/lon.

| Field                           | Type   | Description                                                                                 |
|---------------------------------|--------|---------------------------------------------------------------------------------------------|
| name                            | string | Unique                                                                                      |
| defaultVenue                    | Venue  | ManyToOne, NOT NULL — the venue used by all slots referencing this config unless overridden |
| workerCheckinStartOffsetSeconds | int    | Seconds relative to `startTime` when workers can start checking in. Negative = before start |
| workerLateOffsetSeconds         | int    | Seconds after `startTime` after which workers are LATE                                      |
| memberCheckinStartOffsetSeconds | int    | When members can start checking in                                                          |
| checkinStopOffsetSeconds        | int    | When check-in closes for everyone                                                           |
| allowedDistanceInMeters         | int    | Max distance from effectiveVenue for location validation                                    |

**Constraint:** `workerLateOffset > workerCheckinStartOffset` and `checkinStopOffset > workerLateOffset`

### Attendance

One record per member per service slot.

| Field         | Type                 | Notes                                         |
|---------------|----------------------|-----------------------------------------------|
| id            | UUID                 | PK                                            |
| member        | Member               | ManyToOne                                     |
| serviceSlot   | ServiceSlot          | ManyToOne                                     |
| status        | AttendanceStatusEnum | PRESENT \| LATE \| ABSENT \| ON_LEAVE         |
| checkinTime   | timestamptz          | Null for cron-created ABSENT/ON_LEAVE records |
| roleAtCheckin | MemberRoleEnum       | Snapshot of role at check-in time             |
| location      | JSON                 | `{latitude, longitude}` or null               |

**Unique constraint:** (member, serviceSlot) — one record per person per slot.

### Department

| Field          | Notes                                                                                                                                                  |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| id             | UUID PK                                                                                                                                                |
| name           | Unique                                                                                                                                                 |
| description    |                                                                                                                                                        |
| key            | DepartmentKeyEnum \| null — access-control category for department-gated modules; not unique (multiple departments can share the same key, e.g. MEDIA) |
| workerProfiles | OneToMany → WorkerProfile                                                                                                                              |

### DepartmentLead

Joins a WorkerProfile to a Department as head or assistant lead.

### RequestLeave

| Field             | Notes                                            |
|-------------------|--------------------------------------------------|
| workerProfile     | ManyToOne → WorkerProfile                        |
| dateFrom / dateTo | timestamptz                                      |
| reason            | string                                           |
| status            | PENDING \| APPROVED \| REJECTED                  |
| actionedBy        | ManyToOne → Member (admin who approved/rejected) |

### ChurchClass

| Field               | Notes                                                          |
|---------------------|----------------------------------------------------------------|
| type                | BELIEVERS \| BAPTISMAL \| WORKERS_IN_TRAINING \| BIBLE_COLLEGE |
| facilitator         | ManyToOne → Member (nullable)                                  |
| startDate / endDate | date strings                                                   |

**Delete guard:** Deleting a class is blocked if any member is currently enrolled with status `IN_PROGRESS`. Complete or
cancel all active enrolments first.

### ClassEnrollment

| Field                     | Notes                                 |
|---------------------------|---------------------------------------|
| member                    | ManyToOne → Member                    |
| churchClass               | ManyToOne → ChurchClass               |
| status                    | IN_PROGRESS \| COMPLETED \| CANCELLED |
| enrolledAt                | auto timestamp                        |
| completedAt / cancelledAt | set when status changes               |

**Unique constraint:** (member, churchClass)

### Announcement

| Field        | Notes                                                            |
|--------------|------------------------------------------------------------------|
| audience     | ALL \| WORKERS_ONLY \| DEPARTMENT \| INDIVIDUAL                  |
| department   | ManyToOne → Department (required when audience=DEPARTMENT)       |
| targetMember | ManyToOne → Member, nullable (required when audience=INDIVIDUAL) |
| publishedAt  | defaults to creation time                                        |
| expiresAt    | nullable; expired items excluded from feed                       |

### BirthdayWish

Persists birthday wishes permanently, grouped by year. The birthday announcement expires but wishes remain readable
indefinitely.

| Field     | Type           | Notes                                         |
|-----------|----------------|-----------------------------------------------|
| id        | UUID           | PK                                            |
| message   | text           | DOMPurify-sanitized plain text, max 500 chars |
| recipient | Member         | ManyToOne, CASCADE on delete                  |
| sender    | Member \| null | ManyToOne, SET NULL on delete                 |
| year      | smallint       | Calendar year the wish was sent               |

**Unique constraint:** (recipient, sender, year) — one wish per sender per recipient per year.

### AdminRole

A named role in the admin RBAC system. Carries a list of permissions.

| Field       | Type              | Notes                                                   |
|-------------|-------------------|---------------------------------------------------------|
| id          | UUID              | PK                                                      |
| name        | string            | Unique (e.g. "SuperAdmin", "ContentManager")            |
| description | string            | Optional                                                |
| permissions | AdminPermission[] | `simple-array` column; subset of `AdminPermission` enum |
| admins      | Admin[]           | OneToMany                                               |

### Admin

Links a church member to an admin role. This is the portal-access record — it is separate from the member's church
role (MEMBER/WORKER).

| Field     | Type      | Notes                                                                         |
|-----------|-----------|-------------------------------------------------------------------------------|
| id        | UUID      | PK                                                                            |
| member    | Member    | OneToOne, CASCADE on delete — the admin must be a church member               |
| adminRole | AdminRole | ManyToOne, RESTRICT on delete — deleting a role with active admins is blocked |
| isActive  | boolean   | Soft-disable without revoking the role                                        |

**Relationship:** A church worker can also be an admin. Having `role=WORKER` on the Member entity and an `Admin` record
are independent. Mobile app routes check `role=WORKER`; admin portal routes check the `admins` table.

**Email notifications:**

- `POST /admin/users` (grant) — sends a `welcome-admin` email to the member containing their email address and the admin
  portal login URL. Password is not re-generated; the message instructs the user to log in with their existing account
  password.
- `POST /admin/users/:id/revoke` — sends an `account-deactivated` email to the affected member.

### AuditLog

Immutable record of every admin write action.

| Field       | Type           | Notes                                                                                        |
|-------------|----------------|----------------------------------------------------------------------------------------------|
| id          | UUID           | PK                                                                                           |
| action      | AuditAction    | String enum — see Audit Actions below                                                        |
| actor       | Member \| null | ManyToOne FK to `members.id`, SET NULL on member delete — the admin who performed the action |
| targetId    | UUID \| null   | The ID of the affected resource (member, event, department, etc.)                            |
| targetEmail | string \| null | Email snapshot for identity tracing when targetId alone is insufficient                      |
| metadata    | jsonb \| null  | Action-specific details (role changed, count of records affected, etc.)                      |
| createdAt   | timestamptz    | Auto-set on insert                                                                           |

**Indexes:** `action`, `actor` (FK column `actorId`), `targetId`, `createdAt`.

**Actor traceability:** The `actor` relation is a real FK to the `members` table. When building an audit log API, load
the relation (`relations: ['actor']`) to access actor name and email. If the member account is deleted, `actor` is set
to `null` but the log record and all other fields are preserved.

### EmailLog

Append-only delivery record written by the Bull email processor on every terminal outcome (success or permanent
failure). Used for debugging delivery issues and compliance — answers "was this OTP email actually sent?".

| Field          | Type        | Notes                                                                    |
|----------------|-------------|--------------------------------------------------------------------------|
| id             | UUID        | PK                                                                       |
| recipient      | string      | To address(es), comma-joined if multiple                                 |
| subject        | string      | Email subject line                                                        |
| status         | varchar     | `sent` \| `failed`                                                       |
| jobId          | string      | Bull queue job ID — correlate with Redis for in-flight inspection        |
| errorMessage   | text        | SMTP error on permanent failure; null on success                         |
| attemptsMade   | int         | Number of send attempts before terminal outcome (max 5)                  |
| createdAt      | timestamptz | When the terminal outcome was recorded                                   |

**Written by:** `@OnQueueCompleted` (status = `sent`) and `@OnQueueFailed` (status = `failed`, only on the final
attempt after all retries are exhausted). Transient failures that Bull subsequently retries do **not** produce a log
row — only the final outcome is recorded.

**Indexes:** `recipient`, `status`, `createdAt`.

**Audit Actions:**
`ADMIN_CREATED` · `MEMBER_SIGNED_UP` · `MEMBER_LOGIN` · `MEMBER_LOGOUT` · `ADMIN_LOGIN` · `PASSWORD_CHANGED` ·
`PASSWORD_RESET_REQUESTED` · `PASSWORD_RESET_COMPLETED` · `ADMIN_PASSWORD_RESET` · `WORKER_PROMOTED` ·
`WORKER_REVOKED` · `MEMBER_ACTIVATED` · `MEMBER_DEACTIVATED` · `MEMBER_UPDATED` · `DEVICE_PURGED` ·
`DEVICE_RESET_REQUESTED` · `DEVICE_RESET_COMPLETED` ·
`ANNOUNCEMENT_CREATED` · `ANNOUNCEMENT_UPDATED` · `ANNOUNCEMENT_DELETED` · `EVENT_CREATED` · `EVENT_UPDATED` ·
`EVENT_DELETED` · `NOTE_CREATED` · `NOTE_UPDATED` · `NOTE_DELETED` · `LEAVE_APPROVED` · `LEAVE_REJECTED` ·
`DEPARTMENT_CREATED` · `DEPARTMENT_UPDATED` · `DEPARTMENT_DELETED` · `DEPARTMENT_LEAD_ASSIGNED` ·
`DEPARTMENT_LEAD_REMOVED` · `WORKER_PROFILE_UPDATED` · `ADMIN_ROLE_CREATED` · `ADMIN_ROLE_UPDATED` ·
`ADMIN_ROLE_DELETED` · `ADMIN_USER_CREATED` · `ADMIN_USER_UPDATED` · `ADMIN_USER_DEACTIVATED`

### EventReminder

Optional reminder schedule attached to a service slot. Multiple reminders can be configured per slot (one per interval
preset).

| Field          | Type                       | Notes                                                |
|----------------|----------------------------|------------------------------------------------------|
| id             | UUID                       | PK                                                   |
| serviceSlot    | ServiceSlot                | ManyToOne, CASCADE on delete                         |
| audience       | AnnouncementAudienceEnum   | ALL \| WORKERS_ONLY \| DEPARTMENT                    |
| department     | Department \| null         | Required when audience=DEPARTMENT                    |
| intervalPreset | ReminderIntervalPresetEnum | 15m \| 30m \| 1h \| 3h \| 24h \| 48h                 |
| enabled        | boolean                    | Admin can disable without deleting                   |
| lastSentAt     | timestamptz \| null        | Set when the reminder fires; prevents double-sending |

**Unique constraint:** (serviceSlot, intervalPreset) — one reminder per preset per slot.

### SundaySchoolClass

A permanent Sunday School class. Members are assigned indefinitely (no graduation).

| Field       | Type           | Notes                                             |
|-------------|----------------|---------------------------------------------------|
| id          | UUID           | PK                                                |
| name        | string         |                                                   |
| description | string         | Optional                                          |
| teacher     | Member \| null | ManyToOne, nullable — the appointed class teacher |

**Delete guard:** Deleting a Sunday School class is blocked if any members are assigned to it or any sessions have
been recorded for it. Remove all members and sessions before deleting.

### SundaySchoolMember

Links a church member to a Sunday School class.

| Field             | Type              | Notes          |
|-------------------|-------------------|----------------|
| id                | UUID              | PK             |
| member            | Member            | ManyToOne      |
| sundaySchoolClass | SundaySchoolClass | ManyToOne      |
| assignedAt        | timestamptz       | auto timestamp |

**Unique constraint:** (member, sundaySchoolClass)

### SundaySchoolSession

One session (meeting) of a Sunday School class.

| Field             | Type                | Notes                                                |
|-------------------|---------------------|------------------------------------------------------|
| id                | UUID                | PK                                                   |
| sundaySchoolClass | SundaySchoolClass   | ManyToOne                                            |
| sessionDate       | string (YYYY-MM-DD) | Date of the session                                  |
| selfMarkOpen      | boolean             | When true, enrolled members may self-mark attendance |
| notes             | string              | Optional session notes                               |

**Unique constraint:** (sundaySchoolClass, sessionDate)

### SundaySchoolAttendance

One attendance record per member per session.

| Field           | Type                         | Notes                                                           |
|-----------------|------------------------------|-----------------------------------------------------------------|
| id              | UUID                         | PK                                                              |
| session         | SundaySchoolSession          | ManyToOne                                                       |
| member          | Member                       | ManyToOne                                                       |
| status          | SundaySchoolAttendanceStatus | PRESENT \| ABSENT \| EXCUSED                                    |
| markedByTeacher | boolean                      | True if a teacher/staff marked the record; false if self-marked |
| markedAt        | timestamptz                  |                                                                 |

**Unique constraint:** (session, member)

### ChildAgeGroup

Defines an age bracket for automatic child classification.

| Field        | Type   | Notes                                                                                                                            |
|--------------|--------|----------------------------------------------------------------------------------------------------------------------------------|
| id           | UUID   | PK                                                                                                                               |
| name         | string | e.g. "Nursery", "Toddlers"                                                                                                       |
| minAgeMonths | int    | Inclusive lower bound in months                                                                                                  |
| maxAgeMonths | int    | Inclusive upper bound in months                                                                                                  |
| displayOrder | int    | UI sort order — lower numbers appear first. Use sequential integers (1, 2, 3…) to control the display order across age brackets. |

**Delete guard:** Deleting an age group is blocked if any child profiles are directly assigned to it or to any of its
class groups. This prevents silent orphaning — the admin must reassign or remove the affected children first.
Internally, `ChildClassGroup` rows CASCADE on age-group delete; `ChildProfile.ageGroup` and `ChildProfile.classGroup`
are SET NULL on delete.

### ChildClassGroup

A physical class room or group within an age group.

| Field       | Type          | Notes                          |
|-------------|---------------|--------------------------------|
| id          | UUID          | PK                             |
| name        | string        | e.g. "Nursery Room A"          |
| ageGroup    | ChildAgeGroup | ManyToOne, CASCADE on delete   |
| capacity    | int \| null   | Optional room capacity         |
| teacherNote | text \| null  | Optional notes for the teacher |

**Delete guard:** Deleting a class group is blocked if any child profiles are currently assigned to it. Reassign
children before deleting.

### ChildProfile

The central record for a registered child.

| Field        | Type                | Notes                                    |
|--------------|---------------------|------------------------------------------|
| id           | UUID                | PK                                       |
| firstname    | string              |                                          |
| lastname     | string              |                                          |
| dateOfBirth  | string (YYYY-MM-DD) | Used for automatic age-group assignment  |
| ageGroup     | ChildAgeGroup       | ManyToOne — auto-assigned from DOB       |
| classGroup   | ChildClassGroup     | ManyToOne — auto-assigned from age group |
| photoUrl     | string \| null      | Optional                                 |
| specialNotes | string \| null      | Allergies, medical info, etc.            |
| registeredBy | Member \| null      | ManyToOne, nullable                      |
| guardians    | ChildGuardian[]     | OneToMany                                |

### ChildGuardian

A guardian or authorised pickup person for a child.

| Field              | Type                     | Notes                                                                                 |
|--------------------|--------------------------|---------------------------------------------------------------------------------------|
| id                 | UUID                     | PK                                                                                    |
| child              | ChildProfile             | ManyToOne                                                                             |
| fullName           | string                   |                                                                                       |
| relationship       | GuardianRelationshipEnum | MOTHER \| FATHER \| GRANDPARENT \| SIBLING \| UNCLE \| AUNT \| FAMILY_FRIEND \| OTHER |
| phoneNumber        | string                   |                                                                                       |
| email              | string \| null           | Direct email; resolved at runtime as `guardian.email ?? guardian.member.email`        |
| member             | Member \| null           | ManyToOne, nullable — links guardian to a church member account                       |
| photoUrl           | string \| null           | Optional                                                                              |
| isAuthorizedPickup | boolean                  | Whether this guardian is allowed to pick up the child                                 |

### ChildCheckIn

One check-in/check-out record per child per session.

| Field            | Type                   | Notes                                                         |
|------------------|------------------------|---------------------------------------------------------------|
| id               | UUID                   | PK                                                            |
| child            | ChildProfile           | ManyToOne                                                     |
| serviceSlot      | ServiceSlot \| null    | ManyToOne, nullable                                           |
| pickupCode       | string (6 chars)       | Unique per check-in; sent to guardians via email              |
| status           | ChildCheckInStatusEnum | CHECKED_IN \| CHECKED_OUT \| FLAGGED                          |
| checkinTime      | timestamptz            |                                                               |
| checkoutTime     | timestamptz \| null    | Set on checkout                                               |
| droppedOffBy     | ChildGuardian \| null  | ManyToOne, nullable                                           |
| droppedOffByName | string                 | Name captured at drop-off                                     |
| pickedUpBy       | ChildGuardian \| null  | ManyToOne, nullable — set on checkout                         |
| pickedUpByName   | string \| null         | Name captured at pickup                                       |
| checkedInBy      | Member \| null         | ManyToOne, nullable — staff member who performed the check-in |
| flagReason       | string \| null         | Reason if status = FLAGGED                                    |

---

## 4. Authentication & Authorization

### Dual-Surface Sessions

The app has two independent entry points — the mobile app (`POST /auth/login`) and the admin portal (`POST /auth/admin-login`) — and each maintains its own session row in `member_sessions`. The `surface` column (`MEMBER | ADMIN`) is the discriminator; a unique constraint on `(member_id, surface)` ensures at most one active session per surface per user.

**JWT payload** now includes `aud` (audience) to identify the surface:

```json
{ "sub": "<memberId>", "role": "MEMBER|WORKER", "aud": "MEMBER|ADMIN" }
```

**Surface enforcement:**

- `JwtStrategy` calls `validateAccessToken(sub, aud)` — it looks up the session row for that specific `(memberId, surface)` pair. An admin token used on a mobile endpoint checks the `ADMIN` session; if the user has no admin session, the request is rejected with 401.
- `AdminGuard` additionally checks `request.user.surface === 'ADMIN'`. A member token (`aud: MEMBER`) used on an admin-portal endpoint is rejected with 403 before the admin DB lookup even runs.
- `POST /auth/logout` is surface-scoped: it reads `req.user.surface` from the validated token and deletes only that session row, leaving the other surface's session intact.
- Password reset and device reset/purge invalidate **both** surfaces simultaneously (credential change = full sign-out).

There is no `ADMIN` role in the JWT. Admin portal access is determined at the route level by `AdminGuard` looking up the `admins` table.

### Guards

- **ThrottlerGuard** — applied globally via `APP_GUARD`. Rate-limits every endpoint to `THROTTLE_LIMIT` requests per
  `THROTTLE_TTL_MS`-millisecond window per IP (defaults: 100 req / 60 s). Returns HTTP 429 when the limit is exceeded.
  The `GET /health` endpoint is exempt via `@SkipThrottle()`.
- **JwtAuthGuard** — applied globally via `APP_GUARD`. All routes are protected unless decorated with `@Public()`.
- **PasswordChangeRequiredGuard** — applied globally via `APP_GUARD` (runs after `JwtAuthGuard`). Blocks all requests
  with HTTP 403 `PASSWORD_CHANGE_REQUIRED` if the authenticated user has `changedPassword = false` (i.e. they are on a
  system-generated temporary password). Exempt routes must be decorated with `@SkipPasswordChangeCheck()`:
  `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`.
- **RolesGuard** — applied per-route via `@Roles(MemberRoleEnum.WORKER)`. Checks `request.user.role` for worker-only
  routes (mobile app).
- **AdminGuard** — applied per-route via `@UseGuards(AdminGuard)`. First checks `request.user.surface === 'ADMIN'` (rejects member tokens with 403), then queries the `admins` table to verify an active Admin record, then checks `@RequiresPermission(AdminPermission.X)` metadata. Sets `request.admin` for downstream use. Used exclusively on admin portal routes.
- **LocalAuthGuard** — used on `POST /auth/login` (mobile) and `POST /auth/admin-login` (web portal) to invoke the
  Passport local strategy.
- **RefreshJwtAuthGuard** — used on `POST /auth/refresh`.

### Token Lifecycle

1. **Login** → receives `access_token` + `refresh_token` + `requires_password_change`. A surface-scoped session row is created (or updated) with a hashed refresh token. If `requires_password_change` is `true`, the client must redirect the user to `POST /auth/change-password` before allowing any other action.
2. **Access token expires** → call `POST /auth/refresh` with the refresh token in the `Authorization: Bearer` header. The refresh token carries `aud` and renews the same-surface session.
3. **Logout** → clears only the session row for the caller's surface (`aud` from the token). The other surface's session is unaffected. The access token becomes invalid on the next request (`validateAccessToken` finds no session for that surface).

### Temporary Password Flow

All new accounts — whether created via signup or admin-elevated — receive a server-generated temporary password. The
`changedPassword` flag on `Member` is set to `false`. On first login:

- The login response includes `"requires_password_change": true`.
- The `PasswordChangeRequiredGuard` blocks every subsequent authenticated request except the four exempt routes above.
- The user **must** call `POST /auth/change-password` (supplying the emailed temporary password as `oldPassword`) to
  activate full access.
- Once changed, `changedPassword` is set to `true` and normal access resumes.

**Signup:** `POST /auth/signup` no longer accepts a `password` field. The server generates a secure random password,
hashes it, sets `changedPassword = false`, and emails the plaintext temporary password to the new member.

### Device Lock (Mobile App)

Only one device may be logged into the mobile app per member account. This prevents proxy check-ins.

- `POST /auth/login` requires a `deviceId` string in the request body (the mobile client's device fingerprint).
- On the member's **first login** (`member.deviceId` is `null`), the device is registered and login succeeds.
- On subsequent logins, the incoming `deviceId` is compared to the stored value. If they match, login succeeds. If they
  differ, HTTP 403 is returned.
- An admin can purge the device lock via `DELETE /admin/members/:id/device` (`MEMBERS_WRITE` permission). This sets
  `deviceId = null` and invalidates all active sessions for that member, forcing a fresh login from any device.
- `POST /auth/admin-login` (web portal) does **not** perform a device check — it is web-first.

### Self-Service Device Reset Flow

A member who needs to log in from a new device (lost phone, factory reset, etc.) can reset their own device lock
without admin involvement, subject to a rate limit.

1. `POST /auth/device-reset/request` — accepts `{ email, newDeviceId }`. Rate-limited per email (default: 3 attempts
   per 24-hour window, configurable via `DEVICE_RESET_MAX_ATTEMPTS` and `DEVICE_RESET_WINDOW_SECONDS`). Generates a
   6-digit OTP, stores an Argon2 hash and the `newDeviceId` in `device_reset_otps`, and emails the code. Always
   returns the same success message to avoid leaking account existence.
   - **Security note:** `newDeviceId` is locked in at request time. An attacker who intercepts the OTP cannot redirect
     the reset to their own device — the device is bound to whoever initiated the request.
2. `POST /auth/device-reset/verify` — accepts `{ email, otp }`. Verifies the OTP, checks expiry, marks the record
   as used, updates `member.deviceId` to the `newDeviceId` stored on the OTP record, invalidates all active sessions,
   and sends a confirmation email. On success the member must log in fresh from the new device.
   - If the attempt count reaches the configured maximum, the email is rate-limited and the member must contact an
     admin for an out-of-band device purge (`DELETE /admin/members/:id/device`).

### Forgot Password / OTP Reset Flow

1. `POST /auth/forgot-password` — rate-limited (default: 3 attempts per hour, configurable via env). Generates a 6-digit
   OTP, stores an Argon2 hash in `password_reset_otps`, and emails the code. Always returns the same success message to
   avoid leaking account existence.
2. `POST /auth/reset-password` — verifies the OTP against the hash, checks expiry (default: 15 min), marks the OTP as
   used, updates the password, **invalidates any existing session**, and emails a confirmation. On success the user must
   log in fresh.

### Role Elevation

The access token's role is re-validated from the live database on every request via `validateAccessToken`. This means if
a member is promoted to WORKER, their existing token will reflect the new role on the next request after the DB is
updated.

### Department-Key-Based Access Control

Certain modules are gated by a department `key` rather than a specific department name. This allows multiple departments
to share access to the same module (e.g. both "Technical Media" and "Social Media" can carry `key=MEDIA`).

**How it works:**

- Each `Department` record has a nullable `key: DepartmentKeyEnum | null` field. The key is **not unique** — many
  departments may share the same key.
- A `WorkerProfile` has a primary `department` and an optional `secondaryDepartment`. A worker passes a key-based gate
  if **either** their primary or secondary department carries the required key.
- HOD (head-of-department) assignment is always restricted to the worker's **primary** department.

**Sunday School access** — a request passes if any of the following is true:

1. Caller is a WORKER whose primary or secondary department has `key = SUNDAY_SCHOOL`.
2. Caller is the appointed teacher of the specific Sunday School class being acted upon.

Admin-only SS routes (delete class/session) use `AdminGuard + SUNDAY_SCHOOL_WRITE` instead.

**Children Church access** — a request passes if any of the following is true:

1. Caller is a WORKER whose primary or secondary department has `key = CHILDREN_CHURCH`.

Admin-only CC routes (age group/class group CRUD, slot-level check-in report) use
`AdminGuard + CHILDREN_CHURCH_WRITE/READ` instead.

---

## 5. Module Reference

### Auth Module

**Routes:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/admin-login`, `POST /auth/refresh`,
`POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`,
`POST /auth/reset-password`, `POST /auth/device-reset/request`, `POST /auth/device-reset/verify`

**Route separation:** `POST /auth/login` is for the **mobile app** (members & workers) and enforces device lock —
`deviceId` is required. `POST /auth/admin-login` is for the **web admin portal** — it verifies that the caller has an
active `Admin` record and has no device check. Both routes use the same Passport `LocalAuthGuard` for credential
validation.

### Member Module

Manages the universal identity. Admin portal routes (list members, promote/revoke workers, change status, reset
passwords) are now guarded by `AdminGuard` + the appropriate `MEMBERS_READ` or `MEMBERS_WRITE` permission.

**Routes prefix:** `/members`

### Admin Module

Manages the admin RBAC system used by the admin web portal. This module is `@Global()` — its providers (`AdminGuard`,
`AdminService`, `AdminRoleService`) are available across the entire app without explicit module imports.

**AdminRole routes** (`/admin/roles`):

- `GET /admin/roles` — `ADMIN_READ` — list all roles
- `GET /admin/roles/:id` — `ADMIN_READ` — get role by ID
- `POST /admin/roles` — `ADMIN_WRITE` — create role
- `PATCH /admin/roles/:id` — `ADMIN_WRITE` — update role
- `DELETE /admin/roles/:id` — `ADMIN_WRITE` — delete role (blocked if active admins use it)

**Admin user routes** (`/admin/users`):

- `GET /admin/users` — `ADMIN_READ` — list all admin users
- `GET /admin/users/me` — any admin — own admin profile
- `GET /admin/users/:id` — `ADMIN_READ` — get admin by ID
- `POST /admin/users` — `ADMIN_WRITE` — grant admin access to a member
- `PATCH /admin/users/:id` — `ADMIN_WRITE` — change admin role or active status
- `POST /admin/users/:id/revoke` — `ADMIN_WRITE` — soft-revoke admin access (`isActive = false`)

**Predefined role seed (migration):** A one-time migration (`SeedPredefinedAdminRoles`) seeds 9 ready-to-use roles
covering the typical org structure. The migration is idempotent — it uses `ON CONFLICT ("name") DO NOTHING` so
re-running it on a database that already has these roles is safe.

| Role name                       | Typical use                                      |
|---------------------------------|--------------------------------------------------|
| Super Admin                     | All permissions                                  |
| General Admin                   | Most read/write permissions excluding admin RBAC |
| Member Coordinator              | Members read/write                               |
| Content Manager                 | Announcements write                              |
| Welfare & Pastoral              | Notes read/write, members read                   |
| Children Church Coordinator     | Children church read/write                       |
| Sunday School Coordinator       | Sunday school read/write                         |
| Attendance Monitor              | Attendance read                                  |
| Leave Approver                  | Leave read/write                                 |

**Default seed:** On application bootstrap, if `DEFAULT_ADMIN_EMAIL` is set and no admin exists with that email, the
system creates:

1. A `Member` with `role = MEMBER` and `changedPassword = false`
2. A `SuperAdmin` `AdminRole` carrying all permissions
3. An `Admin` record linking the two

### Event Module

Manages events and service slots. Events can be single or recurring (daily/weekly/monthly). At least one `serviceSlot`
is required at creation — each slot carries an optional `configId` pointing to an `EventConfig`. For recurring events
the same slot template (including `configId`) is stamped onto every generated occurrence; updating the config later
propagates to all check-ins that reference it.

**Routes prefix:** `/events`, `/event-config`

Each slot can have multiple reminder schedules via sub-resource `/events/slots/:slotId/reminders` (admin-only). See
EventReminder model.

### Venue Module

Manages named venue records referenced by event configs and individual service slots. Venues decouple location data from
event creation — create a venue once, reference it by ID in any config or slot.

**Routes prefix:** `/venues`  
**ADMIN:** create, update, delete  
**Any authenticated user:** list (full, unpaginated — admin-controlled reference data), get by ID

### Attendance Module

**Check-in window logic:**

- Window opens: `slot.startTime + workerCheckinStartOffsetSeconds` (workers) or `+ memberCheckinStartOffsetSeconds` (
  members)
- Window closes: `slot.startTime + checkinStopOffsetSeconds` (same for all)
- Workers are LATE if they check in after `slot.startTime + workerLateOffsetSeconds`
- Members are always PRESENT if within the window

**Distributed absence-marking lock:** The every-5-minute cron job acquires a Redis `SET NX EX 270` lock before running. If a second instance starts while the first is running, it sees the lock and skips silently. The TTL (270 s) is shorter than the cron interval (300 s) so the lock self-expires if the process crashes mid-run. Department-scoped history endpoints (`/history/department`, `/department/event/:eventId`) are automatically scoped to the caller's own department via their lead-role assignment — no `departmentId` query parameter is accepted or needed.

**Routes prefix:** `/attendances`

### Department Module

Departments are the workforce units. Each can have a head and assistant lead assigned from its worker members. The
optional `key` field on a department links it to a module-access category (e.g. `SUNDAY_SCHOOL`, `CHILDREN_CHURCH`,
`MEDIA`). Multiple departments can carry the same key.

`GET /departments` returns the **full list** (unpaginated) — department count is admin-controlled and bounded. Workers
by department (`GET /departments/:id/workers`) remains paginated as it can be large.

**Routes prefix:** `/departments`

### Leave Module

Workers request leave with a date range. Approved leave is checked by the cron job: if a worker has approved leave
overlapping a slot's time range, they are marked ON_LEAVE instead of ABSENT.

**Routes prefix:** `/leave`

### Classes Module

Tracks member progress through structured church programs.

**Class types:** BELIEVERS, BAPTISMAL, WORKERS_IN_TRAINING, BIBLE_COLLEGE

**Enrollment statuses:** IN_PROGRESS → COMPLETED or CANCELLED

**Routes prefix:** `/classes`

### Announcements Module

Audience-targeted broadcast messages. The `/announcements/feed` endpoint filters automatically based on the caller's
role and optional `departmentId`.

**Audience rules:**

- MEMBER → sees `ALL` + any `INDIVIDUAL` announcements addressed to them
- WORKER → sees `ALL` + `WORKERS_ONLY` + `DEPARTMENT` (for their department) + `INDIVIDUAL` (addressed to them)
- ADMIN → sees all audiences
- Expired announcements (`expiresAt < now`) are excluded from the feed

**Audience types:** `ALL` | `WORKERS_ONLY` | `DEPARTMENT` | `INDIVIDUAL`  
When `audience = DEPARTMENT`, `departmentId` is required. When `audience = INDIVIDUAL`, `targetMemberId` (UUID) is
required.

**Routes prefix:** `/announcements`

### Utility Module

Shared infrastructure used across the entire application.

**Email queue (`EmailQueueService` + `EmailProcessor`):** All outbound email goes through a Bull queue backed by
Redis. `EmailQueueService.queueEmailWithTemplate()` compiles the HTML template using **Handlebars** and adds a job to
the `email` queue. `EmailProcessor` processes jobs via Nodemailer. Bull handles retries automatically — 5 attempts,
5-second fixed backoff. On success or permanent failure, a row is written to `email_logs`.

Template files live in `src/utility/templates/*.html` and use `{{variable}}` for simple substitution, `{{#if}}` for
conditionals, and `{{#each}}` for loops. Values are HTML-escaped automatically; use `{{{variable}}}` only for
intentional raw HTML.

**Cache (`CacheService`):** A Redis-backed key-value cache. All read operations (`get`) are awaited — the result is
needed before the request can continue. Write operations (`set`, `del`) are **fire-and-forget** for non-critical
data (cache population after a DB fetch, cache invalidation on mutations) — if the Redis write is lost, the worst
case is a cache miss on the next request, which falls through to the database. Rate-limit reads are always awaited;
rate-limit counter clears and increments are fire-and-forget.

**Caching strategy by data type:**

| Data              | Key pattern                     | TTL                              | Invalidation |
|-------------------|---------------------------------|----------------------------------|--------------|
| Department list   | `departments:all`               | `CACHE_TTL_REFERENCE_SECONDS`    | On any CRUD  |
| Venue list        | `venues:all`                    | `CACHE_TTL_REFERENCE_SECONDS`    | On any CRUD  |
| Event config list | `event-config:all`              | `CACHE_TTL_REFERENCE_SECONDS`    | On any CRUD  |
| Leaderboard       | `leaderboard:{days}:{limit}`    | `CACHE_TTL_LEADERBOARD_SECONDS`  | TTL only     |
| Rate limit keys   | `login_fail:{email}` etc.       | Per-window duration              | On success   |

### Birthday Module

Automatically greets members on their birthday with an email and a congregation-wide announcement. Other members can
send personal wishes that persist permanently in the member's birthday book.

**Cron:** Runs daily at 6 AM. Queries all active members whose `MONTH(dateOfBirth)` and `DAY(dateOfBirth)` match today,
then for each:

- Creates an `ALL`-audience announcement with `expiresAt = 23:59:59` tonight
- Sends the birthday email

**Wish wall:** Wishes persist in `birthday_wishes` regardless of announcement expiry. Rate-limited to `WISH_DAILY_LIMIT`
wishes per sender per day (default: 20). Input is DOMPurify-sanitized.

**Routes prefix:** `/birthday`

### Notes Module

Pastoral records of significant events (child naming, dedication, marriage). Admin-only. Stored as typed JSON detail
objects.

**Note types:** `child_naming`, `child_dedication`, `marriage`

**Routes prefix:** `/notes`, `/notes-analytics`

### Dashboard Module

Aggregated data endpoints per role. Does not store data — assembles from other services.

**Routes prefix:** `/dashboard`

### Sunday School Module

Manages permanent Sunday School classes, class membership, and session-based attendance. Classes have no graduation —
members stay assigned indefinitely. Both teachers and enrolled students can mark attendance, but self-mark requires that
a staff member has opened the window on the session.

**Key flows:**

- Admin or SS-dept worker creates a class and assigns a teacher (optional).
- Members are assigned to a class via the members sub-resource. Assignments are permanent until explicitly removed.
- A session is created per class per date. Staff can toggle `selfMarkOpen` to allow enrolled students to self-mark.
- Bulk marking is used by teachers/staff; self-mark (`POST /sunday-school/sessions/:id/checkin`) is used by individual
  members.

**Routes prefix:** `/sunday-school`

### Children Church Module

Provides a security-grade check-in/check-out system for children. Key features:

- Children are automatically assigned to an age group and class group based on date of birth. Running
  `POST /children-church/age-groups/recompute` re-evaluates all children against current age-group rules.
- Each check-in generates a unique 6-character pickup code. The code is emailed to all registered guardians at check-in
  time.
- Pickup is verified by code via `GET /children-church/checkin/verify/:code` before the checkout is submitted.
- Any check-in can be flagged with `PATCH /children-church/checkin/:id/flag` (e.g. unknown pickup attempt).
- Multiple guardians can be registered per child; `isAuthorizedPickup` controls who may collect.

**Routes prefix:** `/children-church`

---

## 6. API Endpoints Quick Reference

> All routes are prefixed with `/v1/` via NestJS URI versioning (`defaultVersion: '1'`). For example, `POST /auth/login` is accessed as `POST /v1/auth/login`. Future endpoint versions can be declared with `@Version('2')` at the controller or method level without affecting existing routes.

| Method | Route                                                      | Role                                                          | Description                                                                                                   |
|--------|------------------------------------------------------------|---------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| GET    | /health                                                    | Public                                                        | Liveness check (served at `/v1/health`) — probes DB and Redis; returns 503 with details if either is unreachable. Exempt from rate limiting (`@SkipThrottle`). |
| POST   | /auth/signup                                               | Public                                                        | Register new member (server generates temp password; emailed to user)                                         |
| POST   | /auth/login                                                | Public                                                        | Mobile app login — requires `deviceId`; enforces one-device-per-account lock                                  |
| POST   | /auth/admin-login                                          | Public                                                        | Admin portal login — verifies active Admin record; no device check                                            |
| POST   | /auth/refresh                                              | Public                                                        | Exchange refresh token                                                                                        |
| POST   | /auth/logout                                               | Any                                                           | Invalidate session                                                                                            |
| GET    | /auth/me                                                   | Any                                                           | Own profile                                                                                                   |
| POST   | /auth/change-password                                      | Any                                                           | Change password (required when `requires_password_change` is true)                                            |
| POST   | /auth/forgot-password                                      | Public                                                        | Request OTP reset code (rate-limited)                                                                         |
| POST   | /auth/reset-password                                       | Public                                                        | Verify OTP and set new password; invalidates current session                                                  |
| POST   | /auth/device-reset/request                                 | Public                                                        | Self-service device reset — rate-limited; issues OTP to registered email; locks in `newDeviceId` at request   |
| POST   | /auth/device-reset/verify                                  | Public                                                        | Verify OTP and swap `deviceId` to `newDeviceId`; invalidates all active sessions                              |
| GET    | /members?page=&limit=&role=&search=                        | AdminGuard (MEMBERS_READ)                                     | List members — filterable by role; `search` matches firstname, lastname, email, or phone (case-insensitive)   |
| GET    | /members/workers                                           | AdminGuard (MEMBERS_READ)                                     | List workers (filterable by status)                                                                           |
| GET    | /members/:id                                               | AdminGuard (MEMBERS_READ)                                     | Get member by ID                                                                                              |
| PATCH  | /members/:id                                               | AdminGuard (MEMBERS_WRITE)                                    | Update member details                                                                                         |
| POST   | /members/:id/promote                                       | AdminGuard (MEMBERS_WRITE)                                    | Promote member to worker                                                                                      |
| POST   | /members/:id/revoke-worker                                 | AdminGuard (MEMBERS_WRITE)                                    | Remove worker role                                                                                            |
| PATCH  | /members/:id/worker-profile                                | AdminGuard (MEMBERS_WRITE)                                    | Update worker profile                                                                                         |
| PATCH  | /members/:id/status                                        | AdminGuard (MEMBERS_WRITE)                                    | Activate/deactivate member                                                                                    |
| POST   | /members/:id/reset-password                                | AdminGuard (MEMBERS_WRITE)                                    | Reset & email new password                                                                                    |
| DELETE | /members/:id/device                                        | AdminGuard (MEMBERS_WRITE)                                    | Purge device lock; invalidates all active sessions                                                            |
| GET    | /admin/roles                                               | AdminGuard (ADMIN_READ)                                       | List admin roles                                                                                              |
| GET    | /admin/roles/:id                                           | AdminGuard (ADMIN_READ)                                       | Get admin role by ID                                                                                          |
| POST   | /admin/roles                                               | AdminGuard (ADMIN_WRITE)                                      | Create admin role                                                                                             |
| PATCH  | /admin/roles/:id                                           | AdminGuard (ADMIN_WRITE)                                      | Update admin role                                                                                             |
| DELETE | /admin/roles/:id                                           | AdminGuard (ADMIN_WRITE)                                      | Delete admin role                                                                                             |
| GET    | /admin/users                                               | AdminGuard (ADMIN_READ)                                       | List admin users                                                                                              |
| GET    | /admin/users/me                                            | AdminGuard                                                    | Own admin profile                                                                                             |
| GET    | /admin/users/:id                                           | AdminGuard (ADMIN_READ)                                       | Get admin user by ID                                                                                          |
| POST   | /admin/users                                               | AdminGuard (ADMIN_WRITE)                                      | Grant admin access to a member                                                                                |
| PATCH  | /admin/users/:id                                           | AdminGuard (ADMIN_WRITE)                                      | Update admin user role/status                                                                                 |
| POST   | /admin/users/:id/revoke                                    | AdminGuard (ADMIN_WRITE)                                      | Revoke admin access                                                                                           |
| GET    | /admin/audit-logs                                          | AdminGuard (AUDIT_READ)                                       | Paginated audit log; filterable by action, actorId, targetId, dateFrom, dateTo                                |
| POST   | /attendances/checkin                                       | Any                                                           | Check in to a service slot                                                                                    |
| GET    | /attendances/my-history                                    | Any                                                           | Own attendance records                                                                                        |
| GET    | /attendances/history                                       | AdminGuard (ATTENDANCE_READ)                                  | All attendance records                                                                                        |
| GET    | /attendances/history/department?slotId=                    | WORKER                                                        | Department attendance for a slot (scoped to caller's own department via lead role)                            |
| GET    | /attendances/department/event/:eventId                     | WORKER                                                        | Worker attendance for all slots of an event (scoped to caller's own department via lead role)                 |
| GET    | /attendances/summary/slot/:slotId                          | AdminGuard (ATTENDANCE_READ)                                  | Status counts for a slot                                                                                      |
| GET    | /attendances/leaderboard                                   | AdminGuard (ATTENDANCE_READ)                                  | Top workers by attendance                                                                                     |
| POST   | /events                                                    | AdminGuard (EVENTS_WRITE)                                     | Create event (single or recurring)                                                                            |
| PATCH  | /events/:id                                                | AdminGuard (EVENTS_WRITE)                                     | Update event                                                                                                  |
| GET    | /events/:id                                                | Any                                                           | Get event by ID                                                                                               |
| GET    | /events                                                    | Any                                                           | List events                                                                                                   |
| DELETE | /events/:id                                                | AdminGuard (EVENTS_WRITE)                                     | Delete single event                                                                                           |
| DELETE | /events/recurring/:recurringEventId                        | AdminGuard (EVENTS_WRITE)                                     | Delete future recurring events                                                                                |
| POST   | /event-config                                              | AdminGuard (EVENTS_WRITE)                                     | Create timing config                                                                                          |
| PATCH  | /event-config/:id                                          | AdminGuard (EVENTS_WRITE)                                     | Update timing config                                                                                          |
| GET    | /event-config/:id                                          | AdminGuard (EVENTS_WRITE)                                     | Get config by ID                                                                                              |
| GET    | /event-config                                              | AdminGuard (EVENTS_WRITE)                                     | List configs                                                                                                  |
| DELETE | /event-config/:id                                          | AdminGuard (EVENTS_WRITE)                                     | Delete config                                                                                                 |
| POST   | /events/slots/:slotId/reminders                            | AdminGuard (EVENTS_WRITE)                                     | Add a reminder schedule to a slot                                                                             |
| GET    | /events/slots/:slotId/reminders                            | AdminGuard (EVENTS_WRITE)                                     | List reminders for a slot                                                                                     |
| PATCH  | /events/slots/:slotId/reminders/:reminderId                | AdminGuard (EVENTS_WRITE)                                     | Update reminder (audience, preset, enabled)                                                                   |
| DELETE | /events/slots/:slotId/reminders/:reminderId                | AdminGuard (EVENTS_WRITE)                                     | Delete reminder                                                                                               |
| POST   | /venues                                                    | AdminGuard (VENUES_WRITE)                                     | Create venue                                                                                                  |
| PATCH  | /venues/:id                                                | AdminGuard (VENUES_WRITE)                                     | Update venue                                                                                                  |
| DELETE | /venues/:id                                                | AdminGuard (VENUES_WRITE)                                     | Delete venue                                                                                                  |
| GET    | /venues                                                    | Any                                                           | List venues                                                                                                   |
| GET    | /venues/:id                                                | Any                                                           | Get venue by ID                                                                                               |
| GET    | /departments                                               | Any                                                           | List departments                                                                                              |
| GET    | /departments/keys                                          | Any                                                           | List all valid department key values                                                                          |
| GET    | /departments/:id                                           | Any                                                           | Get department                                                                                                |
| POST   | /departments                                               | AdminGuard (DEPARTMENTS_WRITE)                                | Create department                                                                                             |
| PATCH  | /departments/:id                                           | AdminGuard (DEPARTMENTS_WRITE)                                | Update department                                                                                             |
| DELETE | /departments/:id                                           | AdminGuard (DEPARTMENTS_WRITE)                                | Delete department                                                                                             |
| POST   | /departments/assign-lead                                   | AdminGuard (DEPARTMENTS_WRITE)                                | Assign head/assistant lead                                                                                    |
| POST   | /departments/remove-lead                                   | AdminGuard (DEPARTMENTS_WRITE)                                | Remove lead                                                                                                   |
| GET    | /departments/leads/:id                                     | AdminGuard (DEPARTMENTS_READ)                                 | Leads for a department                                                                                        |
| GET    | /departments/leads                                         | AdminGuard (DEPARTMENTS_READ)                                 | All department leads                                                                                          |
| GET    | /departments/:id/workers                                   | AdminGuard (DEPARTMENTS_READ)                                 | List workers in a department (paginated)                                                                      |
| GET    | /departments/my/summary                                    | WORKER                                                        | Own department summary (lead only)                                                                            |
| POST   | /leave                                                     | WORKER                                                        | Request leave                                                                                                 |
| PATCH  | /leave/:id/action                                          | AdminGuard (LEAVE_WRITE)                                      | Approve or reject leave                                                                                       |
| DELETE | /leave/:id                                                 | WORKER                                                        | Delete own pending leave                                                                                      |
| GET    | /leave/my-history                                          | WORKER                                                        | Own leave history                                                                                             |
| GET    | /leave/history                                             | AdminGuard (LEAVE_READ)                                       | All leave requests                                                                                            |
| GET    | /leave/department                                          | WORKER                                                        | Department leave requests (lead only)                                                                         |
| POST   | /classes                                                   | AdminGuard (CLASSES_WRITE)                                    | Create class                                                                                                  |
| PATCH  | /classes/:id                                               | AdminGuard (CLASSES_WRITE)                                    | Update class                                                                                                  |
| DELETE | /classes/:id                                               | AdminGuard (CLASSES_WRITE)                                    | Delete class                                                                                                  |
| GET    | /classes                                                   | Any                                                           | List classes (filterable by type)                                                                             |
| GET    | /classes/:id                                               | Any                                                           | Get class                                                                                                     |
| POST   | /classes/enroll                                            | AdminGuard (CLASSES_WRITE)                                    | Enrol member in class                                                                                         |
| PATCH  | /classes/enrollments/:id/status                            | AdminGuard (CLASSES_WRITE)                                    | Update enrolment status                                                                                       |
| GET    | /classes/my/enrollments                                    | Any                                                           | Own enrolments                                                                                                |
| GET    | /classes/:id/enrollments                                   | AdminGuard (CLASSES_READ)                                     | All enrolments for a class                                                                                    |
| POST   | /announcements                                             | AdminGuard (ANNOUNCEMENTS_WRITE)                              | Create announcement                                                                                           |
| PATCH  | /announcements/:id                                         | AdminGuard (ANNOUNCEMENTS_WRITE)                              | Update announcement                                                                                           |
| DELETE | /announcements/:id                                         | AdminGuard (ANNOUNCEMENTS_WRITE)                              | Delete announcement                                                                                           |
| GET    | /announcements/all                                         | AdminGuard (ANNOUNCEMENTS_READ)                               | All announcements                                                                                             |
| GET    | /announcements/feed                                        | Any                                                           | My filtered feed                                                                                              |
| GET    | /announcements/:id                                         | Any                                                           | Get announcement                                                                                              |
| POST   | /birthday/wishes/:recipientId                              | Any                                                           | Send a birthday wish (once per year per sender; rate-limited to WISH_DAILY_LIMIT/day)                         |
| GET    | /birthday/wishes/me                                        | Any                                                           | Read own birthday wishes (?year= filter optional)                                                             |
| GET    | /birthday/wishes/:memberId                                 | AdminGuard (MEMBERS_READ)                                     | Read any member's birthday wishes                                                                             |
| GET    | /notes/:type                                               | AdminGuard (NOTES_READ)                                       | List notes by type                                                                                            |
| POST   | /notes                                                     | AdminGuard (NOTES_WRITE)                                      | Create note                                                                                                   |
| PUT    | /notes/:id                                                 | AdminGuard (NOTES_WRITE)                                      | Update note                                                                                                   |
| GET    | /notes/:type/:id                                           | AdminGuard (NOTES_READ)                                       | Get note                                                                                                      |
| DELETE | /notes/:type/:id                                           | AdminGuard (NOTES_WRITE)                                      | Delete note                                                                                                   |
| GET    | /notes-analytics/:type                                     | AdminGuard (NOTES_READ)                                       | Analytics for a note type                                                                                     |
| GET    | /dashboard/member                                          | Any                                                           | Member dashboard                                                                                              |
| GET    | /dashboard/worker                                          | WORKER                                                        | Worker dashboard                                                                                              |
| GET    | /dashboard/admin                                           | AdminGuard (DASHBOARD_READ)                                   | Admin dashboard                                                                                               |
| POST   | /sunday-school/classes                                     | WORKER (SS-dept or class teacher)                             | Create SS class                                                                                               |
| PATCH  | /sunday-school/classes/:id                                 | WORKER (SS-dept or class teacher)                             | Update SS class                                                                                               |
| DELETE | /sunday-school/classes/:id                                 | AdminGuard (SUNDAY_SCHOOL_WRITE)                              | Delete SS class                                                                                               |
| GET    | /sunday-school/classes                                     | Any                                                           | List SS classes                                                                                               |
| GET    | /sunday-school/classes/:id                                 | Any                                                           | Get SS class by ID                                                                                            |
| POST   | /sunday-school/classes/:id/members                         | WORKER (SS-dept or class teacher)                             | Assign member to class                                                                                        |
| DELETE | /sunday-school/classes/:id/members/:memberId               | WORKER (SS-dept or class teacher)                             | Remove member from class                                                                                      |
| GET    | /sunday-school/classes/:id/members                         | WORKER (SS-dept or class teacher)                             | List class members                                                                                            |
| POST   | /sunday-school/sessions                                    | WORKER (SS-dept or class teacher)                             | Create SS session                                                                                             |
| PATCH  | /sunday-school/sessions/:id/toggle-self-mark               | WORKER (SS-dept or class teacher)                             | Open/close self-mark window                                                                                   |
| POST   | /sunday-school/sessions/:id/checkin                        | Any (self-mark; member must be enrolled; window must be open) | Self-mark attendance                                                                                          |
| POST   | /sunday-school/sessions/:id/bulk-mark                      | WORKER (SS-dept or class teacher)                             | Bulk mark session attendance                                                                                  |
| GET    | /sunday-school/sessions/:id/roster                         | WORKER (SS-dept or class teacher)                             | Get session attendance roster                                                                                 |
| GET    | /sunday-school/sessions?classId=                           | Any                                                           | List sessions for a class (paginated)                                                                         |
| GET    | /sunday-school/sessions/:id                                | Any                                                           | Get SS session by ID                                                                                          |
| DELETE | /sunday-school/sessions/:id                                | AdminGuard (SUNDAY_SCHOOL_WRITE)                              | Delete SS session                                                                                             |
| POST   | /children-church/age-groups                                | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Create age group                                                                                              |
| PATCH  | /children-church/age-groups/:id                            | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Update age group                                                                                              |
| DELETE | /children-church/age-groups/:id                            | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Delete age group                                                                                              |
| GET    | /children-church/age-groups                                | Any                                                           | List age groups                                                                                               |
| POST   | /children-church/age-groups/recompute                      | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Batch reassign all children to correct age/class group                                                        |
| POST   | /children-church/class-groups                              | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Create class group                                                                                            |
| PATCH  | /children-church/class-groups/:id                          | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Update class group                                                                                            |
| DELETE | /children-church/class-groups/:id                          | AdminGuard (CHILDREN_CHURCH_WRITE)                            | Delete class group                                                                                            |
| GET    | /children-church/class-groups?ageGroupId=                  | WORKER (CC-dept)                                              | List class groups (filterable by age group)                                                                   |
| POST   | /children-church/children                                  | WORKER (CC-dept)                                              | Register child                                                                                                |
| PATCH  | /children-church/children/:id                              | WORKER (CC-dept)                                              | Update child profile                                                                                          |
| GET    | /children-church/children/:id                              | WORKER (CC-dept)                                              | Get child by ID                                                                                               |
| GET    | /children-church/children/:id/checkin-history              | WORKER (CC-dept)                                              | Child check-in history (paginated)                                                                            |
| GET    | /children-church/children?name=&classGroupId=&page=&limit= | WORKER (CC-dept)                                              | Search/list children                                                                                          |
| POST   | /children-church/children/:id/guardians                    | WORKER (CC-dept)                                              | Add guardian to child                                                                                         |
| GET    | /children-church/children/:id/guardians                    | WORKER (CC-dept)                                              | List child guardians                                                                                          |
| DELETE | /children-church/guardians/:id                             | WORKER (CC-dept)                                              | Remove guardian                                                                                               |
| POST   | /children-church/checkin                                   | WORKER (CC-dept)                                              | Check in a child                                                                                              |
| GET    | /children-church/checkin/verify/:code                      | WORKER (CC-dept)                                              | Verify pickup code                                                                                            |
| POST   | /children-church/checkout                                  | WORKER (CC-dept)                                              | Check out a child                                                                                             |
| PATCH  | /children-church/checkin/:id/flag                          | WORKER (CC-dept)                                              | Flag a check-in record                                                                                        |
| GET    | /children-church/checkin/active?classGroupId=              | WORKER (CC-dept)                                              | List active check-ins                                                                                         |
| GET    | /children-church/checkin/slot/:slotId                      | AdminGuard (CHILDREN_CHURCH_READ)                             | All check-ins for a service slot                                                                              |

---

## 7. Check-In Flow

```
POST /attendances/checkin
  Body: { serviceSlotId, location? }
```

**Step-by-step:**

1. **Load slot** — fetches `ServiceSlot` with its `EventConfig` and parent `Event`. Throws 404 if not found.

2. **Load member** — fetches the authenticated member with `workerProfile.department`.

3. **Assert active** — throws 400 if `member.status = INACTIVE`. Also throws if the member is a WORKER with
   `workerProfile.status = INACTIVE`.

4. **Duplicate check** — throws 400 if an attendance record already exists for (member, slot).

5. **Resolve config** — merges per-slot overrides over EventConfig values. If the slot has no config and no overrides,
   throws 400.

6. **Validate window:**
    - Workers: window opens at `startTime + workerCheckinStartOffsetSeconds` (typically negative)
    - Members: window opens at `startTime + memberCheckinStartOffsetSeconds`
    - Both close at `startTime + checkinStopOffsetSeconds`

7. **Validate location** *(if location provided)*: Resolves `effectiveVenue` (
   `slot.venueOverride ?? slot.config.defaultVenue`). Calculates Haversine distance between submitted coordinates and
   the venue's `latitude`/`longitude`. If distance exceeds `allowedDistanceInMeters` and `ENFORCE_DISTANCE_CHECK=true`,
   throws 400.

8. **Resolve status:**
    - Member → always `PRESENT`
    - Worker before late threshold → `PRESENT`
    - Worker at or after `startTime + workerLateOffsetSeconds` → `LATE`

9. **Save record** — creates `Attendance` with `roleAtCheckin` snapshot and optional location.

---

## 8. Automated Absence Marking

A cron job runs every 5 minutes (`EVERY_5_MINUTES`).

**Logic:**

1. Finds all `ServiceSlot` records where `markedAbsent = false` AND `endTime < now`.
2. For each slot:
    - Gets all **members** (ACTIVE, any role) who have no attendance record for the slot → marks them `ABSENT` with role
      snapshot `MEMBER`.
    - Gets all **workers** (WORKER role, ACTIVE worker profile) with no record:
        - Checks `request_leave` table: if the worker has an APPROVED leave whose date range overlaps the slot's
          start–end time → marks `ON_LEAVE`.
        - Otherwise → marks `ABSENT`.
3. All records for the slot are saved in a single DB transaction.
4. Sets `slot.markedAbsent = true` so the job skips it next run.

---

## 9. Role & Permission Matrix

The system has two distinct access dimensions:

1. **Church role** (`MemberRoleEnum` on the Member entity) — controls mobile-app routes: `MEMBER` or `WORKER`.
2. **Admin portal access** (`Admin` entity + `AdminRole` permissions) — controls admin web portal routes via
   `AdminGuard`.

A church worker can also have admin access. They pass `@Roles(WORKER)` routes via their church role and pass
`@UseGuards(AdminGuard)` routes via their Admin record.

### Mobile App (church role)

| Action                                          | MEMBER          | WORKER                       |
|-------------------------------------------------|-----------------|------------------------------|
| Sign up / login                                 | ✓               | ✓                            |
| View own profile                                | ✓               | ✓                            |
| Check in to service                             | ✓               | ✓                            |
| View own attendance                             | ✓               | ✓                            |
| View own class enrolments                       | ✓               | ✓                            |
| View announcement feed                          | ✓               | ✓                            |
| Worker dashboard                                | —               | ✓                            |
| Request leave                                   | —               | ✓                            |
| View own leave history                          | —               | ✓                            |
| View department leave                           | —               | ✓ (lead only)                |
| SS class actions (create/update/assign members) | —               | ✓ (SS-dept or class teacher) |
| SS session management                           | —               | ✓ (SS-dept or class teacher) |
| SS self-mark attendance                         | enrolled member | enrolled member              |
| SS bulk-mark / roster                           | —               | ✓ (SS-dept or class teacher) |
| CC child/guardian management                    | —               | ✓ (CC-dept worker)           |
| CC check-in / check-out / flag                  | —               | ✓ (CC-dept worker)           |

### Admin Portal (`AdminGuard` + permission)

| Action                                        | Permission              |
|-----------------------------------------------|-------------------------|
| List / view members                           | `MEMBERS_READ`          |
| Promote / revoke workers, reset passwords     | `MEMBERS_WRITE`         |
| View events / configs                         | `EVENTS_READ`           |
| Create / update / delete events & configs     | `EVENTS_WRITE`          |
| Create / update / delete venues               | `VENUES_WRITE`          |
| View departments / leads                      | `DEPARTMENTS_READ`      |
| Create / update / delete departments & leads  | `DEPARTMENTS_WRITE`     |
| View all attendance, leaderboard              | `ATTENDANCE_READ`       |
| View all leave requests                       | `LEAVE_READ`            |
| Approve / reject leave                        | `LEAVE_WRITE`           |
| View classes & enrolments                     | `CLASSES_READ`          |
| Create / update / delete classes & enrolments | `CLASSES_WRITE`         |
| View announcements                            | `ANNOUNCEMENTS_READ`    |
| Create / update / delete announcements        | `ANNOUNCEMENTS_WRITE`   |
| View pastoral notes & analytics               | `NOTES_READ`            |
| Create / update / delete notes                | `NOTES_WRITE`           |
| Admin dashboard                               | `DASHBOARD_READ`        |
| SS delete class/session                       | `SUNDAY_SCHOOL_WRITE`   |
| CC age/class group CRUD + recompute           | `CHILDREN_CHURCH_WRITE` |
| CC slot-level check-in report                 | `CHILDREN_CHURCH_READ`  |
| View audit logs                               | `AUDIT_READ`            |
| View admin users & roles                      | `ADMIN_READ`            |
| Create / update / delete admin users & roles  | `ADMIN_WRITE`           |
| View own admin profile                        | *(any active admin)*    |

---

## 10. Environment Variables

All variables are validated by Joi at startup (`src/config/env.validation.ts`). Missing required variables crash the
process with a clear error before any HTTP traffic is accepted.

### Runtime

| Variable       | Default        | Description                                  |
|----------------|----------------|----------------------------------------------|
| `NODE_ENV`     | `development`  | `development` \| `production` \| `test`      |
| `PORT`         | `3000`         | HTTP port the server listens on              |
| `CORS_ORIGINS` | — *(required)* | Comma-separated list of allowed CORS origins |

### Branding (used in email templates)

These are read through `ConfigService` at constructor time — **not** from bare `process.env` — so `.env` files are
loaded correctly before use.

| Variable         | Default                                         | Description                              |
|------------------|-------------------------------------------------|------------------------------------------|
| `PRODUCT_NAME`   | `Discovery Hub`                                 | Product name shown in email subjects     |
| `CHURCH_NAME`    | `RCCG Discovery Centre`                         | Church/org name shown in email templates |
| `CHURCH_ADDRESS` | `62 Igi Olugbin Street, Bariga. Lagos, Nigeria` | Church address shown in email templates  |

### Database

| Variable             | Default        | Description                                                                  |
|----------------------|----------------|------------------------------------------------------------------------------|
| `DATABASE_HOST`      | — *(required)* | Postgres host                                                                |
| `DATABASE_PORT`      | `5432`         | Postgres port                                                                |
| `DATABASE_USER`      | — *(required)* | DB username                                                                  |
| `DATABASE_PASSWORD`  | — *(required)* | DB password                                                                  |
| `DATABASE_NAME`      | — *(required)* | DB name                                                                      |
| `DATABASE_SSL`       | `false`        | Enable SSL (`rejectUnauthorized=false`)                                      |
| `DATABASE_LOGGING`   | `false`        | Enable TypeORM query logging                                                 |
| `DATABASE_POOL_SIZE` | `50`           | Max connections in the pool                                                  |
| `DATABASE_POOL_MIN`  | `10`           | Min idle connections kept alive                                              |
| `DATABASE_POOL`      | `transaction`  | Pool mode for PgBouncer/Supavisor: `transaction` \| `session` \| `statement` |

### JWT

| Variable                | Default                      | Description                                  |
|-------------------------|------------------------------|----------------------------------------------|
| `JWT_SECRET`            | — *(required, min 32 chars)* | Access token signing secret                  |
| `JWT_EXPIRY_IN`         | `1h`                         | Access token expiry (e.g. `1h`, `15m`, `7d`) |
| `REFRESH_JWT_SECRET`    | — *(required, min 32 chars)* | Refresh token signing secret                 |
| `REFRESH_JWT_EXPIRY_IN` | `7d`                         | Refresh token expiry                         |

### Email (SMTP)

| Variable         | Default        | Description                                  |
|------------------|----------------|----------------------------------------------|
| `EMAIL_HOST`     | — *(required)* | SMTP host                                    |
| `EMAIL_PORT`     | — *(required)* | SMTP port                                    |
| `EMAIL_SECURE`   | `false`        | `true` for port 465, `false` for 587         |
| `EMAIL_SERVICE`  | —              | e.g. `gmail` (optional if HOST/PORT are set) |
| `EMAIL_USER`     | — *(required)* | SMTP username / sender address               |
| `EMAIL_PASSWORD` | — *(required)* | SMTP password                                |

### Auth / OTP

| Variable                         | Default | Description                                  |
|----------------------------------|---------|----------------------------------------------|
| `OTP_TTL_SECONDS`                | `900`   | How long a reset OTP stays valid (15 min)    |
| `FORGOT_PASSWORD_MAX_ATTEMPTS`   | `3`     | Max OTP requests per rate-limit window       |
| `FORGOT_PASSWORD_WINDOW_SECONDS` | `3600`  | Rate-limit window for forgot-password (1 hr) |
| `LOGIN_MAX_ATTEMPTS`             | `5`     | Max failed login attempts before lockout     |
| `LOGIN_WINDOW_SECONDS`           | `900`   | Lockout window duration (15 min)             |
| `DEVICE_RESET_MAX_ATTEMPTS`      | `3`     | Max self-service device reset requests per window per email |
| `DEVICE_RESET_WINDOW_SECONDS`    | `86400` | Rate-limit window for device resets (24 hr)  |

### Global Rate Limiting

Applied to every endpoint via `ThrottlerGuard` as a global `APP_GUARD`. Returns HTTP 429 when exceeded. The
`GET /health` endpoint is exempt via `@SkipThrottle()`.

| Variable          | Default | Description                            |
|-------------------|---------|----------------------------------------|
| `THROTTLE_TTL_MS` | `60000` | Sliding window in milliseconds (1 min) |
| `THROTTLE_LIMIT`  | `100`   | Max requests per window per IP         |

### Redis

Used for two purposes: the distributed cache (`CacheService`) and the Bull email job queue (`EmailQueueService`).
Both use the same Redis server and the same logical database — Bull keys are namespaced `bull:*` and do not collide
with application cache keys.

| Variable         | Default     | Description                                                    |
|------------------|-------------|----------------------------------------------------------------|
| `REDIS_HOST`     | `localhost` | Redis server hostname                                          |
| `REDIS_PORT`     | `6379`      | Redis server port                                              |
| `REDIS_PASSWORD` | —           | Redis auth password (leave blank if no auth)                   |
| `REDIS_DB`       | `0`         | Logical database index (0–15)                                  |

### Cache TTLs

| Variable                        | Default | Description                                                        |
|---------------------------------|---------|--------------------------------------------------------------------|
| `CACHE_TTL_REFERENCE_SECONDS`   | `300`   | TTL for reference data: departments, venues, event configs (5 min) |
| `CACHE_TTL_LEADERBOARD_SECONDS` | `90`    | TTL for attendance leaderboard                                     |

### Birthday Wishes

| Variable           | Default | Description                                        |
|--------------------|---------|----------------------------------------------------|
| `WISH_DAILY_LIMIT` | `20`    | Max birthday wishes a single user can send per day |

### Attendance / Check-In

| Variable                 | Default | Description                                                        |
|--------------------------|---------|--------------------------------------------------------------------|
| `ENFORCE_DISTANCE_CHECK` | `false` | Require members to be within `allowedDistanceInMeters` to check in |

### Default Seed Data (applied on first boot)

| Variable                                   | Default                 | Description                                   |
|--------------------------------------------|-------------------------|-----------------------------------------------|
| `DEFAULT_ADMIN_EMAIL`                      | —                       | Email for the seeded default admin account    |
| `DEFAULT_ADMIN_PASSWORD`                   | —                       | Password for the seeded default admin account |
| `DEFAULT_VENUE_NAME`                       | `RCCG Discovery Centre` | Name for the seeded default venue             |
| `DEFAULT_VENUE_ADDRESS`                    | —                       | Street address for the seeded default venue   |
| `DEFAULT_VENUE_LATITUDE`                   | —                       | WGS84 latitude of the default venue           |
| `DEFAULT_VENUE_LONGITUDE`                  | —                       | WGS84 longitude of the default venue          |
| `DEFAULT_EVENT_CONFIG_NAME`                | —                       | Name for the seeded default event config      |
| `DEFAULT_EVENT_ALLOWED_DISTANCE_IN_METERS` | `100`                   | Default allowed check-in radius (metres)      |
| `WORKER_CHECKIN_START_OFFSET_SECONDS`      | `-1800`                 | Workers can check in 30 min before start      |
| `WORKER_LATE_OFFSET_SECONDS`               | `0`                     | Workers arriving after `startTime` are LATE   |
| `MEMBER_CHECKIN_START_OFFSET_SECONDS`      | `-900`                  | Members can check in 15 min before start      |
| `CHECKIN_STOP_OFFSET_SECONDS`              | `3600`                  | Check-in closes 1 hr after start              |

### App URLs (embedded in emails)

| Variable                      | Description                                                                                 |
|-------------------------------|---------------------------------------------------------------------------------------------|
| `LOGIN_URL`                   | Mobile app login URL — embedded in member/worker welcome and notification emails (required) |
| `ADMIN_LOGIN_URL`             | Admin portal login URL — embedded in the admin welcome email on role grant (required)       |
| `SUPPORT_FORM_URL`            | Support contact form URL                                                                    |
| `EXPLAINER_VIDEO_ANDROID_URL` | Android onboarding video URL                                                                |
| `EXPLAINER_VIDEO_IOS_URL`     | iOS onboarding video URL                                                                    |

---

## 11. Enum Reference

### MemberRoleEnum

`MEMBER` · `WORKER`

Admin portal access is not a member role — it is managed via the `Admin` entity and `AdminRole`.

### AdminPermission

Granular permissions assigned to `AdminRole` records:

`members:read` · `members:write` · `events:read` · `events:write` · `venues:read` · `venues:write` ·
`departments:read` · `departments:write` · `attendance:read` · `leave:read` · `leave:write` · `classes:read` ·
`classes:write` · `announcements:read` · `announcements:write` · `notes:read` · `notes:write` · `dashboard:read` ·
`sunday_school:read` · `sunday_school:write` · `children_church:read` · `children_church:write` · `admin:read` ·
`admin:write` · `audit:read`

### MemberStatusEnum / WorkerStatusEnum

`ACTIVE` · `INACTIVE`

### GenderEnum

`MALE` · `FEMALE`

### MaritalStatusEnum

`SINGLE` · `MARRIED` · `DIVORCED` · `WIDOWED`

### AttendanceStatusEnum

`PRESENT` · `LATE` *(workers only)* · `ABSENT` · `ON_LEAVE` *(workers only)*

### LeaveStatusEnum

`PENDING` · `APPROVED` · `REJECTED`

### ChurchClassTypeEnum

`BELIEVERS` · `BAPTISMAL` · `WORKERS_IN_TRAINING` · `BIBLE_COLLEGE`

### EnrollmentStatusEnum

`IN_PROGRESS` · `COMPLETED` · `CANCELLED`

### AnnouncementAudienceEnum

`ALL` · `WORKERS_ONLY` · `DEPARTMENT` · `INDIVIDUAL`

### NoteTypeEnum *(path param values)*

`child_naming` · `child_dedication` · `marriage`

### EventRecurrencePatternEnum

`daily` · `weekly` · `monthly`

### OrderBy (Events)

`eventDate` · `createdAt` · `updatedAt`

### DepartmentKeyEnum

Access-control categories for department-gated modules. A department's `key` field uses one of these values (or is null
if the department is not linked to any gated module). Multiple departments can share the same key.

`SUNDAY_SCHOOL` · `CHILDREN_CHURCH` · `MEDIA` *(example — extend as needed)*

### SundaySchoolAttendanceStatus

`PRESENT` · `ABSENT` · `EXCUSED`

### GuardianRelationshipEnum

`MOTHER` · `FATHER` · `GRANDPARENT` · `SIBLING` · `UNCLE` · `AUNT` · `FAMILY_FRIEND` · `OTHER`

### ChildCheckInStatusEnum

`CHECKED_IN` · `CHECKED_OUT` · `FLAGGED`

### ReminderIntervalPresetEnum

`15m` (15 min) · `30m` (30 min) · `1h` (1 hour) · `3h` (3 hours) · `24h` (24 hours) · `48h` (48 hours)
