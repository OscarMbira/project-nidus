-- ============================================================================
-- v423: Full expense approval chain resolution (Platform + Simulator)
-- Replaces stub in v420 with manager hierarchy + amount thresholds + PMO escalation
-- Prerequisites: v420, projects/programmes/portfolios, user_roles, expense_approval_thresholds
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_expense_approval_chain(
  p_project_id UUID,
  p_submitter_user_id UUID,
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_pm UUID;
  v_prog_mgr UUID;
  v_port_mgr UUID;
  v_pmo UUID;
  v_account_id UUID;
  v_prog_id UUID;
  v_port_id UUID;
  v_req_level INT := 1;
  v_uuids UUID[] := ARRAY[]::UUID[];
  v_roles TEXT[] := ARRAY[]::TEXT[];
  v_i INT;
  v_out JSONB := '[]'::JSONB;
  v_n INT;
BEGIN
  SELECT p.project_manager_user_id, p.account_id
    INTO v_pm, v_account_id
  FROM public.projects p
  WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE;

  IF v_account_id IS NULL THEN
    SELECT u.account_id INTO v_account_id FROM public.users u WHERE u.id = p_submitter_user_id;
  END IF;

  SELECT pp.programme_id INTO v_prog_id
  FROM public.programme_projects pp
  WHERE pp.project_id = p_project_id
  LIMIT 1;

  IF v_prog_id IS NOT NULL THEN
    SELECT pr.programme_manager_user_id, pr.portfolio_id
      INTO v_prog_mgr, v_port_id
    FROM public.programmes pr
    WHERE pr.id = v_prog_id AND COALESCE(pr.is_deleted, FALSE) = FALSE;
  END IF;

  IF v_port_id IS NOT NULL THEN
    SELECT pf.portfolio_manager_user_id INTO v_port_mgr
    FROM public.portfolios pf
    WHERE pf.id = v_port_id AND COALESCE(pf.is_deleted, FALSE) = FALSE;
  END IF;

  SELECT ur.user_id INTO v_pmo
  FROM public.user_roles ur
  INNER JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name = 'pmo_admin'
    AND COALESCE(ur.is_active, TRUE)
    AND COALESCE(ur.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    SELECT t.required_approval_level INTO v_req_level
    FROM public.expense_approval_thresholds t
    WHERE t.account_id = v_account_id
      AND COALESCE(t.is_deleted, FALSE) = FALSE
      AND COALESCE(t.is_active, TRUE)
      AND p_amount >= t.min_amount
      AND (t.max_amount IS NULL OR p_amount <= t.max_amount)
    ORDER BY t.min_amount DESC
    LIMIT 1;
  END IF;

  IF v_req_level IS NULL THEN
    v_req_level := 1;
  END IF;

  IF v_pm IS NOT NULL AND v_pm <> p_submitter_user_id THEN
    v_uuids := array_append(v_uuids, v_pm);
    v_roles := array_append(v_roles, 'project_manager');
  END IF;

  IF v_prog_mgr IS NOT NULL AND v_prog_mgr <> p_submitter_user_id
     AND NOT (v_prog_mgr = ANY(v_uuids)) THEN
    v_uuids := array_append(v_uuids, v_prog_mgr);
    v_roles := array_append(v_roles, 'programme_manager');
  END IF;

  IF v_port_mgr IS NOT NULL AND v_port_mgr <> p_submitter_user_id
     AND NOT (v_port_mgr = ANY(v_uuids)) THEN
    v_uuids := array_append(v_uuids, v_port_mgr);
    v_roles := array_append(v_roles, 'portfolio_manager');
  END IF;

  WHILE COALESCE(array_length(v_uuids, 1), 0) < v_req_level
    AND COALESCE(array_length(v_uuids, 1), 0) < 3
  LOOP
    IF v_pmo IS NULL OR v_pmo = p_submitter_user_id OR v_pmo = ANY(v_uuids) THEN
      EXIT;
    END IF;
    v_uuids := array_append(v_uuids, v_pmo);
    v_roles := array_append(v_roles, 'pmo_admin');
  END LOOP;

  v_n := COALESCE(array_length(v_uuids, 1), 0);
  IF v_n > 3 THEN
    v_uuids := v_uuids[1:3];
    v_roles := v_roles[1:3];
    v_n := 3;
  END IF;

  FOR v_i IN 1..COALESCE(v_n, 0) LOOP
    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'level', v_i,
        'approver_user_id', v_uuids[v_i],
        'approver_role', v_roles[v_i]
      )
    );
  END LOOP;

  RETURN v_out;
END;
$$;

COMMENT ON FUNCTION public.resolve_expense_approval_chain(UUID, UUID, NUMERIC) IS
  'v423: Ordered approval chain (max 3 steps) from PM / programme / portfolio managers and PMO; skips self-approval.';

