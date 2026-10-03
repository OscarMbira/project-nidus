# v1082 — Team Member & Team Field Change History

**Status:** Approved for implementation (interview locked 2026-09-19).
**Related:** `apps/platform/src/pages/platform-app/TeamDetail.jsx`, `teamService.js`,
`SQL/v04_project_core_tables.sql` (teams / team_members), `SQL/v1077_team_members_allocation_dates.sql`,
`SQL/v444_project_delays.sql` (append-only history + `set_config` pattern).

---

## a) Problem statement

Allocation %, start/end dates, member role, and other team membership fields change over the
project lifecycle. Core team fields (name, type, max size, active, team lead) also change.
Today those updates overwrite the live row with no durable trail, so PMs cannot explain when a
member’s allocation moved or when the lead changed. Users need automatic history plus a clear
page to review it.

## b) Solution

1. Append-only `team_change_history` tables (Platform `public`, Simulator `sim` on practice teams)
   written by DB triggers whenever tracked columns change.
2. **Mandatory** change reason from the UI for all roles via
   `set_team_change_reason` (pending table, read by history triggers). Save is blocked while the
   reason is empty/whitespace.
3. Dedicated history page per team, linked from the Members tab on View/Edit team (no new sidebar leaf).

## c) User stories

1. As a PM, when I change a member’s allocation % and end date in one save, I see **one** history
   event listing both field diffs.
2. As a PM (or any role), I **must** enter a change reason before saving; it appears on the history row.
3. As a user, if I leave the reason blank, save is blocked with an error.
4. As a viewer, from the Members tab I can open **View allocation history** and see a filterable,
   searchable, exportable list of events.
5. As a PM, adding or removing a member creates a history event.
6. As a PM, changing team name, type, max size, active flag, or team lead creates a history event.
7. As a Simulator user on practice teams, the same history behaviour applies (parity).
8. As any user without project access, I cannot read another project’s history (RLS).

## d) Implementation decisions

1. Tracked `team_members` fields: member_role, allocation_percentage, allocation_start_date,
   allocation_end_date, required_skills, is_active / is_deleted (add & remove), user identity.
2. Tracked `teams` fields: team_name, team_type, max_team_size, is_active, team_lead_user_id.
3. One history row per change event; `changes` JSONB array of `{ field, old_value, new_value }`.
4. DB triggers are source of truth; UI change reason is **mandatory for all roles** via
   `set_team_change_reason` (pending table).
5. Dedicated route `/platform/teams/:id/allocation-history`; link from Members tab only; no menu leaf.
6. Platform + Simulator in the same delivery (Simulator uses `practice_teams` / `practice_team_members`).
7. No backfill of invented past history.
8. No Admin app work.

## e) Testing decisions

- Unit: history fetch mapping; `setTeamChangeReason` helper.
- Manual/SQL: multi-field member update → one row; team lead update → one row; blank reason OK.
- UI: Members link; optional reason on edit save; list toggle/export.

## f) Out of scope

- Sidebar menu leaf
- Embedding full history inside Audit details (link only)
- Historical backfill
- Admin app

## g) Further notes

Simulator practice teams lack some Platform columns (e.g. required_skills on members may be absent);
triggers only emit diffs for columns that exist on that table.
