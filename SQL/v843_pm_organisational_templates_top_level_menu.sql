-- =============================================================================
-- v843: Promote PM "Templates" out of Projects → top-level Organizational Templates
-- Route stays /platform/templates (redirects to organisational with project context).
-- =============================================================================

UPDATE public.menu_items AS mi
SET
  parent_menu_id = sec.id,
  menu_level = COALESCE(sec.menu_level, 1) + 1,
  menu_label = 'Organizational Templates',
  menu_description = 'Templates in effect for the current project (project copy or nearest tier above)',
  route_path = '/platform/templates',
  sort_order = 25,
  menu_icon = COALESCE(NULLIF(mi.menu_icon, ''), 'library'),
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE mi.menu_code = 'plat_pm_templates'
  AND sec.menu_code = 'plat_sec_universal'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(sec.is_deleted, FALSE) = FALSE;

-- Idempotent label fix if the row was already reparented but still says "Templates"
UPDATE public.menu_items
SET
  menu_label = 'Organizational Templates',
  updated_at = NOW()
WHERE menu_code = 'plat_pm_templates'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND menu_label IS DISTINCT FROM 'Organizational Templates';

-- Ensure the leaf exists even if v681 seed was skipped in an environment
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pm_templates',
  'Organizational Templates',
  'Templates in effect for the current project (project copy or nearest tier above)',
  sec.id,
  COALESCE(sec.menu_level, 1) + 1,
  25,
  '/platform/templates',
  'library',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS sec
WHERE sec.menu_code = 'plat_sec_universal'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE menu_code = 'plat_pm_templates'
      AND COALESCE(is_deleted, FALSE) = FALSE
  )
LIMIT 1;

-- Keep role grants that already exist; re-assert for common PM roles if missing
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pm_templates'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'project_manager', 'portfolio_manager', 'programme_manager',
    'pmo_admin', 'system_admin', 'account_owner',
    'PMO Admin', 'System Admin', 'Superuser',
    'Project Manager', 'Portfolio Manager', 'Programme Manager'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();
