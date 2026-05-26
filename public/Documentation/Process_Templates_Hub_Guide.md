# Process Templates Hub (v629)

## Overview

The Process Templates hub groups PMBOK-aligned templates, registers, and logs into **Pre-Project + 5 process groups**. It is available on Platform (PMO/PM) and Simulator (PMO/PM) with parity.

## Routes

| Role | Hub base |
|------|----------|
| PMO | `/pmo/process-templates` |
| PM | `/pm/process-templates` |
| Simulator PMO | `/simulator/pmo/process-templates` |
| Simulator PM | `/simulator/pm/process-templates` |

Group detail: `…/process-templates/{group}` where `group` is `pre-project`, `initiating`, `planning`, `executing`, `monitoring-controlling`, or `closing`.

New CRUD templates: `…/process-templates/t/{slug}` (list, new, detail, edit).

## Permissions

- **PMO / Simulator PMO** — full master CRUD.
- **Other roles** — view masters, copy to workspace, edit own copies.

## Key files

- Registry: `src/components/processTemplates/processTemplatesRegistry.js`
- Hub components: `src/components/processTemplates/`
- CRUD pages: `src/pages/processTemplates/`
- Services: `src/services/processTemplatesService.js`, `processTemplateCrudFactory.js`
- SQL: `SQL/v629_process_templates_new_tables.sql`

## Database

Run the v629 SQL migration in Supabase (public + `sim` schemas) before using new template CRUD against production data.
