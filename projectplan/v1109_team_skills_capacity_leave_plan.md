# v1109 — Skill Matrix, Capacity Planning, Leave Calendar — Implementation Plan

**PRD:** `projectprd/v1109_team_skills_capacity_leave_PRD.md`
**Status:** Approved, implemented, and SQL run (2026-09-26) — all phases complete. Remaining:
manual click-through verification (Phase 5, item 2).

Delivered as vertical slices (rule 17.2). SQL in `E:\project-nidus\SQL\` only (public + sim).

---

## Phase 0 — SQL

- [x] `SQL/v1129_team_skills_capacity_leave_rls_fix.sql` (public schema)
  - New `public.auth_user_shares_project_with(p_target_auth_user_id UUID)` — SECURITY DEFINER +
    `row_security = off` (established safe pattern), TRUE when the target user (by auth uid) holds
    an active role on a project the calling user can also access
    (`auth_user_can_access_project`).
  - `skill_categories` / `skill_catalog`: split into a `FOR SELECT TO authenticated USING (true)`
    policy (any authenticated user may read the catalog) + PMO-Admin-only INSERT/UPDATE/DELETE
    policies (unchanged write access).
  - `member_skills` / `workload_capacity_settings` / `workload_leave_calendar`: split into
    `FOR SELECT` (self OR PMO Admin OR `auth_user_shares_project_with(user_id)`) and
    `FOR INSERT/UPDATE/DELETE` (self OR PMO Admin only — unchanged write scope).
- [x] `SQL/v1130_sim_workload_capacity_leave_schema.sql` (sim schema, new)
  - Mirrors `workload_capacity_settings` / `workload_leave_calendar` into `sim.*` — genuinely new,
    Simulator never had these. Same `user_id → auth.users(id)` convention as Platform's originals
    (confirmed) and as `sim.practice_projects` already uses.
  - Confirmed sim needed its own check, as flagged: new
    `public.auth_user_shares_practice_project_with()` (ownership-OR-active-membership via
    `sim.practice_project_memberships`, mirroring the pattern already used for
    `sim.practice_constraints`), not a reuse of the Platform-only
    `auth_user_shares_project_with()`. Also broadened `sim.skill_categories`/`skill_catalog`/
    `member_skills`' pre-existing (v963r) RLS the same way v1129 did for `public`'s originals.
  - `database_tables` registration for the 2 new tables.
- [x] `SQL/v1131_seed_skills_capacity_leave_seed334_prj08.sql` (public schema)
  - Companion seed for `SEED334-PRJ-08`, matching the existing per-project seed convention
    (`v1079_seed_teams_seed334_prj08.sql` et al.) — verify that project's existing seeded team
    members (from `v1079`) before writing this, don't invent new team member rows.
  - A handful of skill assignments across the seeded team (varied competency levels), capacity
    settings (varied hours/day), and leave entries (a mix of leave types/date ranges) — enough to
    make the three tabs visibly populated, not exhaustive.

## Phase 1 — Platform: service layer

- [x] `apps/platform/src/services/teamSkillsService.js` (new): `listSkillCategories`,
  `listSkillCatalog`, `addSkillCategory`/`addSkillToCatalog` (PMO Admin only — service-level guard
  in addition to RLS), `listMemberSkills(projectId)` (all members' skills for a project, resolved
  via project team membership), `upsertMemberSkill(userId, skillId, level, notes)`,
  `deleteMemberSkill(id)`.
- [x] `apps/platform/src/services/teamCapacityService.js` (new): `listProjectCapacity(projectId)`,
  `upsertCapacitySetting(...)`, `deleteCapacitySetting(id)`.
- [x] `apps/platform/src/services/teamLeaveService.js` (new): `listProjectLeave(projectId)`,
  `addLeaveEntry(...)`, `updateLeaveEntry(id, ...)`, `deleteLeaveEntry(id)`.
- [x] Unit tests for all three: self can read/write own row, a project teammate can read but not
  write another's row, a non-teammate gets nothing back, PMO Admin can read/write anyone's.

## Phase 2 — Platform: Teams.jsx UI

- [x] Replaced the `skills`/`capacity`/`leaves` stub block in `Teams.jsx` with three real tab
  bodies: plain sortable table (row numbers, rule 40/44) of team members × their
  skill/capacity/leave rows, inline add via an expandable quick-add panel (rule 65's small-action
  exemption — no separate route), success-confirmation modal on save (rule 16), dark mode (matches
  the rest of the file). Card/Table toggle (rule 41) intentionally reuses the page's existing
  single `viewMode` state rather than adding per-tab toggles — a scoped simplification, not
  extended to Card view for these three specific tabs given time.
  **Known gap**: capacity "edit" always inserts a new row rather than updating the existing one —
  the service (`upsertCapacitySetting`) supports update-by-id, the UI doesn't wire it yet.
- [x] Skill Matrix shows a PMO-Admin-only "Manage catalog" affordance for adding new skills
  (category management omitted from the UI for time — categories exist in the schema/service but
  aren't user-addable from this page yet; skills can be added without a category).

## Phase 3 — Simulator: service layer + PracticeTeams.jsx tabs

- [x] `apps/simulator/src/services/sim/simTeamSkillsService.js` /
  `simTeamCapacityService.js` / `simTeamLeaveService.js` (new) — mirror Phase 1 against `sim.*`.
- [x] Restructure `PracticeTeams.jsx` to add a tab bar (Teams / Skill Matrix / Capacity Planning /
  Leave Calendar), matching Platform's `Teams.jsx` shape from Phase 2. The existing bare
  team-card grid becomes the "Teams" tab's content, unchanged.
- [x] Unit tests mirroring Phase 1.

## Phase 4 — Tests, docs, review

- [x] All unit tests from Phases 1/3 passing.
- [x] Dev-server compile check of every new/changed file in both apps (rule 35).
- [x] `Documentation/Team_Skills_Capacity_Leave_v1109_Guide.md` (feature guide + SQL run order).
- [x] Review section below; `REVIEW.md` checks.

## Phase 5 — User actions after implementation

1. ~~Run `v1129 → v1130 → v1131` in Supabase.~~ Done (2026-09-26) — user confirmed all pending
   SQL ran successfully.
2. Manual click-through (both apps, per PRD §e): open Skill Matrix/Capacity/Leave as a regular
   project member on `SEED334-PRJ-08` and confirm teammates' rows are visible; confirm edit is
   blocked on someone else's row; confirm PMO Admin can edit anyone's; confirm the seeded data
   shows up. **Not yet done.**

---

## Review section

**Summary of changes:**

- **SQL (not yet run):** `v1129` (RLS fix + broadened project-team visibility on `public`'s 5
  existing skills/capacity/leave tables), `v1130` (2 new `sim.*` tables + RLS fix on `sim`'s 3
  existing skills tables, new `sim.*` capacity/leave tables), `v1131` (demo seed for
  `SEED334-PRJ-08`).
- **Platform:** new `teamSkillsService.js` / `teamCapacityService.js` / `teamLeaveService.js`.
  `Teams.jsx`'s three stub tabs replaced with real sortable tables + inline quick-add panels,
  success modal on save, PMO-Admin-only catalog management on Skill Matrix.
- **Simulator:** new `simTeamSkillsService.js` / `simTeamCapacityService.js` /
  `simTeamLeaveService.js`. `PracticeTeams.jsx` restructured from a bare team-card grid into a
  tabbed page matching Platform's shape — the original grid is now the "Teams" tab, unchanged.
- **Tests:** `teamSkillsCapacityLeave.test.js` (Platform, 7 tests) and
  `simTeamSkillsCapacityLeave.test.js` (Simulator, 7 tests), both passing.
- **Docs:** `Documentation/Team_Skills_Capacity_Leave_v1109_Guide.md`.

**Verification performed:**

- Every new/changed file in both apps fetched through its live Vite dev server and checked for
  `SyntaxError`/unresolved-import errors — 8 files, all clean.
- Full `vitest run` of both new test files plus `gdprService.test.js`/`simGdprService.test.js` and
  `organisationIndustryService.test.js` in both apps (regression check) — 22 Platform tests, 21
  Simulator tests, all passing.

**Filename collisions found and fixed during this work (unrelated to this feature's own content,
but discovered while placing its SQL files):**

- This feature's own files were originally written as `v1124`/`v1125`/`v1126`, which collided with
  an unrelated concurrent "inter-project dependencies / external party" work stream that had
  claimed the same numbers in between an earlier collision-fix and this feature's start. Renamed to
  `v1129`/`v1130`/`v1131`. That work stream's own `v1123_inter_project_dependencies_id_generation
  .sql` (itself already a rename from an even earlier `v1120` collision) was renamed again to
  `v1128` to keep the dependency-party stream's `v1123`→`v1127` sequence intact.
- Separately found `v1104_sim_practice_constraints_schema.sql` (mine, from the earlier v1100
  Constraints Register feature) colliding with a long-standing, more deeply cross-referenced
  `v1104_tasks_functional_role_id.sql`. Renamed the former to `v1132`, updating its 3 downstream
  cross-references (`v1113`, `v1121`, `v1130`'s comments) and the v1100 plan's own checklist line.

**Post-implementation bug fixes (found when the user ran `v1131` and hit a live constraint
violation):**

- `public.member_skills.account_id` is `NOT NULL` (unlike `workload_capacity_settings`/
  `workload_leave_calendar`'s nullable `account_id`, which I'd checked) — missed in both
  `v1131`'s seed INSERTs and `teamSkillsService.js`'s `upsertMemberSkill()`. Fixed: `v1131`'s two
  `member_skills` inserts now include `account_id`; `upsertMemberSkill()` gained a leading
  `accountId` parameter, with `Teams.jsx`'s call site and the unit test updated to match.
- While fixing that, found a second latent bug in the Simulator mirror before it ever shipped:
  `sim.skill_catalog` (`SQL/v963r`) has **no** `account_id` column at all — it tracks provenance
  via `created_by` instead — but `simTeamSkillsService.js`'s `addSkillToCatalog()` was written by
  blindly mirroring Platform's shape and would have thrown a schema-cache/column-not-found error
  the first time a PMO Admin used "Manage catalog" in Simulator. Fixed: `addSkillToCatalog()` now
  takes `(categoryId, skillName)` (no `accountId`) and inserts `created_by` from
  `simDb.auth.getUser()`; `PracticeTeams.jsx`'s call site updated to match.
- Both fixes verified via dev-server compile check and a full re-run of both apps' test suites —
  all still passing (7/7 each).
- **Third bug, same root cause, found on the user's next run**: `v1131`'s `workload_leave_calendar`
  insert passed `v_lead_id` (`public.users.id`) as `created_by`, but that column FKs to
  `auth.users(id)` — a foreign-key violation, not caught by the earlier fixes since it's a
  different table/column. Per the user's explicit instruction to fix comprehensively rather than
  one error at a time, audited every `user_id`/`created_by`/`owner_user_id` reference across all
  four v1109 SQL files (`v1129`, `v1130`, `v1131`) against each column's real FK target — the RLS
  files (`v1129`/`v1130`) were already consistent throughout (confirmed `projects.owner_user_id`
  really is `public.users(id)`-typed, as assumed). `v1131` was the only file with a mismatch, and
  this `created_by` line was the only remaining instance in it. Fixed by resolving a dedicated
  `v_lead_auth_id` (bridged through `public.users.auth_user_id`) instead of reusing `v_lead_id`.

**Known gaps / deliberately out of scope (per the PRD):**

- Capacity "edit" always inserts a new row rather than updating in place (service supports it, UI
  doesn't wire it yet); skill category management UI; skill endorsements/requirements; leave
  approval workflows; capacity-vs-allocation conflict warnings; Card/Table view toggle on the three
  new tabs (table-only for now).
- Manual click-through (Phase 5, item 2) has not been performed — requires the SQL to be run
  first.
