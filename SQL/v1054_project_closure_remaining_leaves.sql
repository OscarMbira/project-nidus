-- ============================================================================
-- v1054: Add the 5 remaining Project Closure taxonomy leaves as their own
-- findable sidebar menu items
-- ============================================================================
-- Follow-up to v1052 (Archive) / v1053 (Final Acceptance). User confirmed live
-- (2026-09-12) that "Closing a Project" only exposes itself + "Lessons Log" in
-- the sidebar, hiding the following taxonomy leaves as unlabeled tabs inside
-- it: Closure Checklist, Outstanding Items, Handover, Benefits Transition,
-- Closure Report. Per the user's explicit instruction ("Make sure the other
-- menus are showing on the sidebar"), each gets its own sidebar entry that
-- deep-links into the relevant tab/section of the existing hub page — same
-- one-page-many-facets pattern as v1053's Final Acceptance.
--
-- Companion frontend change (ClosingProject.jsx) already reads both ?tab= and
-- ?section= to open the right tab / auto-open the closure form on the right
-- section. menuPathIsActive() in sidebarRouteUtils.js was also updated so the
-- bare "Closing a Project" link no longer double-highlights alongside these.
--
-- Mapping (confirmed live against ClosingProject.jsx's renderTabContent()):
--   Closure Checklist    -> ?tab=closure   (closure_type/status/phase, checklist_completion_percentage)
--   Outstanding Items    -> ?tab=actions   (Follow-on Actions)
--   Handover              -> ?tab=handover  (existing Handover tab)
--   Closure Report        -> ?tab=end-report (End Project Report summary + link to full flow)
--   Benefits Transition   -> ?tab=closure&section=benefits (ProjectClosureForm's Benefits & Finance
--                             section, which holds benefits_transition_status)
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT v.id, v.menu_code, v.menu_label, v.menu_description, v.route_path,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
       (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
       v.sort_order, 'structured', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  (gen_random_uuid(), 'plat_pm_closure_checklist', 'Closure Checklist',
   'Closure type, status, phase, and checklist completion for this project (taxonomy §3, Project Closure). Opens Closing a Project on the Closure tab.',
   '/platform/projects/:projectId/closure?tab=closure', 11, 'list-checks'),
  (gen_random_uuid(), 'plat_pm_closure_outstanding', 'Outstanding Items',
   'Follow-on actions still open at project closure (taxonomy §3, Project Closure). Opens Closing a Project on the Outstanding Actions tab.',
   '/platform/projects/:projectId/closure?tab=actions', 12, 'list-todo'),
  (gen_random_uuid(), 'plat_pm_closure_handover', 'Handover',
   'Handover details and sign-off for this project (taxonomy §3, Project Closure). Opens Closing a Project on the Handover tab.',
   '/platform/projects/:projectId/closure?tab=handover', 13, 'handshake'),
  (gen_random_uuid(), 'plat_pm_closure_benefits_transition', 'Benefits Transition',
   'Transition of benefits ownership to business-as-usual at closure (taxonomy §3, Project Closure). Opens Closing a Project''s Approval & Final Acceptance form on the Benefits & Finance section.',
   '/platform/projects/:projectId/closure?tab=closure&section=benefits', 16, 'trending-up'),
  (gen_random_uuid(), 'plat_pm_closure_report', 'Closure Report',
   'End Project Report summary for this project (taxonomy §3, Project Closure). Opens Closing a Project on the End Project Report tab.',
   '/platform/projects/:projectId/closure?tab=end-report', 17, 'file-text')
) AS v(id, menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant each to every role already granted the Project Closure group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_project_closure'
JOIN public.menu_items dst ON dst.menu_code IN (
  'plat_pm_closure_checklist', 'plat_pm_closure_outstanding', 'plat_pm_closure_handover',
  'plat_pm_closure_benefits_transition', 'plat_pm_closure_report'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1054: Closure Checklist / Outstanding Items / Handover / Benefits Transition / Closure Report menu items added under Project Closure';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_closure_checklist','plat_pm_closure_outstanding','plat_pm_closure_handover','plat_pm_closure_benefits_transition','plat_pm_closure_report');
