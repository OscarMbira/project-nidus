# v906 — Industry Role Catalog, Searchable Built-in Roles, and Level-Based Assignment Restriction

PRD: `projectprd/v906_industry_role_catalog_and_level_restriction_PRD.md`

## Context found during investigation

Role options are currently sourced by **at least 4 separate, duplicated functions**, none of
which apply any level-based restriction:
- `orgAdminService.getProjectRoles(projectId)` — used by `AssignRolesToProjects.jsx`
- `pmoAdminService.getAssignableRolesForPMOAdmin()` — used by `SendRoleInvites.jsx`
- `bulkRoleService.fetchAvailableRoles()` — used by `BulkInviteForm.jsx`
- `RoleAssignment.jsx` uses `organisationRoleService` + `roleService.getUserSystemRoles`
- `InviteUserForm.jsx` and `EditMemberRoleModal.jsx` receive roles via `loadInvitationProjectContext`
  / parent props rather than fetching directly

Rather than bolt level-filtering onto 4+ places independently (guaranteed drift), this plan
centralizes role-list resolution behind one new SECURITY DEFINER RPC and points every consumer
at it. `menu_items` (sidebar) is confirmed shared `public` schema infra read by both Platform and
Simulator (`apps/simulator/src/hooks/useMenu.js` queries `platformDb.from('menu_items')`), so the
Simulator menu wiring is new rows in `public.menu_items`, not a `sim.*` table.

Simulator confirmed gap: `RoleAssignment` is imported into `simulatorRoutes.jsx` but never mounted
as a `<Route>`; `ManageRoles` isn't imported at all.

## Todo checklist

### Phase 1 — Schema ✅ COMPLETE
- [x] `SQL/v906_industry_categories_schema.sql`: new `public.industry_categories` table (id, name,
      is_active, created_at, updated_at) + nullable `industry_category_id` FK on `project_roles`
      and `roles`. Registered in `database_tables` per the Database Table Registration Rule. No
      Admin ID Generation needed (no display-id/reference column on this table — rule 16.2 only
      applies when one exists). **Run against the DB and confirmed working.**

### Phase 2 — Seed data ✅ COMPLETE
- [x] `SQL/v907_industry_role_catalog_seed_data.sql`: idempotent seed of 10 `industry_categories`
      rows (9 industries + Cross-Industry) and **38** new roles (PRD's table totalled 38, not 36 —
      corrected during implementation) from the PRD's table, each inserted as:
      1. A `project_roles` template row (`account_id IS NULL`, `is_template = TRUE`, `role_level`
         per its tier, `industry_category_id` set, `is_governance_only` set for the 2 Level-11
         roles to match their `project_sponsor` source tier).
      2. A matching `roles` row under the same `role_name` (v902 "matching rows in both tables"
         pattern).
      3. `role_menu_items` grants copied from each tier's source role — **with one correction**:
         the 6 Level-10 "Programme Manager"-tier roles (IT Programme Manager, Healthcare Programme
         Director, etc.) copy from `programme_manager`, not `portfolio_manager` as first drafted —
         `portfolio_manager` is one of v902's 3 governance-only roles, and these are meant to be
         operational multi-project coordinators, not oversight-only.
      Uses `ON CONFLICT` on the natural unique keys (idempotent) rather than fixed UUIDs.
      **Run against the DB — confirmed live (48 Built-in Roles = 10 original + 38 new).**

### Phase 3 — Centralized assignable-roles RPC ✅ COMPLETE
- [x] `SQL/v908_get_assignable_project_roles_rpc.sql`: `public.get_assignable_project_roles(
      p_account_id uuid, p_project_id uuid DEFAULT NULL)`. **Design changed from the plan's
      original wording** after discovering `roles.role_level` (5–100 scale) and
      `project_roles.role_level` (4–12 scale) are two *different* scales that share role names —
      comparing them directly would have been meaningless. The restriction operates entirely
      within the `project_roles` scale:
      - Org-wide admin tiers (pmo_admin/system_admin/super_admin/account_owner/org_admin) get an
        **explicit bypass** (this does not "fall out naturally" as decision 4 assumed — the scale
        mismatch means it has to be a real bypass).
      - Everyone else is capped at their highest `project_roles.role_level` across active
        `project_memberships` (scoped to `p_project_id` when given).
      **Run against the DB and confirmed working.**

### Phase 4 — Point existing callers at the new RPC ✅ COMPLETE (5 of 6 surfaces; 1 deliberately excluded)
- [x] `orgAdminService.getProjectRoles` → calls the RPC (team-tier exclusion preserved).
- [x] `pmoAdminService.getAssignableRolesForPMOAdmin` → calls the RPC (team/admin-tier exclusion
      preserved, 60s cache kept).
- [x] `bulkRoleService.fetchAvailableRoles` → calls the RPC.
- [x] `InviteUserForm.jsx` / `SendRoleInvites.jsx` → traced to
      `projectRoleAssignmentService.getPmoMembershipAssignableRoles` /
      `getProjectManagerAssignableRoles`, both now call the RPC (the latter still narrowed to its
      original 5-role team-tier whitelist).
