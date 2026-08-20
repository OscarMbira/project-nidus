# v879 — Controls & Registers Menu Consolidation — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator)
**Plan:** `projectplan/v879_controls_registers_menu_consolidation_plan.md`

---

## a) Problem statement

The "Controls & Registers" sidebar section (`plat_grp_pm_controls` / `sim_grp_pm_controls`) was supposed to be the
one place every project-level register or log lives. A menu reset in `SQL/v680_menu_revamp_clear_old_data.sql`
wiped all pre-existing menu rows, and the rebuild in `v681`/`v682` only carried forward a subset. As a result:

- **Working pages with no menu entry at all:** Quality Register, Configuration Item Register, RAID Log, Decision
  Log, and Benefits Register all have real, routed pages but nothing in the sidebar links to them.
- **Duplicate implementations, inconsistent target:** Risk Register, Quality Register, and Lessons Log each exist
  as both an older `/platform/...` page and a newer `/pm/controls/...` page (the pattern Issue Register was
  already migrated to in v869). The menu (where it exists) points at the older one.
- **Dead links today:** every PMO Project Oversight register entry, the existing Lessons Log entry, and stray code
  references to a `/platform/decision-log` route point at paths that don't exist in `platformRoutes.jsx`.
- **Simulator asymmetry:** Simulator's "Practice Controls & Registers" has Quality Register and Configuration
  Items but not Change Log, Requirements Register, EEF, Decision Log, RAID Log, or Benefits Register — a
  different, incomplete subset from Platform's, violating rule 34.1 parity.
- **Simulator has orphaned imports, not just orphaned menu items:** `ChangeLogPage`, `RAIDLog`, and
  `DecisionLogPage`/`Form`/`Detail` are lazy-imported in `simulatorRoutes.jsx` but never mounted as `<Route>`
  elements — these features don't exist in Simulator at a URL at all yet, on top of having no menu entry.

## b) Solution

Rebuild `plat_grp_pm_controls` / `sim_grp_pm_controls` as a two-level menu: the top-level "Controls & Registers"
group gets four sub-groups (Core Controls, Quality & Configuration, Knowledge & Governance, Scope & Value), each
holding the registers that belong to that discipline. Every leaf points at the canonical, currently-working page
for that register — preferring the `/pm/controls/...` implementation where one exists (matching the Issue
Register precedent), otherwise the existing `/platform/...` page. Dead route-path bugs get fixed as part of the
same pass, since several are one-line corrections in the same SQL being touched anyway. Simulator gets the
equivalent structure, plus the three missing `<Route>` mounts it needs to make Change Log, RAID Log, and Decision
Log reachable at all.

## c) User stories

1. As a PM, I can find Risk, Issue, Change, and Delay registers under Controls & Registers → Core Controls.
2. As a PM, I can find Quality Register and Configuration Item Register under Controls & Registers → Quality &
   Configuration.
3. As a PM, I can find Lessons Log, Decision Log, and RAID Log under Controls & Registers → Knowledge & Governance.
4. As a PM, I can find Requirements Register, EEF, and Benefits Register under Controls & Registers → Scope & Value.
5. As a PM, clicking any of the above navigates to a working page — no dead links.
6. As a Simulator user, the same 12-item, 4-group structure is available under "Practice Controls & Registers",
   pointing at the equivalent `/simulator/...` pages, including the 3 that need a new route mount.
7. As a role other than Project Manager/Admin (Programme Manager, Project Board Member, PM Project Assurance),
   my visibility into each new item matches the grant pattern of the existing sibling items in its sub-group —
   this pass doesn't silently widen or narrow anyone's access beyond that.
8. As a developer building a new register/log page in future, CLAUDE.md tells me it belongs under Controls &
   Registers and which sub-group, so this doesn't drift again.

## d) Implementation decisions (already settled)

