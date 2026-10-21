# v1292 — PMO-managed PMO Configuration areas (PRD)

**Apps:** Platform (`public`) + Simulator (`sim`). Admin: not affected.
**Status:** Draft — awaiting owner approval.
**Related:** v982 Phase 2 (PMO Configuration landing page), v988 (`pmo_configuration_home` menu row), v1119 (`is_pmo_admin_or_owner_for_account`), v1290 (`auth_user_can_use_menu` grant-join pattern).

## a) Problem statement

The PMO Configuration page (`/platform/pmo-admin/configuration`, `/simulator/pmo/configuration`) is the organisation's guided entry point into its setup pages. Its list of areas (Delivery Methodology, Risk Categories, … AI Settings) is a hard-coded `CARDS` array in `PmoConfigurationHome.jsx`:

- A PMO cannot rename an area into their own vocabulary, re-describe it, change the order to match their setup sequence, or hide areas their organisation does not use.
- A PMO cannot add their own shortcuts (e.g. to a register they configure often).
- Because the list is code, it breaks CLAUDE.md rule 25.1 (no hard-coded user-facing structure) and any new area needs a code deploy.
- The list therefore only supports Open (View); there is nothing to Create, Edit or Delete.

## b) Solution

Move the area list into the database and let the organisation's PMO manage it:

- **Built-in areas** become system rows (seeded by SQL, `organisation_id IS NULL`). Each organisation can **rename, re-describe, reorder and hide/show** them through a per-organisation **overrides** table. Built-ins cannot be deleted; a **Reset to default** clears the organisation's override.
- **Custom entries** are organisation-owned rows with full **Create / Edit / Delete** (soft delete). A custom entry links to an **existing page picked from the app's menu**.
- The page keeps its existing Card/Table toggle, search, `#`, sort and export, and gains Edit / Delete / Move up / Move down / Hide / Show actions for managers.

## c) User stories

1. As a PMO Admin or Account Owner, I see Edit, Move up, Move down and Hide/Show actions on every area, and Delete on custom entries.
2. As any other user who can open the page, I see the same list read-only (Open action only).
3. As a manager, I can rename a built-in area and the new title shows for everyone in my organisation.
4. As a manager, I can change a built-in area's description.
5. As a manager, I can click Reset to default on a built-in area's Edit page (with confirmation) and it shows the system title/description again, including any later system wording updates.
6. As a manager, I can hide an area; it disappears from the list for my organisation's users.
7. As a manager, I can switch on a "Show hidden" filter to see hidden areas and Show them again.
8. Hiding an area does not block its page: it still opens from the sidebar or a direct link.
9. As a manager, I can Move up / Move down an area in Table view and the new order saves immediately.
10. The list opens in my organisation's chosen order; ties are ordered A→Z by title (approved exception to rule 40.1).
11. Clicking a column header sorts A→Z / Z→A; clearing the sort returns to my organisation's order.
12. As a manager, I can add a custom entry with a title, description and a page picked from a searchable list of menu pages I can see.
13. The page picker only lists pages for the current app (Platform pages in Platform, Simulator pages in Simulator).
14. A custom entry shows a standard icon and a "Custom" badge.
15. As a manager, I can edit a custom entry's title, description and page.
16. As a manager, I can delete a custom entry after confirming; it disappears everywhere but the row is kept for audit.
17. A custom entry's URL uses its display ID (e.g. `…/configuration/areas/PCA-0001/edit`); a built-in's URL uses its area code (e.g. `…/configuration/areas/risk_categories/edit`); UUIDs still resolve.
18. After every create / update / delete / reset / hide / show, a success confirmation shows the record's display ID or area code and the operation.
19. Leaving an Edit/Create page with unsaved changes asks me to confirm.
20. The Edit/Create page has an Audit details tab (Identity / Classification / Record history); on Create it says details appear after saving.
21. Another organisation's renames, order, hidden areas and custom entries never appear in mine.
22. Simulator has the same behaviour on its own list (sim schema, Simulator routes).
23. Export includes the visible list (title, description, built-in/custom, hidden state) in all export formats.
24. If loading fails, I see an error state, not a fallback hard-coded list.

**Menu links (rule 13 / rule 70)**

25. As a Simulator PMO Admin, I find **PMO Admin → PMO Configuration** in the sidebar (today the page `/simulator/pmo/configuration` has no sidebar link — v988 deferred it).
26. As an Account Owner on Platform, I see the existing **PMO Configuration** sidebar link (`pmo_configuration_home`, today granted only to `pmo_admin` / `system_admin`), because I can manage the list.
27. The AI Settings sidebar links stay as they are (`plat_acct_ai_settings`, `sim_pmo_admin_ai_settings`, v1280); the page's AI Settings area points to the same routes.
28. The Create / View / Edit area pages are reached from the PMO Configuration page (not separate sidebar leaves); while on them the sidebar keeps **PMO Configuration** highlighted and the Organisation zone tab stays active.
29. Every menu change is reflected in `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` in the same change.

