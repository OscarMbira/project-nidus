-- ============================================================================
-- v1456: Consolidated role menus — "Menu based on" for custom organisation roles (Slice 6, D25)
-- PRD/plan: projectprd/v1341 (D25, story 34) / projectplan/v1341
--
-- A custom role (v902: roles / project_roles with account_id) has no built-in name the sidebar
-- can map to a layout. It now carries menu_layout_key: which role's consolidated menu it uses
-- (Project Manager, Team Lead, Team Member or a governance profile). Its menu grants still limit
-- what shows. Built-in roles keep NULL (mapped by name).
--   1. columns on roles and project_roles (check-constrained to the placement keys)
--   2. backfill existing custom roles from their grants: project-setup grants → 'pm', else 'team_member'
--   3. public.set_org_custom_role_menu_layout(project_role_id, key) — same permission as editing roles
-- Idempotent. Run after v1455.
-- ============================================================================

-- ── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS menu_layout_key TEXT;
ALTER TABLE public.project_roles ADD COLUMN IF NOT EXISTS menu_layout_key TEXT;

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_menu_layout_key_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_menu_layout_key_check CHECK (menu_layout_key IS NULL OR menu_layout_key IN (
  'pm', 'team', 'team_member', 'programme', 'portfolio', 'executive', 'sponsor', 'board', 'assurance', 'qa',
  'change_authority', 'stakeholder', 'viewer'));
ALTER TABLE public.project_roles DROP CONSTRAINT IF EXISTS project_roles_menu_layout_key_check;
ALTER TABLE public.project_roles ADD CONSTRAINT project_roles_menu_layout_key_check CHECK (menu_layout_key IS NULL OR menu_layout_key IN (
  'pm', 'team', 'team_member', 'programme', 'portfolio', 'executive', 'sponsor', 'board', 'assurance', 'qa',
  'change_authority', 'stakeholder', 'viewer'));

COMMENT ON COLUMN public.roles.menu_layout_key IS
  'v1456 (v1341 D25): custom role only — which consolidated sidebar it uses. NULL on built-in roles (mapped by role name).';
COMMENT ON COLUMN public.project_roles.menu_layout_key IS
  'v1456 (v1341 D25): custom role only — mirrors roles.menu_layout_key for the Manage Roles screen.';

-- ── 2. Backfill custom roles from their grants ──────────────────────────────
UPDATE public.roles r
   SET menu_layout_key = CASE WHEN EXISTS (
         SELECT 1 FROM public.role_menu_items rmi
         JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
         WHERE rmi.role_id = r.id AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
           AND mi.menu_code IN ('plat_pm_s_project_details', 'plat_pm_s_mandate', 'plat_pm_s_business_case',
                                'plat_pm_s_brief', 'plat_pm_ps_governance', 'plat_pm_budget')
       ) THEN 'pm' ELSE 'team_member' END,
       updated_at = NOW()
 WHERE r.account_id IS NOT NULL
   AND r.menu_layout_key IS NULL;

UPDATE public.project_roles pr
   SET menu_layout_key = r.menu_layout_key,
       updated_at = NOW()
  FROM public.roles r
 WHERE pr.account_id IS NOT NULL
   AND r.account_id = pr.account_id
   AND r.role_name = pr.role_name
   AND pr.menu_layout_key IS NULL
   AND r.menu_layout_key IS NOT NULL;

-- ── 3. Set "Menu based on" from Manage Roles ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_org_custom_role_menu_layout(p_project_role_id UUID, p_menu_layout_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := public.current_internal_user_id();
  v_account UUID;
  v_role_name TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_account := (SELECT pr.account_id FROM public.project_roles pr WHERE pr.id = p_project_role_id);
  v_role_name := (SELECT pr.role_name FROM public.project_roles pr WHERE pr.id = p_project_role_id);
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'Role not found or is a built-in role (not editable)';
  END IF;
  IF NOT public.user_can_manage_org_roles(v_caller, v_account) THEN
    RAISE EXCEPTION 'You do not have permission to edit roles for this organisation';
  END IF;
  IF p_menu_layout_key IS NOT NULL AND p_menu_layout_key NOT IN (
    'pm', 'team', 'team_member', 'programme', 'portfolio', 'executive', 'sponsor', 'board', 'assurance', 'qa',
    'change_authority', 'stakeholder', 'viewer') THEN
    RAISE EXCEPTION 'Unknown menu layout: %', p_menu_layout_key;
  END IF;

  UPDATE public.project_roles SET menu_layout_key = p_menu_layout_key, updated_at = NOW() WHERE id = p_project_role_id;
  UPDATE public.roles SET menu_layout_key = p_menu_layout_key, updated_at = NOW()
   WHERE account_id = v_account AND role_name = v_role_name;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_org_custom_role_menu_layout(UUID, TEXT) TO authenticated;

-- ── Check: each custom role and its menu layout ─────────────────────────────
SELECT r.account_id, r.role_name, r.menu_layout_key
FROM public.roles r
WHERE r.account_id IS NOT NULL
ORDER BY r.account_id, r.role_name;
