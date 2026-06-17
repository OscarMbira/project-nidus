-- =============================================================================
-- v730: Backfill account_owner role for existing organisation founders
-- Assigns account_owner + pmo_admin to accounts.owner_user_id where missing
-- =============================================================================

DO $$
DECLARE
  v_owner_role_id UUID;
  v_pmo_role_id UUID;
  v_acct RECORD;
  v_count INT := 0;
BEGIN
  SELECT id INTO v_owner_role_id FROM public.roles WHERE role_name = 'account_owner' AND COALESCE(is_deleted, FALSE) = FALSE;
  SELECT id INTO v_pmo_role_id FROM public.roles WHERE role_name = 'pmo_admin' AND COALESCE(is_deleted, FALSE) = FALSE;

  IF v_owner_role_id IS NULL OR v_pmo_role_id IS NULL THEN
    RAISE EXCEPTION 'v730: account_owner or pmo_admin role not found — run v728 first';
  END IF;

  FOR v_acct IN
    SELECT id, owner_user_id
    FROM public.accounts
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND owner_user_id IS NOT NULL
  LOOP
    -- account_owner
    INSERT INTO public.user_roles (id, user_id, role_id, is_active, is_deleted, created_at, updated_at)
    SELECT gen_random_uuid(), v_acct.owner_user_id, v_owner_role_id, TRUE, FALSE, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_acct.owner_user_id
        AND ur.role_id = v_owner_role_id
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    );

    -- pmo_admin
    INSERT INTO public.user_roles (id, user_id, role_id, is_active, is_deleted, created_at, updated_at)
    SELECT gen_random_uuid(), v_acct.owner_user_id, v_pmo_role_id, TRUE, FALSE, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_acct.owner_user_id
        AND ur.role_id = v_pmo_role_id
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    );

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'v730: backfilled founder roles for % account(s)', v_count;
END $$;
