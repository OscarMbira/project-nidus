# v930 — Pack-Grouped Sidebar Menu — Implementation Plan

See `projectprd/v930_pack_grouped_sidebar_menu_PRD.md` for the approved decisions this plan
implements. No feature flag (PRD decision 7) — ships live, in small independently-revertible
commits per phase.

## Key existing pieces this plan builds on (facts, not decisions)

- `apps/{platform,simulator}/src/config/pmoMenuHierarchyUtils.js` (+ `packages/config/src/`
  copy, tested by `packages/config/src/__tests__/pmoMenuHierarchyUtils.test.js`) already builds
  the functional category tree (`reorganizeMenuRoots` → `applyCategorySortOrders` →
  `applyPmoSectionNesting` → `wrapPmoMenuWithMethodologyTracks` → ... → final `tree`), called
  from `applyRoleSidebarRevamp()` in `apps/platform/src/hooks/useMenu.js` (mirrored in
  `apps/simulator/src/hooks/useSimMenu.js`).
- `industry_pack_menu_items` (menu_item_id → industry_pack_id) already exists (v920) and
  already has an `authenticated`-readable RLS policy — no new schema or RLS needed.
- `apps/platform/src/services/organisationIndustryService.js`'s `getOrgCapabilities()`
  already has the exact join shape needed (`account_industries` → Cross-Industry lookup →
  `industry_packs` → `industry_pack_menu_items` joined to `menu_items`) — this plan adapts
  that pattern rather than inventing a new one.
- `getOrgIndustries()` already returns `is_primary`, ordered primary-first.
- Category container nodes in the DB already render with `route_path IS NULL` and only a
  label + children (see `SQL/v676_db_menu_hierarchy_as_source_of_truth.sql` Step 1) — so
  Sidebar.jsx already knows how to render a label-only container node. The new synthetic
  "Core Project Management" / "{Industry} Pack" wrapper nodes follow the same shape.

## Phase 0 — Confirm the pipeline preserves a stable join key end-to-end (DONE, resolved before Phase 1)

- [x] Traced how nodes flow through `buildHierarchy` (spreads `{ ...menu, ... }`, preserves all
      fields including `id`) and read every downstream transform
      (`reorganizeMenuRoots`/`applyCategorySortOrders`/`applyPmoSectionNesting` in
      `pmoMenuHierarchyUtils.js`, `wrapPmoMenuWithMethodologyTracks`/`filterMenuTreeByVisibleTracks`
      in `methodologyMenuUtils.js`, `filterExcludedPmoLayoutMenuItems` in
      `pmoLayoutMenuExclusions.js`, `dedupePmoMenuTree` in `pmoMenuSemanticDedupe.js`).
      **Decision: key the pack-bucketing lookup on `menu_code`, not `id`.** Every single one of
      these transforms already routes/matches on `node.menu_code` as its primary identity key
      (it's how the whole pipeline recognizes categories, dedupes, and filters) — `menu_code` is
      therefore far more battle-tested as a stable identity through this pipeline than `id`,
      which is only preserved incidentally via object-spread. Using `menu_code` sidesteps the
      risk entirely instead of just checking for it. `industry_pack_menu_items` joins to
      `menu_items.id`, so Phase 1's query adds `menu_items.menu_code` to its existing join
      (already selecting `menu_items(menu_label)`) to build the map on the right key.

## Phase 1 — Service: resolve menu-item → industry-pack ownership

**Platform:** `apps/platform/src/services/organisationIndustryService.js`
**Simulator:** its own copy (parity, rule 34.1) — confirm whether Simulator's account
industries live in `sim.account_industries`/`sim.industry_packs` or share the `public` tables;
adapt the query accordingly (do not assume — check `SQL/v928_sim_organisation_industries_menu.sql`
first).

- [x] Add `getMenuItemIndustryPackMap(accountId)`, modelled on the existing
      `getOrgCapabilities()` join pattern:
      - Fetch the account's selected real industries via `getOrgIndustries()` (excludes
        Cross-Industry per decision 6 — filter out the row whose `industry_category_id`
        matches the Cross-Industry lookup), ordered primary-first (already returned that way).
      - Fetch `industry_packs` for those industry_category_ids.
      - Fetch `industry_pack_menu_items` for those pack ids, joined to `menu_items(menu_code)`
        (Phase 0 decision — key on `menu_code`, not `menu_item_id`).
      - Return `{ success, data: { sections: [{ packId, industryCategoryId, packName, isPrimary }],
        menuCodeToPack: Map<menu_code, packId> }, error }`. Deliberately excludes Cross-Industry's
        own pack/items — those items simply won't appear in `menuItemToPack`, so the bucketing
        function's default (anything not in the map → Core) handles them correctly with no
        special-casing needed.
      - One batched set of queries (`Promise.all` where independent), per rule 66 — do not
        re-fetch `account_industries`/`industry_packs` if `getOrgIndustries()`'s result can be
        reused directly instead of re-querying.
