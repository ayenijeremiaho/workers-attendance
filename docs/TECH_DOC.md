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
School sessions, Children Church security check-in, internal announcements, tithe records, and internal finance
requests for a local church.

**Core design principles:**

- Every church member has one account. Workers are members with an optional `WorkerProfile` attached.
- A single JWT login endpoint serves all member roles: MEMBER and WORKER. Admin portal access is controlled separately
  via the `admins` table.
- There are two distinct frontends: a **mobile app** for members and workers, and an **admin web portal** managed via
  the Admin RBAC system.
- Attendance is tracked per **Event**, not per slot. One event can have multiple slots but each member gets exactly one attendance record per event.
- Members are PRESENT or ABSENT. Workers can also be LATE (arrived after threshold) or ON_LEAVE (approved leave covering the event date). ON_LEAVE is neutral — it neither contributes to nor breaks the attendance streak.
- Absentees are marked automatically by a background cron job, not by user action.
- **Sunday School** tracks session-based attendance for permanent class assignments. Both teachers and enrolled students
  can mark attendance; self-mark requires an open window set by staff.
- **Children Church** provides a full security check-in/check-out system for 1000+ children, with per-session
  6-character pickup codes, multiple guardians per child, automatic age-group assignment by date of birth, and pickup
  email notifications to guardians.
