-- ============================================================================
-- v966ah: Core PM Menu Rationalisation — Phase 9: Resources > Assignments
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Resources group, continuing
-- SQL/v966n/v966t/v966ag's deliberately-partial build) / Phase 4's deferred "Assignments
-- regroup" bullet ("needs a UX decision about which of project-users/manager-assignments/
-- appointments becomes the anchor -- left for a follow-up pass with that decision made
-- explicit"). That decision has now been made (this task's brief): ProjectUsers is the anchor,
-- single canonical row, Resources-scoped only -- ManagerAssignments/Appointments stay exactly
-- where they are (PMO-admin-scoped tools, deliberately not folded into PM-layout Resources).
--
-- STEP 1 -- consolidate the duplicate pair pointing at the same route (/platform/project-users):
--   - plat_pm_manage_members ("Manage Members", 21 grants, PM-track row under plat_grp_pm_
--     projects) -- KEEPER (broadest).
--   - plat_members_roles ("Members & Roles", 12 grants, legacy row under plat_grp_projects) --
--     LOSER. Migrate its unique grants onto the keeper first, then deactivate.
-- Fresh live grant counts (PostgREST, this session): keeper 21 roles (Content-Range 0-20/21),
-- loser 12 roles (Content-Range 0-11/12) -- both match the brief's estimates exactly.
--
-- STEP 2 -- re-parent the keeper (same id, no additional grant migration for this step) into
-- plat_pm_resources, relabeled "Assignments" (from "Manage Members") to match taxonomy §3's
-- Resources > Assignments naming.
--
-- Deliberately NOT touched, per the user's explicit decision:
--   - plat_tl_assignments ("Team Assignments" / ManagerAssignments component,
--     /pmo-admin/manager-assignments) -- PMO-admin-scoped tool, stays under its current Team
--     Management track parent.
--   - pmo-people-manager-assignments (orphan, /platform/pmo-admin/manager-assignments) and
--     pmo-people-appointment-tracker (orphan, /platform/pmo-admin/appointments) -- both
--     confirmed live with parent_menu_id = NULL (PMO orphan-bucketed rows), left exactly as-is.
--
-- DEDUPE CHECK: plat_pm_manage_members' route (/platform/project-users) does not match any of
-- pmoMenuSemanticDedupe.js's peopleLeafSemanticKey() regexes ("add users" only matches
-- "project.members"/"project-members" text, which plat_pm_manage_members' own code/label/route
-- does not contain) or any other semantic key -- confirmed via fresh grep. No orphan row shares
-- its exact route either (pmo-people-add-users points at the DIFFERENT route /platform/
-- project-members, a distinct page) -- unlike the Capacity/Resource Directory moves (v966n/
-- v966t), no matching inferPmPlatformCategoryId regex-split fix is needed here.
-- ============================================================================

-- ── Step 1: migrate plat_members_roles' unique grants onto plat_pm_manage_members ───────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'plat_members_roles'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_manage_members' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_members_roles' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'plat_members_roles' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- ── Step 2: re-parent the keeper into Resources, relabeled "Assignments" ────────────────────
-- Same-id re-parent (no grant migration needed for this step -- Step 1 already handled the
-- loser's grants).

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 50,
    menu_label = 'Assignments',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_manage_members' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966ah_phase9_resources_assignments.sql applied successfully'; END $$;
