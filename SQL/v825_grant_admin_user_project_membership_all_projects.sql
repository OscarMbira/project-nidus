-- =============================================================================
-- v825: Grant admin account (oscarmbirablogging@gmail.com) membership on every
--       active project currently missing it.
-- Context: The Risk Register (and any other project-scoped module gated by
--          user_projects membership, e.g. Issue/Quality/Change registers) was
--          correctly hiding data from this account via RLS — not a data bug.
--          The account has no user_projects row at all on the seeded/demo
--          projects (ADMSEED-*, SEED334-*, EDP-2024, etc.), so
--          policy_risks_auth_select / policy_risk_registers_auth_select (v173)
--          have nothing to match and silently return zero rows.
-- Fix: grant (or reactivate) 'admin' access_level membership for this account
--      on every active project where it's currently missing/soft-deleted.
-- Idempotent: safe to re-run (upserts on the unique (user_id, project_id) key).
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_granted_count INTEGER;
BEGIN

  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'oscarmbirablogging@gmail.com'
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v825: User oscarmbirablogging@gmail.com not found - skipping.';
    RETURN;
  END IF;

  INSERT INTO public.user_projects (
    user_id, project_id, project_role, access_level,
    is_active, receive_notifications, is_deleted, created_by
  )
  SELECT
    v_user_id, p.id, 'Project Manager', 'admin',
    true, true, false, v_user_id
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, false) = false
  ON CONFLICT (user_id, project_id) DO UPDATE SET
    is_deleted = false,
    is_active = true,
    access_level = 'admin',
    updated_at = NOW();

  GET DIAGNOSTICS v_granted_count = ROW_COUNT;
  RAISE NOTICE 'v825: Granted/reactivated membership for % project(s).', v_granted_count;

END $$;
