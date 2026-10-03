# Skill Matrix, Capacity Planning, Leave Calendar — v1109

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Related:** `projectprd/v1109_team_skills_capacity_leave_PRD.md`,
`projectplan/v1109_team_skills_capacity_leave_plan.md`

## What this adds

Teams.jsx's Skill Matrix, Capacity Planning, and Leave Calendar tabs (previously "coming soon"
placeholders) are now wired to real data. As with the Data Management feature (v1108), the
database tables already existed from an early migration (`SQL/v643`/`v644`) — only the service
layer and UI were missing.

1. **Skill Matrix** — every project team member's skills and competency levels (1-5), plus a
   PMO-Admin-only catalog management affordance.
2. **Capacity Planning** — every team member's configured hours/day and hours/week.
3. **Leave Calendar** — every team member's logged leave entries (type + date range).

Each tab lets you add your own row inline (a quick-add panel, not a separate page — these are
small 2-4 field records). PMO Admin can edit/delete anyone's row; everyone else can only edit/
delete their own.

## The RLS gap this fixes

The original policies only let a user see their **own** row, or a PMO Admin see everyone's — no
"project team can see each other's" rule, which defeated the purpose of a team-facing page. Even
the read-only skill catalog itself was PMO-Admin-only to view. `SQL/v1129` (public) / `SQL/v1130`
(sim) fix this: any project teammate can now **view** (not edit) another member's row, via a new
`auth_user_shares_project_with()` / `auth_user_shares_practice_project_with()` helper (SECURITY
DEFINER + `row_security = off`, the established safe pattern for this codebase). Writes remain
self-only or PMO Admin — unchanged.

## Identity model quirk

`member_skills` / `workload_capacity_settings` / `workload_leave_calendar.user_id` reference
`auth.users(id)` **directly** in both schemas — not `public.users.id` like most other Platform
tables. The service layer passes the raw `supabase.auth.getUser().id` value straight through for
these columns; no `getCurrentUserInternalUserId()` resolution needed here (unlike v1108's
`gdprService.js` fix). `listProjectTeamMembers()` / `listPracticeProjectTeamMembers()` bridge this:
they resolve `public.users` rows (which have both `id` and `auth_user_id`) for the project's
members, so the UI can display a name while the underlying tables key off the auth uid.

## Simulator structural note

Simulator's real Teams page (`PracticeTeams.jsx`) had no tab structure at all before this — a bare
team-card grid. It now has a tab bar matching Platform's `Teams.jsx` shape (Teams / Skill Matrix /
Capacity Planning / Leave Calendar); the original card grid became the "Teams" tab's content,
unchanged. Two new tables were added (`sim.workload_capacity_settings` /
`sim.workload_leave_calendar`, `SQL/v1130`) — genuinely new, Simulator never had these before.
`sim.skill_categories`/`skill_catalog`/`member_skills` already existed (`SQL/v963r`) and got the
same RLS broadening treatment.

## Running the SQL

Run in order against Supabase:

1. `SQL/v1129_team_skills_capacity_leave_rls_fix.sql` — RLS fix on the 5 existing `public` tables.
2. `SQL/v1130_sim_workload_capacity_leave_schema.sql` — 2 new `sim.*` tables + RLS fix on the 3
   existing `sim.*` skills tables.
3. `SQL/v1131_seed_skills_capacity_leave_seed334_prj08.sql` — demo data for the
   `SEED334-PRJ-08` project.

(These files were renumbered from their original v1124-v1126 during implementation, to resolve
filename collisions with unrelated concurrent work — content unchanged from what's described here.)

### Verify

```sql
-- As a non-PMO-Admin project member, this should return more than just your own row
select user_id from public.member_skills where user_id != auth.uid();
```

## Tests

- `apps/platform/src/services/__tests__/teamSkillsCapacityLeave.test.js` (7 tests)
- `apps/simulator/src/services/sim/__tests__/simTeamSkillsCapacityLeave.test.js` (7 tests)

Both cover: project-team-member resolution (internal id + auth uid), that list functions scope to
the given project's team members only (not everyone the RLS *could* show), and that upsert/add
functions build correct payloads.

## Known gaps (documented in the PRD as out-of-scope, or as time-boxed simplifications)

- Capacity "edit" always inserts a new row rather than updating the existing one in the UI — the
  service (`upsertCapacitySetting`) supports update-by-id, just not wired to an edit control yet.
- Skill category management (add/rename categories) isn't exposed in the UI — only adding skills
  (uncategorized) is. Categories exist in the schema/service.
- Skill endorsements, skill requirements, leave approval workflows, and capacity-vs-allocation
  conflict warnings are all out of scope for v1 (per the PRD).
- Card/Table view toggle wasn't extended to these three new tabs — they reuse the page's existing
  single `viewMode` state but only render as a plain table, not a card grid.