- [x] Unit tests for the new function (mock `supabase`), covering: no industries selected →
      empty sections + empty map; one industry → one section; two industries → two sections
      primary-first; Cross-Industry-only account → empty sections (not a section of its own).
      6/6 passing in both Platform and Simulator (`organisationIndustryService.test.js`).

## Phase 2 — Pure bucketing function in `pmoMenuHierarchyUtils.js`

Edit all three copies (`apps/platform/src/config/`, `apps/simulator/src/config/`,
`packages/config/src/` — the last is the one covered by the existing automated test suite; keep
all three byte-identical for this function the same way prior session work has for other
shared files).

- [x] Add `groupMenuTreeByIndustryPack(tree, { sections, menuCodeToPack })`:
      1. Deep-walk `tree`, and for every leaf (a node with a `route_path` and no children),
         determine its owner: `menuCodeToPack.get(leaf.menu_code) ?? 'core'`.
      2. Build the **Core** tree: clone `tree`, pruning any leaf whose owner is a real
         industry pack (not `'core'`), then pruning any now-empty branch (a category/sub-header
         with zero remaining leaf descendants). This preserves the existing nesting shape
         (Executive Overview, Portfolio & Delivery, Workflows & Governance, the methodology
         tracks, etc.) exactly as `applyRoleSidebarRevamp` already built it — decision 3 and 4.
      3. For each section in `sections` (primary industry first): build a tree the same way,
         but keep only leaves owned by that section's `packId`, pruning empty branches. Skip
         emitting the section entirely if it ends up with zero leaves (decision 11 — mirrors
         existing empty-category suppression).
      4. Wrap: return
         `[{ menu_code: 'synthetic-core-pack', menu_label: 'Core Project Management', route_path: null, children: coreTree }, ...sections.map(s => ({ menu_code: \`synthetic-industry-pack-${s.packId}\`, menu_label: \`${s.packName} Pack\`, route_path: null, children: sectionTree }))]`.
      5. If `sections` is empty (no real industries selected — the common case today), return
         the **original, unmodified `tree`** wrapped in the single Core Project Management
         node — do not silently no-op and skip wrapping, since decision 8/user-story-1 says
         even a Cross-Industry-only account should see the "Core Project Management" label
         (confirm this reading with a quick sanity check against the PRD before implementing —
         user story 1 says "sidebar looks the same as it does today" including one Core Project
         Management top-level section, so the wrapper always applies, only the extra industry
         sections are conditional).
