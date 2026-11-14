# v1341 — Consolidated Role Menus (one sidebar per role) (PRD)

> **Status:** Approved 2026-11-13 (D1–D30). **Implemented 2026-11-13** — code complete; SQL v1449–v1459 + Admin v249 written, not run (owner runs). Every organisation keeps today's sidebar until the switch is turned on in Admin. See the plan Review.
>
> **Apps:** Platform + Simulator (rule 34.1). Admin: placement maintenance screens only (rule 34.2). Project Planner (`pln_` menus) is out of scope.
>
> **Design source:** `Documentation/Consolidated_Role_Menus_Proposal.md` (Revision 3) holds the full role menu trees, placement maps and worked examples. This PRD does not repeat the trees; it fixes the requirements and decisions.
>
> **Supersedes:** the presentation part of `projectprd/v930_pack_grouped_sidebar_menu_PRD.md` (the "Core Project Management" + one-section-per-industry grouping). **Keeps:** `projectprd/v931_industry_capability_modules_PRD.md` (organisation-level capability switch-off) and the organisation availability filter (v918 / v924 / v1249).
>
> **Rules applied:** 25.1 (menus from data), 34.1 (parity), 62 (simplicity), 70 and 75 (catalogue + placement), taxonomy §16 (reuse) and §17 (depth).

---

## a) Problem statement

The sidebar shows **separate blocks**: "Core Project Management", then one block per enabled industry pack (v930). For a SaaS product with little or no training this causes four problems:

1. **Users have to know where a feature came from.** A Project Manager on a core banking project must decide whether Data Migration, Testing or Cutover is in the core block or the Banking block. Some features appear in **both** (Testing, Environments, Interfaces), with different pages behind them.
2. **The menu grows with every industry.** Organisation-wide roles see one more block per industry the organisation picks. Project-scoped roles are already narrowed to the open project's industries, but composite projects (e.g. a Core Banking System replacement tagged Banking + IT) still show two industry blocks next to core.
3. **Every role sees the same structure.** Team Members and governance roles get a cut-down version of the PM tree, not a menu designed around their work.
4. **Project Setup is long and nested** (13 items + 2 sub-menus), and settings pages sit next to initiation documents.

There is also no data model for "where an item appears for a role". Placement is implied by `parent_menu_id` and transforms in `useMenu.js`, which is why every menu change risks breaking the layout.

## b) Solution

**One consolidated menu per role, generated from data.**

- **Nine work-based sections, the same for every role:** Home · Project Setup · Scope & Requirements · Plan & Schedule · Deliver & Test · Risks, Changes & Governance · Stakeholders & Adoption · Readiness, Benefits & Close · Money & Resources. Footer: Reports · Documents.
- **Industry items sit inside those sections**, never in an industry block. Items that mean the same thing across packs share one slot (Interfaces, Environments, Data & Migration, Operational Readiness, Cutover, Go-Live & Hypercare, Compliance, Health & Safety). Industry items that extend a core capability become tabs or filters on the core page.
- **Two data layers** (rule 75):
  - the **catalogue** (`menu_items` + `industry_pack_menu_items` + `role_menu_items`) says what exists, which industry it belongs to, and who may see it. This is unchanged.
  - a new **placement** layer says which section, and in which order, each item appears for each role layout or profile.
- **Industry visibility per project:** the open project's industries (all rows in `project_industries`) decide which packs show. The **primary industry** leads naming and tab order on merged pages. The PM can switch off industry items the project does not need.
- **Rollout behind a single switch** (D11): every role's menu is built and tested first, then all roles move to the new sidebar together.

## c) User stories