- [x] `EditMemberRoleModal.jsx` (via `ProjectUsers.jsx`) → traced to the **same**
      `projectRoleAssignmentService` functions above; fixed automatically as a side effect, no
      separate change needed.
- [x] **`RoleAssignment.jsx`'s role source (`organisationRoleService.getAssignableRoles`) —
      deliberately left unchanged.** On inspection this queries the org-scale `roles` table for a
      hardcoded 5-role whitelist (programme_manager, project_manager, project_board_member,
      project_assurance, quality_assurance) for assigning *organisation-wide* roles — a different,
      narrower concept than the project-tier catalog this RPC serves, and the page is already
      PMO-Admin-gated (so the level restriction is moot for its actual users anyway). Rewiring it
      would have widened this deliberately narrow picker to the full 48-role catalog, an
      unrequested behaviour change.
- [x] Deleted the now-dead duplicated query logic in each function switched over.
- [x] **Found and fixed a real bug** this work exposed: `OrgRoleEditorModal.jsx` looked up menu
      grants using the modal's own `accountId` prop instead of the viewed role's own
      `role.account_id` — harmless while built-in roles had no View button, broken once Phase 5
      added one. Fixed in both Platform and Simulator copies; also added `account_id` to
      `getOrgCustomRoles`'s select (it was missing, which the fix depends on).

### Phase 5 — Built-in Roles table UI ✅ COMPLETE
- [x] `ManageRoles.jsx`: Built-in Roles converted to a full table mirroring Custom Roles — search,
      sort, Card/Table toggle (`useViewMode('manage-roles-builtin', 'list')`), row numbers, and a
      View-only `RowActionButton`. Industry filter `<select>` added.
- [x] `getCloneSourceRoles` extended to select `industry_category_id` +
      `industry_category:industry_categories(id, name)`, plus `is_active`/`created_at`/
      `updated_at` (needed for the Audit tab, previously missing for built-ins).
      New `getIndustryCategories()` added for the filter dropdown's options.
      **Confirmed working live** — screenshot shows 48 searchable/sortable/filterable roles.

### Phase 6 — Simulator parity ✅ COMPLETE
- [x] Simulator has its own `routeCommon.jsx` (missed in the earlier investigation) — `ManageRoles`
      was missing from both its LP-destructure and export blocks, same class of bug fixed earlier
      this session for Platform; fixed in both places.