- **Scope:** include every working register/log page found in the audit, including the previously-orphaned ones
  (Quality Register, Configuration Item Register, RAID Log, Decision Log, Benefits Register). **Audit Logs is
  excluded** — its page has no route at all today (not even outside this menu), so wiring it up is a bigger,
  separate task (build + route a page, not just link one), tracked as a follow-up, not part of v879.
- **Canonical page per register:** Risk Register, Quality Register, and Lessons Log point at their
  `/pm/controls/...` implementation (consistent with Issue Register's existing migration). Change Log, Delay
  Register, Requirements Register, EEF, RAID Log, Decision Log, Benefits Register, and Configuration Item
  Register each only have one real implementation — use it as-is.
- **Sub-grouping:** Core Controls (Risk, Issue, Change, Delay) · Quality & Configuration (Quality Register,
  Configuration Item Register) · Knowledge & Governance (Lessons Log, Decision Log, RAID Log) · Scope & Value
  (Requirements Register, EEF, Benefits Register).
- **PMO Project Oversight stays separate.** Its registers are aggregated, cross-project, PMO-level views — a
  different consumption context from a PM's own per-project registers. Its dead route-path bugs (all 5 entries
  point at nonexistent paths) get fixed in this pass since they're one-line corrections, but the section itself is
  not merged into Controls & Registers.
- **Role grants for new items:** match the existing grant pattern of the sibling items already in that sub-group
  (e.g. new Core Controls items get whatever Risk/Issue/Change/Delay already have). Not attempting to broaden or
  rationalize grants beyond that — Requirements/EEF's PM-wildcard-only grant, for instance, carries over to
  Benefits Register unchanged, since that's a separate access-policy decision outside this menu-structure fix.
- **Simulator route-wiring:** `ChangeLogPage`, `RAIDLog`, `DecisionLogPage`/`Form`/`Detail` are already
  lazy-imported in `simulatorRoutes.jsx` — add the missing `<Route>` elements (mechanical, using the existing
  imports) rather than building new pages. Mount at `/simulator/change`, `/simulator/raid-log`,
  `/simulator/governance/decisions` (+ `/new`, `/:id`, `/:id/edit`) to mirror Platform's path shapes.
- **Naming collision cleanup:** `plat_tl_controls` (a same-labelled but differently-shaped Team Lead leaf item,
  `/platform/risks`) gets renamed to avoid confusion with the group — not deleted, since it's a legitimate
  shortcut for that role.

## e) Testing decisions

- No new automated test coverage — this is menu/routing configuration (SQL data + a handful of `<Route>` JSX
  additions), not new logic. `organisationalTemplateRoutes.test.js` / `projectRouteParam.test.js` etc. are
  unaffected and don't need re-running for this change.
- Manual smoke test (post-deploy, by the user): log in as Project Manager on Platform, open every Controls &
  Registers leaf, confirm no dead links; repeat as Programme Manager / Project Board Member / PM Project Assurance
  to confirm grant parity; repeat both on Simulator.

## f) Out-of-scope

- Wiring up Audit Logs (no route exists today — separate task).
- Consolidating the two `/platform/...` vs `/pm/controls/...` implementations for Risk/Quality/Lessons Log into
  one codebase (this pass only repoints the menu; the older pages remain in the codebase, unlinked, for a later
  cleanup).
- Rationalizing role grants beyond "match existing sibling pattern" (e.g. deciding whether Programme Manager
  *should* see Requirements Register — that's a permissions-policy call, not a menu-structure fix).
- Admin app — no equivalent "Controls & Registers" concept exists there.

## g) Further notes

- Audit performed via live grep across `SQL/`, `apps/platform/src/routes/platformRoutes.jsx`, and
  `apps/simulator/src/routes/simulatorRoutes.jsx` on 2026-08-14 — see plan file for the full before/after table.
- `v680`→`v681`/`v682` is the authoritative menu-seed baseline; anything from an SQL file older than v680 is dead
  data unless explicitly re-inserted after it.
