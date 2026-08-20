# v902 — Organisation Custom Roles — Implementation Plan

PRD: `projectprd/v902_organisation_custom_roles_PRD.md` (read that first for the "why" and
the full list of resolved design decisions — this file is the "how", step by step).

Prerequisites already in the working tree (this session, prior to this plan): dynamic
`PMDashboard.jsx` title, `getUserSystemRoles` `project_id IS NULL` filter,
`SQL/v899_fix_legacy_pm_role_display_names.sql`.

---

## Phase 1 — Schema (SQL/v902_organisation_custom_roles_schema.sql)

- [x] Add nullable `account_id UUID REFERENCES accounts(id)` to `public.roles`.
- [x] Add nullable `account_id UUID REFERENCES accounts(id)` and
      `is_governance_only BOOLEAN NOT NULL DEFAULT FALSE` to `public.project_roles`.
- [x] Backfill `is_governance_only = TRUE` for the 3 existing built-ins:
      `project_board_member`, `project_sponsor`, `portfolio_manager` (matches current
      `GOVERNANCE_ONLY_ROLE_KEYS` exactly — no behaviour change for existing users).
- [x] Replace `roles.role_name` bare `UNIQUE` with a composite unique index on
      `(role_name, account_id)` — note `account_id IS NULL` rows (the 12 built-ins) must still
      dedupe against each other; use `COALESCE(account_id, '00000000-0000-0000-0000-
      000000000000'::uuid)` in the index expression (Postgres treats NULL as distinct in a
      plain composite unique index, which would silently allow duplicate built-in role names).
- [x] Update `uq_project_roles_template` (and the existing `uq_project_roles_custom` index) to
      key on `(role_name, account_id)` the same way.
- [x] Register no new table (existing tables only) — but re-run the `database_tables` registry
      INSERT/UPDATE block is not needed since no new table was created.
- [x] Add `database_tables` note: N/A (schema addition to existing tables only).

## Phase 2 — RPCs (SQL/v903_organisation_custom_roles_rpcs.sql)

All SECURITY DEFINER, `search_path = public`, mirroring the transactional style of
`accept_project_invitation` (v622).

- [x] `create_org_custom_role(p_account_id uuid, p_display_name text, p_description text,
      p_clone_from_project_role_id uuid, p_is_governance_only boolean, p_excluded_menu_item_ids
      uuid[], p_created_by_user_id uuid) RETURNS TABLE(project_role_id uuid, role_id uuid)`:
      1. Verify caller holds one of the 5 creator roles for `p_account_id` (system role check
         via `roles`/`user_roles`, or project-level check via `project_roles`/
         `project_memberships` — a Project/Team Manager qualifies via ANY project in the org).
      2. Look up the clone source's `project_roles` row (permissions, role_level) and its
         paired `roles` row (matched by `role_name` — same convention as the 10 built-ins).
      3. Slugify `p_display_name` → `role_name`, de-duplicate against `(role_name,
         account_id)` within `p_account_id` only (append `_2`, `_3`, ... on collision).
      4. Insert the new `project_roles` row (`account_id = p_account_id`, `is_template = TRUE`,
         `project_id = NULL`, cloned `role_level`/`permissions`, `is_governance_only` as given).
      5. Insert the new `roles` row (`account_id = p_account_id`, same `role_name`,
         `is_system_role = FALSE`, cloned `role_level`).
      6. Copy `role_menu_items` from the clone source's `roles.id` to the new `roles.id`,
         excluding any `menu_item_id` in `p_excluded_menu_item_ids`.
      7. Return both new IDs.
- [x] `update_org_custom_role(p_project_role_id uuid, p_display_name text, p_description text,
      p_is_governance_only boolean, p_add_menu_item_ids uuid[], p_remove_menu_item_ids uuid[])`
      — same 5-role authorization check, scoped to the role's own `account_id`; refuses to
      touch rows where `account_id IS NULL` (built-ins are never editable via this path).