- [x] Unit tests added to `packages/config/src/__tests__/pmoMenuHierarchyUtils.test.js`: no
      sections → single Core wrapper; one industry-owned leaf pulled out, Core keeps the rest;
      multi-section primary-first ordering with an empty section correctly omitted; unclassified
      leaf stays in Core (fail-open). 50/50 passing (44 pre-existing + 2 `applyCategorySortOrders`
      regression tests added earlier this session + 4 new). Also added a defensive primary-first
      `.sort()` inside the function itself (not just relying on the caller's order), so its
      ordering guarantee doesn't silently depend on `getMenuItemIndustryPackMap`'s own contract.

## Phase 3 — Wire into `useMenu.js` (Platform + Simulator) / `useSimMenu.js` (both apps)

**Correction discovered during implementation:** the plan originally assumed
`applyRoleSidebarRevamp()`'s own return value (`tree`) was the final presentation. It is not —
`fetchMenuFromDBShared()` is called with `raw: true` by every real caller in both apps (`useMenu.js`'s
own `loadMenu()` and `useSimMenu.js`), so `applyRoleSidebarRevamp`'s output inside
`fetchMenuFromDB()`'s non-`raw` branch is dead code. The actual presentation is built from
`rawHierarchy` via `buildSidebarPresentation()` inside `applyFetchResult()` (a closure in
`useMenuProvider`), and separately via `applySimulatorMenuTransform()` inside `useSimMenu.js`'s
own `applyTransform()`. Confirmed empirically: reverted both files to `HEAD` (scoped
`git checkout HEAD -- <2 files>`, not a full stash) and re-ran the methodology test suite — same
result either way, proving the dead branch was never exercised and ruling it out as a factor.

- [x] `useMenu.js` (both apps): made the module's `applyFetchResult()` closure `async`; after
      `buildSidebarPresentation()` computes `finalItems`, resolve `getCurrentUserAccountId()`
      (sessionStorage-cached, rule 66) → `getMenuItemIndustryPackMap()` → wrap with
      `groupMenuTreeByIndustryPack()`. Added `await` at both of `applyFetchResult`'s call sites
      (both already inside an async `try`/`catch`). Left the dead `raw:false` branch in
      `fetchMenuFromDB()` alone functionally, just documented why it's unreachable.
- [x] The hook's own "instant re-render on remount, no DB round-trip" fast path (reads
      `readSidebarCache()` + `buildSidebarPresentation()` synchronously, deliberately no
      `await`) can't call the same async resolution without defeating its purpose. Added a
      module-level `_packContextByAuthUserId` cache, populated by `applyFetchResult()` on every
      real resolution and read synchronously (best-effort) in the fast path. Cold-cache result:
      falls back to a single Core Project Management wrapper (still fully correct, just not yet
      subdivided) until the first real fetch of the session populates the cache — self-heals
      immediately, and in practice the fast path can only fire after at least one prior
      successful load in the session, so the pack-context cache is almost always already warm
      by the time it matters.
- [x] `layoutHint?.layout === 'pm'` (and 'tm') also get pack-grouped — no special-casing needed,
      since the fix lives in `applyFetchResult()`/`applyTransform()`, downstream of and agnostic
      to which layout produced the tree.
- [x] `useSimMenu.js` — a genuinely separate hook (not a thin wrapper over `useMenu.js`'s own
      presentation, it builds its own via `applySimulatorMenuTransform`) exists as its own file
      in **both** `apps/platform/src/hooks/` and `apps/simulator/src/hooks/` (Platform's own
      Sidebar.jsx also renders a Simulator-scoped menu section, so both copies are live). Fixed
      both with the same async-resolve + synchronous-fast-path-cache pattern, using a
      self-contained `_simPackContextByAuthUserId` map local to each file (not shared with
      `useMenu.js`'s cache — this hook's own header comment already documents it as
      deliberately independent).
