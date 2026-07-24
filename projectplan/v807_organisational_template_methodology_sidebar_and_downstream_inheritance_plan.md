# v807 — Organisational Templates: Methodology-Grouped Sidebar + Real Downstream Inheritance

**Depends on:** v805/v806 (Global vs Organisational split, bulk copy, CRUD, override annotation) — both shipped and completed 2026-07-23, same day as this request.

## Important — most of what was asked for already exists

Before planning new work I checked whether this had been built already, because it looked very close to something recent. It has: **v805**, completed earlier today, already delivers:

1. **PMO accesses the Template Library** — `Portfolio & Delivery → Templates → Template Library` (Global, `is_system_synced=true` only). ✅ Exists.
2. **Select single or multiple templates to copy** — checkbox column + "select all (current filter)" + bulk "Copy N to Organisational" toolbar, sequential copy with a results summary. ✅ Exists (`TemplateLibraryPage.jsx`, both apps).
3. **Copy creates an organisational template** — lands in a **separate** page/menu leaf: `Organisational Templates` (`OrganisationalTemplatesPage.jsx`, both apps), full CRUD (view/edit/retire) via `OrganisationalTemplateDetailPage.jsx`.
4. **Some downstream substitution** — `resolveAccountTemplateOverride()` finds an account's own copy of a specific global node and the Library UI silently forks from it instead of the global master.