**Project Manager**
1. As a PM, I see one sidebar with nine sections and no separate "Core" or industry blocks.
2. As a PM on a Banking project, I find Data Migration under Deliver & Test and Cutover under Readiness, Benefits & Close, next to the core pages for the same stage of work.
3. As a PM on a Banking project, I see one Testing menu entry. It opens the core Testing page, and a tab strip (D23) above it switches between the core Testing page and the Banking testing pages (SIT, UAT, Regression, Performance, Security, DR), not a core Testing menu plus a Banking Testing menu.
4. As a PM on a Construction project in the same organisation, I see no Banking items, and vice versa.
5. As a PM on a composite project (Banking ★ + IT), I see one merged menu: shared slots appear once, and their tab strip (D23) lists the existing pages of both packs, Banking tabs first.
6. As a PM, I find every setup page in Project Setup: Project Details, Mandate, Brief / Charter, Business Case, PID, Benefits Review Plan, Project Team, Governance Setup and Project Settings.
7. As a PM, Project Team, Governance Setup and Project Settings are sub-menus inside Project Setup. Project Settings holds Regional & Format, Working Days & Holidays, Timesheet Settings, Document Signatory, Environments and Custom Fields.
8. As a PM, I can switch off an industry item that is out of scope for my project (Project Settings → Industry Modules), and it disappears for everyone on that project.
9. As a PM, switching an item back on restores it with all its data.
10. As a PM, when I add or remove an industry on the project, the menu changes at the next page load and no records are deleted.
11. As a PM, no section shows more than about 12 pages; if industry pages would exceed that, they group under one tabbed page.
12. As a PM, sections with nothing in them are hidden.

**Team Lead / Team Manager**
13. As a Team Lead, I see the same nine sections, with the items placed for the team layout (fewer than the PM layout). Page content is not filtered by this change.
14. As a Team Lead, industry items appear when the open project has that industry **and** the item has a team-layout placement (D24). The menu does not check which work my team is assigned.
15. As a Team Manager, I get the same team-scoped menu as a Team Lead.

**Team Member**
16. As a Team Member, I see at most five sections built around my work: Home, a Team Directory under Project Setup, Deliver & Test (my tests, defects and industry work), Risks, Changes & Governance (raise items, my actions), and Readiness if I have assigned activities.
17. As a Team Member, I never see which pack an item came from.

**Programme, Portfolio, PMO**
18. As a Programme Manager, I see the same skeleton with Programme Setup and roll-up pages across the programme's projects.
19. As a Portfolio Manager, I see the same skeleton with Portfolio Setup, Intake & Pipeline and roll-ups. Industry appears only as a dashboard filter.
20. As a PMO Admin, I keep the Oversight and Organisation zones. The methodology track headers ([S] / [P] / [A]) leave the sidebar and stay in the methodology switcher.
21. As a PMO Admin, the organisation capability switch-off (v931) still works and applies before any project switch-off.

**Governance profiles**
22. As an Executive, Sponsor, Board Member, Project Assurance, Quality Assurance, Change Authority, Stakeholder or Viewer, I see a compact menu with only what I decide or watch.
23. As a governance user, a project's industries add nothing to my menu unless an item is placed for my profile.

**Product team / developers (rule 75)**
24. As a developer adding a menu item, I add it to the catalogue and give it placement rows; I never edit a consolidated tree.
25. As a developer, if I forget a placement, the item lands in its industry group's default section instead of disappearing.
26. As a developer, an audit query lists every active menu item that has no placement for any role layout.
27. As a product owner, I can change an item's section or order in Admin without a code deploy.

**Everyone**
28. As any user, I can search for a page by name ("Go to page") and open it; the results are exactly the pages in my current sidebar, never switched-off or hidden items (D22). The existing record search (`search_index`) keeps working unchanged.
29. As any user, routes, bookmarks and permissions are unchanged; only the sidebar changes.
30. As any user, Platform and the Simulator practice menus use the same sections.
31. As any user, while my organisation's switch is off, I keep today's sidebar; when it is turned on, every role in my organisation moves to the new sidebar at the same time.

