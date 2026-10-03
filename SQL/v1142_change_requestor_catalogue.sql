-- ============================================================================
-- v1142: Organisation catalogue for change-request requestors
-- ============================================================================
-- Requestor Name and Requestor Organization on Submit Change Request.
-- Existing project members, stakeholders, and past requests stay selectable.
-- A name or organisation typed as missing is stored here for the organisation.
-- Run this file in Supabase before using Add on those fields.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.change_requestor_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL,
  item_name TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT change_requestor_catalogue_kind_check CHECK (item_kind IN ('name', 'organization')),
  CONSTRAINT change_requestor_catalogue_name_len CHECK (char_length(btrim(item_name)) BETWEEN 1 AND 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_change_requestor_catalogue_name
  ON public.change_requestor_catalogue (account_id, item_kind, lower(btrim(item_name)))
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_change_requestor_catalogue_account
  ON public.change_requestor_catalogue (account_id, item_kind)
  WHERE is_deleted = FALSE;

ALTER TABLE public.change_requestor_catalogue ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.change_requestor_catalogue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_requestor_catalogue TO service_role;

CREATE OR REPLACE FUNCTION public.change_requestor_caller_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_change_requestors(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = p_account_id
      AND a.owner_user_id = p_user_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND ur.project_id IS NULL
      AND lower(replace(r.role_name, ' ', '_')) IN (
        'pmo_admin', 'pmo', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
        'programme_manager', 'portfolio_manager'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.projects pr ON pr.id = pm.project_id
    JOIN public.project_roles prl ON prl.id = pm.project_role_id
    WHERE pm.user_id = p_user_id
      AND pm.is_active = TRUE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
      AND lower(replace(prl.role_name, ' ', '_')) IN (
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member',
        'pmo_admin', 'pmo', 'programme_manager', 'portfolio_manager'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.projects pr ON pr.id = ur.project_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN (
        'project_manager', 'pm_project_manager',
        'team_manager', 'team_lead', 'pm_team_manager',
        'team_member', 'pm_team_member',
        'pmo_admin', 'pmo', 'programme_manager', 'portfolio_manager'
      )
  );
END;
$$;

DROP POLICY IF EXISTS change_requestor_catalogue_select ON public.change_requestor_catalogue;
DROP POLICY IF EXISTS change_requestor_catalogue_insert ON public.change_requestor_catalogue;
DROP POLICY IF EXISTS change_requestor_catalogue_update ON public.change_requestor_catalogue;

CREATE POLICY change_requestor_catalogue_select ON public.change_requestor_catalogue
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND public.user_can_edit_change_requestors(public.change_requestor_caller_id(), account_id)
  );

CREATE POLICY change_requestor_catalogue_insert ON public.change_requestor_catalogue
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_edit_change_requestors(public.change_requestor_caller_id(), account_id)
  );

CREATE POLICY change_requestor_catalogue_update ON public.change_requestor_catalogue
  FOR UPDATE TO authenticated
  USING (
    public.user_can_edit_change_requestors(public.change_requestor_caller_id(), account_id)
  )
  WITH CHECK (
    public.user_can_edit_change_requestors(public.change_requestor_caller_id(), account_id)
  );

CREATE OR REPLACE FUNCTION public.add_change_requestor_option(
  p_account_id UUID,
  p_kind TEXT,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.change_requestor_caller_id();
  v_kind TEXT := lower(btrim(COALESCE(p_kind, '')));
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_row public.change_requestor_catalogue%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add a requestor option';
  END IF;
  IF NOT public.user_can_edit_change_requestors(v_user, p_account_id) THEN
    RAISE EXCEPTION 'You cannot add requestor options for this organisation';
  END IF;
  IF v_kind NOT IN ('name', 'organization') THEN
    RAISE EXCEPTION 'Choose a requestor name or organisation';
  END IF;
  IF v_name = '' OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'Enter a name of 1 to 200 characters';
  END IF;

  SELECT * INTO v_row
  FROM public.change_requestor_catalogue
  WHERE account_id = p_account_id
    AND item_kind = v_kind
    AND lower(btrim(item_name)) = lower(v_name)
  ORDER BY is_deleted ASC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.change_requestor_catalogue
    SET item_name = v_name,
        is_deleted = FALSE,
        updated_by = v_user,
        updated_at = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.change_requestor_catalogue (
      account_id, item_kind, item_name, created_by, updated_by
    )
    VALUES (p_account_id, v_kind, v_name, v_user, v_user)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'item_kind', v_row.item_kind,
    'item_name', v_row.item_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_requestor_caller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_edit_change_requestors(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_change_requestor_option(UUID, TEXT, TEXT) TO authenticated, service_role;

-- Practice copy: options saved by the signed-in simulator user.
CREATE TABLE IF NOT EXISTS sim.practice_change_requestor_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_kind TEXT NOT NULL,
  item_name TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT practice_change_requestor_catalogue_kind_check CHECK (item_kind IN ('name', 'organization')),
  CONSTRAINT practice_change_requestor_catalogue_name_len CHECK (char_length(btrim(item_name)) BETWEEN 1 AND 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_change_requestor_catalogue_name
  ON sim.practice_change_requestor_catalogue (user_id, item_kind, lower(btrim(item_name)))
  WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_change_requestor_catalogue ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sim.practice_change_requestor_catalogue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.practice_change_requestor_catalogue TO service_role;

DROP POLICY IF EXISTS practice_change_requestor_catalogue_owner ON sim.practice_change_requestor_catalogue;
CREATE POLICY practice_change_requestor_catalogue_owner
  ON sim.practice_change_requestor_catalogue
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

CREATE OR REPLACE FUNCTION sim.add_practice_change_requestor_option(
  p_kind TEXT,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
  v_user UUID := sim.get_current_user_id();
  v_kind TEXT := lower(btrim(COALESCE(p_kind, '')));
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_row sim.practice_change_requestor_catalogue%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add a requestor option';
  END IF;
  IF v_kind NOT IN ('name', 'organization') THEN
    RAISE EXCEPTION 'Choose a requestor name or organisation';
  END IF;
  IF v_name = '' OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'Enter a name of 1 to 200 characters';
  END IF;

  SELECT * INTO v_row
  FROM sim.practice_change_requestor_catalogue
  WHERE user_id = v_user
    AND item_kind = v_kind
    AND lower(btrim(item_name)) = lower(v_name)
  ORDER BY is_deleted ASC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE sim.practice_change_requestor_catalogue
    SET item_name = v_name,
        is_deleted = FALSE,
        updated_at = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO sim.practice_change_requestor_catalogue (user_id, item_kind, item_name)
    VALUES (v_user, v_kind, v_name)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'item_kind', v_row.item_kind,
    'item_name', v_row.item_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sim.add_practice_change_requestor_option(TEXT, TEXT) TO authenticated, service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('change_requestor_catalogue', 'Organisation-saved requestor names and organisations for change requests', FALSE, TRUE),
  ('practice_change_requestor_catalogue', 'Practice-user requestor names and organisations for simulated change requests', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
