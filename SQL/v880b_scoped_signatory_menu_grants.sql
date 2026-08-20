-- =============================================================================
-- v880b: Document Signatory menu grants for Portfolio / Programme / Project managers
-- Deep-link same page with ?scopeType=… (entity picked in UI).
-- =============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat_tpl_signatory_requirements', 'sim_tpl_signatory_requirements')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'portfolio_manager',
    'programme_manager',
    'project_manager',
    'Portfolio Manager',
    'Programme Manager',
    'Project Manager'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Keep route on existing leaf; managers land on org scope and switch via Scope control.
UPDATE public.menu_items
SET menu_description = 'Configure required signatory role-slots per document type (Organisation defaults; Portfolio / Programme / Project overrides)',
    updated_at = NOW()
WHERE menu_code IN ('plat_tpl_signatory_requirements', 'sim_tpl_signatory_requirements');

DO $$
BEGIN
  RAISE NOTICE 'v880b_scoped_signatory_menu_grants.sql applied';
END $$;