- **Follow-Up** tracks first-time visitors and online non-responders. A FollowUpTask is auto-created on every first-timer registration and assigned to a FOLLOW_UP-department worker via round-robin (fewest open tasks wins). After every event, thank-you emails are sent to all attendees and online-confirm requests are sent to absent members if `onlineAttendanceEnabled` is set. Members who don't confirm online attendance within `ONLINE_CHECKIN_WINDOW_HOURS` get a follow-up task.

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
├── tithe/            Batch tithe upload (Excel), queue-based processing, dispute resolution, member PDF statements
├── finance-request/  Department expense requests lifecycle (submit → approve/reject → proof)
├── follow-up/        First-timer registration, follow-up task management, post-event email jobs, online attendance
├── service-programme/ Service programme authoring, live session control, analytics, PDF reports
├── service-headcount/ Physical attendance headcounts per service slot, trends by period
└── utility/          Email queue, cache, hashing, pagination, email delivery log, Cloudinary file uploads, PDF generation
```

**Stack:** NestJS · TypeORM · PostgreSQL · Redis · Bull · ioredis · Argon2 · Passport (JWT + Local) · class-validator · nestjs-schedule ·
@nestjs/throttler · Handlebars · DOMPurify · ExcelJS · PDFKit · Cloudinary

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
| birthDay              | smallint \| null  | Day of birth (1–31); optional                                                                             |
| birthMonth            | smallint \| null  | Month of birth (1–12); optional                                                                           |
| birthYear             | smallint \| null  | Year of birth (1900–2100); optional — may be omitted when unknown                                        |
| maritalStatus         | MaritalStatusEnum | Optional                                                                                                  |
| yearBornAgain         | Date              | Stored as Jan 1 of given year                                                                             |
| yearBaptized          | Date              | Optional                                                                                                  |
| baptizedWithHolyGhost | boolean           | Optional                                                                                                  |
| dateJoinedChurch      | Date (date only)  | Optional; full YYYY-MM-DD date, stored in `date_joined_church` column                                     |
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

| Field             | Type             | Notes                                                                                                   |
|-------------------|------------------|---------------------------------------------------------------------------------------------------------|
| id                | UUID             | PK                                                                                                      |
| name              | string           |                                                                                                         |
| description       | string           | Optional                                                                                                |
| eventDate         | Date (date only) | Start date of the event                                                                                 |
| endDate           | Date (date only) | Last day of the event (defaults to `eventDate` for same-day events). All slot times must fall within `[eventDate 00:00, endDate 23:59]`. |
| attendanceMarked           | boolean          | Set to `true` by the cron job after absence records are created. Guards against double-processing.      |
| onlineAttendanceEnabled    | boolean          | Default `false`. When `true`, absent members receive an online-confirm email after the event ends.      |
| onlineNotificationSentAt   | timestamptz \| null | Set when the online-confirm emails are dispatched. Used to calculate the confirmation window.        |
| recurringEventId           | UUID             | Groups events in a recurring series                                                                     |
| serviceSlots      | ServiceSlot[]    | OneToMany — at least one slot is required at creation                                                   |
| attendances       | Attendance[]     | OneToMany                                                                                               |

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

One record per member per **event**. Workers and members both receive one attendance record per event; workers are distinguished by a LATE status if they arrive after the threshold.

| Field         | Type                 | Notes                                                             |
|---------------|----------------------|-------------------------------------------------------------------|
| id            | UUID                 | PK                                                                |
| member        | Member               | ManyToOne, CASCADE on delete                                      |
| event         | Event                | ManyToOne, CASCADE on delete — the event being attended           |
| serviceSlot   | ServiceSlot          | ManyToOne, nullable, SET NULL on delete — which slot they entered |
| status        | AttendanceStatusEnum | PRESENT \| LATE \| ABSENT \| ON_LEAVE \| ATTENDED_ONLINE          |
| checkinTime   | timestamptz          | Null for cron-created ABSENT/ON_LEAVE records                     |
| roleAtCheckin | MemberRoleEnum       | Snapshot of role at check-in time                                 |
| location      | JSON                 | `{latitude, longitude}` or null; mandatory for workers at check-in |

**Unique constraint:** `(member, event)` — one record per person per event.

**Streak rules:**
- PRESENT, LATE, and ATTENDED_ONLINE all count as present and increment the streak.
- ON_LEAVE is neutral — it neither increments nor breaks the streak.
- ABSENT breaks the streak.

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
| dateFrom / dateTo | date (YYYY-MM-DD, no time component)             |
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
`TITHE_BATCH_QUEUED` · `TITHE_UNMATCHED_RESOLVED` · `TITHE_UNMATCHED_DISMISSED` · `TITHE_DISPUTE_APPROVED` · `TITHE_DISPUTE_REJECTED` · `TITHE_ACCOUNT_CREATED` · `TITHE_ACCOUNT_UPDATED` ·
`FINANCE_CATEGORY_CREATED` · `FINANCE_CATEGORY_UPDATED` · `FINANCE_REQUEST_CREATED` · `FINANCE_REQUEST_APPROVED` · `FINANCE_REQUEST_REJECTED` · `FINANCE_PROOF_ATTACHED` ·
`TITHE_PROOF_SUBMITTED` · `TITHE_PROOF_CONFIRMED` · `TITHE_PROOF_DECLINED` · `TITHE_PROOF_EXPIRED_PURGED` ·
`CHURCH_SETTING_UPDATED` · `INCIDENT_REPORT_CREATED` · `INCIDENT_REPORT_STATUS_UPDATED` ·
`ASSET_CREATED` · `ASSET_UPDATED` · `ASSET_MAINTENANCE_SCHEDULED` · `ASSET_MAINTENANCE_LOGGED` · `ASSET_INVENTORY_UPDATED`

### EventReminder

Optional reminder schedule attached to a service slot. Multiple reminders can be configured per slot (one per interval
preset).

| Field          | Type                       | Notes                                                |
|----------------|----------------------------|------------------------------------------------------|
| id             | UUID                       | PK                                                                                         |
| serviceSlot    | ServiceSlot                | ManyToOne, CASCADE on delete                                                               |
| audience       | AnnouncementAudienceEnum   | ALL \| WORKERS_ONLY \| DEPARTMENT                                                          |
| department     | Department \| null         | Required when audience=DEPARTMENT                                                          |
| intervalPreset | ReminderIntervalPresetEnum | 15m \| 30m \| 1h \| 3h \| 24h \| 48h                                                      |
| enabled        | boolean                    | Admin can disable without deleting                                                         |
| lastSentAt     | timestamptz \| null        | Set when the reminder fires; prevents double-sending                                       |
| fireAt         | timestamptz \| null        | Pre-computed: `slot.startTime − preset_minutes`. Set on create and on interval preset update; used by the dispatch cron to filter in SQL (no in-memory filtering) |

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
| selfMarkClosesAt  | timestamptz \| null | Non-null and in the future means the self-mark window is open |
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

### TitheAccount

Finance-team-managed list of bank accounts members can pay tithes into. Each account carries its own currency so the church can accept payments in multiple currencies (e.g. NGN, USD).

| Field         | Type    | Notes                                                        |
|---------------|---------|--------------------------------------------------------------|
| id            | UUID    | PK                                                           |
| bankName      | string  |                                                              |
| accountNumber | string  | Indexed                                                      |
| accountName   | string  |                                                              |
| currency      | string  | ISO 4217 code (3 chars). Indexed.                            |
| description   | string \| null | Optional note shown to members                        |
| isActive      | boolean | Default `true`. Inactive accounts are hidden from members. Indexed. |

**Indexes:** `idx_tithe_accounts_account_number`, `idx_tithe_accounts_currency`, `idx_tithe_accounts_is_active`.

### TitheUploadBatch

A batch record created when the finance team uploads an Excel file of tithe payments. Each batch is tied to a specific `TitheAccount`, so all records in the batch are credited to that account.

| Field         | Type               | Notes                                            |
|---------------|--------------------|--------------------------------------------------|
| id            | UUID               | PK                                               |
| uploadedBy    | Admin              | ManyToOne                                        |
| titheAccount  | TitheAccount       | ManyToOne (non-nullable, RESTRICT)               |
| fileName      | string             |                                                  |
| status        | TitheBatchStatus   | PENDING \| PROCESSING \| COMPLETED \| FAILED     |
| totalRows     | int                | Total rows in the spreadsheet                    |
| matchedRows   | int                | Rows matched to a member                         |
| unmatchedRows | int                | Rows with no member match                        |
| disputedRows  | int                | Rows flagged as possible duplicates              |
| rows          | jsonb \| null      | Parsed row data stored for safe requeue          |
| errorMessage  | string \| null     | Error detail on FAILED batches                   |
| processedAt   | timestamptz \| null| Set when processing completes                    |

### TitheRecord

A confirmed tithe payment matched to a member.

| Field       | Type    | Notes                                  |
|-------------|---------|----------------------------------------|
| id          | UUID    | PK                                     |
| member      | Member  | ManyToOne                              |
| batch       | TitheUploadBatch | ManyToOne                    |
| amount      | decimal (12,2)  |                               |
| paymentDate | date    |                                        |
| reference   | string \| null | Optional bank reference        |
| bankName    | string \| null | Sender's bank from the CSV column — not the destination account |

**Duplicate detection:** `(memberId, paymentDate, amount)` — if all three match an existing record, the row is flagged as a dispute instead. The destination bank account is inherited from the batch's `titheAccount`.

### TitheUnmatchedRecord

Rows from a batch where no member matched the email address.

| Field         | Type                    | Notes                                        |
|---------------|-------------------------|----------------------------------------------|
| id            | UUID                    | PK                                           |
| batch         | TitheUploadBatch        | ManyToOne                                    |
| rawEmail      | string                  | Email from the spreadsheet                   |
| amount        | decimal (12,2)          |                                              |
| paymentDate   | date                    |                                              |
| reference     | string \| null          |                                              |
| bankName      | string \| null          |                                              |
| status        | TitheUnmatchedStatus    | PENDING \| MATCHED \| DISMISSED              |
| matchedMember | Member \| null          | Set when manually resolved                   |
| resolvedBy    | Admin \| null           | Set when manually resolved                   |
| resolvedAt    | timestamptz \| null     |                                              |

### TitheDisputeRecord

Rows that matched a member but would duplicate an existing `TitheRecord`.

| Field          | Type               | Notes                                   |
|----------------|--------------------|-----------------------------------------|
| id             | UUID               | PK                                      |
| batch          | TitheUploadBatch   | ManyToOne                               |
| existingRecord | TitheRecord        | ManyToOne — the conflicting record      |
| member         | Member             | ManyToOne                               |
| amount         | decimal (12,2)     |                                         |
| paymentDate    | date               |                                         |
| reference      | string \| null     |                                         |
| bankName       | string \| null     |                                         |
| status         | TitheDisputeStatus | PENDING \| APPROVED \| REJECTED         |
| reviewedBy     | Admin \| null      |                                         |
| reviewedAt     | timestamptz \| null|                                         |

### TithePaymentProof

A member-submitted proof of tithe payment awaiting finance-team review. Files are stored in Cloudinary and automatically purged after a configurable number of days (default 90, controlled by `TITHE_PROOF_EXPIRY_DAYS`).

| Field        | Type             | Notes                                                 |
|--------------|------------------|-------------------------------------------------------|
| id           | UUID             | PK                                                    |
| member       | Member           | ManyToOne. Indexed.                                   |
| titheAccount | TitheAccount     | ManyToOne (non-nullable, RESTRICT). Indexed.          |
| amount       | decimal (12,2)   |                                                       |
| paymentDate  | date             | Indexed.                                              |
| reference    | string \| null   |                                                       |
| proofUrl     | string           | Cloudinary secure URL                                 |
| publicId     | string           | Cloudinary public ID (used for deletion)              |
| resourceType | string           | Cloudinary resource type returned at upload           |
| status       | TitheProofStatus | PENDING \| CONFIRMED \| DECLINED                      |
| reviewedBy   | Admin \| null    |                                                       |
| reviewedAt   | timestamptz \| null |                                                    |
| financeNote  | string \| null   | Reason supplied when declining                        |
| expiresAt    | timestamptz      | Set to `TITHE_PROOF_EXPIRY_DAYS` days from submission (default 90); file purged on expiry |

### FinanceCategory

Admin-managed list of expense categories used on finance requests.

| Field       | Type   | Notes  |
|-------------|--------|--------|
| id          | UUID   | PK     |
| name        | string | Unique |
| description | string \| null |   |

### FinanceRequest

An expense request raised by a department head (HOD).

| Field                | Type                 | Notes                                              |
|----------------------|----------------------|----------------------------------------------------|
| id                   | UUID                 | PK                                                 |
| requestedBy          | Member               | ManyToOne — the HOD who submitted the request      |
| department           | Department           | ManyToOne                                          |
| category             | FinanceCategory      | ManyToOne                                          |
| reason               | text                 | Justification for the expense                      |
| amount               | decimal (12,2)       |                                                    |
| recipientBankName    | string               |                                                    |
| recipientAccountNumber | string             |                                                    |
| recipientAccountName | string               |                                                    |
| attachmentUrl        | string \| null       | Cloudinary URL for optional budget/invoice upload  |
| attachmentPublicId   | string \| null       | Cloudinary public ID for attachment (deletion)     |
| attachmentResourceType | string \| null     | Cloudinary resource type returned at upload        |
| status               | FinanceRequestStatus | PENDING \| APPROVED \| REJECTED                    |
| reviewedBy           | Admin \| null        | Set on approve/reject                              |
| reviewedAt           | timestamptz \| null  |                                                    |
| rejectionReason      | text \| null         | Populated on rejection                             |
| proofUrl             | string \| null       | Cloudinary URL for payment proof, set post-approval|
| proofPublicId        | string \| null       | Cloudinary public ID for proof (deletion)          |
| proofResourceType    | string \| null       | Cloudinary resource type for proof                 |

### FirstTimer

A visitor recorded by a follow-up team worker or admin during or after a service.

| Field                | Type                    | Notes                                                                      |
|----------------------|-------------------------|----------------------------------------------------------------------------|
| id                   | UUID                    | PK                                                                         |
| firstname            | string                  |                                                                            |
| lastname             | string                  |                                                                            |
| phone                | string                  |                                                                            |
| email                | string \| null          | Optional                                                                   |
| source               | FirstTimerSourceEnum    | WALK_IN \| ONLINE \| REFERRAL                                              |
| wantsToJoinChurch    | boolean                 | Default `false`                                                            |
| enjoyedAboutChurch   | text \| null            | What the visitor enjoyed                                                   |
| wantsToJoinWorkforce | boolean                 | Default `false`                                                            |
| notes                | text \| null            | Additional follow-up notes                                                 |
| visitedEvent         | Event \| null           | ManyToOne, SET NULL on delete                                              |
| createdByMember      | Member \| null          | ManyToOne, SET NULL on delete — the follow-up worker who created the record|
| createdByAdmin       | Admin \| null           | ManyToOne, SET NULL on delete — the admin who created the record           |
| followUpTask         | FollowUpTask            | OneToOne — auto-created on registration                                    |

### FollowUpTask

A task assigned to a follow-up team worker to engage a first-timer or online non-responder.

| Field        | Type                    | Notes                                                                                  |
|--------------|-------------------------|----------------------------------------------------------------------------------------|
| id           | UUID                    | PK                                                                                     |
| type         | FollowUpTaskTypeEnum    | FIRST_TIMER \| ONLINE_NO_RESPONSE \| MANUAL                                            |
| status       | FollowUpTaskStatusEnum  | PENDING \| IN_PROGRESS \| COMPLETED \| UNREACHABLE                                     |
| firstTimer   | FirstTimer \| null      | OneToOne, CASCADE on delete — set when type=FIRST_TIMER                                |
| member       | Member \| null          | ManyToOne, SET NULL on delete — set when type=ONLINE_NO_RESPONSE                       |
| event        | Event \| null           | ManyToOne, SET NULL on delete — event context                                          |
| assignedTo   | WorkerProfile           | ManyToOne, RESTRICT on delete — must be a FOLLOW_UP department worker                  |
| outcome      | FollowUpOutcomeEnum \| null | JOINED \| DECLINED \| NO_ANSWER \| PRAYED_WITH                                     |
| outcomeNotes | text \| null            |                                                                                        |
| dueDate      | date \| null            | Optional target date                                                                   |
| notes        | FollowUpNote[]          | OneToMany                                                                              |

**Round-robin assignment:** The worker in the FOLLOW_UP department with the fewest open tasks (PENDING or IN_PROGRESS) is automatically selected. If no eligible worker exists, the API returns 400.

### FollowUpNote

A note added by the assigned worker during follow-up interactions.

| Field    | Type            | Notes                              |
|----------|-----------------|------------------------------------|
| id       | UUID            | PK                                 |
| task     | FollowUpTask    | ManyToOne, CASCADE on delete       |
| addedBy  | WorkerProfile \| null | ManyToOne, SET NULL on delete |
| content  | text            |                                    |

---

### ServiceProgramme

One programme per service slot (unique constraint on `service_slot_id`). Status flows: `DRAFT → LIVE → COMPLETED`.

| Field          | Type              | Notes                                   |
|----------------|-------------------|-----------------------------------------|
| id             | UUID              | PK                                      |
| serviceSlot    | ServiceSlot       | OneToOne, CASCADE on delete             |
| status         | varchar           | DRAFT \| LIVE \| COMPLETED              |
| saveAsTemplate | boolean           | If true, upserts template on completion |
| createdByAdmin | Admin \| null     | ManyToOne, SET NULL on delete           |

### ServiceProgrammeSlot

Ordered items within a programme. Frozen when session starts; runtime changes go to `ServiceSessionSlot`.

| Field            | Type          | Notes                             |
|------------------|---------------|-----------------------------------|
| id               | UUID          | PK                                |
| programme        | ServiceProgramme | ManyToOne, CASCADE on delete   |
| position         | int           | Zero-based order index            |
| type             | varchar       | SPEAKER \| BREAK                  |
| topic            | varchar \| null |                                 |
| member           | Member \| null | Assigned speaker; SET NULL on delete |
| guestName        | varchar \| null | Free-text name for non-members  |
| backupMember     | Member \| null | Backup speaker; SET NULL on delete |
| backupGuestName  | varchar \| null |                                 |
| allocatedMinutes | int           | Planned slot duration             |

### ServiceSession

One session per programme (unique constraint on `programme_id`). Created when a session starts.

| Field       | Type            | Notes                           |
|-------------|-----------------|---------------------------------|
| id          | UUID            | PK                              |
| programme   | ServiceProgramme | OneToOne, CASCADE on delete    |
| sessionCode | varchar         | Unique, e.g. `SVC-ABC123`       |
| status      | varchar         | LIVE \| COMPLETED               |
| startedAt   | timestamptz     |                                 |
| endedAt     | timestamptz \| null |                             |

**Redis anchor** (`session:{sessionCode}:anchor`, TTL 48 h after completion):
```json
{ "currentSlotPosition": 0, "slotStartedAt": 1718000000000, "slotBaseSeconds": 0,
  "status": "LIVE", "isPaused": false, "pausedAt": null }
