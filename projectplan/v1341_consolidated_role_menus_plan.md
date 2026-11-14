# v1341 — Consolidated Role Menus — Implementation Plan

> **PRD:** `projectprd/v1341_consolidated_role_menus_PRD.md`: decisions D1–D21 (first interview), Amendment A (stories 32–42, R1–R8) and D22–D30 (second interview), plus D23 changed at the plan audit (tab strip). All 2026-11-13.
> **Design source:** `Documentation/Consolidated_Role_Menus_Proposal.md` (role trees, placement maps). Where it differs, the PRD wins (note at the top of that document).
> **Status:** Approved 2026-11-13. **Code complete 2026-11-13.** SQL v1449–v1459 (monorepo) and v249 (Admin) written, not run — the owner runs them. Owner steps left: run the SQL, run the audit, smoke-test, switch on (see Review).
> **Repos:** `E:\project-nidus` (Platform + Simulator, `public` / `sim` SQL) and `E:\project-nidus-admin` (Admin screens and Admin SQL). Each artefact stays in its own repo.
> **Method:** test-first tracer bullets (`projectplan/App_Guide.md`, rule 17.2). Every slice ships with the **switch off** (D11). With the switch off, the sidebar is unchanged.

**Revision 2 changes (plan audit):**
- Removed the "my team's work" RPC (D24).
- Search slice rewritten as "Go to page" over the current sidebar only (D22).
- Go-live is all organisations at once, not a pilot (D30).
- Slot tabs are a tab strip on existing pages (D23, changed).
- Added tasks for:
  - D25 custom roles, D26 role on the open project, D27 no project open, D28 organisation-level industry pages, D29 sections per app;
  - R3–R8;
  - the Simulator's `useSimMenu`, access-helper reuse and the new sub-menu parent items.

---

## 1. Facts found in the codebase (2026-11-13)

| Area | Fact | Impact on this plan |
|---|---|---|
| Today's grouping | `groupMenuTreeByIndustryPack` (`packages/config/src/pmoMenuHierarchyUtils.js`, v930) wraps the finished tree into "Core Project Management" + one section per pack. Called in `applyFetchResult` in `apps/platform/src/lib/useMenu.js` and `apps/simulator/src/lib/useMenu.js`. | Replaced by the new engine when the switch is on; kept unchanged when off. |
| Simulator Practice menus | Built by `apps/simulator/src/lib/useSimMenu.js` as well as `useMenu.js`. | Both builders get the engine, switch and cache rules (Slice 11). |
| Organisation availability | `get_account_available_menu_item_ids` (v1249) applies organisation industries plus `organisation_disabled_capabilities` (v920 / v931). | Unchanged. Runs before the new engine. |
| Project industries | `getProjectIndustryCategoryIds` (`apps/*/src/services/organisationIndustryService.js`) returns all `project_industries` rows, falling back to `projects.industry_category_id`. With **no** industry, the sidebar falls back to every organisation industry. | D18 changes the fallback to core only (switch on). A sibling function returns `is_primary` (D15). |
| Primary industry | `public.project_industries.is_primary` (v1112) and `sim.practice_project_industries.is_primary` (v1113), at most one per project. | No schema change for D15. |
| Simulator catalogue | Simulator reads `public.menu_items` / `role_menu_items` through `platformDb` (`sim_` codes). | One placement table in `public` serves both apps (D12). |
| Role layouts | `resolveLayoutType` (`packages/shared/src/utils/menuLayoutUtils.js`): `team_manager` is in the PM layout; programme / portfolio managers and governance roles are PM layout + `pmProfile`. | A placement key resolver maps roles to placement keys (D7: `team_manager` → team key). |
| Custom roles | `public.roles.account_id` / `public.project_roles.account_id` mark organisation custom roles (v902); menu bundles v914. No "menu layout" column exists. | D25 adds a "menu based on" column (Slice 6). |
| Governance profiles | `filterMenuByPmProfile` + `PM_PROFILE_ALLOW_RE` keyword regexes (`packages/config/src/methodologyMenuUtils.js`). | Replaced by explicit placements when the switch is on (D8). |
| PMO track headers | `wrapPmoMenuWithMethodologyTracks` in `applyRoleSidebarRevamp`. | Not used when the switch is on (D9). |
| Sidebar cache | `packages/shared/src/utils/menuCacheUtils.js`: key `nidus_sidebar_v7_${uid}_${layoutScope}`, `SIDEBAR_CACHE_VERSION = 134`. | Key extended and version bumped (R5). |
| Breadcrumbs | No shared breadcrumb component in Platform / `@nidus/ui`. The sidebar's active highlight and expanded section are derived from the tree it renders. | R4 is met by rendering the placement tree; Slice 3 checks the active / expanded state and any header title read from the menu. |
| Access helpers | `public.auth_user_is_account_member(UUID)` (v1444); `public.auth_user_can_access_project` (SECURITY DEFINER, `row_security off` pattern); Simulator practice projects use owner / `practice_project_memberships` checks (v963b). | Reused in the new tables' RLS (no raw-join policies). |
| Global search | `globalSearchService.js` searches records in `search_index`; there is no page search. | D22 adds "Go to page" over the built menu (Slice 12). |
| Admin | No menu management screen. Industry reference CRUD lives in Admin `modules/system` (v208). Admin writes to `public` only through gated RPCs (v227 pattern, `CLAUDE.md` 34.5). | Placement screens + switch go in `modules/system`; new narrow write exception in both `CLAUDE.md` files (R1). |
| Versions | Highest today: monorepo SQL v1448, Admin SQL v248, Admin plans v216. | Every SQL file takes **max + 1 at the moment it is created** (rule 18.0). Names below are working titles. |