**Added by Amendment A**
32. As a user with different roles on different projects (PM on A, Team Member on B), my sidebar follows my role on the **open project** and changes when I switch project (D26).
33. As a project-scoped user with no project open (first login, landing page, no assigned project), I see Home and a project picker, not an empty or PM-sized menu (D27).
34. As a user with a custom organisation role (v902), I get the layout the role is based on (D25), limited to the role's grants.
35. As a PMO Admin, organisation-level industry pages (libraries, templates, reference registers) stay reachable in the Organisation zone even though project-scoped industry items are hidden outside a project (D28).
36. As any user, the breadcrumb and the highlighted sidebar item follow the new section, not the item's old catalogue parent (R4).
37. As any user, my sidebar updates without signing out when I switch project, when the project's industries change, when an industry item is switched off or on, when my organisation's switch is flipped, or when Admin changes a placement (R5).
38. As a PM, switching an industry item off or on shows the success confirmation (rule 16), and the Industry Modules page shows who switched each item and when (R3).
39. As a PMO Admin, the organisation's Industry Modules page lists items already switched off at organisation level as locked (v931 applies first).
40. As a product owner, I turn the new sidebar on for all organisations at once, and can turn it off again for any single organisation to restore its old sidebar (D20, D30).
41. As a product owner, section names and order come from the database, so renaming a section needs no deploy (D29).
42. As a Simulator user, my practice sidebar is built by the Simulator's own menu builder (`useSimMenu`) with the same sections, and no placement points at a Simulator route that is not mounted.

## d) Implementation decisions

Recommendations from the design proposal, confirmed or changed one at a time in the owner interview (2026-11-13). Three decisions were changed by the owner: **D11** (all roles at once behind one switch), **D13 / D13b** (Project Setup groups stay as sub-menus), and **D17** (no limit on industries per project).

