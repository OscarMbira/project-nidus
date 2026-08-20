# PM Organisational Templates — top-level sidebar (v843)

## Change

The PM sidebar item formerly labelled **Templates** under **Projects** is now a top-level row:

- **Label:** from `public.menu_items.menu_label` for `plat_pm_templates` (v843 sets **Organizational Templates**)  
- **Code:** `plat_pm_templates`  
- **Route:** `/platform/templates` (still redirects to `/platform/templates/organisational` with the current project context)

Sidebar text is **not** hardcoded in the client for this item: `useMenu` loads `menu_label` from the DB. Client presentation helpers only fill shells when the label is missing or equals the menu code.

## Why

Templates are organisation/project-tier artefacts, not a Projects CRUD sub-feature. Nesting them under Projects made the library hard to find and implied they were project-list tooling.

## Apply

1. Run `SQL/v843_pm_organisational_templates_top_level_menu.sql` on Supabase.
2. Hard-refresh the Platform app (sidebar cache version bumped to **41**).

## Client safeguards

Even before the SQL reparent lands, hierarchy sanitisation pulls `plat_pm_templates` out of the Projects accordion and promotes it to its own universal category so it does not disappear from the tree.
