-- =============================================================================
-- v728: Account owner / PMO admin role metadata lock-in
-- Prerequisites: v127 (roles exist)
-- =============================================================================

INSERT INTO public.roles (
  role_name, role_display_name, role_description, role_level,
  is_system_role, is_active, is_default_role
)
VALUES (
  'account_owner',
  'Account Owner',
  'Legal organisation owner with billing authority',
  90,
  TRUE,
  TRUE,
  FALSE
)
ON CONFLICT (role_name) DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = 90,
  is_system_role = TRUE,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.roles (
  role_name, role_display_name, role_description, role_level,
  is_system_role, is_active, is_default_role
)
VALUES (
  'pmo_admin',
  'PMO Admin',
  'PMO administrator — operational access; billing via owner or delegated privileges',
  80,
  FALSE,
  TRUE,
  FALSE
)
ON CONFLICT (role_name) DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = 80,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v728: account_owner (90) and pmo_admin (80) metadata verified';
END $$;
