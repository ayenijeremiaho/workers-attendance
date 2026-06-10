# Church Attendance & Member Management — Technical Documentation

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

A NestJS REST API that manages church membership, service attendance, workforce scheduling, class enrolment, and internal announcements for a local church.

**Core design principles:**
- Every church member has one account. Workers are members with an optional `WorkerProfile` attached.
- A single JWT login endpoint serves all roles: MEMBER, WORKER, ADMIN.
- Attendance is tracked per **ServiceSlot**, not per Event. One event can have multiple slots (e.g. first service, second service).
- Members are only ever PRESENT or ABSENT. Workers can also be LATE or ON_LEAVE.
- Absentees are marked automatically by a background cron job, not by user action.

---

## 2. Architecture

```
src/
├── auth/          Single login, JWT strategy, refresh tokens
├── member/        Universal identity: Member + WorkerProfile
├── event/         Event + ServiceSlot + EventConfig
├── venue/         Named, reusable venue entities (lat/lon)
├── attendance/    Check-in, history, leaderboard, cron job
├── department/    Departments + leads
├── request-leave/ Worker leave requests
├── classes/       ChurchClass + ClassEnrollment
├── announcement/  Announcements with audience targeting
├── notes/         Pastoral notes (naming, dedication, marriage)
├── dashboard/     Aggregated dashboards per role
└── utility/       Email, hashing, pagination helpers
```

**Stack:** NestJS · TypeORM · PostgreSQL · Argon2 · Passport (JWT + Local) · class-validator · nestjs-schedule

---

## 3. Data Models

### Member
The universal identity for every person in the system.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| firstname, lastname | string | |
| email | string | Unique |
| password | string | Argon2 hashed |
| changedPassword | boolean | False until first password change |
| role | MemberRoleEnum | MEMBER \| WORKER \| ADMIN |
| status | MemberStatusEnum | ACTIVE \| INACTIVE |
| gender | GenderEnum | Optional |
| dateOfBirth | string (YYYY-MM-DD) | Optional |
| maritalStatus | MaritalStatusEnum | Optional |
| yearBornAgain | Date | Stored as Jan 1 of given year |
| yearBaptized | Date | Optional |
| baptizedWithHolyGhost | boolean | Optional |
| yearJoinedChurch | Date | Optional |
| workerProfile | WorkerProfile | OneToOne, null for plain members |
| attendances | Attendance[] | OneToMany |
| enrollments | ClassEnrollment[] | OneToMany |

### WorkerProfile
Created when a member is promoted to WORKER. Deleted when revoked.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member | Member | OneToOne |
| department | Department | ManyToOne |
| status | WorkerStatusEnum | ACTIVE \| INACTIVE |
| profession | string | Optional |
| yearJoinedWorkforce | Date | Optional |
| completedSOD | boolean | School of Disciples |
| completedBibleCollege | boolean | |

### Event
A church gathering on a specific date.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| description | string | Optional |
| eventDate | Date (date only) | |
| recurringEventId | UUID | Groups events in a recurring series |
| serviceSlots | ServiceSlot[] | OneToMany, auto-creates default if none provided |

### Venue
A named, reusable physical location. Referenced by `EventConfig.defaultVenue` and optionally overridden per slot via `ServiceSlot.venueOverride`.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | Unique |
| address | string | Optional |
| latitude | float | WGS84 latitude |
| longitude | float | WGS84 longitude |

Deleting a venue that is set as `defaultVenue` on any `EventConfig` is rejected by the DB FK constraint. Deleting a venue that is a slot-level `venueOverride` sets that field to `null` (SET NULL).

### ServiceSlot
The actual check-in target within an event. One event can have multiple slots.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| event | Event | ManyToOne |
| name | string | Default: "Service" |
| startTime | timestamptz | |
| endTime | timestamptz | |
| config | EventConfig | ManyToOne, nullable |
| venueOverride | Venue | ManyToOne, nullable — overrides config.defaultVenue for this slot |
| markedAbsent | boolean | Set to true after cron marks absentees |
| *Override columns | int | Per-slot overrides that take priority over EventConfig |

Override columns: `workerCheckinStartOverride`, `workerLateOverride`, `memberCheckinStartOverride`, `checkinStopOverride`, `allowedDistanceOverride`

**effectiveVenue:** computed as `slot.venueOverride ?? slot.config.defaultVenue`. Throws 400 if neither is set.

### EventConfig
A reusable timing template assigned to service slots. Venue is now a first-class relation rather than raw lat/lon.