So steps 1–2 of your list need **no new work** — just a smoke-test that v805/v806 actually landed in your DB (v806 exists specifically because v805's role grants partially failed to apply the first time).

## What's genuinely missing — this plan's actual scope

### Gap 1 — "Organisational Templates" is one flat sidebar leaf, not grouped by methodology
Today `plat_tpl_organisational` / `sim_tpl_organisational` is a single menu row under `Portfolio & Delivery → Templates`, sibling to `Template Library`. It has in-page dropdown filters (tier, domain) but no methodology grouping and no query-param deep-linking.

The Admin app's **Global Templates** nav (`defaultAdminNav.js`) is the reference you pointed to: one `Templates` subsection with **Portfolio / Programme / Project** tier groups, each split into **Structured / Standards-Based / Agile** methodology links, all pointing at the same underlying page with different `?domain=&methodology=` query params — no duplicate pages, just query-param-scoped menu leaves.

### Gap 2 — Downstream tiers do not actually prefer the organisational copy
This is the part of your step 4 that isn't done yet. The Library's "you have a custom version" annotation only fires when someone is *browsing the Library*. The function that actually decides which template a Portfolio/Programme/Project manager's own document resolves to by default — `resolveStartNodeId()` in `pmTemplateInheritanceService.js` — was **deliberately left untouched** by v805 (its own stated decision #2, to avoid changing behaviour for `fields`/`industry_plan`/`opa`). Read just now: its no-explicit-assignment fallback query orders `is_system_synced DESC` — **global still wins the tiebreak**, unchanged, for every domain including `portfolio_template` and `programme_template`. So today, even after a PMO copies and customises a Portfolio template, a Portfolio Manager who hasn't explicitly assigned a template to their specific portfolio still defaults to the **global** version, not the org's.

### Gap 3 — `project_template` isn't a resolvable domain at all
`PM_TEMPLATE_DOMAINS` in `pmTemplateInheritanceService.js` lists `portfolio_template` and `programme_template` but **not `project_template`** — even though Admin's Global Templates nav has a populated Project tier group (Structured/Standards-Based/Agile). Flagging rather than assuming this is intentional — need your confirmation before touching it.

### Gap 4 — OPA copies have no visible link back to their Global source
OPA doesn't get a branch in the new tier/methodology sidebar tree (it already has its own home: `Knowledge & Operations → Process Assets`, `/platform/opa`). Copying a Global `opa`-domain template deep-clones the `organisational_process_assets` row (`duplicateOpaRow()` in `pmTemplateCopyService.js`) and cross-links it with the new `pm_template_nodes` row (`domain_ref_id` ↔ `pm_template_node_id`). `listOPAs()` (`opaService.js`) filters only on `organisation_id` — so the copy silently appears in the normal Process Assets list, indistinguishable from a natively-created OPA. **`OPAList.jsx` / `OPADetail.jsx` show no indicator that a row originated from a Global template** — that provenance is only visible from the Organisational Templates / Template Library side today.

### Gap 5 — `methodology` value mismatch: `pmbok` in the DB vs `standards_based` in the menu/UI convention
`pm_template_nodes.methodology` is CHECK-constrained to `'pmbok' | 'structured' | 'agile'` (`SQL/v785`). The later rename to "Standards-Based" (`SQL/v797`) was **display-label-only** — its own header says so: *"menu_code values and the `methodology` column ('pmbok' | 'structured' | 'agile') are unchanged — only human-readable text."* But `METHODOLOGY_TRACK_DEFS` (used by `OrganisationalTemplatesPage.jsx`'s `methodologyLabel()`) only defines track `standards_based`, not `pmbok` — so **today, any Standards-Based-tagged org template already displays the raw string `"pmbok"`** instead of a proper label. This also means a naive `?methodology=standards_based` query param on the new sidebar leaves would filter against a value that doesn't exist in the column and return zero rows, not "no data yet."

## Design decisions — flagging for your approval, not building yet

1. **Reuse the existing `OrganisationalTemplatesPage` (+ Global `TemplateLibraryPage`), don't build new pages per group.** Mirrors Admin's own pattern exactly: one page, many menu leaves, each passing `?tier=&domain=&methodology=`. Requires adding `useSearchParams` reads for `domain`/`methodology`/`tier` to `OrganisationalTemplatesPage.jsx` (currently pure local state, no URL sync) — `TemplateLibraryPage.jsx` already reads `domain`/`tierFilter` but not `methodology`, so that page needs the same small addition.

2. **Scope the new sidebar grouping to the three tier-template domains only** (`portfolio_template` / `programme_template` / `project_template`) — not Admin's other three subsections (Forms, Content Coverage, Process Docs). Those are Admin-only content-authoring concerns over global/system content; they don't have an organisational-copy equivalent in Platform/Simulator today. **Please confirm this narrower scope is what you want** — if you actually want Forms/Process Docs grouped the same way too, that's materially more menu SQL and should be scoped explicitly.

3. **Fix the downstream tiebreak by branching on domain, not flipping it globally.** For `portfolio_template`/`programme_template`/`project_template` (assuming Gap 3 is confirmed as a real gap and fixed), change `resolveStartNodeId`'s fallback to prefer `is_system_synced=false` (the org's own copy) first. Leave `fields`/`industry_plan`/`opa`/`form_template`/`process_template` ordering exactly as-is, since v805 already made a deliberate call not to touch those and nothing here requires revisiting it.
   - **Open question:** does preferring the org copy ever surprise a manager who expected the current global baseline (e.g. after a compliance-driven global template update)? My read: no — an account that bothered to copy+customise a template has opted out of auto-following global changes for that document, so preferring their copy by default is the correct reading of "customise once, apply everywhere downstream" (the same intent v805 stated for the Library). Flagging in case you disagree.

4. **New menu rows are group *headers* (non-navigable, `route_path = NULL`), not real pages** — `Organisational Templates → Portfolio → {Structured, Standards-Based, Agile}`, same for Programme/Project, 3 tier groups × 3 methodology leaves = 9 new leaves per app (18 total, Platform + Simulator), all pointing at `OrganisationalTemplatesPage` with different query strings. Same role-grant pattern as v805/v806 (`pmo_admin`, `system_admin`, `account_owner` + legacy label variants).

5. **OPA provenance surfaces as a badge/link, not a new page or menu.** On `OPAList.jsx` (+ Simulator mirror `SimOPAList.jsx`) and `OPADetail.jsx`, when a row's `pm_template_node_id` is set, show a small "Copied from Global Template" indicator that resolves the node's `parent_node_id` → the global source node's name, linking through to that global node in the Template Library. No schema change needed — the FK chain already exists (`organisational_process_assets.pm_template_node_id` → `pm_template_nodes.parent_node_id` → source node).

6. **Fix the `pmbok`/`standards_based` mismatch at the boundary, not with a DB rename.** Simplest safe option: the new sidebar leaf's URL query param is internal plumbing nobody reads directly — the "Standards-Based" leaf's link just uses `?methodology=pmbok` (the real stored value), while its visible menu **label** stays "Standards-Based". No translation layer needed for the new filtering to work, and no risky data migration renaming every existing row. Separately (pre-existing bug, unrelated to whether v807 ships): fix `methodologyLabel()` in `OrganisationalTemplatesPage.jsx` (+ sim mirror) to normalise `pmbok → standards_based` before the `METHODOLOGY_TRACK_DEFS` lookup, so existing rows stop displaying the raw string `"pmbok"`.

## Scope

### Phase 0 — Verify v805/v806 actually landed
- Run v806's verification SELECT against the live DB; confirm `plat_tpl_organisational` / `sim_tpl_organisational` show `can_view=true` for your role and are visible in the sidebar today.

### Phase 1 — Query-param filtering on both template pages
- `OrganisationalTemplatesPage.jsx` (+ sim mirror): add `useSearchParams`, read `tier`/`domain`/`methodology` on mount, seed `tierFilter`/`domainFilter`/new `methodologyFilter` state from them.
- `TemplateLibraryPage.jsx` (+ sim mirror): add the same `methodology` read (tier/domain already wired).

### Phase 1b — `pmbok`/`standards_based` boundary fix
- New menu leaves link with `?methodology=pmbok` for the Standards-Based group (matches decision 6) — no code translation layer needed for filtering itself.
- Fix the pre-existing `methodologyLabel()` display bug in `OrganisationalTemplatesPage.jsx` (+ sim mirror): normalise `pmbok → standards_based` before the `METHODOLOGY_TRACK_DEFS` lookup so rows stop showing the raw string `"pmbok"`.

### Phase 2 — Methodology-grouped sidebar SQL (`SQL/v807_...sql`)
- Add 3 tier-group header rows + 9 methodology leaves under `plat_tpl_organisational`, same under `sim_tpl_organisational`. Standards-Based leaves link with `methodology=pmbok` (Phase 1b), label text stays "Standards-Based".
- Role grants identical to v805/v806's pattern.
- Apply-order note + smoke-test section, same convention as v805/v806.

### Phase 2b — Seed data (rule 18.2)
No new tables here, so rule 18.2 doesn't strictly trigger — but without any rows, all 9 new leaves render empty, and it's unverifiable whether Gap 5's fix actually works end-to-end. Companion seed file: `SQL/v807_organisational_template_seed.sql` (Platform + Simulator both covered by one call each, since `sync_global_template_node(..., p_target := 'both')` already fans out to both schemas).
- 9 idempotent calls to `public.sync_global_template_node()`, one per (tier × methodology): domains `portfolio_template` / `programme_template` / `project_template` × methodologies `pmbok` / `structured` / `agile`.
- Fixed hex-only UUIDs for `p_global_template_id` per rule 18.2 (re-runnable, no duplicate rows on re-apply).
- Each call's `p_payload` needs `{"template_code": "..."}` — required by v785's own check for these three domains (`RAISE EXCEPTION '% payload.template_code is required'` if missing).
- This seeds the **Global** (`is_system_synced=true`) side only, fanned out per-account by the existing sync function — matching how all other Global Template Library content already gets there. It does **not** fabricate fake per-account "customised" rows (those should come from a real PMO using the real bulk-copy flow you're building in this plan) — seeding fake customisations would misrepresent what an account has actually chosen to override, which isn't appropriate demo/reference data.

### Phase 3 — Downstream inheritance fix
- Confirm Gap 3 (`project_template` domain) with you before deciding whether to add it to `PM_TEMPLATE_DOMAINS`.
- Branch `resolveStartNodeId`'s fallback `ORDER BY is_system_synced` for the tier-template domains per decision 3.
- Update/extend `pmTemplateInheritanceService.test.js` to cover the new tiebreak explicitly (both the changed and unchanged domains, so a future edit can't silently widen or narrow the branch).

### Phase 3b — OPA provenance badge
- Add a `getNodeContent`-style lookup (or a small dedicated helper) that, given an `organisational_process_assets` row's `pm_template_node_id`, walks `parent_node_id` to the global source node and returns its name/id.
- Wire the badge/link into `OPAList.jsx` (row-level, subtle) and `OPADetail.jsx` (more prominent, with a link back to the global node).
- Same for Simulator's OPA pages (rule 34.1).

### Phase 4 — Parity, docs
- Every phase ships to Platform + Simulator together (rule 34.1).
- Update `Documentation/Template_Library_Menu_And_Copy_Guide.md` with the new sidebar structure, the corrected inheritance behaviour, and the OPA provenance badge.

## Explicitly out of scope
- Forms / Content Coverage / Process Docs methodology grouping (decision 2) — unless you tell me otherwise.
- Any change to `fields`/`industry_plan`/`opa`/`form_template`/`process_template` resolver ordering.
- Simulator's pre-existing `process_template` RLS gap (flagged in v805, still unresolved, unrelated to this plan).

## Todo
- [x] Get your sign-off on design decisions 1–6 above — approved as written
- [x] Phase 0: verify v805/v806 landed — verification query included in `v806`; run against live DB before/with this apply batch
- [x] Phase 1: query-param filtering, both pages, both apps
- [x] Phase 1b: `pmbok`/`standards_based` boundary fix + `methodologyLabel()` display bugfix
- [x] Phase 2: methodology-grouped sidebar SQL, both apps
- [x] Phase 2b: seed data — 9 `sync_global_template_node()` calls, idempotent, both schemas
- [x] Phase 3: downstream inheritance tiebreak fix (+ project_template added to `PM_TEMPLATE_DOMAINS`)
- [x] Phase 3b: OPA provenance badge on Process Assets pages, both apps
- [x] Phase 4: parity check, docs

## Review

**Completed 2026-07-23.**

### Delivered
| Phase | Artifact |
|---|---|
| 1 | `useSearchParams` read/sync for `tier`/`domain`/`methodology` in `OrganisationalTemplatesPage.jsx` and `TemplateLibraryPage.jsx` (both apps); new methodology filter dropdown on both pages |
| 1b | Reused existing `normalizeProjectDeliveryTrack()` (`methodologyMenuUtils.js`) in `methodologyLabel()` across all 4 page files — see correction below, no new duplicate function shipped |
| 2 | `SQL/v807_organisational_templates_methodology_sidebar.sql` — 3 tier-group headers + 9 methodology leaves, both apps, `methodology=standards_based` in the Standards-Based leaf's URL |
| 2b | `SQL/v807_organisational_template_seed.sql` — 9 idempotent `sync_global_template_node(..., p_target:='both')` calls |
| 3 | `project_template` added to `PM_TEMPLATE_DOMAINS`; `resolveStartNodeId`'s fallback tiebreak now branches via `ACCOUNT_PREFERRED_DOMAINS` (org copy wins for the 3 tier-template domains only); 5 new tests in `pmTemplateInheritanceService.test.js` (24/24 passing) |
| 3b | `resolveTemplateProvenanceBatch()` (`pmTemplateOverrideService.js`); "from Global" badge wired into `OPAList.jsx`/`OPADetail.jsx` (Platform) and `SimOPAList.jsx`/`SimOPADetail.jsx` (Simulator, `sim.organisational_process_assets` — confirmed this is the correct mirror, not the unrelated "Practice" OPA pages that use `public` schema) |
| 4 | `Documentation/Template_Library_Menu_And_Copy_Guide.md` updated with a new v807 section; `packages/shared` test suite: 151/151 passing (was 142 before v805, +9 here) |

### Correction made after initial implementation (vs. Gap 5 / decision 6 / Phase 1b as originally written)
Gap 5 and decision 6 above were based on incomplete research at planning time — `SQL/v785` (original CHECK) and `SQL/v797` (its own comment: *"the `methodology` column... unchanged, only human-readable text"*) were found, but a later migration, **`SQL/v798_rename_pmbok_identifier_standards_based.sql`**, was missed. v798 renamed the *stored* identifier too — not just the label — updating the CHECK constraints on `pm_template_nodes.methodology` **and** `sync_global_template_node`'s own validation to require `'standards_based'`, rejecting `'pmbok'` outright. This surfaced only when the seed file was actually run against the live DB: `ERROR: P0001: Invalid methodology: pmbok`.

Fixed post-discovery:
- `SQL/v807_organisational_template_seed.sql` and `SQL/v807_organisational_templates_methodology_sidebar.sql`: all `'pmbok'` / `methodology=pmbok` values corrected to `'standards_based'` / `methodology=standards_based` (menu_code suffixes renamed `_pmbok` → `_standards_based` too, for consistency).
- Further simplification found in the same pass: `packages/config/src/methodologyMenuUtils.js` **already had** `normalizeProjectDeliveryTrack()`, a more robust existing normaliser (handles `pmbok`/`waterfall-pmbok`/free text too) doing the same job my new `normalizeStoredMethodologyTrack()` was written for — so that duplicate function and its accompanying `STORED_METHODOLOGY_OPTIONS` array were **removed** in favour of reusing `normalizeProjectDeliveryTrack()` + building dropdown options directly from the existing `METHODOLOGY_TRACK_DEFS` (all 4 page files updated accordingly). Net: less new surface area than the plan as originally written.
- All 151 `packages/shared` tests re-run clean after this correction.

### Notes for you
- **Not yet run:** Phase 0's DB verification (I have no DB execution access from this session) — run `v806`'s verification SELECT plus `v807`'s own smoke-test SELECT (at the end of its file) against the live DB before/after applying, and confirm the new leaves' `parent_menu_id` resolved correctly.
- **Unrelated pre-existing issue found, not fixed:** `packages/config` has no `vitest.config.js` of its own, so `vitest run` there falls back to the root `vitest.config.js` (a legacy monolith-era config pointing at `./src/test/setup.js`, which doesn't exist for this package) — all 7 of its test files fail with "Cannot find module". This predates this session's changes (confirmed via `git status` — `packages/config` is entirely untracked) and is out of scope for this plan; flagging in case you want it fixed separately.
- Apply order: run `v807_organisational_templates_methodology_sidebar.sql` after `v805`/`v806`, then `v807_organisational_template_seed.sql`.