---

## 2. Design summary (technical)

**New data (monorepo SQL, `public` unless stated):**

| Table / column | Purpose | Written by |
|---|---|---|
| `menu_sections` | Per app (`app` = `platform` / `simulator`): `section_code`, label, icon, sort order, `is_footer`, `overflow_label` (D14 group label). Unique (`app`, `section_code`). Labels from the database (D29, rule 25.1). | SQL seed; Admin RPC |
| `menu_slots` | Shared slots (D4 / D5): `slot_key`, label used when several members show, section, sort order. | SQL seed; Admin RPC |
| `menu_item_placements` | One row per menu item × placement key: `section_code`, optional `parent_menu_item_id` (Level 3 sub-menu, D13 / D13b), optional `slot_key`, `sort_order`, `scope` (`project` default / `organisation`, D28), `is_active`. Unique (`menu_item_id`, `placement_key`). | SQL seed; Admin RPC |
| `menu_items.default_section_code` (new nullable column) | Safety net when a placement is missing: an item inherits its nearest ancestor's default section (story 25). | SQL; Admin RPC |
| `menu_placement_version` (single row, or a column on `menu_sections`) | Version stamp bumped by every placement / section / slot write (trigger); read with the menu to refresh caches (R5). | Trigger |
| `account_menu_settings` | Per-organisation switch `consolidated_menu_enabled` (D11 / D20 / D30). | Admin RPC only |
| `project_disabled_menu_items` + `sim.practice_project_disabled_menu_items` | Per-project switch-off (D16 / D19), with `disabled_by`, `disabled_at` for the audit view (R3). | RPC only |
| `roles.menu_layout_key` + `project_roles.menu_layout_key` (nullable) | "Menu based on" for custom roles (D25); NULL on built-in roles. | Manage Roles RPCs; SQL backfill |

**Placement keys** (text, check-constrained): `pm`, `team`, `team_member`, `programme`, `portfolio`, `pmo_oversight`, `pmo_organisation`, `executive`, `sponsor`, `board`, `assurance`, `qa`, `change_authority`, `stakeholder`, `viewer`. Simulator rows use the same keys on `sim_` menu items.

**Placement key resolution (D25, D26, D27):**
1. Inside a project: the user's role **on the open project** (D26).
   - Built-in role → key (`team_lead` / `team_manager` → `team`, …).
   - Custom role → its `menu_layout_key` (D25).
   - Several roles on one project → the widest key (`pm` > `team` > `team_member` > governance profiles).
2. Organisation-level roles (PMO, portfolio, programme) → their keys, as today.
3. A project-scoped user with **no project open** → the Home section only, plus the project picker (D27).

**Engine** (pure, `packages/config/src/consolidatedMenu.js`; inputs in, tree out, no I/O):
1. Keep only items granted to the user (existing) and available to the organisation (existing).
2. Industry filter:
   - **Project-scope** placements: keep pack items whose industry is on the open project (D2). No project or no industry → core only (D3, D18).
   - **Organisation-scope** placements (D28): keep pack items whose industry is on the organisation; shown only for keys that have the Organisation zone.
3. Drop project switched-off items (D16).
4. Place items by placement key. If a placement is missing → ancestor's `default_section_code`, otherwise omitted and reported to the audit.
5. Build slots:
   - one visible member → that member's own label;
   - several → the slot label.

   Entry target = first member. Member order: core page, then the primary industry, then other industries, then `sort_order` (D15).
