-- ============================================================================
-- v534: Configurable default project invitation expiry (per account)
-- PostgreSQL 15+ (Supabase public schema)
-- Prerequisites: accounts (v84), projects.account_id, is_pmo_admin_user() (v258)
-- ============================================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS project_invitation_expiry_days INTEGER NOT NULL DEFAULT 7
    CHECK (project_invitation_expiry_days >= 1 AND project_invitation_expiry_days <= 365);

COMMENT ON COLUMN accounts.project_invitation_expiry_days IS
  'Default days until a project invitation expires (from invitation_sent_at). Overridable per invite in UI where supported.';

-- Read setting for PMO settings UI (PMO Admin only)
CREATE OR REPLACE FUNCTION public.get_account_project_invitation_expiry_days(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_pmo_admin_user() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT a.project_invitation_expiry_days INTO v_days
  FROM accounts a
  WHERE a.id = p_account_id AND COALESCE(a.is_deleted, FALSE) = FALSE;

  RETURN COALESCE(v_days, 7);
END;
$$;

COMMENT ON FUNCTION public.get_account_project_invitation_expiry_days(UUID) IS
  'Returns account default invitation expiry days (PMO Admin only).';

-- Update setting: PMO Admin (any org) or account owner
CREATE OR REPLACE FUNCTION public.set_account_project_invitation_expiry_days(
  p_account_id UUID,
  p_days INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'Expiry days must be between 1 and 365';
  END IF;

  IF NOT public.is_pmo_admin_user() THEN
    IF NOT EXISTS (
      SELECT 1 FROM accounts a
      INNER JOIN users u ON u.id = a.owner_user_id
      WHERE a.id = p_account_id
        AND u.auth_user_id = auth.uid()
        AND COALESCE(a.is_deleted, FALSE) = FALSE
    ) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  UPDATE accounts
  SET project_invitation_expiry_days = p_days,
      updated_at = NOW()
  WHERE id = p_account_id AND COALESCE(is_deleted, FALSE) = FALSE;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.set_account_project_invitation_expiry_days(UUID, INTEGER) IS
  'Sets default project invitation expiry days for an account (PMO Admin or account owner).';

-- Resolve effective default days when creating an invitation (PMO Admin or active member on project)
CREATE OR REPLACE FUNCTION public.get_default_project_invitation_expiry_days(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_days INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.account_id INTO v_account_id
  FROM projects p
  WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE;

  IF v_account_id IS NULL THEN
    RETURN 7;
  END IF;

  IF NOT (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND r.role_name = 'org_admin'
        AND ur.project_id IS NULL
    )
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.project_id = p_project_id
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    ) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT a.project_invitation_expiry_days INTO v_days
  FROM accounts a
  WHERE a.id = v_account_id AND COALESCE(a.is_deleted, FALSE) = FALSE;

  RETURN COALESCE(v_days, 7);
END;
$$;

COMMENT ON FUNCTION public.get_default_project_invitation_expiry_days(UUID) IS
  'Returns account default invitation expiry days for a project (caller must be PMO Admin or active member on that project).';

GRANT EXECUTE ON FUNCTION public.get_account_project_invitation_expiry_days(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_account_project_invitation_expiry_days(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_project_invitation_expiry_days(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v534_account_project_invitation_expiry.sql applied';
END $$;
