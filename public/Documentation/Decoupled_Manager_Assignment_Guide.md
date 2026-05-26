# Decoupled Manager & Member Assignment — User Guide

**Version:** v592  
**Applies to:** Platform (public schema) and Simulator (sim schema)

## Overview

Portfolio Managers, Programme Managers, and Project Managers can assign or change manager roles and manage team members from dedicated **People & Assignments** pages in the PM sidebar — without opening portfolio, programme, or project edit forms.

PMO Admins continue to use the system-wide **Manager Assignments** page under PMO Admin.

## Who can do what

| Role | Page | Actions |
|------|------|---------|
| PMO Admin | `/platform/pmo-admin/manager-assignments` | Assign portfolio, programme, and project managers (system-wide) |
| Portfolio Manager | `/platform/portfolio-manager/assignments` | Assign programme and project managers within owned portfolios |
| Programme Manager | `/platform/programme-manager/assignments` | Assign project managers within owned programmes |
| Project Manager / Team Lead | `/pm/team-members` | Invite and manage project members |
| Simulator PM (practice) | `/simulator/pm/portfolio-manager/assignments`, `/simulator/pm/programme-manager/assignments` | Same scoped actions for practice entities |

## Platform — Portfolio Manager

1. Open **PM Dashboard** → sidebar **People & Assignments** → **Assign Managers (Portfolio)**.
2. Use tabs **Programmes** and **Projects**.
3. Search, sort columns, or switch **Card / Table** view.
4. Click **Assign** to pick an eligible manager (concurrent assignment limits apply).
5. Click **Remove** to clear the current manager on that entity.

## Platform — Programme Manager

1. **People & Assignments** → **Assign Project Managers (Programme)**.
2. Work with the **Projects** list only (programmes you manage).

## Simulator parity

Under **Simulator PM Dashboard**, use **People & Assignments** for:

- **Assign Managers (Portfolio)** → `/simulator/pm/portfolio-manager/assignments`
- **Assign Project Managers (Programme)** → `/simulator/pm/programme-manager/assignments`
- **Manage Team Members**, **Send Invitation**, and **Invitation Status** for practice projects

## Database deployment

Apply these SQL scripts in order in Supabase:

1. `SQL/v592a_portfolio_mgr_assignments_rls.sql`
2. `SQL/v592b_programme_mgr_assignments_rls.sql`
3. `SQL/v592c_sim_scoped_manager_assignments_rls.sql`
4. `SQL/v605_v592_decoupled_manager_assignment_seed.sql` (after v334 or v305 portfolio/programme seed)

RLS enforces scope; the UI also filters lists by the signed-in manager.

## Seed data (v605)

**File:** `SQL/v605_v592_decoupled_manager_assignment_seed.sql`

Idempotent seed that **does not create users**. It uses existing `public.users` (and `auth.users` for simulator manager columns).

| Source already loaded | What v605 does |
|----------------------|----------------|
| **v334** (`SEED334-*`) | Sets portfolio/programme/project manager IDs on SEED334 entities |
| **v305** (`SEED-PORT-01`, `SEED-PROG-01`) | Fills manager IDs only when still null |
| **Neither** | Skips platform seed with a NOTICE |
| **Simulator** | Creates/updates `SEED592-PF-*`, `SEED592-PRG-*`, `SEED592-PP-*` for the first user linked to `auth.users` |

**Testing tips**

- Log in as the user assigned `portfolio_manager_user_id` on `SEED334-PORT-01` (or as the first seeded auth user for `SEED592-PF-01` in the simulator) to use **Assign Managers (Portfolio)**.
- Log in as the programme manager on `SEED334-PROG-01` / `SEED592-PRG-01` for **Assign Project Managers (Programme)**.
- If only one user exists in the environment, v605 may assign the same user to all three roles so every page is testable.

## Export

Each assignment list includes the standard export menu (Excel, CSV, JSON, Print, etc.) via the shared list export component.

## Related documentation

- Bulk team invite: `Documentation/Bulk_Team_Invite_Guide.md`
- Invitation tracker: PM sidebar **Invitation Status** (`/app/invitation-tracker` or `/pm/invitation-tracker`)
