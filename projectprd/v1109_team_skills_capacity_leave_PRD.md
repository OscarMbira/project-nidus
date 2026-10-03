# v1109 — Skill Matrix, Capacity Planning, Leave Calendar — PRD

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Origin:** Teams page (`Teams.jsx`) has shown "coming soon" placeholders on three of its five
tabs since it was first built. This PRD replaces those placeholders with real features.

## a) Problem statement

The Teams page's Skill Matrix, Capacity Planning, and Leave Calendar tabs have always shown a
generic "coming soon" stub. Investigation found the opposite of what the stub implies: real
database tables for all three already exist (`skill_categories`/`skill_catalog`/`member_skills`/
`skill_requirements`/`skill_endorsements`, `workload_capacity_settings`,
`workload_leave_calendar` — `SQL/v643`/`v644`, committed early, already live), but **no service
layer or UI was ever built on top of them**. Simulator already has a Skills mirror
(`sim.skill_categories` etc., `SQL/v963r`) but no Leave/Capacity tables, and its real Teams page
(`PracticeTeams.jsx`) has no tab structure at all — a bare team-card grid, structurally different
from Platform's tabbed `Teams.jsx`.

A second problem surfaced: the existing RLS on all these tables only allows a user to see their
**own** row, or a PMO Admin to see everyone's. There is no "project team can see each other's"
rule — the SQL even restricts `skill_categories`/`skill_catalog` (the read-only reference catalog
itself) to PMO Admin only. As written, a Project Manager opening Capacity Planning or Leave
Calendar for their team would see almost nothing.

## b) Solution

Build the service layer and UI for all three features against the existing tables, on both apps:

1. **Platform** — wire `Teams.jsx`'s three stub tabs to real content.
2. **Simulator** — add a tab bar to `PracticeTeams.jsx` (Teams / Skill Matrix / Capacity Planning
   / Leave Calendar), matching Platform's structure. New `sim.workload_capacity_settings` /
   `sim.workload_leave_calendar` tables (genuinely new — Simulator never had these).
3. **RLS extension** — any user who can access a project (`auth_user_can_access_project`) can
   **view** (not edit) the skills/leave/capacity of other members of that same project. Editing
   stays self-only or PMO Admin, unchanged. The skill catalog itself (`skill_categories`/
   `skill_catalog`) becomes readable by any authenticated user (still PMO-Admin-only to
   add/rename/deactivate).
4. **Add/edit UI** — inline within each tab (a quick-add row / expandable panel), not a separate
   routed page — these are small 2-4 field records (skill + level, leave type + date range,
   hours/day + effective date), matching rule 65's exemption for small action surfaces.
5. **Seed data** — companion seed SQL for the `SEED334-PRJ-08` project ("Velocity Freight -
   Dynamic Route Optimization Pilot"), matching the existing per-project seed convention already
   used for this project (`v1079_seed_teams_seed334_prj08.sql`,
   `v1089_seed_raci_seed334_prj08.sql`).

## c) User stories

1. As a project team member, I can open the Skill Matrix tab and see every team member's skills
   and competency levels (1-5) for the skills catalog.
2. As a project team member, I can add/edit my own skill assignments (skill + competency level +
   assessed date + notes) inline, without leaving the tab.
3. As a PMO Admin, I can manage the skill catalog itself (categories, skills) — no one else can.
4. As a project team member, I can open Capacity Planning and see each team member's configured
   hours/day and hours/week (with effective date range) for projects I have access to.
5. As a project team member, I can set my own capacity (hours/day, hours/week, effective from/to)
   inline.
6. As a project team member, I can open Leave Calendar and see each team member's leave entries
   (type, date range) for projects I have access to, in a calendar/list view.
7. As a project team member, I can add/edit my own leave entries (type, start/end date, notes)
   inline.
8. As a PMO Admin, I retain full read/write access to everyone's skills/capacity/leave, unchanged
   from today.
9. As a Simulator user, I have the equivalent three tabs on `PracticeTeams.jsx`, against the new
   `sim.*` mirror tables (Leave/Capacity) and the existing `sim.skill_catalog` family (Skills).
10. As anyone viewing the `SEED334-PRJ-08` project's Teams page, I see realistic seeded skill
    assignments, capacity settings, and leave entries for that project's existing seeded team.

## d) Implementation decisions

- **Build all three features now**, not a phased subset.
- **RLS visibility extended to project-team level**: viewing another member's skill/leave/capacity
  row requires the viewer to have project access (`auth_user_can_access_project`) to at least one
  project the target member is also on. Editing another person's row remains PMO-Admin-only, or
  self for one's own row — unchanged.
- **Skill catalog becomes readable by any authenticated user**; only PMO Admin may
  add/rename/deactivate catalog entries — unchanged for writes.
- **Full Simulator parity**, including new `sim.workload_capacity_settings` /
  `sim.workload_leave_calendar` tables mirroring Platform's.
- **Simulator Teams page gets a tab bar added** (`PracticeTeams.jsx` restructured to match
  Platform's `Teams.jsx` shape), rather than bolting the three features on as unrelated separate
  pages.
- **Inline add/edit**, not routed pages, for all three — record size and rule 65's own exemption
  for small action surfaces both support this.
- **Seed data scoped to `SEED334-PRJ-08`** specifically, matching the existing per-project seed
  file convention for this project.

## e) Testing decisions

- Unit tests for the RLS-equivalent access logic at the service layer (self can always
  read/write own row; a project teammate can read but not write another's row; a non-teammate
  cannot read another's row; PMO Admin can read/write anyone's).
- Dev-server compile check on every new/changed file in both apps.
- Manual click-through: open Skill Matrix/Capacity/Leave as a regular project member and confirm
  teammates' rows are visible (not just your own); confirm edit is blocked on someone else's row;
  confirm PMO Admin can edit anyone's.
- "Done" means: all three tabs show real data (no placeholder) in both apps, inline add/edit
  works, RLS actually grants the intended team-visibility (verified live, not just code review),
  and `SEED334-PRJ-08` shows realistic seeded data across all three.

## f) Out-of-scope

- Skill endorsements UI (`skill_endorsements` table exists but has no user story here — logging
  this as a known gap, not silently building it as a side effect).
- `skill_requirements` (attaching required skills to a role/task) — exists in the schema, not
  part of this PRD's scope.
- Leave approval workflows — leave entries are self-logged, not approved/rejected in this PRD.
- Capacity-vs-allocation conflict warnings (e.g. "this person is over-allocated") — display only,
  no computed warnings in v1.

## g) Further notes

- Resource Directory (the 4th tab, not circled) already works — untouched by this PRD.
- The Security tab precedent from PMO Admin (v1108's companion small-fix work) doesn't apply here
  — none of these three tabs belong to a different app by design; they're genuinely missing
  Platform/Simulator features.
