# Forms / Templates submenu split (v851)

## Purpose
Split **Organizational Templates** and **Project Templates** into sidebar children:

- **Templates** — node-fork domains (`process_template`, `fields`, `opa`, level templates, …)
- **Forms** — `form_template` only

This matches the architecture line from v849/v850: process documents vs multi-instance forms.

## URL contract
| Query | Effect |
|-------|--------|
| *(none)* | All domains (parent click — unchanged) |
| `?domainGroup=templates` | Exclude `form_template` |
| `?domainGroup=forms` | Only `form_template` |
| `?domain=process_template` | Exact domain filter (existing deep-links still work) |

When `domainGroup` is active, the in-page Domain dropdown is hidden; the page title gains ` — Forms` or ` — Templates`.

## SQL
1. `SQL/v851_pm_templates_forms_submenu.sql` — Organizational Templates + Project Templates
2. `SQL/v852_template_library_forms_submenu.sql` — Global **Template Library** (same Forms / Templates split)

## Code
- Filter helpers: `packages/shared/src/utils/templateDomainGroup.js` (+ shell mirrors under `apps/*/src/utils/`)
- Pages: `OrganisationalTemplatesPage.jsx`, `TemplateLibraryPage.jsx` (pmo-module + sim-pmo-module)
- **Sidebar hierarchy:** `collapsePmNavigableCategoryToLeaf` must keep
  `plat_pm_*_templates` / `*_forms` children (otherwise PM layout strips them even when SQL is applied)

## If chevrons / submenus are still missing
1. Confirm SQL ran:
   - PM: `plat_pm_project_templates_forms`, `plat_pm_templates_forms`, …
   - PMO Template Library: `plat_tpl_library_templates`, `plat_tpl_library_forms` (v852)
2. Hard-refresh / re-login (menu cache).
3. Ensure hierarchy + Sidebar fixes are in the running build (not only SQL):
   - **PM layout:** `collapsePmNavigableCategoryToLeaf` keeps Forms/Templates children.
   - **PMO Template Library:** `classifyProjectDeliveryChild` must not treat domainGroup
     `Forms` leaves as “Forms & Documents” (that moved them into Workflows). Flat siblings
     are re-attached under `plat_tpl_library` / `plat_tpl_organisational`.
   - **Sidebar:** nested navigable parents (Template Library under Portfolio & Delivery)
     auto-expand when the parent route is active — click the row, not only the chevron.
