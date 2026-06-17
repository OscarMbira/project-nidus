-- =============================================================================
-- v714: Add Organisational Process Assets (OPA) under Governance & Standards
-- after EEF; retire duplicate Process Assets browse row from Knowledge.
-- Runtime: src/config/v671PmoMenuCanonical.js
-- =============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_s_opa',
  'Organisational Process Assets (OPA)',
  '/platform/opa',
  par.id,
  3,
  65,
  'structured',
  'library',
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM public.menu_items AS par
WHERE par.menu_code = 'plat_grp_gov_standards'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM public.menu_items AS existing
    WHERE existing.menu_code = 'plat_s_opa'
      AND COALESCE(existing.is_deleted, FALSE) = FALSE
  );

UPDATE public.role_menu_items AS rmi
SET is_active = FALSE,
    can_view = FALSE,
    can_use = FALSE,
    updated_at = NOW()
FROM public.roles AS r,
     public.menu_items AS mi
WHERE rmi.role_id = r.id
  AND rmi.menu_item_id = mi.id
  AND r.role_name IN ('pmo_admin', 'account_owner', 'org_admin', 'super_admin', 'system_admin')
  AND mi.menu_code IN ('plat_know_assets', 'pmo_knowledge_opa', 'org_knowledge_opa')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v714_add_opa_to_governance_standards.sql applied';
END $$;