- [x] Confirmed via `git checkout HEAD -- <file>` isolation (not a full-tree stash) that the 2
      failing tests in `useMenuMethodology.test.js` ("PM layout places methodology tracks before
      Reporting & Intelligence", "TM layout returns hierarchy as-is") are **pre-existing**,
      reproducing identically against unmodified `HEAD` — unrelated to this plan, out of scope
      to fix here (rule 32), flagged to the user separately.

## Phase 4 — Sidebar rendering sanity check

- [x] `apps/{platform,simulator}/src/components/Sidebar.jsx`: icon lookup already falls back to
      `LayoutDashboard` for any unrecognized `menu_icon` (`iconMap[menuItem.menu_icon] ||
      LayoutDashboard`), so the synthetic wrapper nodes (no `menu_icon` set) render with a
      sensible default — no code change needed.
- [x] Expand/collapse state is plain React `useState`, keyed by `nodeKey` at render time — not
      `localStorage`-persisted, and doesn't reference `menu_level` anywhere in the file (grepped
      — zero matches). Sidebar depth comes purely from actual tree recursion, so the extra
      nesting level pack-grouping introduces renders with correct indentation automatically —
      no code change needed.

## Phase 5 — Manual verification (required — no feature flag per PRD decision 7)

Add a short section to `Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_Guide.md`
(this is a direct extension of that initiative's menu-resolution work) or a new
`Documentation/v930_Pack_Grouped_Sidebar_Menu_Guide.md` — whichever fits better once the change
is written — covering:

- [ ] A Cross-Industry-only account (the common case / every pre-v918 account): sidebar
      unchanged from before this change, one "Core Project Management" wrapper, no industry
      sections.
- [ ] A single real industry selected: exactly one extra section, correctly named, correctly
      populated, Core no longer shows that industry's exclusive items (if any exist in seed
      data) but still shows everything else.
- [ ] Two industries selected (one primary): two extra sections, primary industry's section
      listed first.
- [ ] A narrow role (one that doesn't grant every item in an industry pack): confirm the
      industry section only shows role-granted items, and disappears entirely if the role
      grants none of that pack's items.
- [ ] Disable a capability via Organisation Settings → Modules & Capabilities: confirm the
      item disappears from wherever it was showing (Core or an industry section), same as
      today.
- [ ] Toggle light/dark theme on the new synthetic top-level sections — no dark-only/light-only
      surfaces (rule 28.1).
- [ ] Repeat the above for Simulator.

## Phase 6 — Review section

**Status: code complete, unit-tested, syntax-verified. Phase 5 manual verification against
live data has NOT been performed — this environment has no browser/DB access. Do not treat
this as fully done until Phase 5's checklist is actually run once, since this ships with no
feature flag (PRD decision 7) and therefore has no built-in rollback switch.**

**Files touched:**
- `apps/platform/src/services/organisationIndustryService.js` /
  `apps/simulator/src/services/organisationIndustryService.js` — new `getMenuItemIndustryPackMap()`.
- `apps/platform/src/services/__tests__/organisationIndustryService.test.js` /
  `apps/simulator/src/services/__tests__/organisationIndustryService.test.js` — new, 6/6 tests each.
- `apps/platform/src/config/pmoMenuHierarchyUtils.js` / `apps/simulator/src/config/...` /
  `packages/config/src/pmoMenuHierarchyUtils.js` — new `groupMenuTreeByIndustryPack()`; also
  carries the earlier, separately-scoped `applyCategorySortOrders()` "missing-only" fix from
  the same session (a CLAUDE.md rule 25.1 compliance fix, not part of this PRD's own scope, but
  landed in the same files immediately before this work began).
- `packages/config/src/__tests__/pmoMenuHierarchyUtils.test.js` — 6 new tests (2 for the
  sort-order fix, 4 for `groupMenuTreeByIndustryPack`). 50/50 passing.
- `apps/platform/src/hooks/useMenu.js` / `apps/simulator/src/hooks/useMenu.js` — `applyFetchResult()`
  made async, pack-grouping applied there; module-level `_packContextByAuthUserId` cache added
  for the synchronous fast path; both call sites of `applyFetchResult()` now `await`ed.
- `apps/platform/src/hooks/useSimMenu.js` / `apps/simulator/src/hooks/useSimMenu.js` — same
  pattern, self-contained `_simPackContextByAuthUserId` cache (this hook is deliberately
  independent of `useMenu.js`, per its own header comment).

**Test results:** `organisationIndustryService.test.js` 6/6 (both apps).
`pmoMenuHierarchyUtils.test.js` 50/50 (`packages/config`, the copy the suite actually imports).
`useMenu.test.js` + `applyOrgMenuAvailabilityFilter.test.js` + `useMenuMethodology.test.js`:
55/57 and 61/63 (Platform/Simulator) — the 2 failures are pre-existing, confirmed unrelated by
reproducing identically against unmodified `HEAD` via a scoped 2-file `git checkout`, not
introduced by this work. All 34 changed/new files passed an `esbuild.transformSync` syntax
check.

**Deviations from the original plan:**
- Phase 0 concluded `menu_code` (not `id`) as the join key — see that phase's note.
- Phase 3's actual integration point (`applyFetchResult()`/`useSimMenu.js`'s `applyTransform()`)
  differs from the plan's original assumption (`applyRoleSidebarRevamp()`'s own return) — see
  Phase 3's correction note. This was caught by tracing actual production call sites
  (`raw: true` everywhere) rather than assuming the most obviously-named function was the live
  path.
