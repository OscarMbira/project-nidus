# PM Local Forms (v852)

Blank-origin forms that Portfolio / Programme / Project Managers (and PMO Admins) can create without copying a Global or Organisational template first. Companion to [Form Template Org Field Customisation And Tier Cascade Guide](./Form_Template_Org_Field_Customisation_And_Tier_Cascade_Guide.md).

## What a “local form” is

Not a new table. A local form is:

1. A `form_templates` row (`account_id` = org, `created_by` = creator).
2. A `form_template_versions` v1 with `schema: { sections: [] }` (then edited in Form Template Builder).
3. A `pm_template_nodes` row with `domain = 'form_template'` and **`parent_node_id IS NULL`** (blank origin). Copied templates keep a non-null parent.

## Permissions

| Tier | Who may create |
|------|----------------|
| Project | User with `project_roles.role_name = 'Project Manager'` on that project (or named `project_manager_user_id`), or PMO Admin |
| Portfolio / Programme | Named owner column (`portfolio_manager_user_id` / `programme_manager_user_id`) or PMO Admin — no membership tables yet (PRD O1) |
| PMO / account | PMO Admin |

SQL helpers: `public.can_create_local_form` / `auth_user_has_project_manager_role` (`SQL/v853_*`), INSERT RLS alternative on `pm_template_nodes` (`SQL/v853b_*`). Simulator: project + PMO only (`sim.*` mirrors).

UI “Create Blank Form” is a hint only (`RequireRole` / project context). RLS is the real gate.

## UI

- **Create Blank Form** on Organisational Templates / Project Templates (`OrganisationalTemplatesPage`, Platform + Simulator).
- Detail **origin badge**: `Blank` vs `Copied from: <name>`.
- Blank project-tier forms open the full **Form Template Builder**; copied project-tier forms still open **TierFormPolicyPanel** (`resolveFormTemplateManagePath(..., { isBlankOrigin })`).

## `template_code`

New rows insert `template_code = ''`; Admin ID Generation assigns `FRM-####` / `SFRM-####` (`Admin SQL/v201_*` + monorepo `SQL/v854_*`). Existing `F0xx` codes are not backfilled.

## Forms gallery

`FormsGallery` uses `listNearestFormTemplatesForProject` — nearest-tier org/local copies plus globals that are not overridden — so teams see one deduped picker instead of every copy.

## Apply order

1. `E:\project-nidus-admin\SQL\v201_form_templates_id_generation_seed.sql`
2. `E:\project-nidus\SQL\v853_local_form_permission_function.sql`
3. `E:\project-nidus\SQL\v853b_pm_template_nodes_local_form_insert_rls.sql`
4. `E:\project-nidus\SQL\v854_form_templates_admin_display_id_trigger.sql`