-- Simulator chain: auth.users on programme/portfolio managers → public.users.id
CREATE OR REPLACE FUNCTION sim.resolve_expense_approval_chain(
  p_practice_project_id UUID,
  p_submitter_public_user_id UUID,
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
STABLE
AS $$
DECLARE
  v_pm UUID;
  v_prog_mgr UUID;
  v_port_mgr UUID;
  v_pmo UUID;
  v_account_id UUID;
  v_prog_id UUID;
  v_portfolio_id UUID;
  v_prog_auth UUID;
  v_port_auth UUID;
  v_req_level INT := 1;
  v_uuids UUID[] := ARRAY[]::UUID[];
  v_roles TEXT[] := ARRAY[]::TEXT[];
  v_i INT;
  v_out JSONB := '[]'::JSONB;
  v_n INT;
BEGIN
  SELECT pp.project_manager_user_id INTO v_pm
  FROM sim.practice_projects pp
  WHERE pp.id = p_practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE;

  SELECT u.account_id INTO v_account_id FROM public.users u WHERE u.id = p_submitter_public_user_id;

  SELECT ppp.practice_programme_id INTO v_prog_id
  FROM sim.practice_programme_projects ppp
  WHERE ppp.practice_project_id = p_practice_project_id
  LIMIT 1;

  IF v_prog_id IS NOT NULL THEN
    SELECT pr.programme_manager_user_id, pr.practice_portfolio_id
      INTO v_prog_auth, v_portfolio_id
    FROM sim.practice_programmes pr
    WHERE pr.id = v_prog_id AND COALESCE(pr.is_deleted, FALSE) = FALSE;

    IF v_prog_auth IS NOT NULL THEN
      SELECT id INTO v_prog_mgr FROM public.users WHERE auth_user_id = v_prog_auth LIMIT 1;
    END IF;

    IF v_portfolio_id IS NOT NULL THEN
      SELECT pf.portfolio_manager_user_id INTO v_port_auth
      FROM sim.practice_portfolios pf
      WHERE pf.id = v_portfolio_id AND COALESCE(pf.is_deleted, FALSE) = FALSE;

      IF v_port_auth IS NOT NULL THEN
        SELECT id INTO v_port_mgr FROM public.users WHERE auth_user_id = v_port_auth LIMIT 1;
      END IF;
    END IF;
  END IF;

  SELECT ur.user_id INTO v_pmo
  FROM public.user_roles ur
  INNER JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name = 'pmo_admin'
    AND COALESCE(ur.is_active, TRUE)
    AND COALESCE(ur.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_account_id IS NOT NULL THEN
    SELECT t.required_approval_level INTO v_req_level
    FROM public.expense_approval_thresholds t
    WHERE t.account_id = v_account_id
      AND COALESCE(t.is_deleted, FALSE) = FALSE
      AND COALESCE(t.is_active, TRUE)
      AND p_amount >= t.min_amount
      AND (t.max_amount IS NULL OR p_amount <= t.max_amount)
    ORDER BY t.min_amount DESC
    LIMIT 1;
  END IF;

  IF v_req_level IS NULL THEN
    v_req_level := 1;
  END IF;

  IF v_pm IS NOT NULL AND v_pm <> p_submitter_public_user_id THEN
    v_uuids := array_append(v_uuids, v_pm);
    v_roles := array_append(v_roles, 'project_manager');
  END IF;

  IF v_prog_mgr IS NOT NULL AND v_prog_mgr <> p_submitter_public_user_id
     AND NOT (v_prog_mgr = ANY(v_uuids)) THEN
    v_uuids := array_append(v_uuids, v_prog_mgr);
    v_roles := array_append(v_roles, 'programme_manager');
  END IF;

  IF v_port_mgr IS NOT NULL AND v_port_mgr <> p_submitter_public_user_id
     AND NOT (v_port_mgr = ANY(v_uuids)) THEN
    v_uuids := array_append(v_uuids, v_port_mgr);
    v_roles := array_append(v_roles, 'portfolio_manager');
  END IF;

  WHILE COALESCE(array_length(v_uuids, 1), 0) < v_req_level
    AND COALESCE(array_length(v_uuids, 1), 0) < 3
  LOOP
    IF v_pmo IS NULL OR v_pmo = p_submitter_public_user_id OR v_pmo = ANY(v_uuids) THEN
      EXIT;
    END IF;
    v_uuids := array_append(v_uuids, v_pmo);
    v_roles := array_append(v_roles, 'pmo_admin');
  END LOOP;

  v_n := COALESCE(array_length(v_uuids, 1), 0);
  IF v_n > 3 THEN
    v_uuids := v_uuids[1:3];
    v_roles := v_roles[1:3];
    v_n := 3;
  END IF;

  FOR v_i IN 1..COALESCE(v_n, 0) LOOP
    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'level', v_i,
        'approver_user_id', v_uuids[v_i],
        'approver_role', v_roles[v_i]
      )
    );
  END LOOP;

  RETURN v_out;
END;
$$;

COMMENT ON FUNCTION sim.resolve_expense_approval_chain(UUID, UUID, NUMERIC) IS
  'v423: Practice-project expense chain; maps auth-based sim managers to public.users.id.';

GRANT EXECUTE ON FUNCTION public.resolve_expense_approval_chain(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.resolve_expense_approval_chain(UUID, UUID, NUMERIC) TO authenticated;
