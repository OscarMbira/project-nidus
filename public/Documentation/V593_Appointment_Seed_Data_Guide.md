# v593 Appointment Records — Seed Data Guide

## File

`SQL/v616_v593_appointment_records_seed.sql`

## Prerequisites

Run in order after appointment tables and RPCs:

1. `v606`–`v608`, `v610`–`v612` (platform tables + accept/decline RPCs)
2. `v614` (appointment tracker menu — optional for UI only)
3. Portfolio/programme/project seeds: **v334** (preferred) or **v305**
4. Simulator: `v594`, `v609`, `v613` (and `v605` for `SEED592-PP-01` practice project)

## What is seeded

### Platform (`public`)

| Token | Scope | Appointment status | Invitation status |
|-------|--------|-------------------|-------------------|
| `seed593-mgr-project-pending` | Project (SEED334-PRJ-10 / SEED-PP-01) | `pending_acceptance` | `pending` |
| `seed593-mgr-project-active` | Second project | `active` | `accepted` |
| `seed593-mgr-programme-pending` | Programme | `pending_acceptance` | `pending` |
| `seed593-mgr-programme-declined` | Programme | `declined` | `declined` |
| `seed593-mgr-portfolio-pending` | Portfolio | `pending_acceptance` | `pending` |
| `seed593-team-dev-pending` | Project team | `pending_acceptance` | `pending` |
| `seed593-team-member-active` | Second project team | `active` | `accepted` |

All rows are tagged with `[SEED593]` in invitation/appointment messages.

### Simulator (`sim`)

| Token | Notes |
|-------|--------|
| `seed593-sim-mgr-pending` | Practice PM appointment (`pending_acceptance`) |
| `seed593-sim-team-active` | Practice developer assignment (`active`) |

## Users and entities

- **No new users** are created. The script picks existing `public.users` (PMO/admin as appointer, up to three appointees).
- Entities resolve from **SEED334** codes first, then **SEED-*** v305 codes.
- Simulator practice project uses **SEED592-PP-01** when `v605` has been applied.

## Idempotency

Safe to re-run: inserts are skipped when the fixed `invitation_token` (platform/sim) or matching appointment message already exists.

## How to apply

In Supabase SQL Editor (or `psql`), run the full `v616_v593_appointment_records_seed.sql` file as a role that can bypass RLS (service role / postgres).

## UI verification

1. Log in as **PMO admin** → **Appointment Tracker** — see pending/active/declined manager rows.
2. Log in as **appointee** (one of the first three non-PMO users) → **My Appointments** / accept link using token from `project_invitations`.
3. **Project Users** → formal appointment invite flow (existing invitations with tokens above).
4. Simulator → PM/PMO **Appointment Tracker** after logging in as the seed owner user.

## Acceptance URLs (platform)

Use invitation accept route with token query param, e.g.:

`/auth/invitation-accept?token=seed593-mgr-project-pending`

(Exact route name matches your `InvitationAccept` route in `App.jsx`.)

## Cleanup (optional)

To remove seed rows only:

```sql
DELETE FROM public.manager_appointment_records WHERE appointment_message LIKE '[SEED593]%';
DELETE FROM public.team_member_appointment_records WHERE appointment_message LIKE '[SEED593]%';
DELETE FROM public.project_invitations WHERE invitation_token LIKE 'seed593-%';
DELETE FROM sim.sim_manager_appointment_records WHERE appointment_message LIKE '[SEED593]%';
DELETE FROM sim.sim_team_member_appointment_records WHERE appointment_message LIKE '[SEED593]%';
DELETE FROM sim.entity_invitations WHERE invitation_token LIKE 'seed593-%';
```

Run cleanup in dependency order (appointments before invitations) if foreign keys block deletes.