| Field | Type | Description |
|---|---|---|
| name | string | Unique |
| defaultVenue | Venue | ManyToOne, NOT NULL — the venue used by all slots referencing this config unless overridden |
| workerCheckinStartOffsetSeconds | int | Seconds relative to `startTime` when workers can start checking in. Negative = before start |
| workerLateOffsetSeconds | int | Seconds after `startTime` after which workers are LATE |
| memberCheckinStartOffsetSeconds | int | When members can start checking in |
| checkinStopOffsetSeconds | int | When check-in closes for everyone |
| allowedDistanceInMeters | int | Max distance from effectiveVenue for location validation |

**Constraint:** `workerLateOffset > workerCheckinStartOffset` and `checkinStopOffset > workerLateOffset`

### Attendance
One record per member per service slot.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member | Member | ManyToOne |
| serviceSlot | ServiceSlot | ManyToOne |
| status | AttendanceStatusEnum | PRESENT \| LATE \| ABSENT \| ON_LEAVE |
| checkinTime | timestamptz | Null for cron-created ABSENT/ON_LEAVE records |
| roleAtCheckin | MemberRoleEnum | Snapshot of role at check-in time |
| location | JSON | `{latitude, longitude}` or null |

**Unique constraint:** (member, serviceSlot) — one record per person per slot.

### Department
| Field | Notes |
|---|---|
| id | UUID PK |
| name | Unique |
| description | |
| workerProfiles | OneToMany → WorkerProfile |

### DepartmentLead
Joins a WorkerProfile to a Department as head or assistant lead.

### RequestLeave
| Field | Notes |
|---|---|
| workerProfile | ManyToOne → WorkerProfile |
| dateFrom / dateTo | timestamptz |
| reason | string |
| status | PENDING \| APPROVED \| REJECTED |
| actionedBy | ManyToOne → Member (admin who approved/rejected) |

### ChurchClass
| Field | Notes |
|---|---|
| type | BELIEVERS \| BAPTISMAL \| WORKERS_IN_TRAINING \| BIBLE_COLLEGE |
| facilitator | ManyToOne → Member (nullable) |
| startDate / endDate | date strings |

### ClassEnrollment
| Field | Notes |
|---|---|
| member | ManyToOne → Member |
| churchClass | ManyToOne → ChurchClass |
| status | IN_PROGRESS \| COMPLETED \| CANCELLED |
| enrolledAt | auto timestamp |
| completedAt / cancelledAt | set when status changes |

**Unique constraint:** (member, churchClass)

### Announcement
| Field | Notes |
|---|---|
| audience | ALL \| WORKERS_ONLY \| DEPARTMENT \| INDIVIDUAL |
| department | ManyToOne → Department (required when audience=DEPARTMENT) |
| targetMember | ManyToOne → Member, nullable (required when audience=INDIVIDUAL) |
| publishedAt | defaults to creation time |
| expiresAt | nullable; expired items excluded from feed |

---

## 4. Authentication & Authorization

### Single Login
`POST /auth/login` accepts any user regardless of role. The JWT payload contains:
```json
{ "sub": "<memberId>", "role": "MEMBER|WORKER|ADMIN" }
```

### JWT Guards
- **JwtAuthGuard** — applied globally via `APP_GUARD`. All routes are protected unless decorated with `@Public()`.
- **RolesGuard** — applied per-route via `@Roles(MemberRoleEnum.ADMIN)`. Checks `request.user.role`.
- **LocalAuthGuard** — used only on `POST /auth/login` to invoke the Passport local strategy.
- **RefreshJwtAuthGuard** — used on `POST /auth/refresh`.

### Token Lifecycle
1. **Login** → receives `access_token` + `refresh_token`. Session record is created with a hashed refresh token.
2. **Access token expires** → call `POST /auth/refresh` with the refresh token in the `Authorization: Bearer` header.
3. **Logout** → clears the session record. The access token becomes invalid on the next request (session check fails in `validateAccessToken`).

### Role Elevation
The access token's role is re-validated from the live database on every request via `validateAccessToken`. This means if a member is promoted to WORKER, their existing token will reflect the new role on the next request after the DB is updated.

---

## 5. Module Reference