| # | Decision | Recommendation | Owner |
|---|---|---|---|
| D1 | Section skeleton | The 9 sections in §b, same order for every role | **Confirmed** (2026-11-13) |
| D2 | Which industries show on a project | The open project's industries (all `project_industries` rows) | **Confirmed** (2026-11-13) |
| D3 | Pages outside a project | Core only, plus an industry filter on PMO and Portfolio dashboards | **Confirmed** (2026-11-13) |
| D4 | Overlapping features across packs | Shared slots (proposal §4) | **Confirmed** (2026-11-13) |
| D5 | Compliance | One Compliance page in Section 6: organisation policies + project regulatory tabs | **Confirmed** (2026-11-13) |
| D6 | Mark industry items visually | No marker; industry name only in search results | **Confirmed** (2026-11-13) |
| D7 | Team Manager menu | Team-scoped menu, same as Team Lead | **Confirmed** (2026-11-13) |
| D8 | Governance profiles | Explicit placement rows per profile (replace keyword filtering in `filterMenuByPmProfile`) | **Confirmed** (2026-11-13) |
| D9 | PMO methodology track headers | Switcher only | **Confirmed** (2026-11-13) |
| D10 | Placement storage | New placement table (menu item × role layout / profile → section + order); do not re-parent `menu_items` | **Confirmed** (2026-11-13) |
| D11 | Rollout | One role at a time behind a switch: PM → Team Lead / Manager → Team Member → governance profiles → PMO | **Changed by owner** (2026-11-13): **all roles at once, behind a single switch.** Every role's placements are built and tested before the switch is turned on; with the switch off, every role keeps today's sidebar. |
| D12 | Simulator parity | Same skeleton for the Practice menus | **Confirmed** (2026-11-13): same 9 sections and placement rules, built in the same change |
| D13 | Project Setup | One Project Setup section; Project Team, Governance Setup and Project Settings become tabbed pages | **Changed by owner** (2026-11-13): one Project Setup section; **Project Team and Governance Setup stay as sub-menus** (Level 3 in the sidebar, as today). **D13b:** the settings pages become a **Project Settings sub-menu**: Regional & Format, Working Days & Holidays, Timesheet Settings, Document Signatory, Environments, Custom Fields, plus Industry Modules (D16). No tab containers are built. |
| D14 | Section over ~12 pages | Group that section's industry pages under one tabbed page, only when exceeded | **Confirmed** (2026-11-13). Sub-menu items count toward the limit only as their parent (one item). |
| D15 | Composite projects: who leads naming / tab order | The project's primary industry (`project_industries.is_primary`); if none, the first added | **Confirmed** (2026-11-13) |
| D16 | Per-project switch-off | Allowed (Project Settings → Industry Modules), hides only | **Confirmed** (2026-11-13). Industry Modules is a seventh item in the Project Settings sub-menu. |
| D17 | Maximum industries per project | Up to 3 (one primary + two secondary) | **Changed by owner** (2026-11-13): **no limit.** Section overflow is handled by D14 (industry pages group under one tabbed page when a section exceeds ~12 pages), and naming/tab order by D15. |
| D18 | Project with **no** industry | Core only. Today the sidebar falls back to all organisation industries; the recommendation is to stop that fallback, so an untagged project is never cluttered. | **Confirmed** (2026-11-13) |
| D19 | Who can switch industry items off per project | Project Manager and PMO Admin | **Confirmed** (2026-11-13) |
| D20 | Where the rollout switch lives | Per account, set by Admin (so a pilot organisation can go first) | **Confirmed** (2026-11-13). One switch per organisation covers all roles (D11). |
| D21 | Admin placement screen | In the Admin app's existing menu management area; Platform and Simulator never write placements | **Confirmed** (2026-11-13). Placements are seeded by SQL until the screen exists. |
| D22 | Page search (story 28 vs §f) | Drop page search from this change; global record search stays as is. Page search with "switched off" notes is a later enhancement | **Changed by owner** (2026-11-13): **include page search, without switched-off items.** A "Go to page" search over the pages currently in the user's consolidated sidebar (same items, same permissions); switched-off and hidden items are not listed. Record search is unchanged. |
| D23 | What a shared slot opens | One generic shared-slot page (one shared component in `@nidus/ui`, routed per slot) that shows the **existing** pages of each contributing pack as tabs, primary industry first. With one contributor, the menu entry opens that page directly. No existing page is rebuilt. The plan lists every slot and its contributing pages | **Changed by owner** (2026-11-13, plan audit): **tab strip on the existing pages.** The slot's single sidebar entry opens its first member (core page, then primary industry). While any member route is open, a shared tab strip (`MenuSlotTabStrip`, `@nidus/ui`) above the page lists every visible member; each tab navigates to that member's own route. No slot route, no page embedded in another, no page rebuilt; bookmarks and Back keep working. With one member, no tab strip. |
| D24 | Team layouts and "my team's work" | Menu-only: team layouts use team placements plus the project-industry filter. No check of team assignments (content scoping stays out of scope) | **Confirmed** (2026-11-13) |
| D25 | Custom organisation roles (v902) and menu bundles (v914) | Each custom role gets a "menu based on" layout (PM, Team Lead, Team Member or a governance profile), chosen in Manage Roles; default derived from its grants (has project-setup grants → PM, otherwise Team Member). Grants still limit what shows | **Confirmed** (2026-11-13) |
| D26 | User with different roles on different projects | Layout follows the user's role on the open project; recomputed on project switch | **Confirmed** (2026-11-13) |
| D27 | Project-scoped role with no project open | Home section only, plus the project picker | **Confirmed** (2026-11-13) |
| D28 | Organisation-level industry pages | Placement scope "organisation": shown in the PMO Organisation zone (and Portfolio where relevant), filtered by the organisation's industries; hidden for project-scoped roles outside a project | **Confirmed** (2026-11-13) |
| D29 | Section definitions | New sections table (code, label, icon, order, per app), seeded with the 9 sections + footer; React never lists sections | **Confirmed** (2026-11-13) |
| D30 | Go-live order | Turn the switch on first for an internal test organisation (role smoke tests, §e), then one pilot customer organisation, then the rest | **Changed by owner** (2026-11-13): **all organisations at once**, as soon as slice 10 passes. The per-organisation switch (D20) stays as the rollback lever: turning it off for an organisation restores today's sidebar. |