- Discovered two pre-existing, out-of-scope issues while implementing, not fixed here (rule 32):
  (1) `useMenuMethodology.test.js`'s 2 failing tests (see Phase 3 note); (2) `packages/config/src/pmoMenuHierarchyUtils.js`
  had already drifted from `apps/platform`'s copy in unrelated regex-matching logic (manage-roles/
  manage-menu-bundles/organisation-industries/signatory-requirements category matching) before
  this session touched either file — both should be reconciled in a separate, dedicated pass.

**Not yet done:** Phase 5 manual verification (needs a live environment); Phase 5's
documentation-guide addition (write once manual verification confirms the design is correct in
practice, not before, so the guide describes what was actually verified rather than what was
merely intended).

## Phase 7 — Live-testing bugs found and fixed (2026-08-21)

Phase 5 manual verification (browser) surfaced two real bugs:

1. **Flash of ungrouped menu on load.** `applyFetchResult()`'s pack-grouping (Phase 3) only ran
   on the async DB-fetch completion path. Two *synchronous* fast-render paths in
   `useMenu.js`'s `loadMenu()` — the "localStorage cache check" branch and the "quick role
   names" branch's cache-miss sub-branch — recomputed the sidebar via `buildSidebarPresentation
   (cached.rawHierarchy, cached.layoutHint)`, which does **not** include pack-grouping at all,
   then rendered that ungrouped tree immediately. A moment later the DB fetch resolved and
   `applyFetchResult()` overwrote it with the correctly-grouped tree — visible to the user as
   the sidebar flashing from a flat, ungrouped list to the "Core Project Management" / industry
   pack sections. Root cause: the localStorage cache already stores the fully-finished,
   pack-grouped tree as `items` (written by `applyFetchResult`) — the buggy branches were
   discarding it and recomputing an inferior, ungrouped version from `rawHierarchy` instead of
   just using `cached.items` directly. **Fix**: both branches now use `cached.items`/
   `quickCached.items` directly when present, falling back to `buildSidebarPresentation` only
   when the cache has no finished `items` yet. This also made the `_packContextByAuthUserId`
   best-effort synchronous re-grouping mechanism unnecessary — removed as dead code. Applied to
   `apps/platform/src/hooks/useMenu.js` and `apps/simulator/src/hooks/useMenu.js`;
   `SIDEBAR_CACHE_VERSION` bumped 50 → 51 in both apps' `menuCacheUtils.js` to force a clean
   cache. `useSimMenu.js` was left as-is — it re-transforms the *shared platform* cache's
   `rawHierarchy` through its own simulator-scoped transform, so there is no equivalent
   pre-grouped `items` to reuse there; its existing best-effort `_simPackContextByAuthUserId`
   mechanism is the correct design for that hook and is a smaller, first-navigation-only edge
   case, not the flash-on-every-load bug reported here.

2. **Generic PM chrome mis-bucketed under industry-specific pack sections.** Reported live:
   "IT & Software Pack" showing Portfolio & Delivery > Project Execution / Template Library /
   Organisational Templates / Document Signatory / Field Templates — clearly generic items, not
   IT-specific ones. Root cause traced to `SQL/v921`'s derivation method: `industry_pack_menu_
   items` is populated purely from `role_menu_items` grants on industry-tagged built-in roles
   (`SQL/v906`/`v907`/`v913`), and those roles were themselves seeded by *copying* their entire
   grant set from an existing generic tier_source role (e.g. `it_programme_manager` copies
   `programme_manager`'s full grants wholesale) — correct for RBAC (an IT Programme Manager
   legitimately needs Template Library access) but wrong for sidebar *grouping*, since it tags
   every such generic item as "IT & Software Pack content" too, alongside every other industry
   that also has a role at that tier. Confirmed via reading `SQL/v907`'s own header comment
   ("given the SAME role_menu_items grants... via a mirrored roles row"). **Fix**: `SQL/v939_
   industry_pack_menu_items_generic_content_cleanup.sql` — a menu item claimed by more than half
   of the 9 real industry packs is by definition not industry-specific; delete its
   `industry_pack_menu_items` rows for every non-Cross-Industry pack. `groupMenuTreeByIndustryPack
   ()`'s owner lookup already falls through to `'core'` for any menu_code with no
   `industry_pack_menu_items` row, so no separate Cross-Industry insert is needed. Idempotent;
   safe to re-run. **Caveat documented in the migration**: if `SQL/v921` is ever re-run after new
   industry-tagged roles/grants are added, `v939` must be re-run immediately after — v921's
   derivation is purely additive and doesn't itself know about this majority-rule exclusion, so
   it would silently re-introduce the same over-broad rows.

**Update (2026-08-21, same day)**: user confirmed the flash fix worked but `v939` alone did not
clear the IT & Software Pack mis-bucketing — its "majority of 9 packs" threshold apparently
didn't clear for these specific items. Wrote `SQL/v940_industry_pack_menu_items_generic_
baseline_cleanup.sql` with a more precise signal: `SQL/v906`'s own header comment defines `NULL
industry_category_id` on `public.roles` as *the* canonical generic/methodology role set
(independent of any statistical distribution) — if a menu item is granted to one of those
untagged built-in roles, it's generic by definition, not industry-specific-by-inheritance.
v940 removes `industry_pack_menu_items` rows for any item also granted to an untagged built-in
role, and includes a read-only diagnostic pass reporting anything still classified under IT &
Software with a template/signatory/organisational-sounding label, so a third guess isn't needed
if this still doesn't fully clear it.

**Update (2026-08-21, later same day)**: `v940` ran successfully but was too aggressive — its
"also granted to any untagged/generic built-in role" heuristic matched not just the intended
generic template items but also the real, hand-curated Local Register Engine content (v934
deliberately grants all 28 local-register menu items to that same admin/oversight role set for
oversight access). Confirmed live: after a genuine cache clear + dev server restart, the sidebar
fell back to showing only "Core Project Management" — no industry sections at all, meaning
`industry_pack_menu_items` had been emptied almost entirely, not just cleaned of the 5 offending
items.

**Correction**: `SQL/v942_industry_pack_menu_items_restore.sql` re-runs the two original,
already-idempotent derivation inserts (`v921` step 2 role-derived content, `v934` step 3
local-register-derived content) to restore everything `v939`/`v940` removed. `SQL/v943_
industry_pack_menu_items_explicit_generic_exclusion.sql` then applies the actual fix precisely:
an explicit, hand-reviewed list of exactly 5 menu labels (Template Library, Organisational
Templates, Document Signatory, Field Templates, Project Execution) — matched by exact label, not
any role-grant or frequency heuristic — removed from non-Cross-Industry pack classification
only. No risk of collateral removal since the list is explicit and small. `v939` and `v940`
remain in the migration history as a documented record of the two heuristics that were tried and
found unsuitable (too weak, then too strong) — do not re-run either of them; `v942` is the
correction and `v943` is the actual fix.

**Update (2026-08-21, later still)**: `v943` alone (5 exact labels) was not the complete list.
Added a temporary client-side diagnostic log to `useMenu.js`'s `applyFetchResult()` (removed
again once its purpose was served) to print the account's actual resolved `menuCodeToPack`
entries. This surfaced the real, complete picture: **18** menu codes were still classified under
the IT & Software pack — not just the 5 labels `v943` targeted. All 18 are variants within the
Templates/Forms/Security-templates admin area (per-tab codes like `plat_pm_templates_forms`,
`plat_pm_p_itto_templates`, `plat_tpl_organisational_forms`, etc.) that v921's role-grant
derivation tagged for the same underlying reason as before. 12 are Platform-prefixed
(`plat_*`); 6 are the Simulator-prefixed (`sim_*`) equivalents in the same shared
`public.menu_items` table — harmless to Platform today (Platform prunes non-`/simulator`
routes) but the same bug waiting to surface once Simulator's own pack-grouping renders them, so
fixed for parity too. `SQL/v944_industry_pack_menu_items_template_admin_area_cleanup.sql`
removes exactly these 18 codes (read directly off the live account, not a heuristic) from every
non-Cross-Industry pack, and ends with a verification `SELECT` that should return zero rows.

**Update (2026-08-21, final)**: user correctly pushed back on `v944` — an explicit hardcoded
code list in a migration is the same underlying mistake as `v939`/`v940`/`v943` just moved to a
different layer, and each prior round had already found more mis-classified items than the last.
**`v944` is superseded — do not run it.** Root-caused properly this time: `v921`'s entire
derivation method (inferring pack content from `role_menu_items` grants) has no genuine
industry-specific signal to work with at all, because industry-tagged roles are literal copies
of their generic tier_source role's grants (`v907`/`v913`) — no query against that data can ever
correctly separate "generic" from "industry-specific", because the distinction was never encoded
there. The only real, hand-curated per-industry mapping anywhere in the system is the Local
Register Engine's `local_register_industry_packs` (deliberately authored in `v931`/`v933`, e.g.
Permits for Construction, Clinical Trials for Healthcare).

**`SQL/v945_industry_pack_menu_items_curated_only.sql`** — the actual, permanent fix: keeps
`industry_pack_menu_items` rows ONLY where they trace back to `local_register_industry_packs`
(a real curation table), removing every row `v921`'s role-derivation ever produced. No item list,
no heuristic, no hardcoded codes anywhere — driven entirely by what's already curated in the DB.
`groupMenuTreeByIndustryPack()`'s existing fallback (`|| 'core'`) means everything not in that
curated set correctly reappears under "Core Project Management" on its own. Documented as the
going-forward rule: new industry-specific menu content must be added via a real curation table
(the `local_register_industry_packs` pattern), never by re-deriving from role grants; if `v921`
or `v934` are ever re-run, re-run `v945` immediately after.

**Not yet done**: re-verification in the browser after `v945` is run against the live DB — not
done from this environment.

## Explicitly not in this plan (see PRD Out-of-scope)

Optional Feature Packs, per-item badges, an admin composition view, any change to
`get_account_available_menu_item_ids()` or `organisation_disabled_capabilities`, and any
feature-flag/gradual-rollout mechanism.