- [x] `apps/simulator/src/routes/simulatorRoutes.jsx`: added `simulator/pmo/role-assignment` and
      `simulator/pmo/manage-roles` routes (Simulator uses full `simulator/pmo/*`/`simulator/pm/*`
      paths, not Platform's `admin/*` shorthand — mirrors the neighbouring
      `simulator/pmo/manager-assignments` route's exact wrapper structure).
- [x] `SQL/v909_simulator_manage_roles_menu.sql`: menu items nested under `sim_pmo_cat_admin`
      (Simulator's PMO layout has no dedicated Teams/People category unlike Platform's
      `pmo-cat-teams`), granted to the same creator-tier roles as Platform's v904/v905. **Run
      against the DB and confirmed working.**
- [x] Fixed hardcoded `navigate('/platform/dashboard')` in both Simulator's `ManageRoles.jsx` and
      `RoleAssignment.jsx` (dead code before this change, so harmless until now) → now navigates
      to `/simulator/pmo/dashboard`.
- [x] Synced 6 drifted Simulator service-file duplicates that were identical to Platform's
      pre-change versions but missing this change's additions: `organisationCustomRoleService.js`,
      `orgAdminService.js`, `pmoAdminService.js`, `bulkRoleService.js`,
      `projectRoleAssignmentService.js`, and the `OrgRoleEditorModal.jsx` account_id fix.

### Phase 7 — Tests ⚠️ PARTIAL
- [x] Unit tests for `getAssignableProjectRoles`/`getIndustryCategories` added to
      `organisationCustomRoleService.test.js` (both Platform and Simulator copies) — 15/15 passing
      on both apps.
- [ ] **Not done**: RPC-level SQL tests for `get_assignable_project_roles` (no live DB access this
      session to write/verify against). **Not done**: dedicated tests for the 4 rewired service
      functions (`orgAdminService`, `pmoAdminService`, `bulkRoleService`,
      `projectRoleAssignmentService`) — none existed before this change either, so not a
      regression, but still a gap. **Not done**: `ManageRoles.test.jsx` component test for the new
      Built-in Roles table (no existing admin-page component test convention in this codebase to
      follow, and lower priority than the service-layer logic given no live DB to test against
      end-to-end). Recommend a follow-up pass once there's DB access to verify against.

### Phase 8 — Review
- [x] All 17 touched JS/JSX files pass `esbuild` syntax validation.
- [x] `routeCommon.jsx` export/scope consistency verified programmatically for both apps (every
      name `platformRoutes.jsx`/`simulatorRoutes.jsx` imports from `routeCommon` actually exists
      there, and every name `routeCommon` exports is actually in scope).
- [x] New/updated unit tests pass (15/15) on both Platform and Simulator.
- [ ] Broader existing test suite run — in progress (background), full REVIEW.md checks not yet
      run.
- [x] Live-verified in the browser: "Manage Roles" → 48 Built-in Roles, search/sort/industry
      filter all working (user-confirmed screenshot).
- [x] No `ROADMAP.md` update needed (feature delivery within an already-tracked area).

## Review

**Status: live and working (Platform confirmed; Simulator routed but not yet manually verified
in-browser).**

Delivered all 6 phases from the approved plan, with three notable deviations discovered during
implementation (all documented inline above): the RPC needed a real admin-tier bypass rather than
one that "falls out naturally" (role_level is two different scales, not one); the 6 Programme
Manager-tier roles needed to copy grants from `programme_manager` instead of the governance-only
`portfolio_manager`; and `RoleAssignment.jsx` was deliberately left out of the RPC rewiring because
it's a narrower, different concept than the rest of the picker surfaces.

**Files changed:**
- SQL: `v906` (schema), `v907` (38-role seed), `v908` (RPC), `v909` (Simulator menu) — all 4 run
  against the DB and confirmed working.
- Services (Platform + Simulator, kept in sync): `organisationCustomRoleService.js`,
  `orgAdminService.js`, `pmoAdminService.js`, `bulkRoleService.js`,
  `projectRoleAssignmentService.js`.
- UI: `ManageRoles.jsx` (Built-in Roles table), `OrgRoleEditorModal.jsx` (account_id bug fix) —
  Platform + Simulator.
- Routing: `simulatorRoutes.jsx`, `routeCommon.jsx` (Platform's own gap from earlier in this
  session, and a matching gap discovered in Simulator's copy of the same file).
- Tests: `organisationCustomRoleService.test.js` extended on both apps, 15/15 passing.

**Known gaps** (see Phase 7): no RPC-level SQL tests, no dedicated tests for the 4 rewired service
functions (pre-existing gap, not a regression), no `ManageRoles.test.jsx` component test. All
recommended as a follow-up once there's a way to verify against a live DB in-session.

**Not touched, by design:** `SQL/v905_manage_roles_menu_grants.sql` (pre-existing, unrelated
PM-layout sidebar fix sitting uncommitted in the tree — separate from this work).

## Follow-up: v910–v913 (non-modal conversion, System Role Catalog, catalog expansion to 100)

Later work on this same feature (all in the same session, not separately PRD'd since each was a
direct, unambiguous user instruction extending the already-approved v906 mechanism, not a new
architectural decision):

- **v910** — Converted the Create/View/Edit Role modal (`OrgRoleEditorModal`) to a non-modal
  routed page (`OrgRoleDetail.jsx`, `admin/manage-roles/create` · `:id` · `:id/edit`), per new
  CLAUDE.md rule 65. Also switched role URLs to use the friendly `role_name` slug instead of the
  raw UUID (new CLAUDE.md rule 16.3), via a `getRoleById` that resolves either.
- **System Role Catalog** (`SystemRoleCatalog.jsx` / `SystemRoleEditPage.jsx`, own PRD/plan —
  `v910_system_role_catalog_management_PRD.md`) — separate system_admin/super_admin-only surface
  for editing the shared built-in catalog itself, since v906/v907's built-ins are otherwise
  immutable by design.
- **v912** — Custom Roles' "Create Role" no longer requires cloning an existing role (built-ins
  are unchangeable, so a mandatory clone step read as editing them by proxy). Now a genuine
  from-scratch builder: name, description, level, governance flag, and a checklist of every menu
  item any built-in role has (`getGrantableMenuItems`, deduped **by label** — menu-schema history
  means the same functional item is often seeded under several `menu_items` rows with identical
  labels but different, sometimes-irrelevant query-string variants; showing those raw routes to
  an admin was more confusing than useful, so the picker never surfaces them). Added a live
  sidebar preview panel next to the picker. Fixed a real bug this surfaced: the View page's
  "Close" button was nested inside `<fieldset disabled={readOnly}>`, which natively disables
  every descendant control including it — moved the action-button row outside the fieldset.
- **v913** — Expanded the built-in catalog from 48 to 100 roles: 2 new industry categories
  (Human Resources, Legal & Compliance) + 52 new roles, filling the most glaring gap (IT &
  Software had zero actual Developer roles) plus rounding out every other industry. Same
  tier-bucketing/grant-copying mechanism as v907, no new architecture.

**SQL status: v906–v913 all run against the DB, user-confirmed successful.** Full chain (schema,
seed, RPCs, menus, expansion) is live.

## Explicitly not doing (per PRD out-of-scope)

- Searchable/typeahead role dropdowns (UI polish, not requested once clarified).
- Auditing other parts of the app for hardcoded role lists.
- Running the pre-existing `SQL/v905_manage_roles_menu_grants.sql` (unrelated PM-layout fix).
- Per-project custom roles, field-level audit history.
