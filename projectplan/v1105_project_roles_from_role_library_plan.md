# v1105 — Add Project Roles from the Built-in Role Library — Implementation Plan

**PRD:** `projectprd/v1105_project_roles_from_role_library_PRD.md`
**Status:** Implemented (2026-09-25). SQL migrations run successfully (2026-09-25) — only manual click-through verification remains, see Review section.

Delivered as vertical slices (rule 17.2). SQL in `E:\project-nidus\SQL\` only (public + sim); no Admin repo change.

---

## Phase 0 — SQL (must be run by the user in order)

- [x] `SQL/v1108_project_roles_role_skills.sql`
  - `ALTER TABLE public.project_roles ADD COLUMN IF NOT EXISTS role_skills TEXT;` (+ column comment)
  - `ALTER TABLE public.project_functional_roles ADD COLUMN IF NOT EXISTS source_project_role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL;` + index
  - Same for `sim.practice_project_functional_roles` (FK to `public.project_roles`)
  - No new table → no `database_tables` row, no Admin `id_generation_rules` (no reference column).
- [x] `SQL/v1109_built_in_role_skills_seed.sql`
  - Idempotent `UPDATE public.project_roles … FROM (VALUES (role_name, skills), …)` for all ~100 built-in
    `role_name`s (sources: v91 ×9, v355 ×1, v907 ×38, v913 ×52). 2–3 skills each, newline-joined.
  - Guard `WHERE role_skills IS NULL OR btrim(role_skills) = ''` — never overwrites a System Admin edit.
  - Ends with a `RAISE NOTICE` listing any built-in still lacking skills (expected: none).
- [x] `SQL/v1110_role_functions_required_skills.sql`
  - `DROP FUNCTION` old signatures + `CREATE` with new `p_role_skills TEXT DEFAULT NULL`, then **re-`GRANT`
    and re-`COMMENT` on the new signatures** (v903 line 259 / v910 lines 115,121 name the old ones):
    `create_org_custom_role` (base v912), `update_org_custom_role` (base v903), `update_builtin_role`
    (base v910). Existing auth checks (`user_can_manage_org_roles`, `is_system_admin_user`) unchanged.
  - Each **raises** if the resulting skills are blank (`update_*`: NULL param keeps existing value; raises
    only if the final value is blank).
  - New `SECURITY DEFINER` `fill_org_custom_role_skills_if_blank(p_project_role_id, p_role_skills)`:
    no-op returning `false` unless role is custom (`account_id IS NOT NULL`), caller belongs to that
    account, and current skills are blank; else sets and returns `true`.

## Phase 1 — Role capture: mandatory skills (Platform)

- [x] `services/organisationCustomRoleService.js`: add `role_skills` to `getCloneSourceRoles`,
  `ROLE_BY_ID_SELECT`, `getOrgCustomRoles`; pass `roleSkills` → `p_role_skills` in `createOrgCustomRole`,
  `updateOrgCustomRole`, `updateBuiltinRole`.
- [x] `pages/admin/OrgRoleDetail.jsx`: **Required skills** field (`MultiLineListInput`, `viewModeId`
  `org-role-skills`), included in `loadRole`, `baselineSnapshot`, `isDirty`, `handleSubmit` validation
  (≥ 1 line), view mode read-only.
- [x] `pages/admin/SystemRoleEditPage.jsx`: same field for System Admin built-in edit.

## Phase 2 — Platform: Add from Built-in Roles

- [x] `services/projectRoleLibraryService.js` (new): `listRoleLibrary()`
  (built-in + custom, active, `role_skills` included), `addRolesFromLibrary(projectId, picks[])` (insert /
  reactivate by case-insensitive label with `required_skills` + `source_project_role_id`; then
  `fill_org_custom_role_skills_if_blank` for custom picks), reuse `getCurrentUserAccountId`.
- [x] `pages/platform-app/ProjectFunctionalRoleFromLibrary.jsx` (new, route
  `/platform/project-roles/from-library`): Back button + unsaved guard; parallel load
  (`Promise.all`: project + library + existing catalog — rule 66); search; industry `SelectField`
  defaulting to `projects.industry_category_id`; Table-List default / Card toggle with `#` numbers,
  sortable headers, default sort A→Z then `created_at`, pagination; tick boxes; "Already
  added" rows disabled; per-ticked-row skills editor prefilled from `role_skills`; **Add selected**
  (disabled until each has ≥ 1 skill); success modal with `onOk` → back; theme-aware; PWA-friendly.
