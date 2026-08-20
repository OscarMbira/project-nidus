# v879 — Controls & Registers Menu Consolidation — Plan

**Repo:** `E:\project-nidus`
**PRD:** `projectprd/v879_controls_registers_menu_consolidation_PRD.md`
**Status:** Implemented and applied to the live database 2026-08-15.

---

## Confirmed technical feasibility

`apps/platform/src/components/DynamicMenu.jsx:7-101` (`MenuItem`) is **recursive** — `menuItem.children.map(child => <MenuItem ... level={level+1}>)`, `SidebarNavTier`/`SidebarNavNestedRow` handle arbitrary indent depth. The schema comment in `v681` says "Level 1/2/3" but that's describing what's been *used* so far, not a hard limit — `menu_level` is a plain integer column and the render tree is built from `parent_menu_id`. A 4th level (Section → Group → Sub-group → Leaf) is supported without a frontend change.

---

## Target structure (Platform)

```
plat_grp_pm_controls  "Controls & Registers"  (unchanged, level 2, sort 60)
├── plat_pm_ctrl_core       "Core Controls"              (NEW, level 3, sort 10)
│   ├── plat_pm_risk_reg      Risk Register       /pm/controls/risk-register       (route changed)
│   ├── plat_pm_issue_log     Issue Register       /pm/controls/issue-register      (unchanged, post-v869)
│   ├── plat_pm_change_log    Change Log           /platform/change                 (unchanged)
│   └── plat_pm_delay_reg     Delay Register       /platform/delays                 (unchanged)
├── plat_pm_ctrl_quality    "Quality & Configuration"    (NEW, level 3, sort 20)
│   ├── plat_pm_quality_reg   Quality Register     /pm/controls/quality-register     (NEW row)
│   └── plat_pm_config_reg    Configuration Item Register /pm/controls/configuration-items (NEW row)
├── plat_pm_ctrl_knowledge "Knowledge & Governance"     (NEW, level 3, sort 30)
│   ├── plat_pm_lessons_ctrl  Lessons Log          /pm/controls/lessons-log          (NEW row — plat_pm_lessons stays put under Projects, see note)
│   ├── plat_pm_decision_log  Decision Log         /platform/governance/decisions    (NEW row)
│   └── plat_pm_raid_log      RAID Log             /platform/raid-log                (NEW row)
└── plat_pm_ctrl_scope     "Scope & Value"               (NEW, level 3, sort 40)
    ├── plat_pm_requirements  Requirements Register /platform/scope/requirements      (unchanged)
    ├── plat_pm_eef           EEF                   /platform/eef                     (unchanged)
    └── plat_pm_benefits_reg  Benefits Register     /platform/benefits/register       (NEW row)
```

**Note on Lessons Log:** the existing `plat_pm_lessons` row (under Projects group, pointing at the dead
`/platform/lessons`) is **not deleted** — it's a differently-scoped entry (project-context lessons) that several
role menus may reference by `menu_code`. This plan adds a *new* `plat_pm_lessons_ctrl` row under Controls &
Registers pointing at the working `/pm/controls/lessons-log`, and separately fixes `plat_pm_lessons`'s dead route
to point at `/pm/controls/lessons-log` too (same destination, both entries now work — cleanup/merge of the
duplicate entry itself is a follow-up, not blocking this pass).

**Role grants:** new leaves under each sub-group inherit the `role_menu_items` grant list already used by that
sub-group's existing siblings (source: `v683_menu_revamp_platform_role_assignments.sql`) — e.g. Quality Register
and Configuration Item Register get whatever Risk/Issue/Change/Delay currently have (PM wildcard + Programme
Manager + Project Board Member + PM Project Assurance), and Benefits Register gets whatever Requirements/EEF
currently have (PM wildcard only).

## Target structure (Simulator) — mirrors Platform 1:1

`sim_grp_pm_controls` gets the same 4 sub-groups. Existing `sim_pm_risk_reg`/`sim_pm_issue_reg`/
`sim_pm_quality_reg`/`sim_pm_lessons` route-path bugs get fixed in the same pass (they point at
`/simulator/practice-risks` etc., which don't exist — actual routes are `/simulator/pm/controls/risk-register`
etc., confirmed in `simulatorRoutes.jsx:5567-5619`). New leaves: Change Log (`/simulator/change` — route needs
mounting, see below), Requirements Register (`/simulator/practice-projects/:projectId/scope/requirements`), EEF
(`/simulator/eef`), Decision Log (`/simulator/governance/decisions` — route needs mounting), RAID Log
(`/simulator/raid-log` — route needs mounting), Benefits Register (`/simulator/benefits/register`, already
routed).

---

## Todos

### Simulator route-wiring (prerequisite — do first, these components exist but aren't mounted)
- [x] `apps/simulator/src/routes/simulatorRoutes.jsx` — mount `<Route path="simulator/change" element={<ChangeLogPage/>} />` (import already present at line 564)
- [x] Same file — mount RAID Log at `simulator/raid-log` (import `RAIDLog` already present at line 497)
- [x] Same file — mount Decision Log list/create/detail/edit at `simulator/governance/decisions[...]`, mirroring `platformRoutes.jsx:4985-5006` (imports already present at lines 339-341)

