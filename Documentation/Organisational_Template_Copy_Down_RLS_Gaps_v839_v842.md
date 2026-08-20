# Organisational Template Copy-Down RLS Gaps (v839–v842)

## Context

Project-scoped Organisational Templates (`?entityType=project&entityId=…`) expose **Copy down to my project**. That path forks catalog rows + a project-tier `pm_template_nodes` row for users who are project members — not only suite PMO admins or the named `project_manager_user_id`.

## Fixes

| SQL | Gap | Fix |
|-----|-----|-----|
| **v839** | `form_templates` INSERT required PMO admin | Account copy allowed when `created_by = auth.uid()` + account access |
| **v840** | `can_manage_pm_template_node` project tier = named PM only | Use `auth_user_can_access_project` / practice helper; entity assignment parity (public) |
| **v841** | Sim entity assignment still PMO-only; sim node_links no write; practice access helper too narrow; named PM missing from `auth_user_can_access_project`; OPA insert gated on `opa.create` | Sim assignment + node_links write; harden helpers; OPA creator/project-member path |
| **v842** | Sim process_template owner-only RLS + CHECK | Mirror public v804/v808 for 24 sim tables |

## App change

`pmTemplateCopyService.duplicateProcessTemplateRow` maps `projectId` → `practice_project_id` when the source row is from the sim schema (has `practice_project_id`).

## Apply order

1. `SQL/v839_form_templates_project_copy_rls.sql`
2. `SQL/v840_pm_template_nodes_project_copy_rls.sql`
3. `SQL/v841_template_copy_down_rls_parity.sql`
4. `SQL/v842_sim_process_template_copy_rls.sql`

## Domains covered

`form_template`, `process_template`, `opa`, `fields`, and node-only `*_template` domains for Platform + Simulator project copy-down.
