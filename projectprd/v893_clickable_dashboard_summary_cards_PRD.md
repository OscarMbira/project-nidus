# PRD v893: Clickable Dashboard Summary Cards (System-Wide)

## a) Problem statement

Every register/list page across Platform, Simulator, and Admin has a "Dashboard" tab (or
equivalent landing view) that shows a row of small summary cards — "Total Risks: 11",
"Active: 11", "High/Very High: 3", "Overdue Responses: 0", and dozens of variants like it
across ~15-20 register dashboards, several cross-entity rollup dashboards (PM Dashboard, PMO
Dashboard, Admin's main dashboard and module sub-dashboards), and a longer tail of
analytics/KPI pages. Today these are almost all inert `<div>`s — a label and a number, nothing
else. A user who sees "High/Very High: 3" has no way to actually see which 3 risks those are
without leaving the dashboard, switching to the Register tab, and manually reconstructing the
filter themselves. The number is a promise the UI doesn't let the user collect on.

This is a real day-to-day friction point for PMs triaging their registers: the dashboard is
the first thing they see, and every card on it is a dead end.

## b) Solution

Make every summary card that represents a **count or sum of individually-identifiable
records** clickable. Clicking navigates to the underlying list of those records, pre-filtered
to exactly the subset the card's number represents — reusing each register's own existing
list/search/sort/export tooling rather than building a second, parallel "preview" UI.

Two shared building blocks carry this system-wide:
- **Platform & Simulator**: a new lightweight `DashboardStatCard` component (packages/ui,
  duplicated per-app per the established local-copy convention — see Section d).
- **Admin**: the existing shared `AdminCard` component gains `onClick`/`to` support, since it
  is already used consistently at ~60 call sites.

Cards whose number is a calculated aggregate that doesn't map to one filterable list of
records (averages, percentages/ratios, metrics blended across multiple entity types) are
deliberately left non-interactive — see Section d for the exact rule.

## c) User stories

1. As a PM viewing the Risk Register dashboard, I can click the "High/Very High" card and land
   on the Register tab with the risk-level filter already set to High+Very High.
2. As a PM viewing the Risk Register dashboard, I can click "Total Risks" and land on the
   Register tab unfiltered (showing all risks) — "total" is itself a valid filter state (no
   filter applied).
3. As a PM viewing the Risk Register dashboard, I can click "Overdue Responses" and land on a
   correctly filtered view even though today's Risk Register filter panel has no "overdue"
   filter — the filter capability is added as part of this work, not faked or skipped.
4. As a PM on the top-level PM Dashboard, I can click "21 Open Risks" and be taken to the Risk
   Register's Register tab (a different page/route) with the same "open" filter pre-applied via
   a URL query parameter, so the link is also independently shareable/bookmarkable.
5. As a PM on the top-level PM Dashboard, I can click "12 Open Issues" and land on the Issue
   Register filtered to open issues, following the same cross-page convention as story 4.
6. As a Portfolio/Programme lead, when I look at a card like "Avg Health Score" or "Total
   Budget" (a blended sum across heterogeneous cost lines), the card is visibly non-interactive
   — no hover affordance, no click handler — because there is no single coherent list of
   "records" a click could land on.
7. As a user, I can tell at a glance which cards are clickable (cursor + hover state) versus
   static, without needing to click first to find out.
8. As an Admin user (any of the four Admin dashboard roles), I can click a card like "Pending
   Activations" or "Open Tickets" on my role's dashboard and land on the corresponding filtered
   Admin list page.
9. As an Admin user on a module sub-dashboard (Payments, Revenue, Affiliate, COB, Email, Error,
   Testing), the same clickable behavior applies — extending `AdminCard` benefits every one of
   its ~60 existing call sites without per-page component swaps.
10. As a developer building a brand-new dashboard card after this work ships, the relevant
    CLAUDE.md rule (monorepo rule 64, Admin rule 17) tells me to use `DashboardStatCard` /
    `AdminCard` with a click target from day one, and gives me the count/sum-vs-aggregate test
    for deciding whether the card should be clickable at all.
11. As a developer retrofitting an existing analytics/KPI card that currently uses `MetricCard`,
    I can wire its existing `onClick` prop to the same navigation convention (query-param
    filter) established by this work, without needing a new component.
12. As a user on Simulator, every register dashboard I use behaves identically to its Platform
    counterpart (parity rule 34.1) — same clickable cards, same filters, same navigation.

## d) Implementation decisions

Decided during interview (2026-08-15):

1. **Scope**: Full system-wide retrofit across Platform, Simulator, and Admin in this
   initiative — not deferred to opportunistic adoption. (The plan still sequences delivery
   into phases for practical shipping, per Section f of the plan file, but the target is full
   coverage, not a partial pass.)
2. **Click behavior**: Navigate (full page nav), not a modal/drawer.
   - **Same-page cards** (a register's own Dashboard tab card, e.g. Risk Register's "High/Very
     High"): call the page's existing `setFilters({...})` with the card's filter value, then
     switch to the Register tab (`setViewMode('register')` / `setActiveTab('register')` /
     `setPageTab('register')` — naming varies per page, see inventory in the plan).
   - **Cross-page cards** (a rollup dashboard card linking to a different register, e.g. PM
     Dashboard's "Open Risks" → Risk Register): navigate via route change carrying the filter
     as a URL query parameter (e.g. `?status=open`). The target register reads that param on
     mount and applies it to its own `filters` state, in addition to its normal defaults.
     Bookmarkable/shareable by construction.
3. **Component strategy**:
   - Platform/Simulator: new `DashboardStatCard` component — label, value, optional icon,
     `onClick` — matching the existing visual weight of hand-rolled register tiles (`bg-white
     dark:bg-gray-800 rounded-lg border ... p-4`, `text-sm` label, `text-2xl font-bold` value).
     Lives at `packages/ui/src/DashboardStatCard.jsx` (source of truth) and is duplicated into
     `apps/platform/src/components/ui/` and `apps/simulator/src/components/ui/` with a barrel
     export in each local `index.js`, following the exact pattern established this session for
     `RegisterOpenItemsWidget`. `MetricCard` is left untouched for its existing KPI/trend/EVM
     use cases — not merged or extended.
   - Admin: extend the existing `AdminCard` (`packages/ui/src/AdminCard.jsx` in the Admin repo)
     with optional `onClick`/`to` props and matching hover/cursor styling when either is
     provided. No new component; all ~60 existing call sites gain the capability for free once
     each page's owner decides to wire it.
4. **Calculated-card rule** (governs whether a card gets a click handler at all):
   - **Clickable**: the card's number is a **COUNT** or **SUM** of individual records matching
     an expressible filter (status, category, level, date-range, etc.) on that entity's list
     page — e.g. "High/Very High: 3", "Days lost (sum): 42", "Open Issues: 12".
   - **Not clickable**: the card's number is an **AVERAGE**, a **PERCENTAGE/ratio**, or **blends
     multiple distinct entity types** into one figure — e.g. "Avg Health Score", "% realized",
     a "Total Budget" that sums heterogeneous cost lines across different record types. These
     stay visually and functionally static — no cursor change, no click handler. No tooltip/(i)
     affordance is added to explain the exclusion (confirmed in interview — plain static is
     sufficient, not worth the extra UI surface).
5. **Missing filters**: where a card's implied filter doesn't yet exist on the target list page
   (e.g. no "overdue" filter option on Risk Register today), the filter capability is added to
   that register as part of this work — not faked, not silently downgraded to an unfiltered
   link. This means per-register scope varies: some registers need zero new filter work (their
   `filters` state already covers every card, e.g. Risk Register, RAID Log), others need new
   filter fields added (e.g. Decision Log currently has only a free-text `search` string, no
   structured `status`/`priority` filter state at all — this needs new filter plumbing before
   its cards can be wired).
6. **Rollup dashboards with blended cards** (Portfolio Dashboard, Programme Dashboard): audited
   per rule 4 above on a card-by-card basis, not blanket-excluded — e.g. "Active Portfolios"
   (a count) is clickable, "Avg Health Score" (an average) is not, within the same dashboard.

## e) Testing decisions

- Manual verification per page: click each clickable card, confirm (a) it lands on the correct
  list/register, (b) the filter state visibly matches what the card claimed, (c) the visible
  row count is consistent with the card's number (accounting for any count-vs-filter edge cases
  documented per card during implementation).
- Verify non-clickable (calculated) cards show no hover/cursor affordance and have no click
  handler attached (a quick DOM/props check, not just a visual glance).
- Cross-page query-param links: verify the URL is directly shareable — pasting the same URL in
  a fresh tab reproduces the same filtered view without needing to click the originating card.
- Platform/Simulator parity: for every register that exists in both apps, verify identical
  behavior (same filters, same card set, same navigation) per rule 34.1.
- No automated test suite is mandated for this pass beyond what the plan's tracer-bullet issues
  call for per register; this is primarily a UI/navigation feature verified by hand per the
  existing project convention for this kind of work (see recent session precedent: register
  dashboard mini-tables were verified the same way).

## f) Out-of-scope items

- Modal/drawer-based inline preview of filtered records (explicitly rejected in favor of full
  navigation — see decision 2).
- Adding a tooltip/help affordance explaining *why* a calculated card isn't clickable (explicitly
  rejected — see decision 4).
- Retrofitting `MetricCard`'s own internal architecture — only its *consumers* get wired to the
  new navigation convention where their cards pass the count/sum test; `MetricCard` itself is
  not modified.
- Building brand-new registers/list pages that don't exist yet (e.g. the previously-identified
  gap where Simulator has no live Configuration Item Register or Lessons Log page at all) — a
  card cannot link to a page that doesn't exist; those stay out of scope here exactly as they
  were out of scope for the earlier mini-table work this session.
- Any change to how the underlying stat *numbers* are calculated — this work only adds
  navigation on top of numbers that are already computed correctly today.

## g) Further notes

- This PRD accompanies two implementation plan files: `projectplan/v893_clickable_dashboard_
  summary_cards_plan.md` (Platform + Simulator) in this repo, and
  `E:\project-nidus-admin\projectplans\v206_clickable_dashboard_summary_cards_plan.md` (Admin)
  in the Admin repo, per the repo-scoped SQL & plans convention at the top of this file's
  CLAUDE.md. The two plans are cross-linked but kept in their own repos.
- New CLAUDE.md rules are proposed (not yet applied — pending plan approval) as monorepo rule
  64 and Admin rule 17; exact text is in the plan files' final section.
- Given the "full system-wide" scope decision, expect this to span multiple work sessions; the
  plan sequences delivery into phases so each phase ships a coherent, independently-verifiable
  slice rather than one giant unreviewable change.
