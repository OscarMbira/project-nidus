# Project Documents Register (v849)

## Purpose
Dedicated PM register for **process_template** documents available to the current project:
**Captured** vs **Not yet captured**, with Capture, Retire (archives node + catalog row), and Restore.

## Routes
| App | Path |
|-----|------|
| Platform | `/platform/documents/project` |
| Simulator | `/simulator/pm/documents/project` |

Detail View/Edit/Capture land on Project Documents detail (same page component as Project Templates):
- Platform: `/platform/documents/project/:nodeId`
- Simulator: `/simulator/pm/documents/project/:nodeId`

## Menu
- `plat_pm_project_documents` (sort_order 27, next to Project Templates)
- `sim_pm_project_documents`
- SQL: `SQL/v849_pm_project_documents_menu.sql` (grants copied from Project Templates)
- Catalog RLS: `SQL/v849_process_template_tables_is_deleted.sql`

## Services
- `packages/shared/src/services/projectDocumentsRegisterService.js`
- Retire helpers in `pmTemplateNodeService.js`:
  `archiveProcessTemplateContent`, `archiveProcessTemplateNodeAndContent`,
  `findArchivedProjectProcessTemplateCopy`, `restoreArchivedProjectProcessTemplate`

## Out of scope
Forms gallery (v850), hard deletes, Hub orphan migration, v822 singleton cap changes.
