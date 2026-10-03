-- ============================================================================
-- v1135: Simulator sidebar entry for Practice Change Requests
-- ============================================================================
-- Fixes a real gap found while investigating dead Simulator code: apps/simulator/src/pages/
-- ChangeManagement.jsx, pages/change/ChangeRequestDetail.jsx, and components/change/
-- ChangeRequestForm.jsx were fully built (service layer already correctly targets
-- sim.practice_change_requests via simDb, per changeManagementService.js's own
-- "maps project_id <-> practice_project_id" adapter) but never reachable from any route or menu
-- item. Code-level fixes (project id resolution, non-modal form, list/form mutual exclusivity,
-- a resolveAuditUserLabels schema-client bug) landed alongside this SQL; new routes were added at
-- simulator/practice-change-requests (+ /:id).
--
-- v682's "Practice Controls & Registers" group (sim_grp_pm_controls) already has Risk/Issue/
-- Quality/Delay/Lessons/Configuration-Items registers but no Change Requests entry — this adds
-- the missing sibling, same group, next sort_order slot.
-- ============================================================================

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'sim_pm_change_reg', 'Change Requests', '/simulator/practice-change-requests', par.id, 3, 45, 'universal', 'git-pull-request', TRUE, TRUE, NOW(), NOW()
FROM par
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_change_reg' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role that already has the rest of sim_grp_pm_controls' children (mirrors
-- whatever role_menu_items rows already exist for its sibling sim_pm_risk_reg, so this new item
-- follows the same access model without hardcoding a role list here).
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), rmi.role_id, new_mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items rmi
JOIN public.menu_items sibling ON sibling.id = rmi.menu_item_id AND sibling.menu_code = 'sim_pm_risk_reg'
JOIN public.menu_items new_mi ON new_mi.menu_code = 'sim_pm_change_reg'
WHERE COALESCE(rmi.is_active, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1135_sim_change_requests_menu.sql applied successfully';
END $$;