```
Clients compute `elapsed = slotBaseSeconds + (Date.now() - slotStartedAt) / 1000`. No server-side ticker.

### ServiceSessionSlot

Snapshot of each programme slot at session start. Runtime overrides stored here; planned data stays on `ServiceProgrammeSlot`.

| Field                    | Type          | Notes                                  |
|--------------------------|---------------|----------------------------------------|
| id                       | UUID          | PK                                     |
| session                  | ServiceSession | ManyToOne, CASCADE                    |
| programmeSlot            | ServiceProgrammeSlot | ManyToOne, CASCADE              |
| position                 | int           |                                        |
| status                   | varchar       | PENDING \| IN_PROGRESS \| COMPLETED \| SKIPPED |
| adjustedAllocatedMinutes | int \| null   | Runtime time override                  |
| overriddenTopic          | varchar \| null |                                      |
| overriddenSpeakerName    | varchar \| null | Display-only; analytics still uses member FK |
| overriddenMember         | Member \| null | If actual speaker changed mid-session  |
| actualSeconds            | int \| null   | Measured speaking time                 |
| startedAt                | timestamptz \| null |                                  |
| completedAt              | timestamptz \| null |                                  |

### ServicePauseEntry

One row per pause event during a session.

| Field       | Type          | Notes                  |
|-------------|---------------|------------------------|
| id          | UUID          | PK                     |
| session     | ServiceSession | ManyToOne, CASCADE    |
| slotPosition| int           | Slot active at pause time |
| reason      | varchar       | ServicePauseReasonEnum |
| pausedAt    | timestamptz   |                        |
| resumedAt   | timestamptz \| null | Null until resumed |

### ServiceActionEntry

Audit log of all control actions taken during a session.

| Field             | Type          | Notes                      |
|-------------------|---------------|----------------------------|
| id                | UUID          | PK                         |
| session           | ServiceSession | ManyToOne, CASCADE        |
| actorRole         | varchar       | ADMIN \| WORKER            |
| action            | varchar       | e.g. ADVANCE_SLOT, PAUSE   |
| detail            | varchar \| null |                          |
| performedByMember | Member \| null | SET NULL on delete        |

### ServiceProgrammeTemplate

Auto-upserted when a session with `saveAsTemplate = true` completes. Minister assignments are always blank — only structure is saved.

| Field           | Type            | Notes                                    |
|-----------------|-----------------|------------------------------------------|
| id              | UUID            | PK                                       |
| name            | varchar         | e.g. "First Service"                     |
| serviceSlotName | varchar         | Match key for auto-suggestion            |
| slots           | jsonb           | `[{ position, type, topic, allocatedMinutes }]` |
| createdFrom     | ServiceProgramme \| null | SET NULL on delete               |

### ServiceHeadcount

Physical attendance count record for one service slot, broken down by demographic group.

| Field        | Type                    | Notes                                                          |
|--------------|-------------------------|----------------------------------------------------------------|
| id           | UUID                    | PK                                                             |
| serviceSlot  | ServiceSlot             | ManyToOne, CASCADE on delete                                   |
| maleAdults   | int                     | Default 0                                                      |
| femaleAdults | int                     | Default 0                                                      |
| teenagers    | int                     | Default 0                                                      |
| children     | int                     | Default 0                                                      |
| mobileChurch | int                     | Default 0 — count from the mobile outreach venue (fixed group) |
| customGroups | jsonb                   | `Record<string, number>` — extensible free-form groups         |
| recordedBy   | Admin \| null           | ManyToOne, SET NULL on delete — admin who submitted the record |
| notes        | text \| null            | Optional context note for the record                           |

**Computed field:** `total` is not stored. It is computed on every read as the sum of all five fixed columns plus all values in `customGroups`. The value is appended to each response object.

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
- `PATCH /admin/users/:id` — `ADMIN_WRITE` — change admin role or active status; **an admin cannot modify their own record** (403)
- `POST /admin/users/:id/revoke` — `ADMIN_WRITE` — soft-revoke admin access (`isActive = false`)

**Security notes:**
- Admin user read endpoints (`GET /admin/users`, `GET /admin/users/me`, `GET /admin/users/:id`) strip `password` and `deviceId` from the joined Member before returning — these fields are never returned to API clients.
- Role-change audit entries capture the previous and new role name in addition to the changed field list.

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

Each slot can have multiple reminder schedules via sub-resource `/events/slots/:slotId/reminders` (admin-only). See EventReminder model.

**Reminder dispatch (cron `*/15 * * * *`):** Queries `EventReminder` rows where `enabled = true`, `lastSentAt IS NULL`, `fireAt <= now`, and `slot.startTime > now`. The filter runs entirely in SQL — `fireAt` is pre-computed at reminder creation (and recalculated if `intervalPreset` is updated). When a slot is deleted or recreated (e.g., event update), its reminders are cascade-deleted. On `create`, `fireAt = slot.startTime − preset_minutes`. On `update` with a new `intervalPreset`, `fireAt` is recalculated from the existing slot's `startTime`.

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

**Duplicate check-in:** The `(member, event)` unique constraint is enforced at DB level. If a member tries to check in twice for the same event, the service catches the `QueryFailedError` (PG error code `23505`) and returns `409 Conflict` with the message "You have already checked in for this event."

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

**Submission guards:**
- A worker with a `PENDING` request cannot submit another until the first is actioned.
- A worker cannot submit a request whose date range overlaps any already-approved leave (`dateFrom ≤ request.dateTo AND dateTo ≥ request.dateFrom`). Returns `400 Bad Request`.

**Date columns (`dateFrom`, `dateTo`):** stored as PostgreSQL `date` (no time component, format `YYYY-MM-DD`). Overlap checks compare date strings to avoid timezone shifts.

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

**Cloudinary (`CloudinaryService`):** Streams file uploads to Cloudinary via `upload_stream` with `resource_type: 'auto'`. Used for finance request attachments, payment proofs, and tithe payment proofs. `uploadBuffer(buffer, folder, filename?)` returns `{secureUrl, publicId, resourceType}` — callers must persist `publicId` and `resourceType` so that assets can be deleted without re-parsing the URL. `deleteByPublicId(publicId, resourceType)` destroys the asset using the stored values (replaces the old `deleteByUrl` which hardcoded `resource_type: 'raw'`). The service validates all three credentials on module init and throws if any are missing. Credentials are read from `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

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

**Cron:** Runs daily at 6 AM. Queries all active members whose `birthMonth` and `birthDay` match today and whose `birthdayGreetedYear` is not the current year, then for each member (in an isolated try/catch):

- Creates an `ALL`-audience announcement with `expiresAt = 23:59:59` tonight
- Updates `birthdayGreetedYear` to the current year (only after the announcement saves)
- Sends the birthday email (fire-and-forget via email queue)

**Resilience:** `BirthdayService` implements `OnApplicationBootstrap`. On startup, if the hour is ≥ 6, it fires `triggerBirthdayGreetings()` as a background task (fire-and-forget, guarded by a separate `lock:birthday-catchup` Redis lock). This recovers greetings missed because the app was down at 6 AM — the `birthdayGreetedYear` field prevents re-sending to members already greeted. Per-member isolation means one member's failure never blocks the rest.

**`birthdayGreetedYear`:** Integer column (`smallint`) on the `Member` entity. Null for members who have never been greeted. Set to the current year after a successful greeting. The cron and catch-up both filter `WHERE birthdayGreetedYear IS NULL OR birthdayGreetedYear != currentYear` to skip already-greeted members.

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
- A session is created per class per date. Staff open a timed self-mark window via `PATCH /sessions/:id/open` (body: `{ closesInMinutes: 5–480 }`); members may self-mark only while `selfMarkClosesAt` is non-null and in the future. Staff can close the window early via `PATCH /sessions/:id/close`. No cron job required — the window expires automatically at query time.
- Bulk marking is used by teachers/staff; self-mark (`POST /sunday-school/sessions/:id/checkin`) is used by individual
  members.

