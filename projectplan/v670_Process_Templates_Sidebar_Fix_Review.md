# v670 Process Templates Sidebar Fix — Review

## Problem
Process Templates top-level category disappeared entirely from the PMO sidebar.

## Root causes
1. **Empty category pruned** — `Sidebar.jsx` removes section headers with no children; PT bucket was empty.
2. **Misrouting** — `pmo_pt_roadmap`, `pmo_pt_story_map`, etc. matched portfolio/delivery/reporting rules before PT classification.
3. **Lost DB grants** — v669 deactivated legacy `template_library_*` rows without guaranteed `pmo_pt_*` grants for all roles.
4. **Shallow section extraction** — PT section children only collected from top-level baseline nodes.

## Fixes applied

### Frontend (`useMenu.js` v37 cache)
- PT classification **first** in `matchCategory` via `isPmoProcessTemplateMenuCode`.
- Portfolio/`/platform/templates` rules exclude `pmo_pt_*` codes.
- Recursive baseline walk for `pmo_process_templates_section` children.
- `injectPtItemsFromBaselineTree()` — pulls all granted `pmo_pt_*` from DB hierarchy.
- `relocateMisplacedProcessTemplateItems()` — scans **all** category buckets, not just Projects.
- Shared constants in `src/config/processTemplatesMenuCodes.js`.

### SQL (`v670_process_templates_grants_restore.sql`)
- Reactivates full `pmo_pt_*` tree.
- Grants to `pmo_admin`, `system_admin`, `super_admin`.
- Mirrors legacy `template_library_*` grants → canonical `pmo_pt_*` equivalents.

## Deployment
Run on Supabase (in order if not already applied):
1. `v666_process_templates_sidebar_menu.sql`
2. `v668_process_templates_matchcategory_fix_grants.sql`
3. `v669_process_templates_menu_structure.sql`
4. **`v670_process_templates_grants_restore.sql`**

Then hard refresh the browser (clears menu cache **v38**).

## v38 follow-up — “Menu unavailable: Bad Request”
- **Cause:** PostgREST 400 when `.in('id', …)` included too many menu UUIDs in one URL (common after v670 grant expansion).
- **Fix:** `fetchMenuFromDB` now batches `menu_items` and `role_menu_items` queries (chunks of 80/40), tracks attempted parent IDs to avoid infinite parent hydration loops, skips double `applyRoleSidebarRevamp` on cached PMO menus, and wraps transform errors gracefully.

## Expected sidebar (Process Templates)
- Hub Overview, Pre-Project, Initiating, Planning, Executing, Monitoring & Controlling, Closing
- Browse / Manage / New Template
- **Agile** (nested): Product Backlog, Sprint Planning, Agile Templates, Story Map, Sprint Metrics, Releases, Roadmap
- Industry Templates, Add Industry Template, Template Drafts

## Tests
- `npm run validate:menus` — pass
- `src/config/__tests__/processTemplatesMenuCodes.test.js` — pass