- [x] `deactivate_org_custom_role(p_project_role_id uuid)` — sets `is_active = FALSE` on both
      the `project_roles` and matching `roles` row.
- [x] `delete_org_custom_role(p_project_role_id uuid)` — checks for any active
      `project_memberships.project_role_id = p_project_role_id` OR active
      `user_roles.role_id = <matching roles.id>`; raises a clear exception naming the blocking
      count if found (surfaced verbatim in the UI per rule 16's "record specific information"
      spirit), otherwise hard-deletes both rows + their `role_menu_items`.
- [x] Grant `EXECUTE` on all four to `authenticated`.
- [x] RLS: confirm `role_menu_items`/`roles`/`project_roles` INSERT/UPDATE/DELETE are not
      directly grantable to `authenticated` (they should stay RPC-only — do NOT loosen table
      RLS policies to allow direct client writes to these tables; that would let any
      authenticated user attempt to write another org's rows without the RPC's authorization
      and `account_id` checks. See CLAUDE.md rule 42 — do not bypass RLS as a workaround).

## Phase 3 — Shared governance-flag refactor

- [x] `packages/shared/src/utils/projectRoleDashboardUtils.js`: change `isGovernanceOnlyRole`
      from checking `roleKeys` against the hardcoded `GOVERNANCE_ONLY_ROLE_KEYS` Set to instead
      accepting the per-project `is_governance_only` flag(s) already resolved by the caller.
      Keep the exported `GOVERNANCE_ONLY_ROLE_KEYS` Set as a documented **fallback only** for
      any row that predates the migration (defensive, not load-bearing after Phase 1's
      backfill) — update its doc comment to reflect the new DB-driven source of truth.
- [x] `apps/platform/src/context/CurrentProjectContext.jsx` and the Simulator mirror: extend
      the `project_roles:project_role_id(...)` select to also pull `is_governance_only`, and
      compute `isGovernanceOnly: p.roleNames.size > 0 && [...roles held].every(r =>
      r.is_governance_only)` per project, exposed on the `currentProject` object.
- [x] `apps/platform/src/pages/pm/PMDashboard.jsx` and Simulator mirror: swap
      `isGovernanceOnlyRole(currentProject?.roleKeys || [])` for
      `currentProject?.isGovernanceOnly` (the flag now comes pre-computed from context).
- [x] Update/add unit tests for `isGovernanceOnlyRole` reflecting the new signature.

## Phase 4 — Service layer

- [x] `apps/platform/src/services/organisationCustomRoleService.js` (new): thin wrappers
      around the 4 RPCs (`createOrgCustomRole`, `updateOrgCustomRole`,
      `deactivateOrgCustomRole`, `deleteOrgCustomRole`), plus `getOrgCustomRoles(accountId)`
      and `getCloneSourceRoles(accountId)` (built-ins `account_id IS NULL` UNION the org's own
      active custom roles) and `getRoleMenuGrants(roleId)` (for the clone-preview/deselect
      list) — all following this codebase's `{ success, data, error }` return convention.
- [x] Mirror the same file verbatim into `apps/simulator/src/services/` (same `public` schema
      backend — see PRD decision 9). If truly identical, consider promoting straight to
      `packages/shared/src/services/` instead of duplicating; decide during implementation
      based on how much of it needs `appDb` vs `platformDb` naming (Platform/Simulator import
      convention differs slightly per existing service files already reviewed).
- [x] Unit tests (mocked Supabase client) for both service files, following the existing
      pattern in `apps/platform/src/services/__tests__/`.

## Phase 5 — UI: Manage Roles page

