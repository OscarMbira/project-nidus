-- ============================================================================
-- v1256: Project Planner — shell context + project creation RPCs — v1239 Slice 5.4 / 5.5
-- Run after v1247. Idempotent.
--
--   planner_context()   one round trip for the planner shell (rule 66): user, current account,
--                       edition, trial/limits status, system roles, owner flag.
--   planner_create_project(name, start, description)
--                       creates a project in the caller's current account with a project code
--                       (same "PRJ-" convention the Platform create page uses — projects have no
--                       Admin ID rule), the caller as Project Manager member, and a default
--                       Mon–Fri project calendar. Respects read-only trials and the plan's
--                       project limit (v1247 trigger). Account owner or project_manager only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.planner_context()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_user RECORD;
  v_account RECORD;
  v_roles TEXT[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT id, full_name, email INTO v_user FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('user_id', NULL, 'account_id', NULL);
  END IF;
  SELECT a.id, a.account_name, a.product_edition, a.owner_user_id INTO v_account
    FROM public.accounts a WHERE a.id = public.auth_user_current_account_id();
  SELECT COALESCE(array_agg(DISTINCT r.role_name), '{}') INTO v_roles
    FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
   WHERE ur.user_id = v_user.id AND ur.is_active AND COALESCE(ur.is_deleted, FALSE) = FALSE;
  RETURN jsonb_build_object(
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'email', v_user.email,
    'account_id', v_account.id,
    'account_name', v_account.account_name,
    'edition', v_account.product_edition,
    'is_owner', v_account.owner_user_id = v_user.id,
    'roles', to_jsonb(v_roles),
    'status', CASE WHEN v_account.id IS NOT NULL THEN public.account_planner_status(v_account.id) END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.planner_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.planner_create_project(
  p_project_name TEXT,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_user UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_account UUID := public.auth_user_current_account_id();
  v_allowed BOOLEAN;
  v_project UUID;
  v_code TEXT;
  v_status UUID;
  v_pm_role UUID;
BEGIN
  IF v_user IS NULL OR v_account IS NULL THEN RAISE EXCEPTION 'Sign in to a workspace first' USING ERRCODE = '42501'; END IF;
  IF COALESCE(btrim(p_project_name), '') = '' THEN RAISE EXCEPTION 'Give the project a name'; END IF;
  IF length(btrim(p_project_name)) > 200 THEN RAISE EXCEPTION 'Project names can be up to 200 characters'; END IF;

  v_allowed := EXISTS (SELECT 1 FROM public.accounts WHERE id = v_account AND owner_user_id = v_user)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = v_user AND ur.is_active AND r.role_name IN ('account_owner', 'project_manager'));
  IF NOT v_allowed THEN RAISE EXCEPTION 'Only the account owner or a project manager can create projects' USING ERRCODE = '42501'; END IF;
  IF NOT public.auth_user_account_can_write(v_account) THEN
    RAISE EXCEPTION 'PLANNER_READ_ONLY: your trial has ended. Upgrade to keep planning.' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_status FROM public.project_statuses
   WHERE is_active AND COALESCE(is_deleted, FALSE) = FALSE
   ORDER BY (lower(status_name) = 'planning') DESC, is_initial_status DESC NULLS LAST, created_at
   LIMIT 1;

  -- Same shape as the Platform create page's generated code (PRJ- + 6 digits); retry on clash.
  FOR i IN 1..5 LOOP
    v_code := 'PRJ-' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE project_code = v_code);
  END LOOP;

  INSERT INTO public.projects (project_name, project_code, project_description, account_id, owner_user_id, status_id,
                               planned_start_date, project_manager_user_id, created_by)
  VALUES (btrim(p_project_name), v_code, NULLIF(btrim(p_description), ''), v_account, v_user, v_status,
          COALESCE(p_start_date, CURRENT_DATE), v_user, v_user)
  RETURNING id INTO v_project;

  SELECT id INTO v_pm_role FROM public.project_roles
   WHERE role_name = 'project_manager' AND project_id IS NULL AND is_active ORDER BY created_at LIMIT 1;
  IF v_pm_role IS NOT NULL THEN
    INSERT INTO public.project_memberships (project_id, user_id, project_role_id, invited_by_user_id, invitation_status, is_active)
    VALUES (v_project, v_user, v_pm_role, v_user, 'accepted', TRUE);
  END IF;

  INSERT INTO public.project_calendars (project_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, hours_per_day, created_by)
  VALUES (v_project, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 8, v_user);

  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('projects', v_project, 'planner_project_created', jsonb_build_object('project_code', v_code), v_user);

  RETURN jsonb_build_object('project_id', v_project, 'project_code', v_code);
END;
$$;
REVOKE ALL ON FUNCTION public.planner_create_project(TEXT, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_project(TEXT, DATE, TEXT) TO authenticated;

-- The planner sidebar: menu rows the caller's roles grant (role_menu_items) ∩ what the account
-- may see (get_account_available_menu_item_ids, fail-closed allow-list for planner accounts) ∩
-- the pln_ prefix — so a plat_/sim_ row can never reach the planner (D19).
CREATE OR REPLACE FUNCTION public.planner_menu()
RETURNS TABLE (id UUID, menu_code TEXT, menu_label TEXT, route_path TEXT, parent_menu_id UUID, sort_order INT, menu_icon TEXT, can_use BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  WITH me AS (
    SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1
  ),
  my_roles AS (
    SELECT ur.role_id FROM public.user_roles ur, me
     WHERE ur.user_id = me.id AND ur.is_active AND COALESCE(ur.is_deleted, FALSE) = FALSE
  ),
  available AS (
    SELECT unnest(public.get_account_available_menu_item_ids(public.auth_user_current_account_id())) AS id
  ),
  granted AS (
    SELECT rmi.menu_item_id, bool_or(COALESCE(rmi.can_use, FALSE)) AS can_use
      FROM public.role_menu_items rmi
     WHERE rmi.role_id IN (SELECT role_id FROM my_roles)
       AND rmi.is_active AND COALESCE(rmi.can_view, TRUE) AND COALESCE(rmi.is_deleted, FALSE) = FALSE
     GROUP BY rmi.menu_item_id
  )
  SELECT mi.id, mi.menu_code::text, mi.menu_label::text, mi.route_path::text, mi.parent_menu_id, mi.sort_order, mi.menu_icon::text, g.can_use
    FROM public.menu_items mi
    JOIN granted g ON g.menu_item_id = mi.id
    JOIN available a ON a.id = mi.id
   WHERE mi.menu_code LIKE 'pln\_%' AND mi.is_active AND COALESCE(mi.is_visible, TRUE)
     AND COALESCE(mi.is_deleted, FALSE) = FALSE
   ORDER BY mi.sort_order, mi.menu_label;
$$;
GRANT EXECUTE ON FUNCTION public.planner_menu() TO authenticated;

-- Rename the workspace (D4: the auto-created organisation name is renameable). Owner only.
CREATE OR REPLACE FUNCTION public.planner_rename_account(p_account_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_user UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_account UUID := public.auth_user_current_account_id();
  v_old TEXT;
BEGIN
  IF COALESCE(btrim(p_account_name), '') = '' THEN RAISE EXCEPTION 'Give the workspace a name'; END IF;
  IF length(btrim(p_account_name)) > 200 THEN RAISE EXCEPTION 'Workspace names can be up to 200 characters'; END IF;
  SELECT account_name INTO v_old FROM public.accounts WHERE id = v_account AND owner_user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the account owner can rename the workspace' USING ERRCODE = '42501'; END IF;
  UPDATE public.accounts SET account_name = btrim(p_account_name), updated_at = NOW() WHERE id = v_account;
  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('accounts', v_account, 'renamed', jsonb_build_object('from', v_old, 'to', btrim(p_account_name)), v_user);
  RETURN jsonb_build_object('account_id', v_account, 'account_name', btrim(p_account_name));
END;
$$;
REVOKE ALL ON FUNCTION public.planner_rename_account(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_rename_account(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1256 applied: planner_context(), planner_create_project(), planner_menu(), planner_rename_account()'; END $$;
