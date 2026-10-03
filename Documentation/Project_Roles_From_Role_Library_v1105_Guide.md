# Add Project Roles from the Built-in Role Library (v1105)

**Applies to:** Platform (`apps/platform`), Simulator (`apps/simulator`)
**Related:** `projectprd/v1105_project_roles_from_role_library_PRD.md`,
`projectplan/v1105_project_roles_from_role_library_plan.md`

## What this adds

1. **Add from Built-in Roles** — a button on *Project Roles & Skills* (Platform:
   `/platform/project-roles`; Simulator: `/simulator/practice-project-roles`) that opens a picker
   page listing the same role catalog *Manage Roles* clones from — built-in roles plus your
   organisation's own custom roles. Tick a role, review or edit its Required Skills for this
   project, and add your selection to the project's Roles & Skills catalog.
2. **Required Skills on the role catalog itself** — every built-in and custom role now carries a
   Required Skills field, shown on *Manage Roles* → Create/Edit Role and on the System Admin
   built-in role editor. It is mandatory: the UI and the underlying database functions both
   refuse to save a role with no skills.

## Running the SQL

Run these in order against Supabase (SQL editor, pgAdmin, or DBeaver):

1. `SQL/v1108_project_roles_role_skills.sql` — adds `project_roles.role_skills` and
   `source_project_role_id` on both project functional-role catalog tables.
2. `SQL/v1109_built_in_role_skills_seed.sql` — seeds 2–3 skills on every built-in role that
   doesn't already have any. Safe to re-run; never overwrites an existing value.
3. `SQL/v1110_role_functions_required_skills.sql` — adds `p_role_skills` to
   `create_org_custom_role`, `update_org_custom_role`, `update_builtin_role`, and adds
   `fill_org_custom_role_skills_if_blank`. Each function now raises if the final skills value
   would be blank.

### Verify

```sql
-- Should return 0 rows
select role_name from public.project_roles
where is_template = true and account_id is null and project_id is null
  and (role_skills is null or btrim(role_skills) = '');
```

Then confirm the app: try saving a role on Manage Roles with the skills field empty — it should be
blocked both by the form and (if you call the RPC directly) by the database.

## How "Add from Built-in Roles" works

- The picker shows built-in roles plus your organisation's active custom roles, matching what
  *Manage Roles* offers as a clone source.
- The industry filter defaults to the current project's industry (Platform only — Simulator's
  practice projects have no industry field, so it defaults to *All industries*).
- A role already present in the project's catalog (matched case-insensitively by name) is shown
  disabled with an "Already added" tag.
- Ticking a role reveals its skills, prefilled from the role's own Required Skills. You can edit
  them for this project — that edit is saved to the **project's own catalog row only**.
- For your organisation's own custom role, if its own skills are still blank, the edited skills
  are also saved back to that role (never to a built-in role, and never overwriting skills that
  already exist) via `fill_org_custom_role_skills_if_blank`.
- **Add selected** stays disabled until every ticked role has at least one skill.

## Files

- SQL: `SQL/v1108`–`v1110`.
- Platform: `services/organisationCustomRoleService.js` (skills plumbing),
  `services/projectRoleLibraryService.js` (new), `pages/admin/OrgRoleDetail.jsx`,
  `pages/admin/SystemRoleEditPage.jsx`, `pages/platform-app/ProjectFunctionalRoleFromLibrary.jsx`
  (new), `pages/platform-app/ProjectFunctionalRolesPage.jsx` (button).
- Simulator: the same set, plus `services/sim/projectRoleLibraryService.js` (new) and
  `pages/simulator/PracticeProjectFunctionalRoleFromLibrary.jsx` (new).
- Tests: `services/__tests__/projectRoleLibraryService.test.js` (Platform),
  `services/sim/__tests__/projectRoleLibraryService.test.js` (Simulator).

## Out of scope

- Restricting which access roles a project may assign (this feature only copies delivery roles
  into the project catalog — it does not touch RBAC/menu grants).
- A Category/Skill-level catalog, or linking to the Skill Matrix.
- `bulkRoleService.createProjectRoleTemplates` and `projectRoleService.createCustomRole`/
  `updateRole` still write `project_roles` directly and are not covered by the mandatory-skills
  rule (see the plan's "Open point for approval").
