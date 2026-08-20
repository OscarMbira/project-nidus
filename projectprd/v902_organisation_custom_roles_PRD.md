# v902 — Organisation Custom Roles PRD

## a) Problem statement

The Platform (and Simulator, which shares the same `public.roles` / `public.project_roles`
infrastructure) ships with a fixed set of roles: 2 org-wide system roles (`account_owner`,
`pmo_admin`) and 10 project-level template roles (`project_manager`, `team_manager`,
`change_authority`, etc. — seeded in `SQL/v91_role_system_cleanup.sql` and
`SQL/v355_scope_management_plans.sql`). These are hardcoded SQL seed rows; there is no UI
path to add a role. Different customer organisations run different governance structures —
one org's PMO might need a "Site Coordinator" or "Regional Delivery Lead" role that doesn't
map cleanly onto any of the 10 built-ins — and today the only way to get a new role into the
system is a manual SQL migration authored by the Nidus team.

There was one earlier attempt at custom roles: `apps/platform/src/pages/app/ProjectRoles.jsx`
and `apps/platform/src/services/projectRoleService.js`. It is **dead code** — not wired into
any route, not linked from the sidebar, and `projectRoleService.js` has a build-breaking
syntax error (`'[]'::jsonb`, Postgres cast syntax pasted into a JS file) that would fail to
parse if it were ever imported. It also only covered project-scoped custom roles, not the
org-wide model this PRD settles on (see Implementation decisions).

A second, deeper problem surfaced during investigation: `public.roles.role_name` and
`public.project_roles.role_name` (for templates) both carry a **globally unique** constraint
with no `account_id`/organisation column anywhere in either table. That was harmless while
every role was identical, Nidus-authored reference data shared by all tenants — but it means
the role system today has no concept of "this role belongs to this organisation only." Any
custom-role feature has to fix this or risk two different organisations' custom roles
colliding on name or leaking permissions/menu access across tenants.

## b) Solution

Add an **organisation-scoped custom role** capability: PMO Admin, Portfolio Manager,
Programme Manager, Project Manager, and Team Manager can each create a new role for their
own organisation by **cloning an existing role** (built-in template or another custom role
already in their org) — the clone copies the base role's permission set and full sidebar
menu-grant list, so a new role never starts with an empty, useless sidebar. The creator
names it, writes a description, optionally deselects a few of the cloned menu items, and
optionally flags it as **governance/oversight-only** so it routes to the read-only Governance
Dashboard instead of the operational PM Dashboard. The new role is immediately selectable
anywhere existing roles are selectable — the "Assign Roles" page, project invitation forms —
scoped so only members of the creating organisation ever see or can assign it.

Structurally: `public.roles` and `public.project_roles` both gain a nullable `account_id`
column (`NULL` = built-in system/template role, unchanged, shared by everyone; a value =
custom role owned by that org only), and uniqueness moves from a bare `role_name` constraint
to `(role_name, account_id)`. A custom role is created as **matching rows in both tables
under the same `role_name`** — this is what lets it flow through the existing invitation
pipeline (`accept_project_invitation`, `resolveInvitationRoleIdForInsert`) with **zero
changes** to their role-name-matching fallback logic, since that logic already falls back to
an exact `role_name` match on both sides when no hardcoded `pm_*` alias applies.

New sidebar entry **"Manage Roles"**, sibling to the existing "Assign Roles" entry under
People & Resources, in both Platform and Simulator (the role tables are shared `public`
schema infrastructure already consumed by both apps — no `sim.*` duplication needed).

## c) User stories

1. As a PMO Admin, I can open "Manage Roles" from the sidebar and see a list of my
   organisation's custom roles (built-in system/template roles shown separately, read-only).