**Routes prefix:** `/sunday-school`

### Tithe Module

Enables the finance team to manage bank accounts, upload Excel tithe payment sheets, and review member proof submissions. Members can view their own records, request PDF statements, and submit proof of offline payments.

**Account management:** The finance team maintains a list of tithe bank accounts (`TitheAccount`) — one per physical bank account. Each account has its own currency (ISO 4217), enabling the church to accept NGN, USD, and any other currency simultaneously. Members and workers can browse active accounts at `GET /tithes/accounts`. Admins manage accounts via:

| Method | Route | Permission | Notes |
|--------|-------|------------|-------|
| `POST` | `/admin/tithes/accounts` | `FINANCE_WRITE` | Create account. 409 if `(accountNumber, bankName)` already exists. |
| `GET` | `/admin/tithes/accounts` | `FINANCE_READ` | Lists all accounts (active and inactive), ordered by `currency ASC, bankName ASC`. |
| `PATCH` | `/admin/tithes/accounts/:id` | `FINANCE_WRITE` | Update account details. |
| `GET` | `/admin/tithes/accounts/:id/summary` | `FINANCE_READ` | Aggregate totals for one account. See below. |

**Account summary (`GET /admin/tithes/accounts/:id/summary`):** Accepts optional `fromMonth` / `toMonth` (`YYYY-MM`) query params and returns:
```json
{
  "account": { "...": "TitheAccount fields" },
  "fromMonth": "2026-01",
  "toMonth": "2026-06",
  "bulkTotal": 500000,
  "bulkCount": 45,
  "proofTotal": 75000,
  "proofCount": 8,
  "grandTotal": 575000
}
```
`bulkTotal`/`bulkCount` aggregate confirmed `TitheRecord` rows whose batch is linked to this account. `proofTotal`/`proofCount` aggregate `CONFIRMED` `TithePaymentProof` rows linked directly to this account.

**Upload flow:**
1. Finance admin selects a `TitheAccount` and uploads `.xlsx` via `POST /admin/tithes/upload` (multipart, field name `file`; body field `titheAccountId`).
2. Service validates that the account exists and is active, validates required columns (`Email`, `Amount`, `Payment Date`), and returns 400 immediately for invalid input.
3. A `TitheUploadBatch` record is created (linked to the account, with parsed rows stored as JSONB for safe requeue) and a Bull job (`tithe` queue, `process-batch` job) is dispatched with `attempts: 3, removeOnFail: false`.
4. The processor runs asynchronously inside a **database transaction**: matches each row to a member by email (case-insensitive), creates `TitheRecord` for matches, `TitheUnmatchedRecord` for no-match rows, and `TitheDisputeRecord` for rows that duplicate an existing record by `(memberId, paymentDate, amount)`. The transaction ensures idempotent retries — a mid-batch failure rolls back all inserts so the next attempt starts from a clean slate.

**Failed batch requeue:** If a batch reaches `FAILED` status, a finance admin can requeue it via `POST /admin/tithes/batches/:id/requeue`. The stored `rows` JSONB field is used to reconstruct the job without re-uploading the file.

**Excel template:** Three-sheet workbook — `Tithe Template` (headers only), `Instructions`, `Sample`. Served at `GET /admin/tithes/template`.

**Admin records list:** `GET /admin/tithes/records` returns all confirmed tithe records (paginated, `FINANCE_READ`). Supports the following query params:

| Param | Type | Description |
|---|---|---|
| `memberId` | UUID | Filter to one specific member |
| `departmentId` | UUID | Filter to tithes paid by workers in that department |
| `fromMonth` | `YYYY-MM` | Start of payment date range (inclusive) |
| `toMonth` | `YYYY-MM` | End of payment date range (inclusive, last day of month) |
| `search` | string | Wildcard match on member firstname, lastname, or email |
| `accountId` | UUID | Filter to records tied to a specific tithe account |
| `page` / `limit` | int | Pagination (default 1 / 20) |

`GET /admin/tithes/records/download` accepts the same filters (no pagination) and returns an `.xlsx` file with columns: Member Name, Email, Account (bank name), Currency, Amount, Payment Date, Sender Bank, Reference.

**Member visibility:** Members view their own tithes at `GET /tithes/me` and request a PDF statement emailed to them at `POST /tithes/me/download`. Optional query params `fromMonth` and `toMonth` (format `YYYY-MM`) filter the records included in the statement and display a period range in the PDF (e.g. `?fromMonth=2026-01&toMonth=2026-06`). If only one bound is supplied the other is open-ended.

**Tithe payment proof:** Members and workers submit proof of an offline tithe payment via `POST /tithes/proof` (multipart, field: `file`, max 2 MB; body field `titheAccountId` — the account they paid into). The file is uploaded to Cloudinary and a `TithePaymentProof` record is created with status `PENDING` and `expiresAt` set to `TITHE_PROOF_EXPIRY_DAYS` days from submission (default 90). Finance team admins review proofs at `GET /admin/tithes/proofs` and can `CONFIRM` or `DECLINE` each one. Confirming or declining triggers an email to the member that includes the bank name and account-level currency. A daily cron at `03:00 UTC` (with distributed Redis lock `lock:tithe-proof-cleanup`) finds all expired proofs (`expiresAt ≤ now`), deletes each file from Cloudinary using the stored `publicId` + `resourceType`, and removes the DB rows.

**Routes prefix (admin):** `/admin/tithes`  
**Routes prefix (member):** `/tithes`

### Finance Request Module

Manages expense requests raised by department heads (HODs) through a finance team review lifecycle.

**Lifecycle:** `PENDING → APPROVED / REJECTED`. On approval, the finance team attaches proof of payment via a
separate `PATCH /:id/proof` endpoint.

**Self-approve guard:** An admin cannot approve a request they submitted. Returns `403 Forbidden`.

**Proof replacement:** If `PATCH /:id/proof` is called on a request that already has a proof file, the old Cloudinary asset is deleted before uploading the new one. If the delete fails (network error, already removed), the error is logged and the upload proceeds anyway — the old asset may be orphaned but the request is not blocked.

**Email notifications:**
- On creation → all active admins with `FINANCE_WRITE` permission are notified (filtered in SQL via `ANY(r.permissions)`)
- On approve/reject/proof → the HOD who raised the request is notified

**HOD enforcement:** Only workers with a lead assignment (`DepartmentLead` record) can create or view department
requests. A worker can only raise a request for their own department (verified server-side).

**Admin list filters:** `GET /admin/finance/requests` now accepts additional query params for richer filtering:

| Param | Type | Description |
|---|---|---|
| `status` | enum | `PENDING \| APPROVED \| REJECTED` |
| `categoryId` | UUID | Filter to a specific expense category |
| `memberId` | UUID | Filter to requests raised by a specific member |
| `departmentId` | UUID | Filter to requests raised by a specific department |
| `search` | string | Wildcard match on requester name, email, or reason text |
| `page` / `limit` | int | Pagination (default 1 / 20) |

`GET /admin/finance/requests/download` accepts the same filters (no pagination) and returns an `.xlsx` file with columns: Requester, Email, Department, Category, Amount (NGN), Status, Reason, Reviewed By, Reviewed At, Rejection Reason.

**Routes prefix (admin):** `/admin/finance`  
**Routes prefix (worker):** `/finance`

### Follow-Up Module

Handles first-timer registration, follow-up task management, and post-event engagement workflows.

**First-timer registration** is available on both the worker mobile app (workers in the FOLLOW_UP department) and the admin portal (admins with `FOLLOW_UP_WRITE`). On creation, a `FollowUpTask` of type `FIRST_TIMER` is automatically created and assigned via round-robin to the FOLLOW_UP-department worker with the fewest open tasks. The pick and task creation run inside a single transaction protected by a PostgreSQL advisory lock (`pg_advisory_xact_lock(hashtext('follow-up:round-robin'))`), serializing concurrent registrations so the open-task count is always accurate.

**Post-event jobs (Bull queue `follow-up`):**

1. After `markAbsentees()` completes for an event, a `post-event` Bull job is dispatched.
2. `PostEventProcessor.handlePostEvent` sends thank-you emails to all PRESENT/LATE members.
3. If `event.onlineAttendanceEnabled = true`: sends online-confirm request emails to ABSENT members, sets `event.onlineNotificationSentAt`, and schedules a `online-window-closed` delayed job (`ONLINE_CHECKIN_WINDOW_HOURS` hours later, default 3).
4. `handleOnlineWindowClosed` creates `ONLINE_NO_RESPONSE` follow-up tasks for all members still marked ABSENT.

**Online confirm flow:**

Members receive an email after an online-attendance-enabled event. They confirm via `POST /attendances/online-confirm { eventId }`. The system:
1. Checks `event.onlineAttendanceEnabled = true`
2. Validates that `now ≤ onlineNotificationSentAt + ONLINE_CHECKIN_WINDOW_HOURS`
3. Finds the ABSENT record for `(member, event)` and updates status to `ATTENDED_ONLINE`

**Task assignment email:** When a `FollowUpTask` is created (first-timer registration or online non-responder) or reassigned, an email is sent to the assigned worker using the `follow-up-task-assigned` template. Includes the first-timer's name, phone, email, and due date. Fire-and-forget via the `email` Bull queue.