- [x] `pages/platform-app/ProjectFunctionalRolesPage.jsx`: **Add from Built-in Roles** button (dirty-guarded
  like the existing links).
- [x] Routes: `lazyImports.js`, `platformRoutes.jsx` (`project-roles/from-library`), `routeCommon.jsx`.

## Phase 3 — Simulator parity (rule 34.1)

- [x] Copy Phase 1 to `apps/simulator` (`organisationCustomRoleService.js`, `OrgRoleDetail.jsx`,
  `SystemRoleEditPage.jsx`) — routes stay `simulator/pmo/manage-roles`, `simulator/pmo/system-roles`.
- [x] `services/sim/projectRoleLibraryService.js` (new) writing `sim.practice_project_functional_roles`
  (+ `source_project_role_id`); library read from `public.project_roles` via the existing client.
- [x] `pages/simulator/PracticeProjectFunctionalRoleFromLibrary.jsx` (route
  `simulator/practice-project-roles/from-library`) + button on `PracticeProjectFunctionalRolesPage.jsx`;
  industry filter always "All industries" (sim.practice_projects has no industry column at all — see Review).
- [x] Routes: Simulator `lazyImports.js`, `simulatorRoutes.jsx`, `routeCommon.jsx`.
- Note: `apps/simulator/src/pages/platform-app/ProjectFunctionalRole*.jsx` are Platform-page copies — verified
  unmounted; only the live `PracticeProjectFunctionalRolesPage.jsx` was touched.

## Phase 4 — Tests, docs, review

- [x] Unit tests: `projectRoleLibraryService.test.js` (Platform), `services/sim/__tests__/
  projectRoleLibraryService.test.js` (Simulator) — 5/5 passing each.
- [x] Dev-server compile check of every new/changed file in both apps (duplicate-import check, rule 35).
- [x] `Documentation/Project_Roles_From_Role_Library_v1105_Guide.md` (feature guide + SQL run order + verify queries).
- [x] No `menu_items` change → taxonomy doc (rule 70) and `ROADMAP.md` unchanged.
- [ ] Review section below; `REVIEW.md` checks — pending the user's SQL run + manual click-through.

## Phase 5 — User actions after implementation

1. Run `v1108 → v1109 → v1110` in Supabase.
2. Run the verify queries in the guide (no built-in without skills; functions reject blank skills).
3. Manual click-through in Platform and Simulator (see PRD §e).

## Open point for approval

`bulkRoleService.createProjectRoleTemplates` and `projectRoleService.createCustomRole/updateRole` write
`project_roles` directly and are **not** covered by the mandatory-skills rule (bulk-invite placeholder roles
and per-project roles). Recommended: leave unchanged now. If you want a hard guarantee for those too, add a
DB trigger on catalog roles — but it would break bulk invite unless those flows are changed as well.

---

## Review section

**Phases 0–4 are implemented and verified to compile; Phase 5 is the user's to run.**

Verification performed this session:

- Every new/changed `.jsx`/`.js` file was fetched through each app's live Vite dev server
  (Platform on :5173, already running; Simulator on :5174, started temporarily and stopped
  afterwards) and checked for `SyntaxError` / `Unexpected token` / duplicate-identifier /
  unresolved-import errors — all clean.
- New unit tests (`projectRoleLibraryService.test.js`, Platform + Simulator) run via
  `vitest run`: **5/5 passing** each.