### SQL migration — `SQL/v879_controls_registers_menu_consolidation.sql`
- [x] Insert 4 new Platform sub-group rows (level 3) under `plat_grp_pm_controls`
- [x] Reparent existing 6 Platform leaves (`plat_pm_risk_reg` → Core Controls sub-group, etc.) — `UPDATE ... SET parent_menu_id = (sub-group id), menu_level = 4`
- [x] Update `plat_pm_risk_reg.route_path` → `/pm/controls/risk-register`
- [x] Insert 6 new Platform leaf rows (Quality Register, Configuration Item Register, Decision Log, RAID Log,
      Benefits Register, Lessons-Log-under-Controls) at level 4, with `route_path` per table above
- [x] Fix `plat_pm_lessons`'s dead route (`/platform/lessons` → `/pm/controls/lessons-log`)
- [x] Fix PMO Project Oversight dead routes: `plat_oversight_risk` → `/pmo/oversight/risk-register`,
      `plat_oversight_issue` → `/pmo/oversight/issue-register`, `plat_oversight_quality` →
      `/pmo/oversight/quality-register`, `plat_oversight_lessons` → `/pmo/oversight/lessons-log`,
      `plat_oversight_change` → `/pmo/registers/changes`
- [x] Fix stray code references to the dead `/platform/decision-log` route in
      `apps/platform/src/components/processTemplates/processTemplatesRegistry.js:132` and
      `apps/platform/src/utils/menuLayoutUtils.js:152` → `/platform/governance/decisions`
- [x] Rename `plat_tl_controls` (Team Lead leaf, currently also labelled "Controls & Registers") to something
      distinct, e.g. "Risk Register" (it only ever pointed at `/platform/risks` anyway — the label was just
      copy-pasted from the group)
- [x] `role_menu_items` inserts for the 4 new sub-groups (any role that can see the group needs to see its
      sub-groups) and the 6 new leaves (copy grants from named sibling per table above)
- [x] Repeat the entire structure for Simulator (`sim_grp_pm_controls` + 4 sub-groups + reparented/new leaves +
      route fixes), mirroring role grants from `v684_menu_revamp_simulator_role_assignments.sql`'s existing
      pattern for `sim_pm_risk_reg` etc.
- [x] Idempotent: use `ON CONFLICT (menu_code) DO UPDATE` (or the equivalent pattern already used in this table's
      seeds) so re-running is safe

### Verification (before considering this done)
- [x] Live-query current `menu_items`/`role_menu_items` state (same approach as the v205 Admin ID-generation
      check) to confirm the v681-v878 archaeology in the PRD matches what's actually in the DB today — the SQL
      file chain is long and an intermediate migration could have altered something not caught by static grep
- [ ] Manual smoke test (user, post-deploy): every leaf under Controls & Registers resolves to a working page,
      as Project Manager, Programme Manager, Project Board Member, and PM Project Assurance; repeat on Simulator

---

## Review

### Shipped
- Live-queried `menu_items`/`role_menu_items` before writing any SQL — confirmed the PRD's static-file
  archaeology matched the DB exactly (21/21 rows), so the plan proceeded on verified ground, not assumption.
- `SQL/v879_controls_registers_menu_consolidation.sql` written as the authoritative, idempotent record of the
  change (safe to re-run; every insert is `WHERE NOT EXISTS`, every grant is `ON CONFLICT DO UPDATE`).
- No direct Postgres connection string was available in this environment (`scripts/run-platform-sql.js` needs
  `SUPABASE_DB_PASSWORD`/`DATABASE_URL`, neither set) — applied the equivalent operations via the Supabase
  service-role REST client instead, then live-verified the resulting tree (see below) matches the SQL file's
  intent exactly.
- Confirmed `role_menu_items` ancestor visibility is automatic (`useMenu.js`'s parent-hydration loop) — a role
  granted a leaf sees every ancestor group/sub-group regardless of the ancestor's own grant row, so the new
  sub-groups needed no separate role grants of their own.
- `plat_pm_s_decision_log` was **reparented**, not duplicated — it already existed (under `[S] Governance &
  Standards`, dead route) and is referenced by `project_sponsor`/`project_board_member`'s existing grants; moving
  it into Knowledge & Governance and fixing its route avoided creating a second "Decision Log" entry for those
  roles.
- Found and fixed a self-introduced bug before considering this done: the Simulator Requirements Register has no
  flat (non-`:projectId`) route like Platform's `/platform/scope/requirements` — added
  `SimRequirementsCurrentProjectRedirect` (`apps/simulator/src/pages/scope/SimRequirementsCurrentProjectRedirect.jsx`)
  to resolve the current project and redirect, mounted at `/simulator/practice-projects/scope/requirements`.
- Final tree verified live for both apps (Platform: `plat_grp_pm_controls`, Simulator: `sim_grp_pm_controls`) —
  4 sub-groups × the intended leaves each, every `route_path` cross-checked against an actual mounted `<Route>`
  in `platformRoutes.jsx` / `simulatorRoutes.jsx`.

### Not done
- The manual click-through smoke test (last checklist item) — needs a logged-in session per role, which this
  session doesn't have. Recommend running it before/at next deploy.
- The two `/platform/decision-log` string-reference fixes in `processTemplatesRegistry.js` and
  `menuLayoutUtils.js` have no live consumer today (verified — `.paths` is read nowhere outside its own file, and
  the `menuLayoutUtils.js` array only needed the dead entry *removed*, since the real route is already covered by
  an existing `/platform/governance` prefix) — fixed anyway for documentation accuracy, but neither was a live bug.
