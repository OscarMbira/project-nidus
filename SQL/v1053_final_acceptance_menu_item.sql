-- ============================================================================
-- v1053: Add "Final Acceptance" as its own findable menu item under Project Closure
-- ============================================================================
-- Follow-up to v1052: Final Acceptance's fields (deliverables_acceptance_status /
-- outstanding_deliverables / board_approval_date) were added to the existing "Closing a
-- Project" > Closure tab's "Approval & Final Acceptance" section — reported live (2026-09-12)
-- as "not showing" because it had no sidebar entry of its own, only reachable by opening
-- "Closing a Project" and finding the right tab manually.
--
-- Companion frontend change adds a ?section=approval deep link so this menu item opens
-- "Closing a Project" with the Closure tab's form already open on the Approval & Final
-- Acceptance section — same page as "Closing a Project" (deliberately, per the same
-- one-page-many-facets pattern used throughout this taxonomy), but independently findable in
-- the sidebar as its own leaf, same precedent as Planning Assumptions / RAID Assumptions
-- cross-listing the same register from two taxonomy locations.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_closure_acceptance', 'Final Acceptance',
  'Formal sign-off that this project''s deliverables have been accepted (taxonomy §3, Project Closure). Opens Closing a Project on the Approval & Final Acceptance section.',
  '/platform/projects/:projectId/closure?section=approval',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
  15, 'structured', 'check-circle', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_closure_acceptance' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role already granted the Project Closure group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_project_closure'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_closure_acceptance' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1053: Final Acceptance menu item added under Project Closure';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items WHERE menu_code = 'plat_pm_closure_acceptance';