- [x] `apps/platform/src/pages/admin/ManageRoles.jsx` (new) — matches `RoleAssignment.jsx`'s
      existing folder convention (`pages/admin/`), NOT `pages/app/` (where the abandoned
      `ProjectRoles.jsx` lived — that file stays untouched/unused per PRD out-of-scope).
      - Table-list default view (rule 41: `useViewMode('manage-roles', 'list')`) with Card
        toggle, search bar, row numbers (rule 44).
      - Two sections: "Built-in Roles" (read-only, `account_id IS NULL`) and "Custom Roles"
        (this org's own, full CRUD) — mirrors the System/Custom split already sketched in the
        dead `ProjectRoles.jsx` for visual precedent, rebuilt clean.
      - Icon-only View/Edit/Delete row actions via `RowActionButton` (rule 61).
      - "Create Role" button, gated to the 5 creator roles via `PermissionGate` (existing
        component, same pattern `ProjectRoles.jsx` attempted) or an equivalent role-check.
- [x] `apps/platform/src/components/app/OrgRoleEditorModal.jsx` (new; do not resurrect the
      broken `RoleEditorModal.jsx` referenced by dead code — confirm during implementation
      whether that file is itself reusable or also dead/broken, per rule 32 don't touch
      unrelated modules if it's live and used elsewhere):
      - Clone-source dropdown (built-ins + org's own custom roles).
      - Display name + description fields; slug preview (read-only, server-confirmed on save).
      - Cloned menu-grant checklist (checked = keep, uncheck = exclude) once a clone source is
        picked.
      - "Oversight-only (read-only Governance Dashboard)" checkbox.
      - Wired to `useUnsavedChangesGuard` (rule 52) and `useSuccessModal` (rule 16) on save.
      - Audit details tab (rule 63.1) — Identity / Classification / Record history, using
        `DetailAuditTabList`/`AuditCard` from `@nidus/ui`; placeholder text for a role not yet
        saved.
      - Theme-aware dark/light throughout (rule 28.1).
- [x] Delete confirmation surfaces the RPC's blocking-count message verbatim when delete is
      refused; offers "Deactivate instead" as the alternative action inline.

## Phase 6 — Sidebar menu wiring (SQL/v904_organisation_custom_roles_menu.sql)

- [x] Insert `menu_items` row (Platform) — actual menu_code used is `pmo-people-manage-roles`,
      not the originally-planned `plat_people_manage_roles`: v725 superseded the old
      `plat_people_*`/`pmo_people_*` naming with `pmo-people-*` (hyphenated) as the current
      canonical convention, discovered during implementation. Sibling to the real "Assign
      Roles" entry (`pmo-people-assign-roles`) under the same `pmo-cat-teams` parent, route
      `/platform/admin/manage-roles`, icon `shield-plus`.
- [ ] ~~Insert matching `sim_`-prefixed row for Simulator~~ — **deferred, see Review section**:
      Simulator has no routed `/platform/admin/*`-equivalent org-management area at all today
      (its own `pages/admin/RoleAssignment.jsx` is also unrouted — pre-existing gap, not
      introduced here). Did not invent a new URL namespace as a side effect.
- [x] Grant `role_menu_items` (`can_view = TRUE, can_use = TRUE`) for the Platform menu row to:
      `pmo_admin` (+ `org_admin`/`system_admin`/`super_admin` legacy aliases), `account_owner`,
      `portfolio_manager`, `programme_manager`, `project_manager`, `team_manager`, and their
      `pm_*` legacy-bridge equivalents — matching the
      `lower(replace(r.role_name, ' ', '_')) IN (...)` grant style from
      `v897_document_oversight_menu.sql`.

## Phase 7 — Routing

- [x] `apps/platform/src/routes/lazyImports.js`: add
      `export const ManageRoles = lazy(() => import('../pages/admin/ManageRoles'))`.
- [x] `apps/platform/src/routes/platformRoutes.jsx`: add `<Route path="admin/manage-roles"
      .../>` next to the existing `admin/role-assignment` block (~line 3631), same
      `<ProtectedRoute>`/`<Suspense>` wrapping.
- [ ] ~~Mirror both steps in `apps/simulator/src/routes/`~~ — **deferred**, same reason as
      Phase 6 above. `apps/simulator/src/pages/admin/ManageRoles.jsx`,
      `OrgRoleEditorModal.jsx`, and `organisationCustomRoleService.js` all exist and work —
      only the route/menu wiring is pending a decision on where Simulator's org-admin area
      should live.

## Phase 8 — Invitation & assignment flow integration

- [x] Confirm `getAssignableRoles()` (`organisationRoleService.js`, used by
      `RoleAssignment.jsx`) and the project-invitation role picker
      (`resolveInvitationRoleIdForInsert` callers / `InviteUserForm.jsx`) naturally pick up
      the new `account_id`-scoped rows once Phase 1's scoping is live — add an explicit
      `account_id` filter to whichever of those queries currently has none, so a user only
      ever sees their own org's custom roles (never another tenant's).

## Phase 9 — Tests & verification

- [x] Unit tests per Phase 2/3/4 above.
- [x] Manual pass: create a role as each of the 5 creator role types; assign it to a test user;
      confirm sidebar shows exactly the cloned-minus-excluded menu items; confirm dashboard
      title (from the earlier fix) shows the new role's display name; confirm governance
      toggle routes correctly; confirm a second test organisation cannot see/assign/collide
      with the first org's custom role; confirm delete-blocked-while-in-use and deactivate.
- [x] Targeted verification instead of a full monorepo build: `vitest run` on all new/changed
      test files (Platform + Simulator + `packages/shared`, all passing) and `eslint` spot
      checks on every new/edited file (no real errors — only pre-existing config-level
      `no-undef: console` noise already present codebase-wide). A full
      `pnpm turbo build --filter=@nidus/platform-app` / `--filter=@nidus/simulator-app` pass is
      still recommended before merge (rule 47) but wasn't run in this session.

## Phase 10 — Documentation

- [x] `Documentation/Organisation_Custom_Roles_v902_Guide.md` — user-facing guide: who can
      create roles, how cloning works, governance toggle, lifecycle (deactivate vs delete).

---

## Review section

### Summary

Implemented end-to-end for Platform, and code-complete-but-unrouted for Simulator (see
Deviations). Organisations can now create/edit/deactivate/delete their own org-wide custom
roles by cloning an existing role's permissions and sidebar menu grants, with the read-only
Governance Dashboard now a real per-role DB flag instead of a hardcoded 3-string list, and
the whole role system properly tenant-isolated for the first time (`account_id` scoping).

### Files created

- `SQL/v902_organisation_custom_roles_schema.sql` — `account_id` on `roles`/`project_roles`,
  `is_governance_only` on `project_roles`, per-org uniqueness indexes.
- `SQL/v903_organisation_custom_roles_rpcs.sql` — `slugify_role_name`,
  `user_can_manage_org_roles`, `create/update/deactivate/delete_org_custom_role`.
- `SQL/v904_organisation_custom_roles_menu.sql` — Platform sidebar entry + role grants.
- `apps/platform/src/services/organisationCustomRoleService.js` (+ Simulator mirror, +
  `__tests__` for both, 11 tests each, all passing).
- `apps/platform/src/components/app/OrgRoleEditorModal.jsx` (+ Simulator mirror).
- `apps/platform/src/pages/admin/ManageRoles.jsx` (+ Simulator mirror).
- `Documentation/Organisation_Custom_Roles_v902_Guide.md`.

### Files edited

- `packages/shared/src/utils/projectRoleDashboardUtils.js` (+ its test) — added
  `isGovernanceOnlyFromRoles`, kept `isGovernanceOnlyRole`/`GOVERNANCE_ONLY_ROLE_KEYS` as a
  documented fallback rather than removing them (nothing else in the codebase referenced them
  outside two orphaned duplicate files — see below — so no other call sites needed updating).
- `apps/platform/src/context/CurrentProjectContext.jsx` (+ Simulator mirror) — now resolves
  `isGovernanceOnly` per project from the DB flag.
- `apps/platform/src/pages/pm/PMDashboard.jsx` (+ Simulator mirror) — reads
  `currentProject.isGovernanceOnly` instead of calling `isGovernanceOnlyRole` on role-name
  strings.
- `apps/platform/src/services/roleService.js` (+ Simulator mirror) — `getUserProjectRoles`
  select now includes `is_governance_only`.
- `apps/platform/src/services/projectRoleAssignmentService.js` (+ Simulator mirror) —
  `getPmoMembershipAssignableRoles()` now scopes to the caller's own organisation's custom
  roles plus built-ins (see Deviations — this was a real gap this feature would have opened).
- `apps/platform/src/routes/lazyImports.js` + `platformRoutes.jsx` — new
  `/platform/admin/manage-roles` route (+ matching Simulator lazy import only, route deferred).

### Deviations from the plan

1. **Simulator routing deferred (Phase 6/7).** While researching where to attach the
   Simulator sidebar entry, found that Simulator's own org-admin area doesn't exist as a
   working route tree at all — `apps/simulator/src/pages/admin/RoleAssignment.jsx` (the
   sibling of the page this feature mirrors) is imported in `simulatorRoutes.jsx` but never
   rendered as a `<Route>`, and even calls `navigate('/platform/dashboard')` on its own error
   path — a URL that doesn't exist inside the Simulator SPA's router at all. This is a
   pre-existing gap, not something this feature introduced. Rather than unilaterally
   inventing a new URL namespace/route-tree design for Simulator's org-admin area as a side
   effect of this task, I left the Simulator `ManageRoles.jsx`/`OrgRoleEditorModal.jsx`/
   service fully built and working — wiring it in is a small, separate follow-up once you
   decide where Simulator's org-admin pages should actually live.
2. **Menu code naming corrected during implementation.** The plan originally guessed
   `plat_people_manage_roles`; the actual current convention (found by reading
   `v725_dedupe_people_resources_menus.sql`, which superseded the older naming) is
   `pmo-people-*` (hyphenated). Used `pmo-people-manage-roles` to match the *real* "Assign
   Roles" sibling (`pmo-people-assign-roles`), not the guessed name.
3. **Toast usage avoided.** Found that `useToast()` (`packages/shared/src/hooks/useToast.js`)
   returns `{ success, error, warning, info }`, but several existing "live" components
   (`PurchaseExtraSeatsModal.jsx`, `RoleEditorModal.jsx`, and the dead `ProjectRoles.jsx`)
   destructure a non-existent `{ showToast }` from it — a pre-existing, latent bug elsewhere
   in the codebase. Did not copy that pattern; `OrgRoleEditorModal`/`ManageRoles` use their
   own inline error banners instead, which was already the plan for surfacing RPC errors.
4. **Full monorepo build not run** (see Phase 9) — targeted `vitest` + `eslint` checks only,
   due to session time. Recommend a full `pnpm turbo build` pass before merge.

### Known follow-ups flagged, not fixed (out of this PRD's scope)

- **`bulkRoleService.js`'s `createProjectRoleTemplates`** (used by the CSV Bulk Invite flow)
  inserts new `project_roles` rows directly from the client with no `account_id` set — after
  this migration those rows land as `account_id IS NULL`, i.e. **global, built-in-equivalent
  roles visible to every organisation**, not scoped to the inviting org. This is a
  pre-existing client-side write path (also bypasses the RLS-only-via-RPC posture this
  feature establishes) that predates v902 but now interacts with the new tenant-isolation
  model. Recommend a small dedicated follow-up to scope it to `account_id` and route it
  through a SECURITY DEFINER RPC like the rest of this feature.
- **Simulator org-admin routing** (see Deviation 1 above) — needs a decision on URL/menu
  placement, not something to infer unilaterally.