### Requirements added by Amendment A

- **R1 — Admin write exception (rule 34.5).** Admin writes the placement table, the sections table and the per-account rollout switch only through named `public.admin_*` SECURITY DEFINER RPCs, gated by an Admin permission (e.g. `system.menu_placement.edit`), reason required, audited. CLAUDE.md rule 34.5 gets a new narrow-exception bullet in the same change; no client write policies on those tables.
- **R2 — New-table checklist.** For each new table (placements, sections, per-project switch-off, rollout switch if not a column): DDL + RLS, `database_tables` row, Planner wall re-run (`SQL/v1251_planner_table_wall.sql`) for new `public` tables, and a `sim` per-project switch-off table keyed to practice projects (D12 parity). No display-ID column, so no Admin ID Generation rule.
- **R3 — Industry Modules page.** Lists the project's industry items with on/off toggles; success confirmation modal on save (rule 16); who and when per item (Audit details, rule 63.1); items switched off by the organisation shown locked; switch-off only hides menu entries and never changes records. Both apps.
- **R4 — Breadcrumbs and active item.** Breadcrumbs, page titles and the active sidebar highlight resolve from the placement (section → item), not from `parent_menu_id`, when the switch is on.
- **R5 — Menu cache invalidation.** The `useMenu` / `useSimMenu` caches (`localStorage` / `sessionStorage`) are cleared or keyed so the menu rebuilds on: project switch, project industry change, per-project switch-off change, organisation switch change, placement or section change (a placement version stamp read with the menu).
- **R6 — Performance (rule 66).** Placements, sections and project switch-offs load in parallel with the existing menu queries and are cached with the R5 invalidation; the menu build must not add a sequential round trip.
- **R7 — Rule 75 wording.** Slice 10 updates CLAUDE.md rule 75 ("until the placement layer exists … still pre-PRD") to describe the live placement layer and the Admin screen.
- **R8 — Simulator route check.** The Simulator placement seed only places `sim_` items whose route is mounted in `simulatorRoutes.jsx` (a query or script check, like the v1440 strict route check).

## e) Testing decisions

**Seams**
- **Pure functions** (unit tests, `packages/config` / `packages/shared`):
  - build sections from placements;
  - merge shared slots and order their tabs by primary industry;
  - group industry pages when a section exceeds its limit;
  - hide empty sections;
  - default placement when a placement is missing;
  - project-industry filter, covering a single industry, composite projects, no industry (D18), switch-off, and the organisation capability switch-off applied first.
- **`useMenu` integration** (both apps): switch off → today's sidebar unchanged; switch on → consolidated sidebar; project change → menu regroups; composite project → merged slots.
- **SQL:**
  - the placement seed covers every active Core PM and industry menu item for the PM layout;
  - an audit query returns active items with no placement;
  - RLS on the new tables (read for authenticated users, writes only through the Admin RPC and the project switch-off RPC).
- **Parity:** the same unit suites run against the Simulator copies; the Practice menus produce the same sections.
- **Manual / e2e smoke per role:** PM (FIN project, CON project, FIN + ICT composite, untagged project), Team Lead, Team Member, Executive, PMO, in light and dark themes and on mobile (PWA drawer).
- **Added by Amendment A:**
  - unit tests for layout resolution: role on the open project (D26), no project open (D27), custom role "based on" layout and its default (D25);
  - slot tab strip: one member shows no strip; two members show a strip, primary first, each tab the member's own route (D23);
  - cache: each R5 trigger rebuilds the menu;
  - breadcrumb and active item follow the placement (R4);
  - Simulator tests run against `useSimMenu`, not only `useMenu`;
  - SQL check that no Simulator placement points at an unmounted route (R8);
  - go-live (D30, all organisations at once): the role smoke tests run with the switch on in the test environment before go-live; after go-live, a short check with a few PMs (can they find Testing, Cutover, Project Settings without help), with the per-organisation switch as the rollback.

