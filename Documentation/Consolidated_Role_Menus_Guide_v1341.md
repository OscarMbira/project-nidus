# Consolidated role menus — how the sidebar is built (v1341)

**Introduced:** monorepo SQL `v1449`–`v1459`, Admin SQL `v249`. PRD `projectprd/v1341_consolidated_role_menus_PRD.md`, plan `projectplan/v1341_consolidated_role_menus_plan.md`.

## What users see

With their organisation's switch on, every role gets **one sidebar** with the same sections, in the same order:

Home · Project Setup · Scope & Requirements · Plan & Schedule · Deliver & Test · Risks, Changes & Governance · Stakeholders & Adoption · Readiness, Benefits & Close · Money & Resources · Reports & Documents (footer).

PMO users also get an **Organisation** section (configuration, templates, users, reference data).

Sections with nothing in them are hidden. There are no separate "Core Project Management" or industry blocks:

- **Industry pages sit inside the same sections as core pages.** On a Banking project, Cutover appears under Readiness, Benefits & Close.
- **Only the open project's industries show** (`project_industries`). A project with no industry shows core pages only. Outside a project, project-level industry pages are hidden; the PMO and Portfolio dashboards have a "Projects by industry" panel instead.
- **Shared slots:** pages that mean the same thing across industries share one entry.
  - When every member is a single page (e.g. Interfaces on a Banking + IT project), the entry opens the first page. A tab strip above the page switches between the members, primary industry first, and each tab opens that page's own address.
  - When members are groups of pages (e.g. Cutover), the entry becomes one sub-menu with all their pages.
- **Section limit:** when a section has more than 12 entries, its industry pages are grouped under one entry (e.g. "Industry delivery").
- **Go to page:** a search box at the top of the sidebar finds any page in the user's sidebar, showing its section and industry. Switched-off and hidden pages are not listed.
- **Industry Modules** (Project Setup › Project Settings): the Project Manager or a PMO Admin can switch off industry pages a project does not need. In the Simulator, the practice project's owner can. Switched-off pages disappear for everyone on the project. No records are deleted, and switching a page back on restores it.

With the switch off, the sidebar is exactly as before.

## Which menu a user gets

| Role (on the open project) | Placement key |
|---|---|
| Project Manager | `pm` |
| Team Lead, Team Manager | `team` |
| Team Member | `team_member` |
| Programme Manager / Portfolio Manager | `programme` / `portfolio` |
| PMO Admin, Account Owner, Org Admin | `pmo_oversight` |
| Executive, Sponsor, Board Member, Project Assurance, Quality Assurance, Change Authority, Stakeholder, Viewer | `executive`, `sponsor`, `board`, `assurance`, `qa`, `change_authority`, `stakeholder`, `viewer` |
| Custom organisation role | its **Menu based on** setting (Manage Roles) |

- **Different roles on different projects:** the user's role on the **open project** decides the key. With several roles, the widest key wins (PMO, then Portfolio, Programme, PM, Team, Team Member, then the governance profiles).
- **No project open:** a project-scoped user sees the Home section only. Home includes the project list.
- **Grants still apply:** role grants (`role_menu_items`) and the organisation's industry availability still decide what a user can see. Placements only decide where it appears.
- **Compact menus:** Team Member and the governance profiles show only pages placed for them. The other keys also use default sections (below).

## Data

| Table | Meaning |
|---|---|
| `menu_sections` | Sections per app (label, icon, order, footer, industry group label). Rename here, with no deploy. |
| `menu_slots` | Shared slots (label, section, order). |
| `menu_item_placements` | One row per menu item × placement key: section, optional sub-menu parent, optional slot, order, scope (`project` or `organisation`). |
| `menu_items.default_section_code` | Where an item and its unplaced pages fall back to when a full-menu role has no placement for it. |
| `menu_placement_version` | Bumped by every placement change; sidebars refresh their cache when it changes. |
| `account_menu_settings` | The per-organisation switch. |
| `project_disabled_menu_items`, `sim.practice_project_disabled_menu_items`, `project_menu_item_switch_log` | Industry Modules switch-offs and their history. |

Catalogue rows that must not appear in today's sidebar are created with `is_visible = FALSE`. Examples are `plat_pm_project_settings` and `plat_pm_industry_modules`. They appear only where a placement puts them.

## Adding a menu item (rule 75)

1. **Check it is genuinely new.** If it is really a filter or tab of an existing page, add that instead.
2. **Add the catalogue row**, its role grants, and the industry pack link for industry items.
3. **Place it** for every role that should see it: at least `pm`, plus `team` / `team_member` where teams work on it. Put the placement in the same SQL file, or use Admin › System › Menu Placements.
4. **Update the taxonomy** (rule 70).
5. **Run `SQL/v1452_consolidated_menu_audit_query.sql`.**
   - Result set A must be empty: no granted page left without a placement or default section.
   - Export result set E and run `node scripts/check-sim-placement-routes.mjs <file.csv>` to check that every Simulator placement points at a mounted route.

## Admin

- **System › Menu Placements:** placements per role, add / edit / remove, and **Turn on for all organisations** / **Turn off for all**. Turning it on for everyone is the go-live step.
- **System › Menu Sections & Slots:** rename and reorder sections and slots, per app.
- **Organisations list:** the "Single sidebar" column and a per-organisation on / off action. Turning it off for one organisation is the rollback.

Every write asks for a reason and is audited.

## Code

- **Engine (pure, unit-tested):** `packages/config/src/consolidatedMenu.js`.
- **Data loading:** `packages/shared/src/utils/consolidatedMenuData.js`. It uses a cached switch and placements cached per version, and loads in parallel.
- **Step used by `useMenu` (both apps):** `packages/shared/src/utils/consolidatedMenuStep.js`. The practice menus build the same way in `apps/simulator/src/lib/useSimMenu.js`.
- **UI** (`@nidus/ui`):
  - `MenuSlotTabStrip` (mounted in the app layouts);
  - `MenuPageSearch` (sidebar);
  - `IndustryModulesScreen` / `IndustryModulesPanel`;
  - `IndustryProjectsFilter` (PMO and Portfolio dashboards).
- **Extras store:** `@nidus/shared/hooks/useConsolidatedMenu`. The slot tab strip and the search read it.
