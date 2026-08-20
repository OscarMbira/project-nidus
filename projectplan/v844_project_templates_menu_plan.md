# Plan: Project Templates menu + list (v844)

**PRD:** `projectprd/v844_project_templates_menu_PRD.md`  
**Status:** In progress

## Todos
- [x] PRD
- [x] `OrganisationalTemplatesPage` `listVariant` (platform + sim modules)
- [x] Routes + entry redirect with project entity query
- [x] SQL `v844_pm_project_templates_menu.sql` + hierarchy/cache
- [x] Unit test for scoped filtering
- [x] Docs + review

## Review
- Added PM **Project Templates** menu (`plat_pm_project_templates` → `/platform/templates/project`) and Simulator parity route.
- Shared helpers `filterProjectOwnTemplateNodes` / `resolveOrgTemplatesForProject` in `pmTemplateInheritanceService`.
- Org Templates (project-scoped) no longer lists project-own copies; those appear only under Project Templates.
- Sidebar cache version **43**. Run `SQL/v844_pm_project_templates_menu.sql` on Supabase.
