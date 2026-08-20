# v838 — Governance / Initiation docs visible via project_memberships RLS

## Problem

After applying `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql`, the
Risk Management Strategies page (and sibling Governance / Initiation list pages)
still show **No … yet** for Project Managers.

## Root cause

Same class of bug as v820: seed rows are present in `public`, but SELECT RLS on
these tables only grants access through legacy `user_projects`. The app’s live
membership path is `project_memberships`. Members without a `user_projects` row
get an empty result set (no error).

## Fix

`SQL/v835_governance_documents_project_memberships_rls.sql` — additive SELECT
policies for the seven v834 tables, OR’d with existing policies (v820 pattern).

## Frontend (small)

`RMSList.jsx` (Platform + Simulator): resolve “projects I can create RMS for”
from `project_memberships` (owner/admin/manager) instead of only `user_projects`.

## Todos

- [x] SQL v835 additive SELECT policies
- [x] RMSList available-projects via project_memberships (Platform + Simulator)
- [x] Fix RMSList 400: `project_memberships.role` does not exist — use `project_role_id` / `project_roles`
- [x] Fix RMSList 400: drop ambiguous `author_id`/`owner_id` embeds on multi-FK users table
- [x] SQL v836 UPSERT repair (undelete / fill gaps where v834 `DO NOTHING` skipped)
- [x] v836/v834 set `rms_reference` / `qms_reference` / `cms_reference` explicitly (NOT NULL; trigger may be missing)
- [x] SQL v837: rewrite `user_has_pmo_role` / `user_has_pm_role` to use `user_roles` (fixes missing `user_role_assignments`)
- [ ] User applies **v835 → v836 → v837** in Supabase SQL Editor and hard-refreshes RMS list

## Review

Console showed `Error fetching available projects` + HTTP 400 from selecting a
non-existent `role` column (Strict Mode doubled the log). RMS list was also
vulnerable to PostgREST 400 from ambiguous `users` FK embeds.

v836 first run failed with `23502` null `rms_reference` — the BEFORE INSERT
auto-reference trigger from v197 is not present/firing in this DB. Seeds now
set project-derived refs (`RMS-YYYY-<full project uuid hex>`). Truncating to 8
hex chars collided on seed UUIDs that share the `e7380001-` prefix (`23505`).

After seed/RLS, RMS list alerted `relation "user_role_assignments" does not exist`
because v226 helpers still queried that never-created table from every RMS SELECT
policy. **v837** redefines the helpers on `user_roles` (+ project_memberships for PM).

Apply order: **v835** → **v836** → **v837** → refresh `/pm/governance/risk-strategy`.
