-- ============================================================================
-- v966ai: Core PM Menu Rationalisation — Phase 9: Project Closure > Closing a Project (hub)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Project Closure group,
-- continuing SQL/v966q's deliberately-partial build).
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Project Closure: Closure Checklist /
-- Final Acceptance / Outstanding Items / Handover / Lessons Learned / Benefits Transition /
-- Archive / Closure Report).
--
-- Wires the "Closing a Project" hub page as ONE combined link covering Closure Checklist /
-- Outstanding Items / Handover / Benefits Transition -- confirmed (this session) that all 4
-- concepts live as tabs/sections inside the single ClosingProject.jsx page
-- (handover_status/documentation_complete/training_complete/knowledge_transfer_complete/
-- support_arrangements fields all present on one page), not independently routable without a
-- UI refactor that is out of scope here. Final Acceptance and Archive remain documented gaps
-- (Archive was already settled out-of-scope by v966q's own investigation -- 2 different
-- existing "archive" concepts, neither maps cleanly; Final Acceptance has zero matching code
-- anywhere in the codebase) -- no SQL for either.
--
-- ** LIVE-DATA CORRECTION vs. this task's brief: the ROUTE is NOT
-- /platform/projects/:projectId/structured/closing as assumed. ** A fresh grep of
-- apps/platform/src/routes/platformRoutes.jsx found ClosingProject (imported from
-- apps/platform/src/pages/structured/ClosingProject.jsx, confirming the page file location the
-- brief named) is actually registered at path 'projects/:projectId/closure' inside the
-- 'platform/*' route prefix -- i.e. the real, reachable URL is
-- /platform/projects/:projectId/closure. No route is registered anywhere at .../structured/
-- closing (that string does not appear in any route file) -- which is exactly why the old dead
-- menu row governance_closing (is_deleted = true, stored route_path .../structured/closing) was
-- never a live link even before this initiative: its own stored route never matched a
-- registered route. This file uses the real, confirmed-registered route instead of repeating
-- that same mistake in a new row, and does NOT reactivate governance_closing.
--
-- ROUTE-PARAM SUBSTITUTION: apps/platform/src/utils/sidebarRouteUtils.js's
-- resolveMenuRoutePath() substitutes ':projectId' for any route matching '/platform/projects/'
-- (confirmed by direct read: `.replaceAll(':projectId', platformPid)`, the same mechanism
-- v966v already confirmed for the ':id'-token style) -- so the ':projectId' token used here
-- resolves correctly.
--
-- METHODOLOGY TAG: methodology = 'structured' is set as an honest metadata label reflecting the
-- page's PRINCE2/structured content -- confirmed this session to have NO visibility-filtering
-- effect. Grepped packages/config/src/*.js for every read of a menu_items row's own
-- `methodology` field: the only call site is
-- packages/config/src/pmoMenuHierarchyUtils.js's annotateTemplateRowsByMethodology(), which
-- operates on pm_template_nodes-like rows (Template Library), never on menu_items/sidebar
-- nodes. The sidebar rendering pipeline only reads categoryMethodologyTrack(catId) keyed off
-- menu_code, via TRACK_CHILD_CATEGORY_IDS in packages/config/src/methodologyMenuUtils.js --
-- confirmed plat_pm_project_closure is not a member of any of that map's structured/
-- standards_based/agile id lists, so it is not track-wrapped and this leaf's own methodology
-- value is inert for rendering purposes, exactly as the brief claimed.
--
-- GRANTS -- copied from plat_pm_lessons_ctrl (Lessons Log, the direct Project Closure sibling).
-- ** LIVE-DATA CORRECTION: fresh count is 12 active/granted roles (Content-Range 0-11/12), not
-- the brief's estimated ~18 ** -- the Phase 9 completed-groups table's original "18 roles" note
-- for v966q predates this session and the live grant set has since drifted (ordinary
-- provisioning/role-grant activity between runs, same class of drift the Run 5 harness notes
-- already documented for role_menu_items growing 9,080 -> 10,972 rows). The grant-copy INSERT
-- below reads live role_menu_items at run time regardless, so it will always pick up whatever
-- plat_pm_lessons_ctrl's actual grant set is when the user runs this file.
--
-- DEDUPE CHECK: plat_pm_project_closure's only existing child is plat_pm_lessons_ctrl (route
-- /pm/controls/lessons-log) -- no route or semantic-key overlap with the new hub's route
-- (/platform/projects/:projectId/closure). No semantic key exists for "closing a project"/
-- "closure" in pmoMenuSemanticDedupe.js. No other live row shares this exact route as a sibling
-- under plat_pm_project_closure -- no dedupe risk, no matching inferPmPlatformCategoryId change
-- needed.
-- ============================================================================

-- ── Wire "Closing a Project" under the Project Closure group ────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_project_closure_closing', 'Closing a Project',
  'Combined closure hub covering Closure Checklist, Outstanding Items, Handover, and Benefits Transition (taxonomy §3, Project Closure) -- all 4 concepts live as sections of one page. Final Acceptance and Archive remain documented gaps, not covered by this leaf.',
  '/platform/projects/:projectId/closure',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 20, 'structured', 'clipboard-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure_closing' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy grants from plat_pm_lessons_ctrl (the direct Project Closure sibling).

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_lessons_ctrl'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_project_closure_closing' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966ai_phase9_project_closure_closing_hub.sql applied successfully'; END $$;