**Overdue escalation (daily cron at 08:00):** `FollowUpScheduler.escalateOverdueTasks` runs every day at 08:00. It finds all tasks with status `PENDING` or `IN_PROGRESS` where `dueDate < NOW()`. Each affected worker receives a digest email (`follow-up-overdue-worker`) listing all their overdue contacts. All active admins with `FOLLOW_UP_WRITE` permission receive a summary count email (`follow-up-overdue-admin`).

**Due date:** Tasks auto-set `dueDate = createdAt + FOLLOW_UP_DUE_DAYS` (default 3 days).

**Pastoral report:** `GET /admin/follow-up/report?from=&to=` (requires `FOLLOW_UP_READ`) returns aggregate stats: first-timer totals, source breakdown, wants-to-join counts, task status/outcome breakdown, overdue snapshot, conversion rate, per-worker performance, and per-event first-timer counts. Date range is optional; omitting it returns all-time stats.

**Routes (worker mobile):** `/follow-up/first-timers`, `/follow-up/tasks/mine`, `/follow-up/tasks/:id`  
**Routes (admin portal):** `/admin/follow-up/first-timers`, `/admin/follow-up/tasks`, `/admin/follow-up/tasks/:id/reassign`, `/admin/follow-up/tasks/bulk`, `/admin/follow-up/report`

### ServiceHeadcount Module

Records and retrieves physical attendance counts for services, broken down by demographic group. All routes are admin-portal only (`AdminGuard`). Headcount data can be filtered by service slot, date range, or slot name; trends are bucketed by week, month, or quarter.

**Entity:** `ServiceHeadcount` — one record per slot per submission. Admins with `HEADCOUNT_WRITE` can submit corrections by patching an existing record.

**Computed total:** Every response includes a `total` field (sum of fixed groups + all `customGroups` values). Not stored in DB.

**Trends:** `GET /service-headcount/trends` returns bucketed data. Each bucket is keyed by `periodLabel + serviceSlotName` so multiple slots on the same Sunday appear as separate series.

**Routes prefix:** `/service-headcount`

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

### ServiceProgramme Module

Backend replacement for the Firebase-based Service Timer POC. Manages service programme creation, live session control, real-time state broadcast, and post-session analytics.

**Architecture:**
- `ServiceProgramme` and its slots are authored during the week (DRAFT status).
- When a session starts, the programme transitions to LIVE and a `ServiceSession` is created along with `ServiceSessionSlot` snapshot rows (one per programme slot).
- Live state (current slot, timer anchor, pause state) is held in Redis. Clients compute the display timer locally using: `elapsed = slotBaseSeconds + (Date.now() - slotStartedAt) / 1000`.
- Every state change (advance, rewind, pause, resume, override) updates Redis and writes durable records to the DB.
- A Socket.IO gateway at namespace `/service-session` broadcasts `session:state` events to all room subscribers after every mutation. Clients join with `{ sessionCode }` — no authentication required to subscribe.
- When the session ends, remaining PENDING slots are marked SKIPPED, the programme status moves to COMPLETED, and if `saveAsTemplate = true` the programme is auto-saved as a `ServiceProgrammeTemplate`. A session-report email is fire-and-forget dispatched to all active Admin department workers via Bull queue (template: `service-session-report`).

**Access control:**
- Programme CRUD and reporting: `AdminGuard` + `SERVICE_PROGRAMME_READ` (reads) or `SERVICE_PROGRAMME_WRITE` (mutations). Assign these permissions to admin roles via the role management API.
- Session control (start, advance, rewind, pause, resume, override, end): `RolesGuard (WORKER)` + Admin department key check (`DepartmentKeyEnum.ADMIN`) — mobile app flow, no admin token required.
- Session state read (`GET /service-session/:code/state`) and speaker slot view (`GET /service-session/:code/slots/:position`): unauthenticated — session code is the access credential.
- `ADMIN_WRITE` permission controls who can assign `SERVICE_PROGRAMME_READ` / `SERVICE_PROGRAMME_WRITE` to admin roles.

**WebSocket:**
- Namespace: `/service-session`
- Client event `joinSession({ sessionCode })` → joins room `session:{sessionCode}`
- Client event `leaveSession({ sessionCode })` → leaves room
- Server event `session:state` → `{ anchor: SessionAnchor, session: Partial<ServiceSession> }`