6. Level 3 sub-menus from `parent_menu_item_id` (D13 / D13b).
7. Section limit (D14): if a section has more than 12 entries, counting a sub-menu or slot as one, its industry-only entries move into one generated group entry labelled from `overflow_label`.
8. Hide empty sections. Order by `menu_sections.sort_order` for the app; footer last.
9. Also return a flat **page index** (label, route, section, industry name) of every visible entry for "Go to page" (D22).

**Slot tabs (D23, changed at the plan audit):**
- A merged slot is **one sidebar entry** opening its first member.
- When the current route belongs to a slot with 2+ visible members, the app layout shows a shared **`MenuSlotTabStrip`** (`@nidus/ui`) above the page content.
- One tab per visible member, primary industry first. Each tab navigates to that member's existing route.
- No slot route, no embedding, no page rebuilt. Bookmarks and Back keep working.

**Cache (R5) and performance (R6):**
- Sidebar cache key: `uid` + layout scope + switch state + open project id + `menu_placement_version`.
- `SIDEBAR_CACHE_VERSION` is bumped.
- Cleared on project switch, on a project industry change, on a switch-off change made in this session, and when the stamp read with the menu differs.
- Sections, slots, placements, the switch and project switch-offs load **in one `Promise.all` with the existing menu queries**, never as a later sequential step.
- Placements are cached in `sessionStorage` (`nidus:menuPlacements:<app>:<version>`).

---

## 3. Tracer-bullet slices

> **Shared rules for every slice:**
> - tests first (red → green);
> - Platform + Simulator parity unless the slice says otherwise;
> - theme-aware UI (rule 28.1); no hard-coded labels or section lists (rules 25.1, 75);
> - rule 66 performance pass;
> - rule 70 + 75 documentation in the same change;
> - retest suite after each slice (rule 43).

### Slice 1 — Placement data foundation (D10, D16, D20, D28, D29, R2)
- [x] SQL `v{N}_consolidated_menu_schema.sql`:
  - **Tables:** all §2 tables and columns, except the `roles` / `project_roles` columns (Slice 6). Includes `menu_sections.app` and `icon`, `menu_item_placements.scope`, the version stamp and its trigger, and the switch-off audit columns.
  - **RLS:** authenticated users read sections, slots, placements and the version stamp.
  - **RLS:** `account_menu_settings` is readable when `public.auth_user_is_account_member(account_id)`.
  - **RLS:** `project_disabled_menu_items` is readable when `public.auth_user_can_access_project(project_id)`.
  - **RLS:** the sim switch-off table is readable by the practice project owner or an active member (v963b pattern).
  - **No client write policies** on any of these tables.
  - `database_tables` registration for every new table.
  - No human-readable reference columns, so no Admin ID Generation rule.
- [x] SQL seed (same file, system defaults): sections + footer for `platform` **and** `simulator` (D29), and the shared slots from proposal §4.
- [x] Re-run `SQL/v1251_planner_table_wall.sql` (new `public` tables).
- [x] Tests (SQL smoke query file):
  - 10 sections per app;
  - slot codes unique;
  - an unknown placement key or scope is rejected;
  - a placement write bumps the version stamp.

### Slice 2 — Consolidated menu engine (pure functions) (D1–D4, D13–D15, D17, D18, D22 index, D27, D28)
- [x] Write failing tests in `packages/config/src/__tests__/consolidatedMenu.test.js`, one behaviour at a time:
  - single-industry project;
  - project with no industry → core only;
  - outside a project → core only;
  - composite FIN ★ + ICT: one Interfaces entry, FIN member first;
  - single-member slot keeps its own label and needs no tab strip;
  - Level 3 sub-menus (Project Team, Governance Setup, Project Settings);
  - section with 13 entries → industry entries grouped;
  - empty section hidden;
  - missing placement → default section;
  - switched-off item hidden;
  - no limit on industry count (5 industries still within limits);
  - organisation-scope items: shown in the Organisation zone filtered by organisation industries, hidden for project keys outside a project (D28);
  - no project open for a project key → Home only (D27);
  - page index lists exactly the visible entries, with industry names, and never switched-off items (D22).
- [x] Write failing tests for `resolvePlacementKey()`:
  - role on the open project (D26);
  - several roles → widest key;
  - custom role → `menu_layout_key` (D25);
  - no project → Home-only mode (D27).
- [x] Implement `buildConsolidatedMenu()`, `resolvePlacementKey()` and helpers until green. Export from `@nidus/config`.

