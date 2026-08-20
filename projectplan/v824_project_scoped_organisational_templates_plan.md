# v824 — Project-Scoped, Nearest-Tier Organisational Templates for PMs

## Goal
Follow-up to [[v823]]. The PM sidebar's "Templates" link redirected to the **Global Template
Library** (`/app/pmo/template-library`) — but that page always shows raw, uncustomized
`is_system_synced=true` masters, which is wrong: a PM should never copy directly from Global.
User confirmed the model: a PM should see, per template, the **nearest applicable tier**
(their Project's own copy → else their Programme's → else their Portfolio's → else the org's
PMO-wide copy), never the raw Global master, and be able to fork whichever is nearest down into
their own Project tier.

## Design
### 1. Project ancestry resolution (new)
`packages/shared/src/services/pmTemplateInheritanceService.js` gains
`resolveProjectTierAncestry(db, projectId)`:
- Platform: reads `programme_projects` / `portfolio_projects` join tables (there is **no**
  `projects.programme_id` column — corrected after console 400/403 on Organisational Templates).
- If no direct portfolio link, falls back to `programmes.portfolio_id` from the linked programme.
- Returns `{ programmeId, portfolioId }` (either may be `null`), the two extra scope ids beyond
  "always PMO" and "this project itself" that apply to this specific project.

### 2. Nearest-tier filtering + grouping (new, client-side over already-loaded rows)
`OrganisationalTemplatesPage.jsx` already loads every one of the account's own
`pm_template_nodes` rows (`is_system_synced=false`) via `listTemplateLibraryNodes`. When reached
with `?entityType=project&entityId=<id>` (vs. today's unfiltered PMO-admin view when reached
with no query params — existing behaviour untouched for that case):
1. **Candidate filter**: keep only rows whose scope applies to this project — `tier='pmo'`
   (account-wide), or `tier='programme'` scoped to this project's `programmeId`, or
   `tier='portfolio'` scoped to its `portfolioId`, or `tier='project'` scoped to this exact
   `entityId`.
2. **Family grouping**: a Project-tier fork's `parent_node_id` points at whatever it was forked
   *from* (often the PMO copy, not the original Global master) — so two rows can be "the same
   template" at different tiers. Group candidates by walking each row's `parent_node_id` chain
   as far as it stays *within the loaded candidate set*; the row where that walk stops (parent
   points outside the set, i.e. at Global or nothing) is the family's key.
3. **Nearest wins**: within each family, keep only the most specific applicable tier —
   `project` beats `programme` beats `portfolio` beats `pmo` — exactly "PMO → Portfolio →
   Programme → Project, nearest tier wins" per the user's model. The other tiers in that family
   are dropped from what's *displayed* (not deleted — still real rows, just superseded for this
   project's purposes).

### 3. "Copy down to my project" action (new)
Per displayed row, when in project-scoped mode and the row isn't already `tier='project'` scoped
to this exact project: a new action button forks it down to Project tier for this project,
reusing `copyTemplateNodeForAccount` (already handles the "fork from nearest override, not raw
Global" behaviour and the [[v822]] duplicate-copy guard). The existing View/Edit/Retire actions
stay as they are in the unfiltered PMO-admin view.

### 4. Redirect target (amends [[v823]])
`TemplateLibraryList.jsx` (Platform + Simulator) now points at
`/app/pmo/organisational-templates?entityType=project&entityId=<id>` (Simulator:
`/simulator/pmo/organisational-templates`) instead of `.../template-library`.

## Explicitly out of scope
- Changing the unfiltered PMO-admin view of Organisational Templates (reached with no
  `entityType` query param) — stays exactly as-is, View/Edit/Retire, every tier/scope visible.
- The Global Template Library page itself — stays PMO/Admin-facing, unchanged.
- Any change to how Portfolio-tier or Programme-tier users reach their own scoped view (this
  plan is specifically the Project-tier / PM case per the reported bug); the same
  family-grouping + nearest-tier logic would extend naturally to `entityType=programme` /
  `portfolio` if asked for later, but isn't wired into any nav entry for those roles in this pass.

## Todo
- [x] `resolveProjectTierAncestry()` in `pmTemplateInheritanceService.js` (public + sim schema
      shapes)
- [x] `resolveNearestTierPerFamily()` in `pmTemplateInheritanceService.js` + 6 new unit tests
      (30/30 pass total, including 24 pre-existing)
- [x] `OrganisationalTemplatesPage.jsx` (Platform): ancestry resolution, family grouping,
      nearest-tier filter, "Copy down to my project" action
- [x] `OrganisationalTemplatesPage.jsx` (Simulator): mirror
- [x] `TemplateLibraryList.jsx` (Platform + Simulator): redirect target amended to
      Organisational Templates
- [x] Syntax-check every touched file (5/5 pass)
- [ ] Manual verification in browser (left for user): a project with no programme/portfolio
      shows PMO-tier templates with a working copy-down action; a project that belongs to a
      programme/portfolio shows the nearest of those instead of PMO; a project with its own
      existing copy shows only that, with no copy-down action (already at Project tier)

## Review

**Status: code complete (1 shared service + 2 page pairs + 6 new unit tests), pending browser
verification.**

**What shipped:**
- `resolveProjectTierAncestry(db, projectId, { schema })` — Platform (`public`) and Simulator
  (`sim`) both walk join tables (`programme_projects` / `portfolio_projects`, or
  `practice_programme_projects` / `practice_portfolio_projects`); first match wins. Do not select
  `projects.programme_id` (column does not exist).
- `resolveNearestTierPerFamily(rows, { projectId, programmeId, portfolioId })` — pure function,
  groups already-loaded org template rows into "families" (same underlying template forked
  across tiers) by walking each row's `parent_node_id` as far as it stays inside the loaded set,
  then keeps only the nearest applicable tier per family (`project > programme > portfolio >
  pmo`). No extra DB round-trips — operates on what `OrganisationalTemplatesPage` already
  fetches.
- `OrganisationalTemplatesPage.jsx` (Platform + Simulator): when reached with
  `?entityType=project&entityId=…`, applies the above instead of showing every tier/scope
  flatly; adds a "Copy down to my project" action (only shown for rows not already the
  project's own copy); hides the "Global Template Library" escape-hatch link entirely in this
  mode (a PM should never be routed to the raw Global browser); relabels "View / Edit" to just
  "View" for rows that aren't the project's own (a PM can act on them by copying down, not by
  editing someone else's Portfolio/Programme/PMO-tier customisation directly). The unfiltered,
  every-tier PMO-admin view (reached with no query params, exactly as it worked before this
  change) is completely untouched.
- `TemplateLibraryList.jsx` redirect (from [[v823]]) retargeted from
  `/app/pmo/template-library` (raw Global masters — wrong destination) to
  `/app/pmo/organisational-templates` (right one).

**Left for the user:** the manual verification checklist above — this session could not drive a
browser to confirm the three ancestry scenarios (no programme/portfolio, has one, already has
its own project copy) render correctly.
