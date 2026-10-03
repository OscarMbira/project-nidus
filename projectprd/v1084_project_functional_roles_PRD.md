# v1084 — Project Functional Roles & Skills Catalog

**Status:** Approved for implementation (interview locked 2026-09-19).
**Related:** Team Edit Roles & skills tab (`team_functional_roles`), Team Members
member-role requirement, Project Team menu (`plat_pm_project_team`).

---

## a) Problem statement

Functional roles with required skills were only editable on Edit/Create Team
(`team_functional_roles`). That buries project-wide role definitions inside a single
team and duplicates work when several teams need the same roles. PMs need a Project
Team menu place to define roles that are not covered by global/RBAC role lists, then
reuse them when assigning team members.

## b) Solution

1. Project-scoped catalog `project_functional_roles` (role + required skills).
2. Sidebar leaf **Project roles & skills** under Project Team.
3. Remove Roles & skills tab from Team create/edit; member Role * picks from the
   project catalog.
4. Migrate distinct existing `team_functional_roles` into the project catalog.
5. Anyone with Team Members menu access can edit the catalog.

## c) User stories

1. As a user with Team Members access, I open Project roles & skills for the current
   project and add/edit/delete roles with required skills.
2. As a PM, when I assign a team member I must pick a role from that project catalog.
3. As a user, I no longer see a Roles & skills tab on Edit/Create Team; I see a link
   to manage project roles.
4. After migration, roles previously defined on any team on the project appear once
   in the project catalog (deduped by name).
5. Simulator practice projects get the same capability.

## d) Implementation decisions

1. Standalone functional catalog — not merged with RBAC `project_roles`.
2. Remove team Roles & skills tab entirely.
3. Edit access = same audience as Team Members (project access + menu grant).
4. Bulk SQL migrate from `team_functional_roles`; keep legacy table, stop UI writes.
5. Platform + Simulator parity.

## e) Testing decisions

- Migrate dedupes same role name across teams on one project.
- Page requires project context.
- Member save fails without catalog role; succeeds when role exists.
- Menu granted like Team Members leaf.

## f) Out of scope

- Deleting `team_functional_roles`
- RBAC / invitation changes
- Admin app
- PMO Roles & Responsibilities RACI page

## g) Further notes

Menu label: **Project roles & skills** (`plat_pm_pt_project_roles`).
Route: `/platform/project-roles`.
