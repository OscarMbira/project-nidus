# v822 — Prevent Duplicate Global Template Copies Per Tier/Scope

## Goal
On the Global Template Library page (`/app/pmo/template-library`, `pmo-module`), clicking
"Copy" on an already-copied template just relabels the button "Copy again" and creates
**another** duplicate customized copy — nothing stops it. User wants: each tier instance (the
org's PMO, a specific Portfolio, a specific Programme, a specific Project) should have **at
most one** current customized copy of any given Global template at a time — copying again
should be blocked / redirected to the existing copy, not create a second one.

## Root cause (confirmed by reading the actual code, not assumed)
The tier/scope model the user described **already exists**:
`pm_template_nodes.tier` ('pmo'/'portfolio'/'programme'/'project') +
`scope_entity_type`/`scope_entity_id` (identifies *which* portfolio/programme/project, or
`account`+NULL for PMO-wide). Two gaps break the "only one" guarantee:

1. **`copyTemplateNodeForAccount`** (`packages/shared/src/services/pmTemplateCopyService.js:226`)
   never checks for an existing copy before creating one. For `form_template`/`process_template`/
   `opa` domains it also **duplicates the underlying document row** first
   (`duplicateFormTemplateRow`/`duplicateProcessTemplateRow`/`duplicateOpaRow`, each producing a
   fresh row with its own new id) and passes *that new id* as `domain_ref_id` on the new
   `pm_template_nodes` row. The existing DB uniqueness index
   (`uq_pm_template_nodes_current_scope`, `SQL/v774_pm_template_nodes_multi_document_current_scope.sql`)
   is keyed on `(account_id, tier, domain, scope_entity_type, scope_entity_id, domain_ref_id)` —
   since `domain_ref_id` is different on every single copy by construction, this index can
   **never** catch a re-copy of the same source template into the same scope. (v774's actual,
   correct purpose was different: letting *different* templates in the same domain, e.g.
   "Business Case" and "Project Brief", both be PMO-tier account-wide copies without colliding —
   it was never meant to dedupe re-copies of the *same* template.)
2. **`resolveAccountTemplateOverride(Batch)`** (`packages/shared/src/services/pmTemplateOverrideService.js`)
   — the query behind the "you already have a custom version" label — filters only by
   `account_id` + `parent_node_id` + `is_current`. It has **no tier/scope filter at all**, so it
   can't distinguish "this account customised this template for the PMO tier" from "PM Jane
   customised it for Project X" — every context sees the same (possibly wrong-scope) answer, and
   the UI never disables Copy, only relabels it.

## Fix
1. **New SQL migration** `SQL/v822_pm_template_nodes_prevent_duplicate_copy.sql` (public + sim):
   a genuinely source-aware unique index —
   ```sql
   CREATE UNIQUE INDEX uq_pm_template_nodes_one_copy_per_scope
     ON public.pm_template_nodes (
       account_id, tier,
       COALESCE(scope_entity_type, ''),
       COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
       parent_node_id
     )
     WHERE is_current = TRUE AND parent_node_id IS NOT NULL;
   ```
   Keyed on `parent_node_id` (the Global source) instead of `domain_ref_id` (the duplicated
   document) — this is what actually identifies "a copy of *this* template," and holds even
   though each copy's own document row is different. Defense-in-depth: the JS check below is
   the primary UX gate, this is the backstop against races/other callers.
2. **`pmTemplateCopyService.js`**: `copyTemplateNodeForAccount` queries for an existing
   `is_current=true` node matching `(account_id, tier, scope_entity_type, scope_entity_id,
   parent_node_id=sourceNodeId)` *before* duplicating anything, and throws a clear
   `ALREADY_COPIED` error (carrying the existing node) instead of proceeding — so no wasted
   duplicate document rows get created on a blocked attempt either.
3. **`pmTemplateOverrideService.js`**: `resolveAccountTemplateOverride` and
   `resolveAccountTemplateOverrideBatch` gain optional `tier`/`scopeEntityType`/`scopeEntityId`
   params, applied as additional `.eq()`/`.is()` filters only when provided — fully backward
   compatible (existing tests, which omit these, hit the identical query chain as before).
4. **`TemplateLibraryPage.jsx` + `TemplatePreviewPage.jsx`** (Platform + Simulator — 4 files):
   pass the page's already-resolved `tier`/`scopeEntityType`/`scopeEntityId` into the override
   lookup. Once an override exists **at that specific scope**:
   - Single-row Copy button becomes disabled, relabelled "Already copied" (not "Copy again"),
     with the existing "you have a custom version →" link as the way to reach it.
   - Bulk copy skips already-copied rows (counted separately in the summary toast, e.g.
     "3 copied, 2 already copied, 1 skipped").
   - `handleCopy`/`handleBulkCopy` also catch the new `ALREADY_COPIED` error from the service
     (belt-and-braces against a stale UI state) and surface it as "already copied" rather than a
     raw failure toast.

## Explicitly out of scope
- The older `template_library` / `project_template_copies` system (a separate, pre-existing
  project-only copy mechanism found while researching this — confirmed **not** what this
  screenshot's page uses). Not touched.
- `pm_template_entity_assignment` (keyed by `entity_type`+`entity_id`+`domain`, one row per
  entity+domain — governs which node is the "active" one for `fields`-domain policy resolution,
  a different concern from per-document copy dedup). Not touched.
- Any UI/copy for the `fields` domain's PMO-only special case
  (`createPmoFieldTemplateNode` path) — already effectively one-per-account by the *existing*
  v764/v774 index (fields' `domain_ref_id` is always NULL, so it already collapses to one
  current node per account+tier+scope); the new index in this plan applies alongside it without
  conflict since it's keyed differently (`parent_node_id`, not `domain_ref_id`).

## Todo
- [x] SQL migration `v822_pm_template_nodes_prevent_duplicate_copy.sql` (public + sim)
- [x] `pmTemplateCopyService.js`: pre-copy duplicate check + `ALREADY_COPIED` error
- [x] `pmTemplateOverrideService.js`: scope-aware `resolveAccountTemplateOverride(Batch)`
- [x] Update/extend `pmTemplateOverrideService.test.js` for the new scoped params (10/10 pass)
- [x] `TemplateLibraryPage.jsx` (Platform): scoped override check, disabled Copy, bulk-copy skip
      count
- [x] `TemplateLibraryPage.jsx` (Simulator): mirror
- [x] `TemplatePreviewPage.jsx` (Platform): scoped override check, disabled Copy
- [x] `TemplatePreviewPage.jsx` (Simulator): mirror
- [x] Syntax-check every touched file (6/6 pass); run `pmTemplateOverrideService.test.js` (10/10
      pass, including the 3 new scoped tests)
- [ ] Manual verification in browser (left for user): copy a template once, confirm Copy becomes
      disabled/relabelled for that same scope, confirm a *different* scope (different project,
      or PMO vs a specific project) can still copy independently, confirm bulk-copy correctly
      skips already-copied rows
- [ ] **Run the new SQL migration against the actual Supabase instance** — this session cannot
      execute SQL directly; `SQL/v822_pm_template_nodes_prevent_duplicate_copy.sql` needs to be
      applied for the DB-level backstop to be in place (the JS-side pre-copy check works
      independently of this, but the index is the defense-in-depth layer)

## Review

**Status: code complete (6 JS files + 1 SQL migration), pending SQL execution + browser
verification.**

**Extra fix beyond the original plan:** while mirroring, found `TemplatePreviewPage.jsx` (both
apps) only ever checked for an existing override when `entityType` was
`portfolio`/`programme`/`project` — the PMO/account-wide case (no `entityType`, exactly the
scope shown in the original screenshot) was **never checked at all**, so its Copy button could
never have shown "already copied" regardless of this fix. Broadened the condition to check
every scope, consistent with `TemplateLibraryPage.jsx`, which already did.

**What "disabled" means in practice:** the Copy button becomes non-interactive (grey, disabled
attribute, tooltip "Already copied for this scope") the moment `overrides`/`overrideNode` shows
a match for the *current* tier+scope — not just relabelled as before. The existing "you have a
custom version →" link (already present) remains the path to the existing copy. Bulk copy on
`TemplateLibraryPage` now reports already-copied rows as their own bucket in the summary toast
(`"3 copied, 2 already copied, 1 skipped"`) instead of silently attempting and failing/duplicating
them.

**Defense-in-depth, not defense-only:** the primary gate is the JS-side check in
`copyTemplateNodeForAccount` (runs before any document duplication, so a blocked attempt never
creates orphaned duplicate rows). The new SQL unique index is the backstop for races or any
future caller that bypasses the service function — deliberately keyed on `parent_node_id` (the
Global source) rather than `domain_ref_id` (the copy's own duplicated document), which is what
let the *existing* `uq_pm_template_nodes_current_scope` (v774) index silently fail to catch
re-copies: every copy duplicates its source document into a fresh row with a new id, so a
constraint on that id can never collide between two copies of the same source.

**Left for the user:**
1. Run `SQL/v822_pm_template_nodes_prevent_duplicate_copy.sql` against the Supabase instance.
2. Browser verification per the checklist above.