### Slice 3 — First end-to-end: Project Manager on one Banking project (switch on for a test account) (R4, R5, R6, D23)
- [x] SQL seed `v{N}_consolidated_menu_pm_core_fin_seed.sql`:
  - **Catalogue rows (rule 75):** `menu_items` + role grants for the new sub-menu parent **Project Settings** (D13b), with existing settings pages as its children by placement. Plus a taxonomy line (rule 70).
  - **PM placements** for all Core PM items + the FIN pack (proposal §3, §4, §6.2), including the Project Setup sub-menus (D13 / D13b).
- [x] Platform `useMenu`:
  - read `account_menu_settings`; when on, call the engine instead of `groupMenuTreeByIndustryPack`;
  - `getProjectIndustries(projectId)` returns ids + `is_primary`;
  - all new reads in the existing `Promise.all` (R6);
  - cache key, version bump and clear triggers per §2 (R5);
  - project switch rebuilds the menu, using the role on the new project (D26).
- [x] `MenuSlotTabStrip` in `@nidus/ui` + mount point in the Platform layout (D23): theme-aware, keyboard accessible, horizontally scrollable on mobile, hidden for single-member slots.
- [x] R4: with the switch on, the sidebar's active item and expanded section follow the placement tree. Any header title read from the menu reads the placed item.
- [x] Tests:
  - `useMenu` integration: switch off → unchanged snapshot; switch on → 9 sections for a FIN project; project switch rebuilds; a new version stamp invalidates the cache;
  - tab strip unit tests (one member → hidden; two → primary first; each tab is the member's route);
  - active-item test on a sub-menu page.
- [ ] Manual: FIN project and untagged project, light and dark themes, mobile drawer.

### Slice 4 — Full Project Manager placements, all industries, and the audit
- [x] SQL seed `v{N}_consolidated_menu_pm_industry_seed.sql`:
  - PM placements for the CON, ICT, HLT, GOV, TEL, ENR, MFG, EDU, NGO and RET packs;
  - `default_section_code` on each pack's group rows;
  - organisation-scope placements for organisation-level industry pages (libraries, templates, reference registers) (D28).
- [x] SQL `v{N}_consolidated_menu_audit_query.sql` (read-only):
  - active, granted menu items with no placement for a placement key;
  - slots with no members;
  - sections above the limit for a sample composite project;
  - Simulator placements whose route is not mounted (R8; list fed from the Slice 11 route check).
- [x] Tests: engine tests for a CON project, a FIN + ICT composite (proposal §6.3a counts) and a 3-industry project.
- [x] Docs: taxonomy placement tags for every placed item (rule 70); proposal §3 / §4 aligned with the seeds.

### Slice 5 — Project Industry Modules switch-off (D16, D19, R3, story 39)
- [x] SQL `v{N}_project_menu_item_switch_off_rpc.sql`:
  - **Platform RPC:** `set_project_menu_item_disabled(project_id, menu_item_id, disabled)`, SECURITY DEFINER. Allowed for the project's Project Manager or a PMO Admin of the account. Records `disabled_by` / `disabled_at`. Audited.
  - **Simulator RPC:** `sim.set_practice_project_menu_item_disabled(...)`, allowed for the **practice project owner**. Practice projects belong to one user, so the PM / PMO rule does not apply.
  - **Switch-off only writes the switch-off table.** It never changes or deletes records (stories 9, 10).
  - **Catalogue row:** the menu item "Industry Modules" under Project Setup → Project Settings (D16), with role grants, placement and a taxonomy line.
- [x] Routed page **Industry Modules** (both apps, rule 65):
  - **List:** the project's industry items, each with a switch.
  - **Locked items:** items switched off by the organisation (v931) are shown locked, with the reason (story 39).
  - **Audit (R3, rule 63.1):** "Switched off by / on" per item, plus an Audit details tab for the project's switch-off history.
  - **Standard list features:** sortable table with Card / Table toggle and search (rules 40, 41, 44).
  - **Feedback and navigation:** success modal on change (rule 16); back button (rule 73).
  - **Read-only** for non-editors.
- [x] Engine and `useMenu` read the project's switched-off items. A change clears the sidebar cache (R5).
- [x] Tests:
  - RPC permissions: PM yes, Team Member no, practice owner yes, other practice user no;
  - page unit tests (locked item, audit columns, success modal);
  - engine test (from Slice 2).

### Slice 6 — Team Lead / Team Manager, Team Member menus and custom roles (D7, D24, D25, D26, stories 13–17, 32, 34)
- [x] Resolver: `team_lead` and `team_manager` → `team`; `team_member` → `team_member` (switch on only). **No team-assignment check (D24):** team menus = team placements + project-industry filter.
- [x] SQL seed: `team` and `team_member` placements (proposal §6.6, §6.7).
- [x] SQL `v{N}_custom_role_menu_layout.sql` (D25):
  - `roles.menu_layout_key` and `project_roles.menu_layout_key` (check-constrained to placement keys);
  - backfill existing custom roles from their grants (project-setup grants → `pm`, otherwise `team_member`);
  - the existing Manage Roles RPCs accept and return the field.
- [x] Manage Roles (`OrgRoleDetail.jsx`, both apps): "Menu based on" select, loaded from the placement keys in the database, with a short help line. Success modal and Audit tab already exist on that page.
- [x] Tests:
  - resolver tests (team keys; custom role; role on open project; multi-role widest key);
  - backfill check query;
  - Manage Roles field unit test.

### Slice 7 — Programme and Portfolio menus (stories 18, 19)
- [x] Resolver: `programme_manager` → `programme`; `portfolio_manager` → `portfolio`.
- [x] SQL seed: placements for existing programme / portfolio menu items (proposal §6.4, §6.5).
- [x] **Gaps, not built:** roll-up entries without an existing page are listed in the Review (PRD §f).
- [x] Tests: resolver + engine (programme outside a project → core only, D3).

### Slice 8 — Governance profile menus (D8, stories 22, 23)
- [x] Resolver: the eight profiles map to their placement keys.
- [x] SQL seed: explicit placements per profile (proposal §6.9).
- [x] With the switch on, `filterMenuByPmProfile` is skipped for these keys.
- [x] Tests:
  - each profile's sections match proposal §6.9;
  - renaming a menu label does not change who sees it.

### Slice 9 — PMO menu and organisation-level industry pages (D9, D28, stories 20, 21, 35)
- [x] Resolver: PMO layout roles → `pmo_oversight` (sidebar) and `pmo_organisation` (Organisation zone).
- [x] SQL seed: placements for both zones (proposal §6.8), including the organisation-scope industry pages from Slice 4 (D28).
- [x] With the switch on, methodology track headers are not built; the methodology switcher is unchanged.
- [x] Tests:
  - no track headers when on;
  - organisation capability switch-off still applied first;
  - organisation-level industry pages appear in the Organisation zone only for the organisation's industries.

### Slice 10 — Industry filter on PMO and Portfolio dashboards (D3)
- [x] An industry filter on the PMO dashboard and the Portfolio dashboard:
  - options from the organisation's active industries (database), "All" by default;
  - a composite project counts under each of its industries (proposal §8.1, rule 10).
- [x] Tests: filter unit test; composite project appears under both industries.

### Slice 11 — Simulator parity (D12, R8, story 42)
- [x] The Simulator `useMenu` **and** `useSimMenu` both get:
  - the same engine and switch;
  - the same cache rules (R5) and parallel loading (R6);
  - practice project industries (`sim.practice_project_industries`) and the sim switch-off table;
  - Simulator section labels from `menu_sections` (`app = 'simulator'`).
- [x] `MenuSlotTabStrip` mounted in the Simulator layout.
- [x] SQL seed: placements for `sim_` menu items, same sections and placement keys.
- [x] R8 route check, using the v1440 strict-route approach:
  - a script (`scripts/check-sim-placement-routes.mjs`) lists the `sim_` placements whose `route_path` is not mounted in `apps/simulator/src/routes/simulatorRoutes.jsx`;
  - the seed leaves those out;
  - the audit query lists them.
- [x] Tests:
  - the Slice 2 engine suite runs unchanged;
  - `useMenu` and `useSimMenu` integration tests;
  - the route-check script test.

### Slice 12 — "Go to page" search (D22, D6, story 28)
- [x] A **Go to page** search box at the top of the consolidated sidebar (both apps, mobile drawer included).
  - It searches the engine's page index (Slice 2): the current sidebar's pages only.
  - Results show the page label, its section and, for industry items, the industry name (D6).
  - Keyboard: type to filter; arrow keys and Enter open the page.
  - Theme-aware.
- [x] The existing record search (`globalSearchService.js`) is unchanged.
- [x] Tests:
  - results match the index;
  - switched-off and hidden items never appear;
  - industry name shown for pack items;
  - keyboard navigation.

### Slice 13 — Admin screens (D20, D21, R1) — repo `E:\project-nidus-admin`
- [x] Admin plan `projectplans/v{N}_consolidated_menu_placements_admin_plan.md` (Admin numbering).
- [x] Admin SQL `SQL/v{N}_consolidated_menu_admin_rpc.sql`:
  - permissions `system.menu_placements.view` / `.edit`;
  - `public.admin_menu_placement_*`, `public.admin_menu_slot_*`, `public.admin_menu_section_*` and `public.admin_set_account_consolidated_menu` SECURITY DEFINER RPCs;
  - reason required, audited;
  - every write bumps the placement version stamp (R5).
- [x] Pages in `modules/system`:
  - **Menu Placements:** list by placement key and section, sortable, Card / Table toggle, search, export. Create / edit as routed pages (Admin rule 18) with an Audit tab.
  - **Menu Sections & Slots**, per app.
  - **Consolidated menu switch:** per account, in the account detail screen. It is also the rollback lever (D30).
- [x] `CLAUDE.md` (both repos) §34.5: new narrow write exception for these tables through these RPCs only (R1).
- [x] Tests: Admin page tests; RPC permission tests.

### Slice 14 — Close-out and go-live for all organisations (D30, R7)
- [ ] Run the audit query: zero unplaced active items for every placement key; zero Simulator placements on unmounted routes.
- [ ] Role smoke tests with the switch on in the test environment, in light and dark themes and on mobile:
  - PM on a FIN project, a CON project, a FIN + ICT composite and an untagged project;
  - PM with no project open;
  - Team Lead and Team Member;
  - a custom role;
  - a user who is PM on one project and Team Member on another;
  - Executive;
  - PMO, including organisation-level industry pages.
- [x] Full retest suite, both apps; lint; shared drift check.
- [x] Docs:
  - `Documentation/Consolidated_Role_Menus_Guide_v1341.md` (how menus are built, how to add and place an item);
  - taxonomy placement tags complete;
  - ~~proposal doc header renamed~~ — skipped: the owner asked (2026-11-13) not to edit the proposal document.
- [x] `CLAUDE.md` rule 75: replace the "until the placement layer exists … still pre-PRD" text with the live workflow (placement rows, Admin screen, audit query) (R7).
- [x] `REVIEW.md` review; Review section added to this plan.
- [ ] **Go-live (D30):** the owner turns the switch on for **all organisations at once** in Admin. Rollback: switch it off for any single organisation.
- [ ] After go-live: a short check with a few PMs (can they find Testing, Cutover and Project Settings without help); findings go in the Review.
- [x] `ROADMAP.md`: no change — this delivers an existing priority (simpler SaaS navigation) and does not change priorities or milestones.

---

## 4. Order and dependencies

```text
Slice 1 ──► Slice 2 ──► Slice 3 ──► Slice 4 ──┬──► Slice 5
                                              ├──► Slice 6
                                              ├──► Slice 7
                                              ├──► Slice 8
                                              ├──► Slice 9 ──► Slice 10
                                              ├──► Slice 11 (after 3–9 settle)
                                              └──► Slice 12
Slice 1 ──► Slice 13 (Admin; can run in parallel after Slice 1)
All ──► Slice 14 (go-live for all organisations only after 1–13 pass)
```

D11 / D30: no organisation's switch is turned on until slices 1–13 are done. Then all organisations are switched on together.

## 5. SQL files (owner runs them in order; numbers assigned at creation per rule 18.0)

| Order | Repo | Working title |
|---|---|---|
| 1 | monorepo | `consolidated_menu_schema` (Slice 1) |
| — | monorepo | re-run `v1251_planner_table_wall.sql` after file 1 |
| 2 | monorepo | `consolidated_menu_pm_core_fin_seed` (Slice 3, incl. Project Settings catalogue row) |
| 3 | monorepo | `consolidated_menu_pm_industry_seed` (Slice 4, incl. organisation-scope placements) |
| 4 | monorepo | `consolidated_menu_audit_query` (Slice 4, read-only) |
| 5 | monorepo | `project_menu_item_switch_off_rpc` (Slice 5, incl. Industry Modules catalogue row) |
| 6 | monorepo | `consolidated_menu_team_seed` (Slice 6) |
| 7 | monorepo | `custom_role_menu_layout` (Slice 6, D25) |
| 8 | monorepo | `consolidated_menu_programme_portfolio_seed` (Slice 7) |
| 9 | monorepo | `consolidated_menu_governance_profiles_seed` (Slice 8) |
| 10 | monorepo | `consolidated_menu_pmo_seed` (Slice 9) |
| 11 | monorepo | `consolidated_menu_simulator_seed` (Slice 11) |
| 12 | Admin | `consolidated_menu_admin_rpc` (Slice 13) |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Placement seeds miss items, so items vanish when the switch is on | Default section fallback + audit query; no organisation is switched on until the audit is clean (Slice 14). |
| Stale sidebar cache shows the old or new menu | Cache key includes switch, project and placement version stamp; version bump; clear on every R5 trigger. |
| Extra menu queries slow the sidebar (past timeout incidents) | All new reads in the existing `Promise.all`; placements cached in `sessionStorage` per version (R6). |
| All organisations switch on at once (D30), so any miss affects everyone | Full role smoke tests and a clean audit before go-live; per-organisation switch-off as instant rollback. |
| Custom role backfill picks the wrong layout | Backfill check query lists each custom role's chosen key; organisations can change it in Manage Roles (D25). |
| Roll-up pages for Programme / Portfolio do not exist yet | Not built in this change; listed as gaps (PRD §f). |
| Unlimited industries per project (D17) produce long tab strips | Tab strip scrolls horizontally; D14 grouping keeps sections within the limit. |
| Two menu systems run side by side during the build | Engine only runs when the switch is on; snapshot test guards the off path. |
| Parallel menu changes by other work during the build | Rule 75 requires a placement entry for every new item; the audit query catches misses. |
| Simulator placements point at unmounted routes | R8 route-check script + audit query; seed skips them. |

## 7. Review

**Code complete 2026-11-13. SQL written, not run.** No organisation's sidebar changes until the switch is turned on in Admin.

### Owner steps
1. **Run the SQL, in order:**
   1. monorepo `v1449` (schema), then **re-run `v1251_planner_table_wall.sql`**;
   2. `v1450` (PM core + Banking), `v1451` (other industries);
   3. `v1452` (audit query, read-only; keep for step 2);
   4. `v1453` (Industry Modules RPCs), `v1454` (Simulator), `v1455` (team);
   5. `v1456` (custom role menu layout), `v1457` (programme / portfolio), `v1458` (governance), `v1459` (PMO);
   6. then Admin `v249`.
2. **Run the audit (`v1452`).**
   - Result set A should be empty, or list only pages you accept falling to a default section.
   - Export result set E and run `node scripts/check-sim-placement-routes.mjs <file.csv>`.
3. **Smoke test with the switch on for a test organisation** (Admin › Organisations › "Turn single sidebar on"). Use the roles listed in Slice 14, in light and dark themes and on mobile.
4. **Go live:** Admin › System › Menu Placements › "Turn on for all organisations". Rollback is per organisation, or "Turn off for all".

### What was built
- **Data (v1449):**
  - sections per app (9 + footer + PMO `organisation`);
  - shared slots, placements, default sections and a version stamp;
  - the per-organisation switch;
  - per-project switch-off tables with history.
  - Read-only RLS using `auth_user_is_account_member` / `auth_user_can_access_project`. No client writes.
- **Engine** (`@nidus/config/consolidatedMenu.js`, pure):
  - project-industry filter (D2, D3, D18) and switch-off (D16);
  - placement, default-section fallback and unplaced report (story 25);
  - Level 3 sub-menus (D13 / D13b);
  - shared slots: tab strip for page members, a merged sub-menu for group members, primary industry first (D4, D15, D23);
  - section limit grouping (D14), duplicate-route guard, Home-only (D27), organisation scope (D28);
  - page index (D22);
  - placement key resolver (D25, D26, D27). Compact keys (Team Member, governance) get no default fallback.
- **Loading** (`consolidatedMenuData.js`, `consolidatedMenuStep.js`):
  - switch cached for 2 minutes;
  - placements cached per version (R5);
  - one parallel batch (R6);
  - hidden "consolidated-only" catalogue rows injected when placed.
- **Builders:** `useMenu` (both apps) and `useSimMenu`.
  - With the switch off, the code path is unchanged.
  - The sidebar rebuilds on project switch, on Industry Modules changes (event) and when the version changes.
  - The cache version was bumped to 135.
- **UI:**
  - **Slot tab strip** (layouts in both apps and the Simulator role layout).
  - **Go to page** search (both Sidebars).
  - **Industry Modules page,** both apps (`/platform/project-setup/industry-modules`, `/simulator/practice-projects/industry-modules`):
    - switch per item;
    - organisation switch-offs shown locked;
    - Audit tab with history;
    - success modal;
    - read-only for non-editors.
  - **"Menu based on"** in Manage Roles (both apps).
  - **"Projects by industry"** on the PMO dashboard (Projects tab) and the Portfolio dashboard.
- **Seeds:** PM placements for all 205 Core PM pages and all 121 industry groups; Simulator placements by label; team, team member, programme, portfolio, 8 governance profiles and PMO.
- **Admin:**
  - Menu Placements (with switch for all organisations), placement form, Menu Sections & Slots and section/slot form;
  - "Single sidebar" column and action on the Organisations list.
  - RPCs are reason-required and audited.
  - `CLAUDE.md` rule 34.5 exception added in both repos; rule 75 updated (R7).

### Decisions taken while building
- **New hidden catalogue rows.** "Project Settings" and "Industry Modules" are new catalogue rows with `is_visible = FALSE`, so today's sidebar never shows them.
- **PMO Organisation zone.** It became an `organisation` section, hidden for every other role.
- **Industry filter on dashboards (D3).** It is a "Projects by industry" panel (industry chips, composite projects counted under each industry, project list). It does not re-slice the PMO analytics figures, which come from organisation-level RPCs.
- **Custom role layout.** "Menu based on" is set through a separate small RPC (`set_org_custom_role_menu_layout`), not by changing the create / update role RPCs. The layout options are a fixed list matching the CHECK constraint.
- **Admin confirmations.** Admin saves confirm with the Admin toast, as every existing `modules/system` page does.
- **Proposal header not renamed.** You asked not to edit the proposal document.

### Gaps (not built)
- **No organisation-level industry pages yet.** No industry pack has one today, so D28 works but nothing is seeded under it.
- **Programme / Portfolio roll-up pages are missing.** The proposal names some that don't exist (roadmap, go-live calendar, capacity & demand).
- **Simulator dashboards have no industry filter.** Its PMO and portfolio dashboards use a different data model (rule 64 precedent).
- **Header page titles.** The sidebar's active item follows the placement tree (R4). No shared breadcrumb component exists, so there was nothing else to change.

### Validation
- **New tests, all passing:**

  | Suite | Tests |
  |---|---|
  | engine | 30 |
  | loader | 11 |
  | step | 6 |
  | industry dashboard grouping | 3 |
  | Industry Modules service | 4 |
  | Industry Modules panel | 5 |
  | route-check script | 2 |
  | Admin services | 7 |

- **Packages:**
  - `@nidus/config`: 153 / 153.
  - `@nidus/ui`: 276 / 276.
  - `@nidus/shared`: 6 failures in 3 untouched files (checkpoint report export, timezone options, query router).
- **Apps:**
  - Platform: 158 failures in 61 files; Simulator: 121 in 59. All in files this change does not touch (stale service mocks, integration tests, removed imports).
  - The three failing files that import changed code (`useMenuMethodology` in both apps, `DecisionLogPage.pendingActions`) fail the same way on the committed code.
- **Shared drift check:** 0. All SQL files parse (libpg-query), with no "into" outside `INSERT INTO`.

### First audit run (2026-11-14) → `SQL/v1460_consolidated_menu_audit_fixes.sql`
- **Audit query fixes (v1452 edited, read-only):**
  - Compact menus no longer count a default section as covered.
  - Industry pages are skipped for compact menus (story 23).
  - Result A now starts with a per-role count (`A_summary`).
- **Result A (CSV Files/consolidated_menu_audit_A.csv)** had 253 distinct uncovered pages for the full-menu roles: PMO / organisation tools, legacy `local_register_*` pages, reports and personal pages. v1460 gives each a default section by what it is: explicit rules first, then keyword rules. I checked the mapping against the CSV before writing it.
- **Compact roles:** v1460 places My Expenses and Notification Preferences for every compact role, plus the reports and documents each governance role reviews. Other granted pages stay out on purpose.
- **Result E route check** (`scripts/check-sim-placement-routes.mjs`, now matches nested `/*` routes): two Simulator menu rows pointed at pages that do not exist. `sim_pm_pending_approval` and `sim_pm_submitted` are now `/simulator/pm/authorisation/queue` and `/simulator/pm/authorisation/submitted`. This also fixes today's sidebar.
- **Second audit run:** pm 17, pmo_oversight 66 still uncovered. v1460 had counted a page as covered when any role had a placement for it. `SQL/v1461_consolidated_menu_defaults_per_role.sql` checks coverage per role and applies the same default rules. The compact roles' remaining rows (board, executive, sponsor, stakeholder) are pages left out on purpose: expense approvals, approval chains, procurement and the like (proposal §6.9).
- **Audit B / C (2026-11-14):**
  - B: the unused Environments slot is switched off (`SQL/v1462`).
  - C: rewritten to count per app and per distinct page.
  - Owner decisions: six consolidated-only sub-menus and Benefits Review Plan shown once (`SQL/v1463`): Management Strategies, Project Reports, Agile Tools, ITTO, RAID Registers, My Work. A role gets a sub-menu only where it has two or more of its pages. Platform only; the Simulator's sections were not over the limit.