- A broader `vitest run src/services/__tests__/` regression pass on Platform's full service test
  tree (153 files, 911 tests) surfaced a **pre-existing test suite I hadn't checked before editing
  the service**: `organisationCustomRoleService.test.js` (both apps) asserts exact RPC call
  payloads via `toHaveBeenCalledWith`/`toEqual`, and 4 of its 33 tests broke because they didn't
  expect the new `p_role_skills` field. Fixed all 8 assertions (4 per app) to include
  `p_role_skills: null` — both suites are back to 33/33 passing. Grepped every `*.test.js` in both
  apps for the touched function names to confirm no other test file needed the same fix. The
  broader run's remaining ~38 failing files (e.g. `sim/practiceTaskService.test.js`) are unrelated
  to this feature — pre-existing failures in files this change never touches.

**Not yet done — requires the user's live Supabase environment (no DB execution tool available in
this session):**

1. ~~Run `SQL/v1108 → v1109 → v1110` in order.~~ — **done, confirmed run successfully by the user
   on 2026-09-25.**
2. Run the verify query in the guide (zero built-in roles with blank `role_skills` after v1109).
3. Manual click-through (both apps): add roles from the library with edited skills; confirm a
   custom role's own skills get backfilled when blank and left alone when already set; confirm a
   built-in role's skills are never modified by the picker; confirm Create/Edit Role and the
   System Admin built-in editor block saving without skills; confirm "Already added" roles are
   locked and don't duplicate on repeated adds.

**Design deviations from the original plan sketch worth noting:**

- **Simulator's industry filter is not just defaulted differently — `sim.practice_projects` has
  no industry column at all**, confirmed by grepping the SQL history before writing the picker.
  The Simulator picker's industry filter always starts on "All industries"; there is no per-project
  default to fall back from.
- **No Export button on either picker page.** Rule 38 asks for export on tables/lists, but this
  page is a bulk-selection utility over the role catalog, not a persisted register of its own —
  it falls under the same "bulk-action/picker" exclusion rules 63.1 and 65 already carve out for
  Audit tabs and modal replacement. Sortable Table-List/Card toggle with row numbers (rules
  40/41/44) were kept since the page is still a list of individually selectable rows.
- **No Audit tab on either picker page**, same reasoning (rule 63.1's bulk-action exclusion) —
  added roles are audited on the existing *Audit Details* tab of Project Roles & Skills /
  Practice Project Roles & Skills, which already existed before this feature.
- `getCloneSourceRoles`'s existing signature (`accountId` as a parameter) was kept as-is;
  `listRoleLibrary()` in the new service resolves the account itself via
  `getCurrentUserAccountId()` rather than taking it as a parameter, which is why the plan
  sketch's `listRoleLibrary(accountId, industryCategoryId?)` signature isn't literally what
  shipped — industry filtering happens client-side in the picker page instead, since the full
  library list is small (~100+ rows) and is already being fetched in full either way.

**Open point still awaiting your answer:** `bulkRoleService.createProjectRoleTemplates` and
`projectRoleService.createCustomRole`/`updateRole` write `project_roles` directly and remain
outside the mandatory-skills guarantee (see "Open point for approval" above). No change was made
to either file this session.

**Files touched (summary):**

- New SQL: `SQL/v1108`–`v1110` (3 files).
- New Platform files: `services/projectRoleLibraryService.js`,
  `pages/platform-app/ProjectFunctionalRoleFromLibrary.jsx`,
  `services/__tests__/projectRoleLibraryService.test.js`.
- New Simulator files: `services/sim/projectRoleLibraryService.js`,
  `pages/simulator/PracticeProjectFunctionalRoleFromLibrary.jsx`,
  `services/sim/__tests__/projectRoleLibraryService.test.js`.
- Changed (both apps): `organisationCustomRoleService.js`, `pages/admin/OrgRoleDetail.jsx`,
  `pages/admin/SystemRoleEditPage.jsx`, the Roles & Skills list page (button), route files
  (`lazyImports.js`, `platformRoutes.jsx`/`simulatorRoutes.jsx`, `routeCommon.jsx`).
- Docs: `Documentation/Project_Roles_From_Role_Library_v1105_Guide.md`.