**Done means**
- Every story in §c is demonstrable with the switch on.
- With the switch off, the sidebar is identical to today (snapshot test).
- The audit query returns no unplaced active items for roles whose switch is on.
- Taxonomy placement tags and proposal placement tables match the seeded placements (rules 70 and 75).

## f) Out of scope

- Changing routes, page content, permissions or RLS (menu visibility is not security).
- Rebuilding any page, and tab containers for Project Setup (D13 / D13b keep sub-menus). The only new UI is the slot tab strip (D23, a strip above existing pages, not a page), the D14 industry grouping (built only if a section exceeds its limit) and the Industry Modules settings page (R3).
- Searching switched-off or hidden pages (D22: page search lists only the current sidebar's pages).
- Filtering page content by team assignment (D24).
- The Admin app's own sidebar.
- The Project Planner product (`pln_` menus).
- New industry packs or new industry pages; this change only places existing ones.
- Per-user menu customisation (favourites and pinning are a later enhancement; page search is in scope per D22).
- Retiring the taxonomy document; it stays the catalogue.

## g) Further notes

- **Existing code to reuse or replace:**
  - `groupMenuTreeByIndustryPack` (`packages/config/src/pmoMenuHierarchyUtils.js`) is replaced by the placement-based regroup;
  - `getMenuItemIndustryPackMap` and `getProjectIndustryCategoryIds` (`apps/*/src/services/organisationIndustryService.js`) are reused;
  - `applyRoleSidebarRevamp` / `buildSidebarPresentation` in `apps/*/src/lib/useMenu.js` gain the new step behind the switch;
  - `get_account_available_menu_item_ids` and `organisation_disabled_capabilities` are unchanged.
- **Schema facts already in place:**
  - `public.project_industries` and `sim.practice_project_industries` already have `is_primary`, with at most one primary per project (v1112 / v1113);
  - organisation switch-off is `organisation_disabled_capabilities` (v920).
  - A per-project switch-off table would mirror it, keyed by project.
- **Proposed tracer-bullet slices** (detailed in the plan after approval). All slices ship with the single switch off (D11). The switch is turned on only after slice 10 passes:
  1. Placement table, seed for the PM layout, and the regroup step behind the switch, using one Banking project end to end.
  2. Project-industry rules: composite, primary, no industry, section limit.
  3. Project Setup sub-menus: Project Team, Governance Setup and Project Settings (Level 3 placements; no tab containers, D13 / D13b).
  4. Per-project Industry Modules switch-off.
  5. Team Lead / Manager and Team Member layouts.
  6. Governance profiles.
  7. PMO layout.
  8. Simulator Practice menus.
  9. Admin placement screen (with the R1 Admin RPCs and rule 34.5 exception).
  10. Audit query, documentation and rule wording for the "database is the source of truth" phase (R7).

  Amendment A folds its items into those slices: sections table (D29) and cache/performance (R5, R6) in slice 1; slot tab strip (D23) in slice 3; breadcrumbs (R4) in slice 1; Industry Modules page details (R3) in slice 4; layout resolution (D25–D27) in slice 5; organisation-level industry pages (D28) in slice 7; Simulator route check (R8) in slice 8; page search (D22) in slice 1; go-live for all organisations (D30) after slice 10.
- **Documentation:** after go-live, the proposal becomes the generated *Sidebar Placement Guide* (rules 70 and 75, Phase 3).
- **ROADMAP:** update only if this changes active priorities (decided at plan approval).
