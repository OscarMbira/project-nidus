-- =============================================================================
-- v724: Remove duplicate Workflows & Approvals menu rows
-- Keeps canonical v671 codes; hides legacy plat_wf_*, pmo_workflows_*, pmo_admin_* duplicates
-- =============================================================================

UPDATE public.menu_items
SET is_visible = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code IN (
  'plat_wf_mandate_approvals',
  'plat_wf_brief_approvals',
  'pmo_workflows_mandate_pending',
  'pmo_workflows_brief_pending',
  'pmo_admin_mandates_pending_approvals',
  'pmo_admin_briefs_pending_approvals'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Ensure canonical workflow approval leaves exist with correct routes (for role_menu_items)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_workflows_approvals' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-workflows-mandate-approvals', 'Mandate Approvals',        '/platform/mandates/approvals', 10, 'file-check'),
  ('pmo-workflows-brief-approvals',   'Project Brief Approvals',  '/platform/briefs/approvals',   20, 'file-check')
) AS v(mc, ml, rp, so, ic)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND mi.menu_code IN ('pmo-workflows-mandate-approvals', 'pmo-workflows-brief-approvals')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v724_dedupe_workflow_approval_menus.sql applied'; END $$;