## d) Implementation decisions (owner-approved 2026-10-20)

| # | Decision |
|---|----------|
| Q1 | Built-ins: rename, re-describe, reorder, hide/show — no delete. Custom entries: full CRUD. |
| Q2 | Custom entries link only to an existing page picked from `menu_items` (searchable dropdown, rule 69). No external URLs, no free-text paths. |
| Q3 | Managers = PMO Admin + Account Owner via `public.is_pmo_admin_or_owner_for_account`. Others read-only. |
| Q4 | Hide affects this list only; it does not change sidebar visibility or page access. |
| Q5 | Default order = organisation's order, tie-break A→Z by title. **Named exception to rule 40.1.** Column sort still overrides. |
| Q6 | Built-ins move into DB as system rows (SQL seed); per-organisation overrides table; organisation-owned custom rows. Same in `public` and `sim`. |
| Q7 | Reorder via Move up / Move down icon buttons in Table view, saved immediately. |
| Q8 | Custom entries: one standard icon + "Custom" badge. Built-ins keep their current icons (stored as an icon key; mapping key → lucide icon is UI chrome). |
| Q9 | "Reset to default" on a built-in's Edit page, with confirmation, deletes the organisation's override row. |
| Q10 | **Exempt from rule 37 (drafts) and rule 26 (bulk upload)** — three-field form, handful of rows. |
| Q11 | Custom entry delete = soft delete (`is_deleted`, `deleted_at`, `deleted_by`). |

Rule-driven (not separately decided):
- Create/Edit are routed pages (rule 65): `…/configuration/areas/create`, `…/configuration/areas/:key`, `…/configuration/areas/:key/edit`.
- Custom rows get `display_id` from Admin ID Generation (rule 16.2) — abbreviation **PCA**, rule seeded in `E:\project-nidus-admin\SQL\` for `public.pmo_configuration_areas` and `sim.pmo_configuration_areas`. Built-ins use stable `area_code` in URLs (rule 16.3).
- `useSuccessModal` (rule 16), `useUnsavedChangesGuard` (rule 52), Audit tab via `DetailAuditTabList` (rule 63.1), icon-only `RowActionButton` (rule 61), back button (rule 73), theme-aware (rule 28.1), `SelectField` for the page picker (rule 69).
- Tables registered in `database_tables`; RLS enabled; planner wall re-run (v1251).
- Menu links (menu-registry conventions): new `sim_pmo_admin_configuration` row (label "PMO Configuration", route `/simulator/pmo/configuration`) under the same live parent as `sim_pmo_admin_ai_settings`, grants copied from that AI Settings leaf; `account_owner` grant added to `pmo_configuration_home`; matching `packages/config/src/menuRegistry.js` entries (`roles` include `account_owner`); sidebar cache version bumped (`SIDEBAR_CACHE_VERSION` 133 → 134) so users see the change without clearing storage; rollback SQL provided.

## e) Testing decisions

- **SQL test script** (`v1292_…_tests.sql`): resolution (system + override + custom), hide/show, reset, move up/down at list edges, soft delete, cross-organisation isolation, non-manager write rejected, display ID assigned on custom insert.
- **Service unit tests** (Vitest, mocked Supabase): list/get/create/update/delete/move/hide/reset call the right RPC with the right args and surface errors (no fallback data).
- **Pure helper unit tests**: effective-row resolution and order/tie-break sorting; key detection (area code vs display ID vs UUID).
- **Component tests**: manager vs read-only actions; hidden filter; Move up disabled on first row / Move down on last; Custom badge.
- Done = all above green in both apps + manual light/dark check + Platform/Simulator parity diff reviewed.

## f) Out of scope

- Hiding areas from the sidebar or blocking pages (Q4).
- External links / free-text paths (Q2).
- Icon picker for custom entries (Q8).
- Drafts/hold queue and bulk upload (Q10).
- Drag-and-drop reordering (Q7).
- Admin app UI for managing system rows (system rows change by SQL seed).
- Translating area titles (current page is English-only).

## g) Further notes

- The current Simulator list differs from Platform (no Templates → industry templates; Reference Data → project types; methodology → PMO dashboard). Seeds reproduce each app's current list exactly, including the v1292 AI Settings card.
- A new built-in area in future = one idempotent seed row per schema; no code change.
- Rule 70: the taxonomy gets the new Simulator PMO Admin → PMO Configuration leaf and the Level 4 sub-pages (areas create/view/edit) under PMO Configuration in both apps.
- The custom-entry page picker lists only menu pages the signed-in manager can see (same active-grant join as `auth_user_can_use_menu`, v1290, but `can_view`), filtered to the current app (`sim_` codes / `/simulator/` routes for Simulator). A custom entry whose menu page is later deactivated shows "Page no longer available" and no Open action until a manager edits it.
