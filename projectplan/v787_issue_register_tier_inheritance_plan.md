# v787 — Issue Register: wire into the tier-inheritance system (Phase 2, reuses v785's infrastructure)

**Prerequisite (verified complete):** `v785_native_register_methodology_awareness_plan.md` — Risk Register proved the pattern; all core mechanism gaps (entity-scoped auth, sticky-disable, mandatory-lock, category-based resolver routing) are built, tested, and live in both apps.

## Why this one is much smaller than v785

Everything mechanism-level is done. This plan only needs the **per-screen wiring** repeated — the same shape as v785's old Gaps 4/5/6, nothing from Gaps 1/2/3.

## What's already confirmed reusable, unchanged
- `pmTemplateInheritanceService.js` (`resolveEffectiveFields`, `resolveStartNodeId` with `category` option, sticky-disable, mandatory-lock) — domain-agnostic, works for any entity/category, no changes needed.
- `TierFieldCustomisationPanel.jsx` — already generic (`entityType`, `entityId`, `category` props), already permission-gated via `can_manage_pm_template_node`.
- `custom_field_values` / `custom_field_screen_map` (LDE) — generic value storage, just needs a new `screen_code`.

## Schema facts (verified this session)
- `public.issues` (`v25_issue_management.sql`, enhanced `v174_issue_register_tables.sql`): `issue_type`, `issue_category`, `priority`, `severity`, `priority_rationale`/`severity_rationale`, `closure_date`, `status_date`. Separate `public.issue_decisions` table: `decision_date`, `decision_type`, `decision_maker_id/name`, `decision_rationale`.
- `sim.practice_issues` (`v233_sim_issue_management.sql`): has `issue_type`, `priority`, `severity`, `priority_rationale`/`severity_rationale` — **missing `closure_date`** (the one real parity gap, smaller than Risk Register's — `sim.practice_issue_decisions` already exists, contrary to earlier assumption, so no separate decisions-table gap this time).
- Views: `apps/platform/src/pages/IssueRegisterView.jsx`, `apps/simulator/src/pages/IssueRegisterView.jsx` — currently fixed hardcoded columns, same shape as Risk Register was before v785.

## Scope (mirrors v785's Gaps 4/5/6 exactly, applied to Issue Register)

1. **Sim parity fix:** add `closure_date DATE` to `sim.practice_issues` (single-column migration — much smaller than Risk Register's parity fix).
2. **Screen identity:** register an `issue_register` screen_code in `system_screens` (public + sim), same pattern as `v788`'s `risk_register` entry.
3. **Category tag:** Admin's Global Template `fields`-domain templates for the Issue Register get `category = 'issue_register'` so `resolveStartNodeId`'s existing category filter (built in v785) routes correctly — no resolver code change, just using what's already there.
4. **View wiring:** add a "Settings" tab to `IssueRegisterView.jsx` (Platform + Simulator) embedding `TierFieldCustomisationPanel` with `category="issue_register"`, `entityType="project"` — same shape as `RiskRegisterView.jsx`'s existing Settings tab, effectively copy-adapt.
5. **Simulator parity** for the wiring itself (steps 2–4 identically in `apps/simulator`).

## Explicit non-goals
- No changes to `pmTemplateInheritanceService.js`, `TierFieldCustomisationPanel.jsx`, or the `locked`/sticky-disable mechanism — all reused verbatim.
- No Admin-side Global Template content work here (that's the separate v189/v191-style completeness plans if the Issue Register's *field catalog* itself needs enriching — this plan is purely the tier-inheritance wiring, not content).

## Todo
- [x] `sim.practice_issues` — add `closure_date` column (single migration) — `SQL/v789_issue_register_screen_and_sim_parity.sql`
- [x] Register `issue_register` screen_code (public + sim `system_screens`) — same file
- [x] Embed `TierFieldCustomisationPanel` (Settings tab) in `IssueRegisterView.jsx`, Platform + Simulator
- [x] Wire `InheritedIssueRegisterFields.jsx` (new component, mirrors `InheritedRiskRegisterFields.jsx`) into `IssueForm.jsx`, Platform + Simulator
- [x] Wire `InheritedIssueRegisterFields` on Issue Detail (view mode) + resolve `accountId` (was declared but never set) — Platform + Simulator
- [x] Verify 15→10→8-style cascade for Issue Register category via unit test (domain-agnostic merge; category is routing-only)
- [x] Review section

## Review

**Status: 100% complete (implementation).** Apply `SQL/v789_issue_register_screen_and_sim_parity.sql` on Supabase before using `issue_register` screen / `sim.practice_issues.closure_date` in a live environment. (Risk category pick-list SQL was renumbered to `SQL/v790_list_risk_category_options.sql` to clear a duplicate v789 filename.)

### What shipped

| Item | Change |
|------|--------|
| Sim parity | `sim.practice_issues.closure_date` |
| Screen | `system_screens.screen_code = issue_register` (public + sim, module `issues`) |
| Settings | Issue Register Settings tab → `TierFieldCustomisationPanel` with `category="issue_register"` |
| Form / Detail | `InheritedIssueRegisterFields` on IssueForm + IssueDetailView (Platform `platformDb`, Simulator `simDb` + `practiceProjectId`) |
| Bugfix | `IssueDetailView` now loads `account_id` from `projects` (state was previously never set, so LDE / inherited fields never rendered) |
| Verify | Unit test `issue_register cascade: PMO narrows then project narrows further (15→10→8 style)` in `pmTemplateInheritanceService.test.js` |
| Docs | `Documentation/Issue_Register_Tier_Field_Inheritance_Guide.md` |

### Key files
- `SQL/v789_issue_register_screen_and_sim_parity.sql`
- `apps/platform|simulator/.../InheritedIssueRegisterFields.jsx`
- `apps/platform|simulator/.../IssueRegisterView.jsx`, `IssueForm.jsx`, `IssueDetailView.jsx`
- `Documentation/Issue_Register_Tier_Field_Inheritance_Guide.md`

### Global / PMO category convention
Tag fields-domain Global Templates with `category = 'issue_register'` so `resolveStartNodeId` routes the Issue Register chain (same as `risk_register`). Catalog content enrichment remains out of scope.