### Auth Module
**Routes:** `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `GET /auth/admin/profile`

### Member Module
Manages the universal identity. Admins can create admins, list all members, promote/revoke workers, change status, and reset passwords.

**Routes prefix:** `/members`

### Event Module
Manages events and service slots. Events can be single or recurring (daily/weekly/monthly). If no slots are provided at creation, a single default slot spanning the full event day is created automatically.

**Routes prefix:** `/events`, `/event-config`

### Venue Module
Manages named venue records referenced by event configs and individual service slots. Venues decouple location data from event creation — create a venue once, reference it by ID in any config or slot.

**Routes prefix:** `/venues`  
**ADMIN:** create, update, delete  
**Any authenticated user:** list, get by ID

### Attendance Module
**Check-in window logic:**
- Window opens: `slot.startTime + workerCheckinStartOffsetSeconds` (workers) or `+ memberCheckinStartOffsetSeconds` (members)
- Window closes: `slot.startTime + checkinStopOffsetSeconds` (same for all)
- Workers are LATE if they check in after `slot.startTime + workerLateOffsetSeconds`
- Members are always PRESENT if within the window

**Routes prefix:** `/attendances`

### Department Module
Departments are the workforce units. Each can have a head and assistant lead assigned from its worker members.

**Routes prefix:** `/departments`

### Leave Module
Workers request leave with a date range. Approved leave is checked by the cron job: if a worker has approved leave overlapping a slot's time range, they are marked ON_LEAVE instead of ABSENT.

**Routes prefix:** `/leave`

### Classes Module
Tracks member progress through structured church programs.

**Class types:** BELIEVERS, BAPTISMAL, WORKERS_IN_TRAINING, BIBLE_COLLEGE

**Enrollment statuses:** IN_PROGRESS → COMPLETED or CANCELLED

**Routes prefix:** `/classes`

### Announcements Module
Audience-targeted broadcast messages. The `/announcements/feed` endpoint filters automatically based on the caller's role and optional `departmentId`.

**Audience rules:**
- MEMBER → sees `ALL` + any `INDIVIDUAL` announcements addressed to them
- WORKER → sees `ALL` + `WORKERS_ONLY` + `DEPARTMENT` (for their department) + `INDIVIDUAL` (addressed to them)
- ADMIN → sees all audiences
- Expired announcements (`expiresAt < now`) are excluded from the feed

**Audience types:** `ALL` | `WORKERS_ONLY` | `DEPARTMENT` | `INDIVIDUAL`  
When `audience = DEPARTMENT`, `departmentId` is required. When `audience = INDIVIDUAL`, `targetMemberId` (UUID) is required.

**Routes prefix:** `/announcements`

### Notes Module
Pastoral records of significant events (child naming, dedication, marriage). Admin-only. Stored as typed JSON detail objects.

**Note types:** `child_naming`, `child_dedication`, `marriage`

**Routes prefix:** `/notes`, `/notes-analytics`

### Dashboard Module
Aggregated data endpoints per role. Does not store data — assembles from other services.

**Routes prefix:** `/dashboard`

---

## 6. API Endpoints Quick Reference

| Method | Route | Role | Description |
|---|---|---|---|
| POST | /auth/signup | Public | Register new member |
| POST | /auth/login | Public | Authenticate (all roles) |
| POST | /auth/refresh | Public | Exchange refresh token |
| POST | /auth/logout | Any | Invalidate session |
| GET | /auth/me | Any | Own profile |
| POST | /auth/change-password | Any | Change password |
| GET | /auth/admin/profile | ADMIN | Admin own profile |
| GET | /members | ADMIN | List members (filterable by role) |
| GET | /members/workers | ADMIN | List workers (filterable by status) |
| GET | /members/:id | ADMIN | Get member by ID |
| POST | /members/admins | ADMIN | Create admin account |
| PATCH | /members/:id | ADMIN | Update member details |
| POST | /members/:id/promote | ADMIN | Promote member to worker |
| POST | /members/:id/revoke-worker | ADMIN | Remove worker role |
| PATCH | /members/:id/worker-profile | ADMIN | Update worker profile |
| PATCH | /members/:id/status | ADMIN | Activate/deactivate member |
| POST | /members/:id/reset-password | ADMIN | Reset & email new password |
| POST | /attendances/checkin | Any | Check in to a service slot |
| GET | /attendances/my-history | Any | Own attendance records |
| GET | /attendances/history | ADMIN | All attendance records |
| GET | /attendances/history/department | WORKER | Department attendance for a slot |
| GET | /attendances/summary/slot/:slotId | ADMIN | Status counts for a slot |
| GET | /attendances/leaderboard | ADMIN | Top workers by attendance |
| POST | /events | ADMIN | Create event (single or recurring) |
| PATCH | /events/:id | ADMIN | Update event |
| GET | /events/:id | Any | Get event by ID |
| GET | /events | Any | List events |
| DELETE | /events/:id | ADMIN | Delete single event |
| DELETE | /events/recurring/:recurringEventId | ADMIN | Delete future recurring events |
| POST | /event-config | ADMIN | Create timing config |
| PATCH | /event-config/:id | ADMIN | Update timing config |
| GET | /event-config/:id | ADMIN | Get config by ID |
| GET | /event-config | ADMIN | List configs |
| DELETE | /event-config/:id | ADMIN | Delete config |
| POST | /venues | ADMIN | Create venue |
| PATCH | /venues/:id | ADMIN | Update venue |
| DELETE | /venues/:id | ADMIN | Delete venue |
| GET | /venues | Any | List venues |
| GET | /venues/:id | Any | Get venue by ID |
| GET | /departments | Any | List departments |
| GET | /departments/:id | Any | Get department |
| POST | /departments | ADMIN | Create department |
| PATCH | /departments/:id | ADMIN | Update department |
| DELETE | /departments/:id | ADMIN | Delete department |
| POST | /departments/assign-lead | ADMIN | Assign head/assistant lead |
| POST | /departments/remove-lead | ADMIN | Remove lead |
| GET | /departments/leads/:id | ADMIN | Leads for a department |
| GET | /departments/leads | ADMIN | All department leads |
| POST | /leave | WORKER | Request leave |
| PATCH | /leave/:id/action | ADMIN | Approve or reject leave |
| DELETE | /leave/:id | WORKER | Delete own pending leave |
| GET | /leave/my-history | WORKER | Own leave history |
| GET | /leave/history | ADMIN | All leave requests |
| GET | /leave/department | WORKER | Department leave requests |
| POST | /classes | ADMIN | Create class |
| PATCH | /classes/:id | ADMIN | Update class |
| DELETE | /classes/:id | ADMIN | Delete class |
| GET | /classes | Any | List classes (filterable by type) |
| GET | /classes/:id | Any | Get class |
| POST | /classes/enroll | ADMIN | Enrol member in class |
| PATCH | /classes/enrollments/:id/status | ADMIN | Update enrolment status |
| GET | /classes/my/enrollments | Any | Own enrolments |
| GET | /classes/:id/enrollments | ADMIN | All enrolments for a class |
| POST | /announcements | ADMIN | Create announcement |
| PATCH | /announcements/:id | ADMIN | Update announcement |
| DELETE | /announcements/:id | ADMIN | Delete announcement |
| GET | /announcements/all | ADMIN | All announcements |
| GET | /announcements/feed | Any | My filtered feed |
| GET | /announcements/:id | Any | Get announcement |
| GET | /notes/:type | ADMIN | List notes by type |
| POST | /notes | ADMIN | Create note |
| PUT | /notes/:id | ADMIN | Update note |
| GET | /notes/:type/:id | ADMIN | Get note |
| DELETE | /notes/:type/:id | ADMIN | Delete note |
| GET | /notes-analytics/:type | ADMIN | Analytics for a note type |
| GET | /dashboard/member | Any | Member dashboard |
| GET | /dashboard/worker | WORKER/ADMIN | Worker dashboard |
| GET | /dashboard/admin | ADMIN | Admin dashboard |

---

## 7. Check-In Flow

```
POST /attendances/checkin
  Body: { serviceSlotId, location? }
