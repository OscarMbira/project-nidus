# v1105 — Add Project Roles from the Built-in Role Library (+ mandatory Role Skills) PRD

**Status:** Draft — decisions settled in-session (interview 2026-09-25); awaiting user approval of PRD + plan.
**Related plan:** `projectplan/v1105_project_roles_from_role_library_plan.md`
**Touches:** Platform (`apps/platform`), Simulator (`apps/simulator`), `public` + `sim` schemas.

## a) Problem statement

Two role concepts exist and are disconnected:

- **Built-in / custom access roles** (`public.project_roles`, listed on *Manage Roles*): ~100 system roles
  (Actuary, Agile Coach, Backend Developer …) plus each organisation's custom roles. They carry a
  name, description, level, dashboard and industry — **but no skills**.
- **Project Roles & Skills** (`public.project_functional_roles`, page `/platform/project-roles`): the
  per-project *delivery-role* catalog (Analyst, Developer, Scrum Master …) with Required Skills. Team
  member assignment and task screens read from it.

Today a project team has to re-type every delivery role by hand, even though a curated system library of
roles already exists. And the library itself has no skills, while Project Roles & Skills insists every
role has at least one skill — so the two cannot be joined without a data gap.

## b) Solution

1. **Add from Built-in Roles** — a button on *Project Roles & Skills* opens a routed page where the user
   ticks roles from the library (built-in + their organisation's custom roles), reviews/edits the skills,
   and adds them as rows in the project's catalog, ready for use throughout the project.
2. **Skills on the role record** — add a `role_skills` column to `project_roles`; seed 2–3 skills for
   every existing built-in role; make skills **mandatory** on every role create/edit path.
3. **Safe write-back** — skills a user types never modify the shared built-in roles (they belong to every
   organisation). They are saved to the project's own catalog row.

## c) User stories

1. As a Project Manager, on *Project Roles & Skills* I see an **Add from Built-in Roles** button beside
   *Create Role & Skills*.
2. The button opens its own page (`…/project-roles/from-library`) with a **Back** button and the shared
   unsaved-changes guard (rule 65 / 52).
3. The page lists built-in roles **and my organisation's custom roles** in a Table-List (default) with
   Card toggle, `#` row numbers, sortable columns, search, pagination and export (rules 38/40/41/44).
4. An **industry filter** defaults to the current project's industry and can be widened to *All
   industries* (Cross-Industry roles always remain reachable).
5. Roles already in this project's catalog (case-insensitive match) show as **Already added** and cannot
   be ticked again.
6. Ticking a role reveals its **Required skills** (one per line, `MultiLineListInput`), **prefilled** from
   the role's `role_skills`; the user may edit them for this project.
7. **Add selected** is disabled until every ticked role has ≥ 1 skill; it adds all ticked roles in one
   action and shows the success modal (record id = project code, operation `created`, count in message).
8. Added rows appear immediately on *Project Roles & Skills* and in team-member assignment and task role
   pickers, exactly like hand-created roles.
9. Editing a copied role's skills on the project **never** changes the shared built-in role.
10. For an **organisation custom role** whose `role_skills` is blank (legacy), the skills entered on the
    picker are also saved back to that custom role (only if blank; only within the caller's own
    organisation).
11. A copied row remembers its source role (`source_project_role_id`) for traceability.
12. On *Manage Roles* **Create Role** and **Edit Role**, and on the System Admin **built-in role edit**
    page, a **Required skills** field is mandatory (≥ 1 line); Save is disabled without it.
13. The database functions `create_org_custom_role`, `update_org_custom_role` and `update_builtin_role`
    **reject** a blank skills value, so no role saved through them can lack skills.
14. Every one of the ~100 existing built-in roles has 2–3 skills after the seed runs; the seed is
    idempotent and never overwrites skills a System Admin has already entered.
15. Existing custom roles with no skills keep working; skills are requested the next time they are edited.
16. Everything above exists in the **Simulator** for practice projects (`sim.practice_project_functional_roles`),
    matching Platform (rule 34.1).

## d) Implementation decisions (settled with the user)

- **Intent:** copy library roles into the project's Roles & Skills catalog — not a per-project access
  allow-list (rejected: security/RLS impact, out of scope).
- **Placement:** button + routed page on Project Roles & Skills; **no new sidebar item** (advice accepted:
  it is a sub-step of Roles & Skills, avoids menu clutter — rule 62; therefore no `menu_items` change and no
  taxonomy-doc change under rule 70).
- **Source list:** built-in + own-organisation custom roles; industry filter defaults to the project's
  industry.
- **Skills capture:** on the picker page, per ticked role, required (≥ 1).
- **Write-back:** built-ins are seeded with skills and edited only by System Admins; picker edits go to
  the **project copy only**; custom org roles get a guarded fill-if-blank write-back via a
  SECURITY DEFINER function (RLS is not bypassed elsewhere; `project_roles` has no client UPDATE policy).
- **Mandatory skills:** required in the UI **and** enforced in the three role functions (create custom,
  update custom, update built-in).
- **Storage format:** `role_skills TEXT`, newline-joined — identical to `required_skills`, so copy is 1:1.
- **Not a single-record CRUD form:** the picker is a bulk selection page, so no per-record Audit tab of
  its own (rule 63.1 exclusion for bulk actions); copied rows are audited on the existing *Audit Details*
  tab of Project Roles & Skills.
- **No new table**, therefore no `database_tables` registration and no Admin ID Generation rule.
- **Deliberate non-goals of enforcement (flagged for approval):** `bulkRoleService.createProjectRoleTemplates`
  and `projectRoleService.createCustomRole/updateRole` insert/update `project_roles` **directly** (bulk-invite
  placeholder roles and per-project roles) and bypass the three functions; they are left unchanged.

## e) Testing decisions

- Unit tests (rule 23): the new library service (list/filter/"already added" detection, add-selected
  merge, source-id persistence, skills validation) for Platform and Simulator; the mandatory-skills
  validation helper.
- SQL verification queries (run by the user after applying): zero built-in roles with blank `role_skills`;
  each function raises on blank skills; fill-if-blank function is a no-op on built-ins and other orgs.
- Manual: add several roles from the library with edited and unedited skills; confirm they appear in team
  assignment/task pickers; confirm shared built-in skills unchanged after a project edit; confirm Create Role
  cannot be saved without skills; repeat in Simulator.
- Retest suite after each phase (rule 43).

## f) Out of scope

- Restricting which access roles a project may assign (allow-list).
- Skill-level catalog, proficiency levels, or linking to the Skill Matrix.
- Changing `bulkRoleService` / `projectRoleService` role creation.
- A "From built-in" badge on the Roles & Skills list (possible follow-up; `source_project_role_id` makes it
  trivial later).
- Backfilling skills onto existing custom roles.

## g) Further notes

- Highest existing versions when written: SQL v1107, plan/PRD v1104 → this work uses PRD/plan **v1105** and
  SQL **v1108–v1110**.
- Documentation: `Documentation/Project_Roles_From_Role_Library_v1105_Guide.md` (user guide + SQL run order).