2. As a PMO Admin / Portfolio Manager / Programme Manager / Project Manager / Team Manager, I
   can click "Create Role", pick an existing role (built-in or my org's own custom role) as
   the clone source, and see its permission set and menu grants pre-populated.
3. As that same creator, I can rename the clone (display name), write a description, and the
   system generates a URL/DB-safe `role_name` slug from the display name automatically.
4. As that creator, I can deselect individual menu items from the cloned grant list before
   saving, so the new role doesn't automatically get everything the source role has.
5. As that creator, I can check "Oversight-only (read-only dashboard)" so anyone assigned this
   role lands on the Governance Dashboard instead of the operational PM Dashboard, matching
   how Project Board Member / Project Sponsor / Portfolio Manager already behave.
6. As any of the 5 creator-eligible roles, I can edit an existing custom role's display name,
   description, governance flag, and menu grants — not limited to roles I personally created.
7. As any of the 5 creator-eligible roles, I can deactivate a custom role, hiding it from
   future assignment while leaving current holders unaffected.
8. As any of the 5 creator-eligible roles, I can delete a custom role only if no active
   `project_memberships` or `user_roles` row currently references it; otherwise I'm told to
   reassign or deactivate instead, with a record-specific message (rule 16).
9. As a PMO Admin sending a project invitation, my organisation's custom roles appear
   alongside the 10 built-in roles in the role picker, indistinguishable in the flow.
10. As a user assigned a custom role, my sidebar shows exactly the menu items granted to that
    role, my dashboard title (`PMDashboard.jsx`, v899 fix) shows my role's display name, and
    (if flagged oversight-only) I land on the Governance Dashboard.
11. As an organisation admin, I never see another organisation's custom roles in any picker,
    list, or invitation flow — full tenant isolation via `account_id` scoping.
12. As a user in the Simulator app, "Manage Roles" and my organisation's custom roles behave
    identically to Platform, since both apps read the same `public.roles`/`project_roles`.
13. As any user viewing a custom role's detail/edit screen, I see an Audit details tab
    (Identity / Classification / Record history) per rule 63.1, alongside the role's own
    fields tab.
14. As any user completing a create/edit/deactivate/delete action, I see the shared blocking
    success-confirmation modal (rule 16) with the operation and the role's name.

## d) Implementation decisions

(Resolved via interview — see conversation for full reasoning on each.)

1. **Scope**: organisation-wide only (not per-project custom roles). A custom role, once
   created, is usable when assigning membership to any project in the creating org.
2. **Creators/editors**: PMO Admin, Portfolio Manager, Programme Manager, Project Manager,
   Team Manager — any holder of any of these 5 roles can create, edit, or deactivate/delete
   ANY of their organisation's custom roles (not restricted to the original creator).
3. **Configuration method**: clone-from-existing-role only. No full permission-matrix builder
   in this pass — creator picks a base role, gets its permissions + menu grants, can deselect
   individual cloned menu items, then saves. Editing later works the same way (adjust the
   grant list), not a from-scratch matrix.
4. **Governance dashboard routing**: `project_roles` gains `is_governance_only BOOLEAN DEFAULT
   FALSE`. `GOVERNANCE_ONLY_ROLE_KEYS` (hardcoded Set of 3 role-name strings in
   `packages/shared/src/utils/projectRoleDashboardUtils.js`) is superseded by this DB flag —
   the 3 existing built-in governance roles get `is_governance_only = TRUE` via migration so
   behaviour is unchanged for them, and `isGovernanceOnlyRole` now checks the flag instead of
   a name Set. `CurrentProjectContext` (Platform + Simulator) is extended to carry this flag
   per project alongside `roleKeys`.
5. **Multi-tenancy**: nullable `account_id UUID REFERENCES accounts(id)` added to both
   `public.roles` and `public.project_roles`. `NULL` = built-in, shared globally (existing 12
   rows untouched). Non-null = custom, owned by that org. Uniqueness changes from a flat
   `UNIQUE(role_name)` to a composite/partial unique index on `(role_name, account_id)` (and
   the existing `uq_project_roles_template`/custom indexes gain the same `account_id` key).
6. **Name-matching bridge, unchanged**: a custom role is inserted as matching-`role_name` rows
   in BOTH `roles` and `project_roles` (mirroring how the 10 built-ins already pair with their
   `pm_*` legacy bridge rows). `accept_project_invitation`'s CASE mapping and
   `resolveInvitationRoleIdForInsert`'s alias dictionary are **not modified** — both already
   fall back to an exact `role_name` match when no `pm_*` alias exists, which is exactly what
   a same-name custom-role pair produces. This was verified by reading both functions in full.
7. **Menu-grant cloning**: creating a custom role inserts `role_menu_items` rows for the new
   `roles.id` copied from the clone source's `roles.id` grants, minus any menu items the
   creator explicitly deselected. Implemented as a single SECURITY DEFINER RPC (transactional
   — can't partially create the `roles` row without its `project_roles` counterpart and menu
   grants).
8. **`role_name` slug**: auto-derived from display name (lowercase, non-alphanumerics →
   underscore), collision-checked within `(role_name, account_id)` only — different orgs can
   independently have a role slugged `site_coordinator`. Immutable after creation (editing
   only changes `role_display_name`/description/flags/grants, not the slug) — avoids having
   to keep two tables' `role_name` values in sync on rename.
9. **Sidebar placement**: new menu item "Manage Roles", sibling to the existing "Assign Roles"
   (`pmo_people_assign_roles`) under People & Resources, granted to the same 5 creator roles,
   in both Platform and Simulator menu trees (Simulator gets its own `sim_`-prefixed
   `menu_items` row per existing convention, e.g. `v677_simulator_roles_db_hierarchy.sql`,
   but both point at the same shared `public.roles`/`project_roles` backend — no `sim.*`
   schema duplication, since org/role identity is already cross-app shared infrastructure,
   confirmed by `apps/simulator/src/services/supabaseClient.js` re-exporting `platformDb` as
   `supabase` for `roleService.js`).
10. **Lifecycle**: delete is blocked (with a clear message) while any active
    `project_memberships` or `user_roles` row references the role; deactivate
    (`is_active = false`) always available as the non-destructive alternative and hides the
    role from future assignment pickers without affecting current holders.
11. **UI conventions applied**: Table-list default view with Card toggle (rule 41), row
    numbers (rule 44), icon-only View/Edit/Delete actions (rule 61), Audit details tab (rule
    63.1 — this is a record-CRUD form), shared success-confirmation modal on
    create/update/deactivate/delete (rule 16), theme-aware dark/light (rule 28.1), unsaved-
    changes guard on the create/edit form (rule 52).

## e) Testing decisions

- Unit tests for the new `role_name` slugify/collision util (pure function, easy to isolate).
- Unit tests for the updated `isGovernanceOnlyRole` (DB-flag-based) against
  `packages/shared/src/utils/projectRoleDashboardUtils.js`'s existing test coverage pattern.
- Unit tests for the service layer functions that call the new RPCs (mocked Supabase client,
  following the existing pattern in `apps/platform/src/services/__tests__/`).
- Manual verification: create a custom role as each of the 5 creator role types, confirm menu
  visibility for a user assigned that role, confirm the org-isolation (a second test org must
  not see the first org's custom role anywhere), confirm delete-blocked-while-in-use and
  deactivate paths, confirm Platform/Simulator parity.

## f) Out-of-scope items

- Full custom permission-matrix / menu-tree builder (deselecting from a clone's existing
  grants is in scope; building a role's grants from a blank slate is not).
- Project-scoped (per-project, not org-wide) custom roles — the abandoned
  `ProjectRoles.jsx`/`projectRoleService.js` attempt at this is left dead/unused; not repaired
  or repurposed. Could be a later PRD if a real need shows up.
- Renaming a custom role's underlying `role_name` slug after creation.
- Cross-organisation role sharing, templates marketplace, or org-to-org role copying.
- Migrating the existing 10 built-in templates or their `pm_*` legacy bridge rows onto the new
  `account_id`/matching-slug convention — they stay exactly as they are (`account_id IS
  NULL`), untouched by this feature.
- Retrofitting `GOVERNANCE_ONLY_ROLE_KEYS`-style hardcoded-list patterns elsewhere in the
  codebase, if any other exist — only the one used by `PMDashboard.jsx`/
  `isGovernanceOnlyRole` is in scope here.

## g) Further notes

- This PRD directly follows on from the dashboard-title and header-badge fixes already applied
  in this conversation (`PMDashboard.jsx` dynamic title, `getUserSystemRoles` project_id
  filter, `SQL/v899_fix_legacy_pm_role_display_names.sql`) — those fixes are prerequisites,
  already committed to the working tree, not part of this PRD's own scope.
- The corresponding implementation plan is `projectplan/v902_organisation_custom_roles_plan.md`.