**Routes prefix:** `/service-programme`, `/service-session`

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
| GET    | /members/me                                                | Any (JwtAuthGuard)                                            | Own member profile with workerProfile + department relations                                                  |
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
| POST   | /attendances/checkin                                       | Any                                                           | Check in to a service slot (workers must include `location`; one record per event per member)                 |
| GET    | /attendances/my-history                                    | Any                                                           | Own attendance records                                                                                        |
| GET    | /attendances/history                                       | AdminGuard (ATTENDANCE_READ)                                  | All attendance records                                                                                        |
| GET    | /attendances/history/department?slotId=                    | WORKER                                                        | Department attendance for a slot (scoped to caller's own department via lead role)                            |
| GET    | /attendances/department/event/:eventId                     | WORKER                                                        | Worker attendance for all slots of an event (scoped to caller's own department via lead role)                 |
| GET    | /attendances/summary/slot/:slotId                          | AdminGuard (ATTENDANCE_READ)                                  | Status counts for a slot                                                                                      |
| GET    | /attendances/leaderboard                                   | AdminGuard (ATTENDANCE_READ)                                  | Top workers by attendance                                                                                     |
| PATCH  | /attendances/:id/correct                                   | AdminGuard (ATTENDANCE_WRITE)                                 | Admin correction of an attendance record status                                                               |
| POST   | /attendances/online-confirm                                | JwtAuthGuard (any authenticated member)                       | Confirm online attendance for an event (updates ABSENT → ATTENDED_ONLINE within window)                       |
| POST   | /follow-up/first-timers                                    | WORKER (FOLLOW_UP dept)                                       | Register a first-timer (auto-creates FollowUpTask via round-robin)                                            |
| GET    | /follow-up/tasks/mine                                      | WORKER (FOLLOW_UP dept)                                       | List follow-up tasks assigned to the caller                                                                   |
| PATCH  | /follow-up/tasks/:id                                       | WORKER (FOLLOW_UP dept)                                       | Update task status/outcome/notes (caller must be the assignee)                                                |
| POST   | /admin/follow-up/first-timers                              | AdminGuard (FOLLOW_UP_WRITE)                                  | Register a first-timer from admin portal                                                                      |
| GET    | /admin/follow-up/first-timers                              | AdminGuard (FOLLOW_UP_READ)                                   | List all first-timers (filterable by eventId)                                                                 |
| GET    | /admin/follow-up/tasks                                     | AdminGuard (FOLLOW_UP_READ)                                   | List all follow-up tasks (filterable by status, type)                                                         |
| PATCH  | /admin/follow-up/tasks/:id/reassign                        | AdminGuard (FOLLOW_UP_WRITE)                                  | Reassign a task to a different FOLLOW_UP-dept worker                                                          |
| PATCH  | /admin/follow-up/tasks/bulk                                | AdminGuard (FOLLOW_UP_WRITE)                                  | Bulk update task statuses                                                                                     |
| GET    | /admin/follow-up/report                                    | AdminGuard (FOLLOW_UP_READ)                                   | Pastoral report: first-timer totals, task stats, overdue count, conversion rate, by-worker, by-event         |
| POST   | /events                                                    | AdminGuard (EVENTS_WRITE)                                     | Create event (single or recurring)                                                                            |
| PATCH  | /events/:id                                                | AdminGuard (EVENTS_WRITE)                                     | Update event                                                                                                  |
| GET    | /events/:id                                                | Any                                                           | Get event by ID                                                                                               |
| GET    | /events                                                    | Any                                                           | List events. Query: `page`, `limit`, `orderBy`, `order`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `upcoming=true` |
| DELETE | /events/:id                                                | AdminGuard (EVENTS_WRITE)                                     | Delete single event — blocked if `attendanceMarked = true` or event is in the past                           |
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
| GET    | /birthday/today                                            | Any (JwtAuthGuard)                                            | List active members with a birthday today (birthDay + birthMonth match current date)                          |
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
| PATCH  | /sunday-school/sessions/:id/open                           | WORKER (SS-dept or class teacher)                             | Open self-mark window for N minutes (body: `{ closesInMinutes }`)                                            |
| PATCH  | /sunday-school/sessions/:id/close                          | WORKER (SS-dept or class teacher)                             | Close self-mark window immediately                                                                            |
| GET    | /sunday-school/sessions/open                               | Any authenticated member                                      | List sessions with an active self-mark window that the member is enrolled in                                  |
| GET    | /sunday-school/attendance/me                               | Any authenticated member                                      | Paginated list of the member's own Sunday School attendance history                                           |
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
| GET    | /admin/tithes/records                                      | AdminGuard (FINANCE_READ)                                     | List all confirmed tithe records (paginated); filters: `memberId`, `departmentId`, `fromMonth`, `toMonth`, `search` |
| GET    | /admin/tithes/records/download                             | AdminGuard (FINANCE_READ)                                     | Download filtered tithe records as `.xlsx`; same query params as list endpoint, no pagination                 |
| GET    | /admin/tithes/template                                     | AdminGuard (FINANCE_READ)                                     | Download the tithe upload Excel template (3-sheet workbook)                                                   |
| POST   | /admin/tithes/upload                                       | AdminGuard (FINANCE_WRITE)                                    | Upload tithe payment Excel; validates headers, creates batch, dispatches Bull job                              |
| GET    | /admin/tithes/batches                                      | AdminGuard (FINANCE_READ)                                     | List all upload batches (paginated)                                                                           |
| GET    | /admin/tithes/batches/:id                                  | AdminGuard (FINANCE_READ)                                     | Get batch by ID                                                                                               |
| POST   | /admin/tithes/batches/:id/requeue                          | AdminGuard (FINANCE_WRITE)                                    | Requeue a FAILED batch using stored row data; resets status to PENDING                                        |
| GET    | /admin/tithes/unmatched?status=&page=&limit=               | AdminGuard (FINANCE_READ)                                     | List unmatched rows; `status` defaults to PENDING; pass MATCHED or DISMISSED to review resolved rows          |
| POST   | /admin/tithes/unmatched/:id/match                          | AdminGuard (FINANCE_WRITE)                                    | Manually match an unmatched row to a member; creates TitheRecord                                              |
| POST   | /admin/tithes/unmatched/:id/dismiss                        | AdminGuard (FINANCE_WRITE)                                    | Mark an unmatched row as DISMISSED (intentionally ignored)                                                    |
| GET    | /admin/tithes/disputes?status=&page=&limit=                | AdminGuard (FINANCE_READ)                                     | List dispute records; `status` defaults to PENDING; pass CONFIRMED_VALID or REJECTED to review resolved ones  |
| PATCH  | /admin/tithes/disputes/:id/approve                         | AdminGuard (FINANCE_WRITE)                                    | Approve a tithe dispute (creates TitheRecord)                                                                 |
| PATCH  | /admin/tithes/disputes/:id/reject                          | AdminGuard (FINANCE_WRITE)                                    | Reject a tithe dispute                                                                                        |
| GET    | /tithes/me                                                 | Any (JwtAuthGuard)                                            | Member's own tithe records (paginated)                                                                        |
| POST   | /tithes/me/download                                        | Any (JwtAuthGuard)                                            | Email a PDF tithe statement to the caller's registered email. Optional query: `fromMonth` (YYYY-MM), `toMonth` (YYYY-MM) — filters records to the date range and prints the period on the PDF |
| POST   | /tithes/proof                                              | Any (JwtAuthGuard)                                            | Submit tithe payment proof (multipart, field: file, max 2 MB); body: amount, paymentDate, bankName?, reference? |
| GET    | /tithes/proof                                              | Any (JwtAuthGuard)                                            | List caller's own tithe payment proofs (paginated)                                                            |
| GET    | /admin/tithes/proofs?status=&page=&limit=                  | AdminGuard (FINANCE_READ)                                     | List all tithe payment proofs; optional `status` filter (PENDING/CONFIRMED/DECLINED)                          |
| POST   | /admin/tithes/proofs/:id/confirm                           | AdminGuard (FINANCE_WRITE)                                    | Confirm a tithe payment proof; notifies member by email                                                       |
| POST   | /admin/tithes/proofs/:id/decline                           | AdminGuard (FINANCE_WRITE)                                    | Decline a tithe payment proof (body: financeNote); notifies member by email                                   |
| GET    | /admin/finance/categories                                  | AdminGuard (FINANCE_READ)                                     | List finance categories                                                                                       |
| POST   | /admin/finance/categories                                  | AdminGuard (FINANCE_WRITE)                                    | Create finance category                                                                                       |
| PATCH  | /admin/finance/categories/:id                              | AdminGuard (FINANCE_WRITE)                                    | Update finance category                                                                                       |
| GET    | /admin/finance/requests                                    | AdminGuard (FINANCE_READ)                                     | List finance requests (paginated); filters: `status`, `categoryId`, `memberId`, `departmentId`, `search`      |
| GET    | /admin/finance/requests/download                           | AdminGuard (FINANCE_READ)                                     | Download filtered finance requests as `.xlsx`; same query params as list endpoint, no pagination              |
| GET    | /admin/finance/requests/:id                                | AdminGuard (FINANCE_READ)                                     | Get finance request by ID                                                                                     |
| PATCH  | /admin/finance/requests/:id/approve                        | AdminGuard (FINANCE_WRITE)                                    | Approve a pending finance request — 403 if the approver is the same member who raised the request            |
| PATCH  | /admin/finance/requests/:id/reject                         | AdminGuard (FINANCE_WRITE)                                    | Reject a pending finance request (body: rejectionReason)                                                      |
| PATCH  | /admin/finance/requests/:id/proof                          | AdminGuard (FINANCE_WRITE)                                    | Attach payment proof to an approved request (multipart, field: file)                                          |
| GET    | /finance/categories                                        | WORKER (RolesGuard)                                           | List finance categories (visible to HOD for request creation)                                                 |
| POST   | /finance/requests                                          | WORKER — HOD only                                             | Raise a finance request for own department (multipart optional: attachment)                                   |
| GET    | /finance/requests                                          | WORKER — HOD only                                             | List own department's finance requests (paginated)                                                            |
| GET    | /finance/requests/:id                                      | WORKER — HOD only                                             | Get a single request from own department (includes proofUrl once attached)                                    |
| POST   | /service-programme                                         | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Create a programme linked to a service slot (one per slot)                                                    |
| GET    | /service-programme                                         | AdminGuard + SERVICE_PROGRAMME_READ                           | List all programmes paginated (query: page, limit)                                                            |
| GET    | /service-programme/templates                               | AdminGuard + SERVICE_PROGRAMME_READ                           | List all reusable programme templates ordered by name                                                         |
| DELETE | /service-programme/templates/:templateId                   | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Delete a template                                                                                             |
| GET    | /service-programme/:id                                     | AdminGuard + SERVICE_PROGRAMME_READ                           | Get a single programme with all slots and member relations                                                    |
| PATCH  | /service-programme/:id                                     | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Update programme metadata (saveAsTemplate flag)                                                               |
| DELETE | /service-programme/:id                                     | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Delete a DRAFT programme — 400 if LIVE or COMPLETED                                                          |
| POST   | /service-programme/:id/slots                               | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Append a slot (appended at next position)                                                                     |
| PUT    | /service-programme/:id/slots/reorder                       | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Reorder all slots (body: `{ slots: [{ id }] }` in desired order)                                             |
| PATCH  | /service-programme/:id/slots/:slotId                       | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Update a single slot — 400 if programme is not DRAFT                                                         |
| DELETE | /service-programme/:id/slots/:slotId                       | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Remove a slot — 400 if programme is not DRAFT                                                                |
| POST   | /service-programme/:id/apply-template/:templateId          | AdminGuard + SERVICE_PROGRAMME_WRITE                          | Apply a template to a DRAFT programme (clears existing slots, copies template structure)                      |
| GET    | /service-programme/event/:eventId/pdf                      | AdminGuard + SERVICE_PROGRAMME_READ                           | Download the full event programme as a PDF (application/pdf). Covers every service slot in the event ordered by start time. Each service shows its programme slots (type, topic, speaker, backup, minutes) or a "no programme" notice if not yet created. Filename derived from event name. |
| GET    | /service-programme/:id/pdf                                 | AdminGuard + SERVICE_PROGRAMME_READ                           | Download a single programme as a PDF (application/pdf). Includes slot name, event date/time, all slots with type, topic, speaker, backup, and allocated minutes. |
| GET    | /service-programme/:id/sessions                            | AdminGuard + SERVICE_PROGRAMME_READ                           | Paginated list of historical sessions for a programme (query: page, limit)                                    |
| POST   | /service-session/programme/:programmeId/start              | WORKER (Admin dept)                                           | Start a session for a DRAFT programme; returns session with sessionCode                                       |
| POST   | /service-session/:sessionCode/advance                      | WORKER (Admin dept)                                           | Advance to next slot; returns updated Redis anchor                                                            |
| POST   | /service-session/:sessionCode/rewind                       | WORKER (Admin dept)                                           | Go back to previous slot — 400 if already at first slot                                                      |
| POST   | /service-session/:sessionCode/pause                        | WORKER (Admin dept)                                           | Pause session (body: reason); creates ServicePauseEntry                                                       |
| POST   | /service-session/:sessionCode/resume                       | WORKER (Admin dept)                                           | Resume paused session; adjusts slotBaseSeconds to exclude pause duration                                      |
| POST   | /service-session/:sessionCode/slots/:position/override     | WORKER (Admin dept)                                           | Runtime override for a slot (speakerName, topic, allocatedMinutes, memberId)                                  |
| POST   | /service-session/:sessionCode/end                          | WORKER (Admin dept)                                           | End session; marks remaining slots SKIPPED; auto-saves template if saveAsTemplate                             |
| GET    | /service-session/analytics                                 | AdminGuard + SERVICE_PROGRAMME_READ                           | Aggregate analytics across COMPLETED sessions (query: from, to, serviceSlotName); overrun stats, avg times, top speakers |
| GET    | /service-session/:sessionCode/state                        | Public (no auth)                                              | Get live session state — anchor from Redis + programme data; used by presentation and speaker views           |
| GET    | /service-session/:sessionCode/slots/:position              | Public (no auth)                                              | Single slot state for speaker view — programmeSlot data, overrides, and current anchor                        |
| GET    | /service-session/:sessionCode/report                       | AdminGuard + SERVICE_PROGRAMME_READ                           | Formatted session report: duration, completion rate, per-slot overrun, pause log                              |
| GET    | /service-session/:sessionCode/report/pdf                   | AdminGuard + SERVICE_PROGRAMME_READ                           | Download session report as a PDF file — same data as JSON report, formatted for printing and sharing          |
| GET    | /service-session/event/:eventId/report/pdf                 | AdminGuard + SERVICE_PROGRAMME_READ                           | Download a full-event PDF covering all service slots in one document. Requires all sessions to be COMPLETED; returns 400 if any are still live and 404 if none exist. Includes variance summary table, per-slot allocated vs actual, slot variance (sum of individual slot overruns), and an ACCENT time-summary band per section. |
| GET    | /service-session/event/:eventId/report/summary-pdf         | AdminGuard + SERVICE_PROGRAMME_READ                           | Download a shareable one-page event summary PDF (admin access). Does NOT require sessions to be COMPLETED — works at any point after at least one session has started. Contains 4 stat cards (Speakers Done, Total Allocated, Total Actual, Overall Variance) and a single flat table across all services: # \| Speaker \| Topic/Slot \| Allocated \| Actual \| Variance \| Status. Times in MM:SS. Status labels: Over Time (red), Under Time/On Time (green), Not Used/Pending (muted). Returns 404 if no sessions exist. |
| GET    | /service-session/event/:eventId/summary-pdf                | JwtAuthGuard + WORKER + Admin dept (primary or secondary)     | Identical PDF to the admin route above, but accessible by workers in the Admin department (primary or secondary). Enforces `assertAdminDeptWorker` — returns 403 if the authenticated worker is not in the Admin department. Designed for mobile use: admin-dept workers can download and share the summary immediately after service ends. |

| POST   | /service-headcount                                         | AdminGuard + HEADCOUNT_WRITE                                  | Record physical attendance headcount for a service slot (body: serviceSlotId, maleAdults, femaleAdults, teenagers, children, mobileChurch, customGroups?, notes?) |
| PATCH  | /service-headcount/:id                                     | AdminGuard + HEADCOUNT_WRITE                                  | Correct an existing headcount record (any field except serviceSlotId)                                         |
| GET    | /service-headcount                                         | AdminGuard + HEADCOUNT_READ                                   | List headcount records (query: page, limit, serviceSlotId, from, to); each record includes computed `total`   |
| GET    | /service-headcount/trends                                  | AdminGuard + HEADCOUNT_READ                                   | Aggregated attendance trends bucketed by period (query: period=weekly\|monthly\|quarterly, from, to, serviceSlotName); returns grouped data per slot per bucket |
| GET    | /service-headcount/:id                                     | AdminGuard + HEADCOUNT_READ                                   | Get a single headcount record by ID (includes computed `total`)                                               |

| GET    | /admin/settings                                            | AdminGuard (any admin)                                        | List all known modules with their current enabled status and `required` flag (absent row = enabled by default) |
| GET    | /admin/settings/:key                                       | AdminGuard (any admin)                                        | Get one module setting by key (e.g. `incident_report`, `asset_management`). Returns `required` flag.          |
| PATCH  | /admin/settings/:key                                       | AdminGuard (ADMIN_WRITE)                                      | Enable or disable a module — body: `{ "enabled": boolean }`. Returns `400` if module is `required`. Upserts the row, invalidates cache, and writes `CHURCH_SETTING_UPDATED` audit log. |

| POST   | /incidents                                                 | JwtAuthGuard + Module: incident_report                        | Submit a new incident report. Rate-limited to `INCIDENT_DAILY_REPORT_LIMIT` (default 2) per member per 24 h. Body: title, description, images? (Cloudinary URLs), location?, isAnonymous? (default false). Notifies admins with INCIDENT_REPORT_WRITE permission by email. |
| GET    | /incidents?page=&limit=                                    | JwtAuthGuard + Module: incident_report                        | Returns only the current member's own reports. Members cannot see reports submitted by others.                |
| GET    | /incidents/:id                                             | JwtAuthGuard + Module: incident_report                        | Returns a single report only if it was submitted by the current member. Returns `404` otherwise.             |
| GET    | /admin/incidents?page=&limit=                              | AdminGuard (INCIDENT_REPORT_READ)                             | Paginated list of all incidents with full reporter identity and admin notes.                                  |
| GET    | /admin/incidents/:id                                       | AdminGuard (INCIDENT_REPORT_READ)                             | Get a single incident report with full details.                                                               |
| PATCH  | /admin/incidents/:id/status                                | AdminGuard (INCIDENT_REPORT_WRITE)                            | Update incident status (`OPEN` → `IN_PROGRESS` → `RESOLVED`) and optionally set adminNotes. Sets `resolvedAt` automatically when status is `RESOLVED`. |

| POST   | /admin/assets                                              | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Create a new asset. `tagNumber` auto-generated (`AST-{YEAR}-{NNNN}`) if not provided. Optional: `serialNumber`, `manufacturer`, `model`, `warrantyExpiry`, `vendorName`, `vendorContact`, `departmentId`. Returns `409` if tag already exists. |
| GET    | /admin/assets?page=&limit=&status=&category=&maintenanceEnabled=&departmentId= | AdminGuard (ASSET_MANAGEMENT_READ) + Module: asset_management | Paginated asset list. Filterable by status, category (case-insensitive), maintenanceEnabled, and departmentId. Each record includes `maintenanceSchedule` and `department`. |
| GET    | /admin/assets/checkouts?page=&limit=                       | AdminGuard (ASSET_MANAGEMENT_READ) + Module: asset_management | All currently active checkouts across all assets (returnedAt IS NULL), newest first. |
| GET    | /admin/assets/:id                                          | AdminGuard (ASSET_MANAGEMENT_READ) + Module: asset_management | Get asset with `maintenanceSchedule` and `department`. Maintenance history is paginated separately. |
| PATCH  | /admin/assets/:id                                          | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Partial update. Supports all asset fields including `serialNumber`, `manufacturer`, `model`, `warrantyExpiry`, `vendorName`, `vendorContact`, `departmentId`. |
| POST   | /admin/assets/:id/maintenance-schedule                     | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Set or update the maintenance schedule. Sets `maintenanceEnabled = true`. Resets all notification timestamps. Body: `frequencyUnit`, `frequencyValue`, `nextDueAt`. |
| POST   | /admin/assets/:id/maintenance-records                      | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Log a maintenance record. `COMPLETED` → asset `ACTIVE` + recalculates `nextDueAt`. `IN_PROGRESS` → asset `UNDER_MAINTENANCE`. |
| PATCH  | /admin/assets/:id/inventory                                | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Set inventory breakdown. Sets `inventoryEnabled = true`. Body: `inStorage`, `inUse`, `underRepair`, `writtenOff` (all int ≥ 0). `totalUnits = sum of all four`. |
| GET    | /admin/assets/:id/maintenance-records?page=&limit=         | AdminGuard (ASSET_MANAGEMENT_READ) + Module: asset_management | Paginated maintenance history for an asset, newest first. |
| POST   | /admin/assets/:id/checkouts                                | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Check out an asset. Requires `checkedOutToMemberId` or `checkedOutToDepartmentId` (at least one). Optional: `expectedReturnAt`, `purpose`, `notes`. Returns `400` if asset already has an active checkout, or asset is `UNDER_MAINTENANCE`, `DECOMMISSIONED`, or `INACTIVE`. **On success:** email notification sent to the checked-out member (if member checkout) and/or all HOD/D_HOD leads of the target department (if department checkout) via the `asset-checkout-notification` template. Notifications are fire-and-forget. |
| PATCH  | /admin/assets/:id/checkouts/:checkoutId/return             | AdminGuard (ASSET_MANAGEMENT_WRITE) + Module: asset_management | Mark a checkout as returned. Optional body: `notes`. Returns `400` if already returned. **On success:** email notification sent to the original recipient (member or department HOD/D_HOD leads) confirming the return. A `RETURN_CONFIRMED` row is recorded in `asset_checkout_notifications`. |
| GET    | /admin/assets/:id/checkouts?page=&limit=                   | AdminGuard (ASSET_MANAGEMENT_READ) + Module: asset_management | Paginated checkout history for a specific asset, newest first. |

**Overdue checkout reminders (daily cron at 08:00):** `OverdueCheckoutScheduler` runs every day at 08:00 with a distributed Redis lock. It finds all active checkouts (`returnedAt IS NULL`) where `expectedReturnAt < now`. For each, it checks which day-thresholds defined in `ASSET_OVERDUE_NOTIFICATION_DAYS` have not yet been sent (tracked in the `asset_checkout_notifications` table with `type = OVERDUE_REMINDER`). Notifications go to the checked-out member and/or all HOD/D_HOD leads of the checked-out department. Set `ASSET_OVERDUE_NOTIFICATION_DAYS=` (empty) to disable all overdue reminders.

---

## 7. Check-In Flow

```
POST /attendances/checkin
  Body: { serviceSlotId, location? }
```

**Step-by-step:**

1. **Load slot** — fetches `ServiceSlot` with relations `event`, `config`, `config.defaultVenue`, `venueOverride`. Throws 404 if not found.

2. **Load member** — fetches the authenticated member with `workerProfile`.

3. **Assert active** — throws 400 if `member.status = INACTIVE`. Also throws if the member is a WORKER with
   `workerProfile.status = INACTIVE`.

4. **Worker location** — workers **must** provide `location` coordinates. Throws 400 if `location` is absent for a WORKER.

5. **Duplicate check** — throws 400 if an attendance record already exists for `(member, event)`. One record per event, regardless of which slot the member enters.

6. **Resolve config** — merges per-slot overrides over EventConfig values. Throws 400 if no config and no overrides.

7. **Validate window:**
    - Workers: window opens at `startTime + workerCheckinStartOffsetSeconds` (typically negative)
    - Members: window opens at `startTime + memberCheckinStartOffsetSeconds`
    - Both close at `startTime + checkinStopOffsetSeconds`

8. **Validate location** *(if location provided)*: Resolves `effectiveVenue` (
   `slot.venueOverride ?? slot.config.defaultVenue`). Calculates Haversine distance between submitted coordinates and
   the venue's `latitude`/`longitude`. If distance exceeds `allowedDistanceInMeters` and `ENFORCE_DISTANCE_CHECK=true`,
   throws 400.

9. **Resolve status:**
    - Member → always `PRESENT`
    - Worker before late threshold → `PRESENT`
    - Worker at or after `startTime + workerLateOffsetSeconds` → `LATE`

10. **Save record** — creates `Attendance` with references to both `event` and `serviceSlot`, `roleAtCheckin` snapshot, and optional location.

---

## 8. Automated Absence Marking

A cron job runs every 5 minutes (`EVERY_5_MINUTES`).

**Logic:**

1. Finds all `Event` records where `attendanceMarked = false` AND `endDate < today` AND the event has at least one service slot.
2. For each event:
    - Gets all **members** (ACTIVE, role=MEMBER) who have no `PRESENT` or `LATE` attendance record for the event → creates one `ABSENT` record per member referencing the event (`serviceSlot = null`).
    - Gets all **workers** (ACTIVE, role=WORKER) who have no `PRESENT` or `LATE` record for the event:
        - Checks `request_leave` table: if the worker has an APPROVED leave whose `date_from ≤ event.eventDate ≤ date_to` → creates `ON_LEAVE` record.
        - Otherwise → creates `ABSENT` record.
3. All absence records for the event are saved in a single DB transaction.
4. Sets `event.attendanceMarked = true` so the job skips it next run.
5. Dispatches a `post-event` job to the `follow-up` Bull queue for thank-you emails and optional online-confirm notifications (fire-and-forget, inside the loop but outside the transaction).

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
| Register first-timers                           | —               | ✓ (FOLLOW_UP-dept worker)    |
| View / update own follow-up tasks               | —               | ✓ (FOLLOW_UP-dept worker)    |
| Confirm online attendance                       | ✓               | ✓                            |

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
| Correct an attendance record status           | `ATTENDANCE_WRITE`      |
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
| View tithe batches, records, disputes         | `FINANCE_READ`          |
| Upload tithes, resolve disputes, approve/reject requests, attach proof | `FINANCE_WRITE` |
| View finance categories and requests          | `FINANCE_READ`          |
| View first-timers and follow-up tasks         | `FOLLOW_UP_READ`        |
| Register first-timers, reassign / bulk-update tasks | `FOLLOW_UP_WRITE` |
| View service attendance headcounts and trends       | `HEADCOUNT_READ`  |
| Record and correct physical attendance headcounts   | `HEADCOUNT_WRITE` |

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

| Variable                      | Default | Description                                                        |
|-------------------------------|---------|--------------------------------------------------------------------|
| `ENFORCE_DISTANCE_CHECK`      | `false` | Require members to be within `allowedDistanceInMeters` to check in |
| `ONLINE_CHECKIN_WINDOW_HOURS` | `3`     | Hours after online-confirm emails are sent during which members can confirm online attendance |
| `FOLLOW_UP_DUE_DAYS`          | `3`     | Days from task creation before a follow-up task is considered overdue (sets `dueDate`) |

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

### Cloudinary (file uploads)

Used for finance request attachments and payment proofs.

| Variable                  | Default        | Description                     |
|---------------------------|----------------|---------------------------------|
| `CLOUDINARY_CLOUD_NAME`      | — *(required)* | Cloudinary account cloud name                                              |
| `CLOUDINARY_API_KEY`         | — *(required)* | Cloudinary API key                                                         |
| `CLOUDINARY_API_SECRET`      | — *(required)* | Cloudinary API secret                                                      |
| `MAX_FILE_UPLOAD_BYTES`      | `5242880`      | Global hard ceiling for all file uploads (bytes). Registered via `MulterModule` in `AppModule`; individual endpoints may enforce a stricter limit. |
| `TITHE_PROOF_EXPIRY_DAYS`    | `90`           | Days after which a tithe payment proof is purged from Cloudinary and DB    |
| `ASSET_OVERDUE_NOTIFICATION_DAYS` | `1,3,7`   | Comma-separated day thresholds for overdue checkout reminders. Leave empty to disable. |

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
`departments:read` · `departments:write` · `attendance:read` · `attendance:write` · `leave:read` · `leave:write` · `classes:read` ·
`classes:write` · `announcements:read` · `announcements:write` · `notes:read` · `notes:write` · `dashboard:read` ·
`sunday_school:read` · `sunday_school:write` · `children_church:read` · `children_church:write` · `admin:read` ·
`admin:write` · `audit:read` · `finance:read` · `finance:write` · `follow_up:read` · `follow_up:write` ·
`service_programme:read` · `service_programme:write` · `headcount:read` · `headcount:write`

`GET /enums` returns these as both a flat `adminPermissions` list (value + label) and a grouped `adminPermissionGroups` list (group name + permissions with value, label, and description) — use the grouped form to render the permission assignment UI.

### MemberStatusEnum / WorkerStatusEnum

`ACTIVE` · `INACTIVE`

### GenderEnum

`MALE` · `FEMALE`

### MaritalStatusEnum

`SINGLE` · `MARRIED` · `DIVORCED` · `WIDOWED`

### AttendanceStatusEnum

`PRESENT` · `LATE` *(workers only)* · `ABSENT` · `ON_LEAVE` *(workers only)* · `ATTENDED_ONLINE`

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

`SUNDAY_SCHOOL` · `CHILDREN_CHURCH` · `WORSHIP` · `USHERING` · `MEDIA` · `PROTOCOL` · `WELFARE` · `PRAYER` · `EVANGELISM` · `YOUTH` · `YOUNG_ADULTS` · `FOLLOW_UP`

### SundaySchoolAttendanceStatus

`PRESENT` · `ABSENT` · `EXCUSED`

### GuardianRelationshipEnum

`MOTHER` · `FATHER` · `GRANDPARENT` · `SIBLING` · `UNCLE` · `AUNT` · `FAMILY_FRIEND` · `OTHER`

### ChildCheckInStatusEnum

`CHECKED_IN` · `CHECKED_OUT` · `FLAGGED`

### ReminderIntervalPresetEnum

`15m` (15 min) · `30m` (30 min) · `1h` (1 hour) · `3h` (3 hours) · `24h` (24 hours) · `48h` (48 hours)

### TitheBatchStatus

`PENDING` · `PROCESSING` · `COMPLETED` · `FAILED`

### TitheUnmatchedStatus

`PENDING` · `MATCHED` · `DISMISSED`

### TitheDisputeStatus

`PENDING` · `CONFIRMED_VALID` · `REJECTED`

### FinanceRequestStatus

`PENDING` · `APPROVED` · `REJECTED`

### FirstTimerSourceEnum

`WALK_IN` · `ONLINE` · `REFERRAL`

### FollowUpTaskTypeEnum

`FIRST_TIMER` · `ONLINE_NO_RESPONSE` · `MANUAL`

### FollowUpTaskStatusEnum

`PENDING` · `IN_PROGRESS` · `COMPLETED` · `UNREACHABLE`

### FollowUpOutcomeEnum

`JOINED` · `DECLINED` · `NO_ANSWER` · `PRAYED_WITH`

### ServiceProgrammeStatusEnum

`DRAFT` · `LIVE` · `COMPLETED`

### ServiceSlotTypeEnum

`SPEAKER` · `WORSHIP` · `PRAYER` · `OFFERING` · `ANNOUNCEMENT` · `BREAK`

### ServiceSessionStatusEnum

`LIVE` · `COMPLETED`

### ServiceSessionSlotStatusEnum

`PENDING` · `IN_PROGRESS` · `COMPLETED` · `SKIPPED`

### ServicePauseReasonEnum

`TECHNICAL_ISSUE` · `ANNOUNCEMENT` · `BREAK_INTERVAL` · `UNPLANNED_DELAY` · `OTHER`

### ServiceActionRoleEnum

`ADMIN` · `WORKER`

### DepartmentKeyEnum (updated)

`SUNDAY_SCHOOL` · `CHILDREN_CHURCH` · `WORSHIP` · `USHERING` · `MEDIA` · `PROTOCOL` · `WELFARE` · `PRAYER` · `EVANGELISM` · `YOUTH` · `YOUNG_ADULTS` · `FOLLOW_UP` · `ADMIN`

### IncidentStatusEnum

`OPEN` · `IN_PROGRESS` · `RESOLVED`

### AssetStatusEnum

`ACTIVE` · `INACTIVE` · `UNDER_MAINTENANCE` · `DECOMMISSIONED`

### MaintenanceFrequencyUnitEnum

`DAYS` · `WEEKS` · `MONTHS`

### MaintenanceRecordTypeEnum

`SCHEDULED` · `UNPLANNED`

### MaintenanceCompletionStatusEnum

`IN_PROGRESS` · `COMPLETED`

### AssetConditionEnum

`GOOD` · `FAIR` · `POOR`