```

**Step-by-step:**

1. **Load slot** — fetches `ServiceSlot` with its `EventConfig` and parent `Event`. Throws 404 if not found.

2. **Load member** — fetches the authenticated member with `workerProfile.department`.

3. **Assert active** — throws 400 if `member.status = INACTIVE`. Also throws if the member is a WORKER with `workerProfile.status = INACTIVE`.

4. **Duplicate check** — throws 400 if an attendance record already exists for (member, slot).

5. **Resolve config** — merges per-slot overrides over EventConfig values. If the slot has no config and no overrides, throws 400.

6. **Validate window:**
   - Workers: window opens at `startTime + workerCheckinStartOffsetSeconds` (typically negative)
   - Members: window opens at `startTime + memberCheckinStartOffsetSeconds`
   - Both close at `startTime + checkinStopOffsetSeconds`

7. **Validate location** *(if location provided)*: Resolves `effectiveVenue` (`slot.venueOverride ?? slot.config.defaultVenue`). Calculates Haversine distance between submitted coordinates and the venue's `latitude`/`longitude`. If distance exceeds `allowedDistanceInMeters` and `ENFORCE_DISTANCE_CHECK=true`, throws 400.

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
   - Gets all **members** (ACTIVE, any role) who have no attendance record for the slot → marks them `ABSENT` with role snapshot `MEMBER`.
   - Gets all **workers** (WORKER role, ACTIVE worker profile) with no record:
     - Checks `request_leave` table: if the worker has an APPROVED leave whose date range overlaps the slot's start–end time → marks `ON_LEAVE`.
     - Otherwise → marks `ABSENT`.
3. All records for the slot are saved in a single DB transaction.
4. Sets `slot.markedAbsent = true` so the job skips it next run.

---

## 9. Role & Permission Matrix

| Action | MEMBER | WORKER | ADMIN |
|---|---|---|---|
| Sign up / login | ✓ | ✓ | ✓ |
| View own profile | ✓ | ✓ | ✓ |
| Check in to service | ✓ | ✓ | ✓ |
| View own attendance | ✓ | ✓ | ✓ |
| View own class enrolments | ✓ | ✓ | ✓ |
| View announcement feed | ✓ | ✓ | ✓ |
| Request leave | — | ✓ | — |
| View own leave history | — | ✓ | — |
| View department leave/attendance | — | ✓ | — |
| Manage members | — | — | ✓ |
| Manage events & configs | — | — | ✓ |
| Manage venues | — | — | ✓ |
| Manage departments | — | — | ✓ |
| Action leave requests | — | — | ✓ |
| Manage classes & enrolments | — | — | ✓ |
| Create/manage announcements | — | — | ✓ |
| Manage pastoral notes | — | — | ✓ |
| View all attendance / leaderboard | — | — | ✓ |
| Admin dashboard | — | — | ✓ |

---

## 10. Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_HOST` | Postgres host | `localhost` |
| `DARTABASE_PORT` | Postgres port (note: typo in code) | `5432` |
| `DATABASE_USER` | DB username | `postgres` |
| `DATABASE_PASSWORD` | DB password | `secret` |
| `DATABASE_NAME` | DB name | `church_attendance` |
| `DATABASE_SSL` | Enable SSL | `false` |
| `DATABASE_LOGGING` | Enable TypeORM query logging | `false` |
| `JWT_SECRET` | Access token signing secret | `your-secret` |
| `JWT_EXPIRY_IN` | Access token expiry | `1h` |
| `REFRESH_JWT_SECRET` | Refresh token signing secret | `your-refresh-secret` |
| `REFRESH_JWT_EXPIRY_IN` | Refresh token expiry | `7d` |
| `DEFAULT_ADMIN_EMAIL` | Email for seeded default admin | `admin@church.com` |
| `DEFAULT_ADMIN_PASSWORD` | Password for seeded default admin | `Admin123!` |
| `DEFAULT_VENUE_NAME` | Display name for the seeded default venue | `Main Auditorium` |
| `DEFAULT_VENUE_ADDRESS` | Street address for the seeded default venue | `Lagos, Nigeria` |
| `DEFAULT_VENUE_LATITUDE` | WGS84 latitude of the default venue | `6.5244` |
| `DEFAULT_VENUE_LONGITUDE` | WGS84 longitude of the default venue | `3.3792` |
| `DEFAULT_EVENT_CONFIG_NAME` | Name for seeded default event config | `Default` |
| `DEFAULT_EVENT_ALLOWED_DISTANCE_IN_METERS` | Default allowed check-in radius (metres) | `100` |
| `WORKER_CHECKIN_START_OFFSET_SECONDS` | Default worker early open offset | `-1800` |
| `WORKER_LATE_OFFSET_SECONDS` | Default worker late threshold | `0` |
| `MEMBER_CHECKIN_START_OFFSET_SECONDS` | Default member open offset | `-900` |
| `CHECKIN_STOP_OFFSET_SECONDS` | Default close offset | `3600` |
| `ENFORCE_DISTANCE_CHECK` | Enable location distance validation | `true` |
| `LOGIN_URL` | App login URL (used in welcome email) | `https://app.church.com/login` |
| `EXPLAINER_VIDEO_ANDROID_URL` | Android onboarding video URL | |
| `EXPLAINER_VIDEO_IOS_URL` | iOS onboarding video URL | |
| `SUPPORT_FORM_URL` | Support contact form URL | |
| `MAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP username | `noreply@church.com` |
| `MAIL_PASSWORD` | SMTP password | |
| `MAIL_FROM` | Sender address | `noreply@church.com` |

---

## 11. Enum Reference

### MemberRoleEnum
`MEMBER` · `WORKER` · `ADMIN`

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
