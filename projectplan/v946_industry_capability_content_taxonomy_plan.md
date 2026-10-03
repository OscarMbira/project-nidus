# v946 — Industry Capability Content Taxonomy (14 Industries, PM-Filtered) — Implementation Plan

PRD: `projectprd/v946_industry_capability_content_taxonomy_PRD.md`
Source taxonomies: `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` (11 usable industries),
`Documentation/Marketing_and_Creative_Menu_Taxonomy.md` (12th),
`Documentation/Human_Resources_and_Legal_Compliance_Menu_Taxonomy.md` (13th/14th).

**Scale**: 382 new `local_registers` rows across 14 industries (see PRD section g's actual final
table), after applying the PRD's decision-0 PM-filter (down from an original ~850-1000 estimate
before that filter existed). This plan defines the repeatable per-industry pattern once, then
sequences 15 vertical-slice phases (one per industry) that each apply it, using only the
kept-category list from PRD section g — **not** each source document's full tree.

**All 15 phases (2-16 below) are written; Phase 2-15 SQL has been run against the live DB and
independently verified correct via a 10-point diagnostic (`SQL/v961`) — every register, category,
role grant, and industry-pack link matched its expected count exactly.**

**Post-rollout bug found and fixed (2026-08-21, not a data problem)**: despite the DB being fully
correct, the sidebar still showed the old, pre-rollout content. Root cause: `useMenu.js`'s
`fetchRoleMenuRowsForRoles()` had no explicit `.range()`/pagination on its `role_menu_items`
query, relying on PostgREST's default row cap (commonly 1000). This initiative added ~3,500 new
`role_menu_items` rows in one pass (840 for categories + 2,674 for registers); confirmed via
`SQL/v962` that a single test account's total role grant count is now 2,026 — comfortably past
that cap, so the query was silently truncating with no error, dropping the newest (this
initiative's) rows from what the sidebar ever fetched. This is a real, previously-latent
performance/scale bug the rollout exposed, not a flaw in any of the 15 seed migrations. Fixed by
paginating `fetchRoleMenuRowsForRoles()` with `.range()` in a loop until an empty page returns
(`apps/platform/src/hooks/useMenu.js` and the Simulator copy, parity rule 34.1); `SIDEBAR_CACHE_
VERSION` bumped 51 → 52 in both apps' `menuCacheUtils.js` since any previously-cached sidebar
baked in the incomplete data regardless of the code fix.

---

## Confirmed technical pattern (verified against live code before writing this plan)

Traced `groupMenuTreeByIndustryPack()`'s `pruneToOwner()` recursion
(`apps/*/src/config/pmoMenuHierarchyUtils.js`): a parent node with children is kept under a pack
automatically whenever at least one child matches that pack — **only the Level-3 leaf (register)
menu_items rows need an `industry_pack_menu_items` row; the Level-2 category row needs none.** A
category with zero matching children is correctly dropped from every bucket, including "Core
Project Management".

Traced `useMenu.js`'s `fetchMenuFromDB()`: which menu_items rows are visible to a user is NOT
solely role-grant driven — a fixed set of "structural scaffolding" category codes
(`getCategoryMenuCodes()` in `pmoMenuHierarchyUtils.js`) is unioned in regardless of role grants.
That set is a **hardcoded JS list**, not DB-driven — adding ~28 new category codes to it would
both violate rule 25.1's no-hardcoding intent and isn't necessary: **granting each new L2
category row normal `role_menu_items` rows (same broad delivery-team role set v934 already uses)
makes it visible through the existing, ordinary role-grant path** — no code change needed, matches
PRD decision 9 (no new code, seed data only).

**Per-industry SQL pattern** (repeats for every industry, one migration pair):

0. **Role grants use `public.grant_menu_role_group(menu_code_pattern)`** (added in `SQL/v946c`,
   after the role-name list was found repeated verbatim across every phase's migration —
   `menu_role_grant_groups` is a real DB table holding the `delivery_team` role set, and the
   function grants a menu_code pattern to every role in a named group in one call. No phase
   migration should ever inline the role-name list again; call the function twice per phase (once
   for `<prefix>_cat_%`, once for `<prefix>_reg_%` — or a pattern covering both, e.g. `ict_re%`
   for `ict_reg_%`/`ict_reuse_%`, when a phase also has reuse-link menu items).
1. **Category seed** — one `menu_items` row per Level-2 category, `parent_menu_id = NULL`,
   `route_path = NULL` (pure section header, matches the existing pmo-cat-* pattern and the
   reference mockups — clicking only expands/collapses), granted via step 0's function.
2. **Register seed** — one `local_registers` row per Level-3 leaf (fixed hex UUID, one dedicated
   9xxx block per industry — see each phase's own file header for its block number), its
   `local_register_fields` (Level-4 children mapped to dropdown options or a short status
   workflow per PRD decision 5; Title/Description/Status/Owner only where no clean L4 mapping
   exists), and one `local_register_industry_packs` row linking it to that industry's pack.
   **Also apply decision 5's logic one level up**: when an L2 category's own leaf list reads as a
   status progression of ONE register (e.g. "Register, New, Open, Responses, Overdue, Closed")
   rather than genuinely distinct record types, collapse it to one register with a
   status_workflow — confirmed necessary while authoring CON (v948), which would otherwise have
   produced 117 registers instead of a sensible 67.
3. **Menu wiring** — one `menu_items` row per register (route_path
   `/platform/local-registers/<uuid>`, `parent_menu_id` = that leaf's Level-2 category row from
   step 1), the same role grant via step 0's function, and one `industry_pack_menu_items` row
   (derived from `local_register_industry_packs`, same join shape as v934 step 3 / v945's kept
   rows — **never** re-run v921's role-derivation query for these; that mechanism is retired per
   v945).
4. **Verification** — re-run v945's verification query shape (every new row traces to a real
   `local_register_industry_packs` link) scoped to the new industry.

**Reuse categories (PRD decisions 6 / 6a)**: instead of steps 1-3, add a single `menu_items` row
whose `route_path` points at the *existing* feature's route (Requirements Register, Defects
module, Risk/Issue Register, Cost Management, Resource Management, governance/approvals,
procurement, document management, Lessons Learned, reporting), nested under a Level-2 category
row the same way, with no `local_registers` row at all — the point of decision 6/6a is precisely
that these don't get a new register.

**Simulator**: no new Simulator-side schema or route work — every new register is
`is_system_defined = true` in `public.local_registers`, already read cross-schema by Simulator
per v938's existing design. Simulator-specific `sim_*`-prefixed menu_items rows (so these appear
in Simulator's own sidebar, not just reachable by direct URL) are **not** created in this pass —
this matches the existing 28 registers' current state (same gap, not a new one introduced here),
tracked as a follow-up once a real Simulator entry-point exists (`projectplan/v931_local_
register_engine_plan.md`'s own noted gap).

---

## Phase 1 — Industry master data

- [x] `SQL/v946_industry_master_expansion.sql` written and run — renamed 5 existing
      `industry_categories` rows, updated their `industry_packs` rows in place, added
      Telecommunications/NGO/Retail. Verification confirmed live.
- [x] **Correction found from the live verification output**: the live DB already had 10 active
      industries, not 9 (undocumented `Human Resources` and `Legal & Compliance` rows existed
      with zero content); the migration's own "General Project Management" insert duplicated the
      pre-existing Cross-Industry pack. `SQL/v946b_general_project_management_dedup_fix.sql`
      written and run — removed the redundant row.
- [x] **Confirmed against live DB, post-fix**: 15 active `industry_categories` rows — 14 real
      industries (getting real content from this initiative) + Cross-Industry.
- [x] PRD updated to reflect the real 14-industry, decision-0-filtered scope (see PRD section g
      for the per-industry kept-category table this plan's phases below implement).

## Phase 2 — FIN: Banking & Financial Services

- [x] `SQL/v947_fin_banking_categories_and_registers_seed.sql` written — 8 category menu_items +
      62 registers (Banking Transformation 6, Core Banking 5, Data Migration 11, Testing &
      Assurance 7, Cutover 11, Operational Readiness 9, Go-Live 6, Hypercare 7), fields for the
      9 registers with a clean Level-4 mapping (Product Configuration, Parameterisation,
      Interfaces, Environments, Mock Migrations, Reconciliations dropdowns; Regulatory
      Milestones/Go/No-Go/Go-Live Decision date fields), all other registers use status-workflow
      only (Title/Description/Status/Owner). UUID block 9001.
- [ ] **Not yet run** — needs the user to execute against the live DB.
- [ ] Manual verification: select Banking & Financial Services on a test org, confirm the tree,
      confirm record CRUD on 3 sample registers.

## Phase 3 — CON: Construction & Engineering

- [x] `SQL/v948_con_construction_categories_and_registers_seed.sql` written — 17 category
      menu_items + 67 registers (collapsed from a literal 117 by recognizing several taxonomy
      leaf lists as status progressions of one register rather than separate registers, e.g.
      RFIs' Register/New/Open/Responses/Overdue/Closed → one "RFI Register" with a
      status_workflow — applied this same discipline one level up from PRD decision 5's L4
      guidance). Reuses the existing Sites/Materials/Permits registers (v933) rather than
      duplicating their "X Register" leaf; explicitly links those 3 to the Construction &
      Engineering pack in case they weren't already. UUID block 9002.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 4 — ICT: Information Technology

- [x] `SQL/v949_ict_technology_categories_and_registers_seed.sql` written — 11 category
      menu_items + 38 registers (collapsed from a literal ~65 using the same leaf-status
      discipline as CON — e.g. Environments' Dev/Test/SIT/UAT/Staging/Prod/DR collapsed to one
      register with an environment dropdown, Testing's 8 test types collapsed to one register
      with a test_type dropdown). Requirements/Defects get new reuse-link `menu_items` rows
      pointing at their confirmed existing routes (`/platform/scope/requirements`,
      `/platform/testing/defects`); Releases/Deployments are left untouched (already correctly
      linked from v931/v934, no need to re-parent working rows). UUID block 9003.
- [ ] **Not yet run.**
- [ ] Manual verification, including confirming Requirements/Defects/Releases/Deployments route
      to the existing pages, not a new empty register.

## Phase 5 — HLT: Healthcare

- [x] `SQL/v950_hlt_healthcare_categories_and_registers_seed.sql` written — 6 category menu_items
      + 22 registers. No collision with the 4 existing registers (they belong to the dropped
      categories, untouched). UUID block 9004.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 6 — GOV: Government & Public Sector

- [x] `SQL/v951_gov_government_categories_and_registers_seed.sql` written — 7 category menu_items
      + 23 registers. No collision (existing 2 belong to dropped categories). UUID block 9005.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 7 — TEL: Telecommunications (genuinely new industry, no existing content to reconcile)

- [x] `SQL/v952_tel_telecommunications_categories_and_registers_seed.sql` written — 9 category
      menu_items + 28 registers. UUID block 9006.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 8 — ENR: Energy & Utilities

- [x] `SQL/v953_enr_energy_categories_and_registers_seed.sql` written — 10 category menu_items +
      29 registers. No collision with the 3 existing registers. UUID block 9007.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 9 — MFG: Manufacturing

- [x] `SQL/v954_mfg_manufacturing_categories_and_registers_seed.sql` written — 7 category
      menu_items + 16 registers. Process Validation dropped as its own category (fully covered
      by the existing register, an empty category would just be pruned); Bill of Materials and
      Equipment/Asset Qualification reused, not recreated. UUID block 9008.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 10 — EDU: Education

- [x] `SQL/v955_edu_education_categories_and_registers_seed.sql` written — 6 category menu_items
      + 14 registers. Reuses the existing Curriculum Development register instead of recreating
      it. UUID block 9009.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 11 — NGO: NGO / Development (genuinely new industry, no existing content to reconcile)

- [x] `SQL/v956_ngo_development_categories_and_registers_seed.sql` written — 8 category
      menu_items + 18 registers. UUID block 900a.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 12 — RET: Retail (genuinely new industry, no existing content to reconcile)

- [x] `SQL/v957_ret_retail_categories_and_registers_seed.sql` written — 6 category menu_items +
      13 registers. UUID block 900b.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 13 — MKT: Marketing, Advertising & Creative Services

- [x] `SQL/v958_mkt_marketing_categories_and_registers_seed.sql` written — 16 category menu_items
      + 33 registers (heavily collapsed — e.g. Campaign Management's 10 remaining leaves become
      one "Campaign Register" with a 7-stage status_workflow, not 10 registers; final count much
      smaller than the earlier 100-130 estimate once this discipline was applied) + 11 reuse-link
      menu items (decision 6a). **Route verification caught 5 wrong guessed paths** before this
      was finalized (Documents/Lessons/Calendar had different real paths;
      Cost Management/Procurement turned out to be project-scoped routes
      `projects/:projectId/costs` with no project-agnostic equivalent, which this generic
      menu_items mechanism can't resolve a live project id into — those 2 point at Reports/
      Governance as the closest working destination instead, flagged as a known limitation, not
      silently shipped broken). UUID block 900c.
- [ ] **Not yet run.**
- [ ] Manual verification — full trimmed Marketing tree end to end, including confirming every
      reuse-link menu item actually navigates somewhere real (not just the 2 flagged ones).

## Phase 14 — HRM: Human Resources (already existed as a bare `industry_categories` row — no new
row needed, only content)

- [x] `SQL/v959_hrm_human_resources_categories_and_registers_seed.sql` written — 4 category
      menu_items + 10 registers + 4 verified reuse-link menu items. UUID block 900d.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 15 — LCO: Legal & Compliance (already existed as a bare `industry_categories` row — no
new row needed, only content)

- [x] `SQL/v960_lco_legal_compliance_categories_and_registers_seed.sql` written — 5 category
      menu_items + 9 registers + 6 verified reuse-link menu items. UUID block 900e.
- [ ] **Not yet run.**
- [ ] Manual verification.

## Phase 16 — Final cross-industry review

- [ ] Run v945's verification query shape across the whole `industry_pack_menu_items` table (not
      scoped to one industry) — confirm every row across all 14 industries traces to a real
      `local_register_industry_packs` link, zero role-derived rows anywhere.
- [ ] Spot-check the sidebar for at least 4 industries side by side, including at least one
      heavily-trimmed one (HR or Legal & Compliance) next to the least-trimmed one (Construction)
      so the filter's effect is visibly sane, not just correct on paper. Theme toggle light/dark
      too (rule 28.1).
- [ ] Update `Documentation/v931_Local_Register_Engine_Guide.md` with a note that the register
      count has grown from 28 to roughly 230-290 (~200-260 new + the 28 existing) and point to
      this plan for the industry-by-industry breakdown, plus a short explanation of the decision-0
      PM-filter so a future reader understands why e.g. Legal & Compliance has only 5 categories
      when its source document defines ~40.
- [ ] Add this plan's Review section summarising what shipped, deviations (especially the 3-round
      scope correction: master-data miscount → GEN duplicate → decision-0 filter arriving after
      Marketing/HR/Legal were already partly scoped), and any items that turned out not to map
      cleanly to a register/reuse choice during authoring.

---

## Notes on sequencing discipline

- Each phase is independently shippable and testable — do not batch multiple industries into one
  SQL file even though the pattern repeats, so a bad row in one industry's seed never blocks
  another's.
- SQL version numbers for phases 2-15 are assigned at build time (next free `v9xx`), not
  pre-reserved here, since other unrelated work may land in the sequence between phases.
- Exact field-type/status-workflow curation for each register happens at SQL-authoring time
  within each phase, following PRD decision 5's rule — not pre-specified in this plan document.
- **Before authoring each phase, re-derive that industry's exact Level-3 leaf list from the
  source document, filtered to only the Level-2 categories this plan names as "kept" for that
  industry** — this plan records which categories survive, not which individual leaves within
  them (that's still a straightforward mechanical step once the category is confirmed in scope,
  since every leaf under a kept category is itself PM content by the same logic that kept the
  category).
