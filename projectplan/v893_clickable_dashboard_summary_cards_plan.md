# Plan v893: Clickable Dashboard Summary Cards — Platform & Simulator

Companion PRD: `projectprd/v893_clickable_dashboard_summary_cards_PRD.md`
Companion Admin plan (separate repo): `E:\project-nidus-admin\projectplans\v206_clickable_dashboard_summary_cards_plan.md`

## Context

See the PRD for the full problem statement and interview decisions. Summary of what's
decided: build a new `DashboardStatCard` component; wire every count/sum-based stat card
system-wide to navigate to its underlying filtered list (same-page tab+filter switch, or
cross-page route+query-param); leave average/percentage/blended cards static; add missing
filter capability to any register whose filter panel doesn't yet cover a card's implied
filter; full system-wide scope, sequenced into phases below for practical delivery.

This plan covers Platform + Simulator only. Admin is tracked in its own repo's plan (linked
above) since Admin SQL/plans must stay in the Admin repo per this repo's CLAUDE.md.

## Phase 0 — Infrastructure ✅ done

- [x] Built `packages/ui/src/DashboardStatCard.jsx`: props `{ label, value, icon?, accentClassName?, iconClassName?, borderClassName?, onClick?, className? }` (the last two added during Phase 1 once RAID Log's per-category colored borders/icons needed them). Renders the existing visual pattern, adds hover/focus affordance only when `onClick` is passed (renders as a `<button>`; plain `<div>` otherwise — zero visual regression for calculated cards).
- [x] Exported from `packages/ui/src/index.js`.
- [x] Duplicated into `apps/platform/src/components/ui/DashboardStatCard.jsx` + barrel entry.
- [x] Duplicated into `apps/simulator/src/components/ui/DashboardStatCard.jsx` + barrel entry.
- [x] Added `useInitialFilterFromQuery(paramNames)` to `packages/shared/src/hooks/` + both per-app local copies — reads a fixed set of query params, returns only the ones present; **not yet wired into any receiving page** (that happens in Phase 3 when cross-page cards are built).

## Phase 1 — Registers with existing rich filter state (cheap wins) ✅ done

- [x] Risk Register (`apps/platform/src/pages/RiskRegisterView.jsx` + Simulator mirror) — Total Risks, Active (`status_in`, new multi-value support added to `getRisksByProject`), High/Very High (`risk_level_in`), Overdue Responses (`overdue_responses_only`, new subquery-backed filter against `risk_responses` added to the service — the "add missing filter" case anticipated in the PRD).
- [x] RAID Log (`apps/platform/src/pages/RAIDLog.jsx` + Simulator mirror) — Total Items, Risks/Assumptions/Issues/Dependencies via existing `raid_type` filter, no service changes needed.
- [x] Issue Register (`apps/platform/src/pages/IssueRegisterView.jsx` + Simulator mirror) — all 8 cards wired: Total Issues, New, In Progress, Resolved, Closed (existing `status` filter), Critical (new `critical_only`, priority OR severity), Open Issues (new `status_not_in`), Overdue Actions (new `overdue_actions_only`, backed by the existing `getOverdueActions` RPC wrapper). Filtering here is client-side in `fetchIssues()`, not a service-layer query — new filter branches added directly in that function on both apps.

All Phase 0+1 files (14 total) verified with `esbuild --bundle=false` — zero syntax errors, including one real bug caught and fixed (a stray unbalanced `</div>` left over from replacing Issue Register's hand-rolled card markup).

**Not yet done: manual in-browser click-through verification** (per the PRD's testing decisions) — no browser tool available in this session. Please verify Risk Register, RAID Log, and Issue Register's dashboard cards before Phase 2 continues.

## Phase 2 — Registers needing new filter plumbing ✅ done

- [x] Decision Log (`apps/platform/src/pages/platform-app/DecisionLogPage.jsx` + Simulator mirror) — added `statusFilter`/`priorityFilter` state, `clearFiltersAndShowRegister()` helper, wired all 6 cards + visible `<select>` filters + Clear button. Simulator hand-edited (route-prefix divergence).
- [x] Risk Register's "Overdue Responses" card — done in Phase 1 (`overdue_responses_only` subquery filter).
- [x] Change Log (`components/change/ChangeLog.jsx` + Simulator mirror) — reused existing `filters.action_type`/`setFilter`/`clearFilters`, wired 5 cards, no new plumbing needed.
- [x] Delay Register (`pages/delays/DelayRegister.jsx` + `components/delays/DelaySummaryStats.jsx`, + Simulator mirrors) — `DelaySummaryStats` rewritten to accept `onCardClick`; added `openOnly`/`resolvedOnly`/`autoLinkedOnly` state + filter-chip UI on the page.
- [x] Quality Register (`pages/pm/PMControlsQualityRegister.jsx`, Platform only — no Simulator dashboard/register split) — added `statusGroupFilter` + `STATUS_GROUPS` + `registerItems` useMemo, wired 4 cards + chip/Clear UI.
- [x] Configuration Item Register (`components/ci/ConfigurationItemList.jsx`, Platform only — Simulator page doesn't exist) — added `statusGroupFilter` + `STATUS_GROUP_CODES` + `registerItems` useMemo, wired 5 cards + chip/Clear UI.
- [x] Requirements Register (`pages/scope/RequirementsRegister.jsx` + Simulator mirror) — added `statusFilter` state, extended `filtered` useMemo, wired Total + dynamic `topStatuses` cards via `showRegisterFiltered()`, chip/Clear UI. Simulator hand-edited (route-prefix divergence, `platformProjectPath` not used there).
- [x] EEF (`pages/eef/EEFList.jsx` + Simulator mirror) — added `statusFilter`/`holdOnly` state, `filteredRows` useMemo feeding `sortedData()`, wired Total/On hold/dynamic status cards, chip/Clear UI. Simulator hand-edited (route-prefix divergence).
- [x] Benefits Register (`pages/benefits/Benefits.jsx` + Simulator mirror) — reused existing `filters.benefit_status` server-side filter plumbing (already had a full filter panel), wired all 5 cards (Estimated/Realized Value sums map to unfiltered/`realized` respectively, per the Delay Register sum-card precedent). Simulator copied byte-identical after diff confirmed no other divergence.
- [x] Lessons Log (`pages/LessonsLogView.jsx`, Platform only — Simulator page doesn't exist) — Positive/Negative/Neutral wired via existing `filters.effect_type`; Actions Pending/High Priority (OR-across-multiple-values, no single matching filter field) wired via a new lightweight client-side `quickFilter` state applied on top of the already-loaded `lessons` array, with chip/Clear UI. Total clears all filters.

## Phase 3 — Rollup dashboards (cross-page navigation) ✅ done (Platform; Simulator mirrors copied where they exist)

- [x] PM Dashboard (`apps/platform/src/pages/pm/PMDashboard.jsx`) — all 6 cards converted from `<Link>` tiles to `DashboardStatCard` + `navigate()`, each carrying a `?filter=<kind>` query param (`active`/`open`/`all`/`pending`). Target pages updated to read it on mount via `useInitialFilterFromQuery(['filter'])` and apply the equivalent of their in-page card click:
  - `pages/workpackage/WorkPackagesListView.jsx` — added `activeOnly` state (`filter=active` → status in authorized/accepted/in_progress; this page only had a single-value status dropdown before, so this is new OR-filter capability), chip/Clear UI.
  - `pages/RiskRegisterView.jsx` — mount effect maps `filter=open|high|overdue|all` to the same `setFilters(...)` calls already used by the in-page Phase 1 cards.
  - `pages/IssueRegisterView.jsx` — mount effect maps `filter=open|critical|overdue|all` to the same `setFilters(...)` calls already used by the in-page Phase 1 cards.
  - `pages/pm/PMControlsQualityRegister.jsx` — mount effect maps `filter=all` (and any status-group value) to `showRegisterFiltered(...)`.
  - `pages/structured/CheckpointReportList.jsx` — added `pendingOnly` state + `status_in` support in `services/checkpointReportService.js` (`getCheckpointReportsByProject` only supported a single exact status before), chip/Clear UI.
  - `pages/LessonsLogView.jsx` — mount effect maps `filter=all` (and quick-filter kinds) to `showRegisterFiltered(...)`.
  - **Simulator PM Dashboard is NOT a mirror of this file** — see note below. No Simulator changes made for PM Dashboard in this phase.
- [x] PMO Dashboard (`apps/platform/src/pages/pmo/PMODashboard.jsx`) — converted to `DashboardStatCard` + `navigate()`. Fixed the pre-existing "Active Projects" mislink (was `/pmo/oversight/risk-register`, now `/platform/projects/all`) and its count query (was counting ALL projects with no status filter despite the "Active" label; now `.eq('record_status', 'live')` to match what the target list defaults to). "Open Risks"/"Open Issues" carry `?filter=open`. Left "Governance Baselines" (hardcoded `5`, never queried), "Pending Reviews", and "Reports This Month" (both hardcoded `0`, never queried) navigable as before — these are fabricated placeholder metrics, not real record counts, so no filter semantics were invented for them; flagged in code comments as pre-existing, out of scope here.
  - Also wired the shared `PMOOversightHeader.jsx` component (used by 6 PMO oversight pages) to render its `stats` prop through `DashboardStatCard` with per-item `onClick`, then wired all 6 consumers' own stat cards (not just the ones PMO Dashboard links to):
    - `PMOOversightRiskRegister.jsx` — fixed two more bugs found while wiring: "Open" previously checked `status === 'open'`, a value that doesn't exist in the real `status_enum` enum (correct set is `identified/assessing/responding/monitoring/occurred`, matching `RiskRegisterView.jsx`'s `RISK_ACTIVE_STATUSES`); "High/Critical" checked for a `'critical'` risk level that doesn't exist (`'very_high'` is correct). Also fixed a **card-click bug introduced then caught in the same edit**: an initial version set the same `filters` object also used for the server-side fetch, which would have made "Total Risks" (and the other cards) show an already-narrowed count after any other card was clicked — moved to a separate client-side `quickFilter` state (`displayRisks` memo) so stats always reflect the true full fetch, matching the same fix applied to `PMOOversightIssueRegister.jsx` below. Added `useInitialFilterFromQuery(['filter'])` mount effect so PMO Dashboard's `?filter=open` link pre-applies the filter on load.
    - `PMOOversightIssueRegister.jsx` — same client-side `openOnly` pattern (avoids the same stats-corruption bug), added the same mount-effect query-param wiring.
    - `PMOOversightQualityRegister.jsx` — added `statusQuickFilter` (passed/failed/review) using the same decoupled pattern (this page's fetch has no status param at all, so no bug existed here, but kept the same shape for consistency).
    - `PMOOversightLessonsLog.jsx` — added `implementedOnly` quick filter using the same pattern for the one stat ("Implemented") that had no existing tab to map to.
    - `PMOOversightScope.jsx` — "Scope plans"/"Scope statements" cards scroll to their already-always-visible table (both tables render together on this read-only page; no tab/filter concept applies).
    - `PMOOversightSchedules.jsx` — left unchanged: "Schedule plans" is the only table on the page (already fully visible, a click would be a no-op scroll); "Tracked activities (sample)" is a genuine cross-project sum with no activity-level list on this page to link to — correctly stays a static, non-clickable calculated card.
- [x] Portfolio Dashboard (`apps/platform/src/pages/platform-app/PortfolioDashboard.jsx` + Simulator mirror, byte-identical before this change so copied directly) — local `KpiCard` now renders through `DashboardStatCard`. "Total Portfolios" clears a new `activeOnly` filter, "Active Portfolios" sets it (filters the "Portfolio Health Overview" table client-side, chip/Clear UI added); "Total Budget" (sum) / "Avg Health Score" (average) left static per the calculated-card rule. **Bug found and fixed while touching this file:** the health-overview table's row-number cell called `getDisplayRowNumber(index)` where `index` was never defined in scope (the `.map` callback's parameter is `i`) — a guaranteed `ReferenceError` crash on every row render, meaning this table has likely never rendered successfully. Fixed by using `i`.
- [x] Programme Dashboard (`apps/platform/src/pages/platform-app/ProgrammeDashboardOverview.jsx` + Simulator mirror, byte-identical before this change so copied directly) — local `MetricCard` now renders through `DashboardStatCard`. Of the 6 cards, only "Total Programmes" is a real count of individually-identifiable records; wired it to scroll to the "By Programme" breakdown grid already rendered lower on the same page (`id="programme-breakdown"`). "Total Projects" is a sum with no flat project list on this page (only per-programme rollup cards), and "Avg. Progress" / "Benefits Realized" / "Avg. Health Score" / "Budget (Spent)" are averages/ratios/blended sums — all 5 left static per the calculated-card rule.

**Discovery — Simulator PM Dashboard is a different, partly non-functional page, not a mirror:**
`apps/simulator/src/pages/simulator/pm/SimulatorPMDashboard.jsx` is NOT built on the same
`sim.risks`/`sim.issues` data as `apps/simulator/src/pages/RiskRegisterView.jsx` (the file this
session's Phase 1 wired). It queries a separate `practice_risks`/`practice_issues` table pair
("PM Practice" training module), and 4 of its 6 stat values (`activePracticeWorkPackages`,
`practiceQualityActivities`, `pendingPracticeReports`, `practiceLessonsLogged`) are hardcoded to
`0` — never queried at all — pre-existing, unrelated to this task. Its card links
(`/simulator/pm/controls/risk-register` etc.) route to `SimulatorPMControlsRiskRegister` and
siblings — a separate "Practice" component tree under `pages/simulator/pm/`, not the
`RiskRegisterView.jsx`/`IssueRegisterView.jsx` mirrors already wired. Making this dashboard's
cards clickable would mean either (a) wiring an entirely separate Practice-module register stack
that hasn't been touched this session, or (b) linking to the wrong target data. **Decision:
treat as a separate, pre-existing gap — flagged here rather than silently fixed or silently
skipped.** Recommend a dedicated follow-up plan scoped to the Practice module specifically
before applying v893's rule to it.

Same finding applies to `apps/simulator/src/pages/simulator/portfolio/SimulatorPortfolioDashboard.jsx`
(cards labeled "Practice Portfolios" / "Programmes in Portfolio" / "Projects Tracked" — same
naming convention, same separate module) and likely `apps/simulator/src/pages/simulator/
SimPortfolioDashboard.jsx` (not individually inspected) — folded into the same Practice-module
follow-up recommendation, not wired in this phase.

Same finding also applies to `apps/simulator/src/pages/simulator/pmo/SimulatorPMODashboard.jsx` —
also queries `practice_projects`/`practice_risks`/`practice_issues` and links to its own
`SimulatorPMOOversight*` component tree, not the `PMOOversightRiskRegister.jsx`/
`PMOOversightIssueRegister.jsx` files wired above (those are Platform-only, under
`apps/platform/src/pages/pmo/`). No Simulator changes made for PMO Dashboard in this phase —
folded into the same Practice-module follow-up recommendation above.

## Phase 4 — Long-tail `MetricCard` consumers ✅ done

`MetricCard` already supports `onClick`. Audited every consumer card-by-card against the
count/sum-vs-calculated rule:

- [x] `EVMDashboard.jsx` — all 8 cards (EV/PV/AC/BAC/SV/CV/EAC/ETC/VAC) are EVM formula outputs, not counts of individual records. Left static, no changes.
- [x] `VarianceAnalysis.jsx` — all 3 cards are "Average X Variance". Left static, no changes.
- [x] `ProjectHealthDashboard.jsx` — Completion%, Budget Utilization%, Schedule Performance%, Quality Score — all percentages/scores. Left static, no changes.
- [x] `KPITracker.jsx` — already correctly interactive: each card's `onClick` reveals that KPI's own trend-detail panel below (a single metric's own history, not a list of other records). Matches the rule's spirit already; no changes needed.
- [x] `PortfolioAnalyticsDashboard.jsx` (+ Simulator mirror, byte-identical so copied directly) — "Total Projects" / "Active Projects" / "Completed Projects" are real counts backed by an in-component `projects` array; wired them to a new `statusFilter` state that expands the existing "Top Performing Projects" list (previously a fixed top-5) into a full filtered/scrollable list with a "Back to top 5" control. "Average Health Score" (average), "Total Budget" / "Total Spent" (sums with no distinct line-item list on this widget), "Budget Variance" (%) left static.
- [x] `QualityReportBuilder.jsx` (+ Simulator mirror, byte-identical so copied directly) — "Total Items" wired to the existing `filters.quality_status` dropdown (clears it) — reused existing filter plumbing, no new state. "Average Quality Score" / "Pass Rate" (average/%) left static. **"Open Defects" left non-clickable and flagged, not silently skipped:** its count comes from a separate `defects`/`defect_status` domain with no defects list or register page rendered anywhere on this widget or found elsewhere in the codebase this session — wiring it would mean building a new defects list feature, out of proportion for this component. Documented as a gap for a future defects-register feature, not treated as done.

## Phase 5 — Simulator parity sweep ✅ done

Applied inline during Phases 1-4 (diff-then-copy-or-hand-edit, verified with `esbuild
--bundle=false` after every file) rather than as a separate pass — every Platform file that has
a byte-identical or near-identical Simulator counterpart was synced as part of the same edit
(RequirementsRegister, EEF, Benefits, PortfolioDashboard, ProgrammeDashboardOverview,
PortfolioAnalyticsDashboard, QualityReportBuilder, and all Phase 1/2 registers from earlier in
this session).

**Structural finding for Phase 3's rollup dashboards specifically:** Simulator's PM, PMO, and
Portfolio role-dashboards (`SimulatorPMDashboard.jsx`, `SimulatorPMODashboard.jsx`,
`SimulatorPortfolioDashboard.jsx`) are **not mirrors** of the Platform files wired in this
phase — they're a separate, parallel "Practice" module built on `practice_projects` /
`practice_risks` / `practice_issues` tables and their own `SimulatorPMOOversight*` /
`PracticeWorkPackageList` / `PracticeCheckpointReportList` component tree, distinct from the
`sim.risks`/`sim.issues`-backed `RiskRegisterView.jsx`/`IssueRegisterView.jsx` mirrors wired in
Phase 1. Several of that dashboard's own stat values are hardcoded placeholders (`0`), unrelated
to this task. No Simulator changes were made for PM/PMO/Portfolio Dashboard, `PMOOversightHeader`
and its 6 consumers, `WorkPackagesListView`, or `CheckpointReportList` — see the "Discovery"
notes under Phase 3 for the full explanation. **Recommend a dedicated follow-up plan scoped to
the Practice module** before extending v893's rule there — it needs its own audit of what's
real vs. placeholder before deciding what "clickable" even means for it.

## Phase 6 — CLAUDE.md rule (monorepo) ✅ done

- [x] Appended as rule 64 in `E:\project-nidus\CLAUDE.md`, directly after rule 63.1, before the "Simulator Module Architecture Rules" section header.

Proposed rule text:

> 64) **Clickable dashboard summary cards (mandatory for NEW and AMENDED dashboard/summary
> cards — Platform, Simulator, and Admin, v893).** Any card on a Dashboard tab or rollup
> dashboard whose number is a **COUNT or SUM of individually-identifiable records matching an
> expressible filter** (status, category, level, date range, etc.) must be clickable: clicking
> navigates to that filtered subset on the record's list/register page, using each register's
> own existing filter state where the page's Dashboard and Register views live together
> (`setFilters(...)` + switch tab), or a URL query parameter when the card links to a
> different page (e.g. `?status=open`, read on mount and folded into the target's filter
> state). Use `DashboardStatCard` (`@nidus/ui`, Platform/Simulator) or `AdminCard`'s
> `onClick`/`to` props (Admin) — do not hand-roll a new static `<div>` tile.
> **Do not make a card clickable** when its number is an **average, percentage/ratio, or
> blends multiple distinct entity types** into one figure (e.g. "Avg Health Score", "%
> realized", a budget sum spanning heterogeneous cost lines) — these have no single coherent
> list of records behind them; leave them static, no hover affordance, no tooltip explaining
> the exclusion. If a card's implied filter doesn't exist yet on the target list page, add the
> filter capability — do not link to an unfiltered list as a substitute. **Platform–Simulator
> parity applies** (rule 34.1). **Adopt opportunistically** for any dashboard card not yet
> covered by the v893 rollout when next touched. See `projectprd/v893_clickable_dashboard_
> summary_cards_PRD.md` / `projectplan/v893_clickable_dashboard_summary_cards_plan.md`.

## Verification

Per the PRD's testing decisions section — manual click-through per card, confirm filter state
and row count match, confirm calculated cards show no hover/click affordance, confirm
cross-page query-param URLs are independently shareable, confirm Platform/Simulator parity.

## Review

**Status: Phases 0-6 complete for Platform + Simulator** (this repo's scope). Admin (v206,
separate repo/plan) has not been started.

**What shipped:** a new `DashboardStatCard` shared component; every count/sum dashboard card
across ~12 registers, 4 rollup dashboards (PM, PMO, Portfolio, Programme), and the long-tail
`MetricCard` consumers now navigates to its filtered record list on click, using each page's own
filter state (same-page) or a `?filter=` query param read via `useInitialFilterFromQuery`
(cross-page). Calculated cards (averages, percentages, blended sums) were deliberately left
static per the agreed rule. CLAUDE.md rule 64 codifies this for future work.

**Real bugs found and fixed as a side effect of wiring** (all directly in files this task
touched, not a separate sweep):
- `PortfolioDashboard.jsx` — `getDisplayRowNumber(index)` referenced an undefined variable
  (`index` vs the map callback's actual `i`) — a guaranteed crash on every row render.
- `PMODashboard.jsx` — "Active Projects" card linked to the risk register (copy-paste mislink)
  and its count query had no status filter at all despite the "Active" label.
- `PMOOversightRiskRegister.jsx` — "Open" and "High/Critical" stats checked for status/level
  values (`'open'`, `'critical'`) that don't exist in the real enums.
- Caught (during wiring, before it shipped) a class of bug where naively reusing a page's
  server-side fetch `filters` state for a stat-card click would have corrupted the *other*
  cards' counts after the first click — fixed by decoupling into a client-side "quick filter"
  layered on top of an always-full fetch, applied consistently across `PMOOversightRiskRegister`,
  `PMOOversightIssueRegister`, `PMOOversightQualityRegister`, and `PMOOversightLessonsLog`.

**Documented, not fixed:** Simulator's PM/PMO/Portfolio role dashboards are a separate "Practice"
module (`practice_projects`/`practice_risks`/`practice_issues`, its own component tree), not
mirrors of the Platform files wired here — several of its own stat values are pre-existing
hardcoded placeholders. Recommend a dedicated follow-up plan scoped to that module. Also
`QualityReportBuilder.jsx`'s "Open Defects" card has no defects list/register anywhere in the
codebase to link to — left static and flagged rather than either building a new feature or
silently skipping it.

**Not done in this pass:** no in-browser click-through verification (no browser tool available
this session) — please verify before relying on this in production. Admin implementation
(`E:\project-nidus-admin\projectplans\v206_clickable_dashboard_summary_cards_plan.md`) is a
separate, not-yet-started piece of work in the Admin repo.
