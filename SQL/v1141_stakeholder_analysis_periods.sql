-- ============================================================================
-- v1141: Organisation analysis periods for Stakeholder Analysis
-- ============================================================================
-- Shared lifecycle periods (Initiation, Planning, and so on) plus names an
-- organisation adds itself. Stakeholder Analysis stores the chosen name on
-- stakeholder_analysis.analysis_period. Run this file in Supabase before
-- adding a period from the form.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stakeholder_analysis_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stakeholder_analysis_periods_name_len CHECK (char_length(btrim(period_name)) BETWEEN 1 AND 100),
  CONSTRAINT stakeholder_analysis_periods_scope_check CHECK (
    (is_system = TRUE AND account_id IS NULL)
    OR (is_system = FALSE AND account_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stakeholder_analysis_periods_system_name
  ON public.stakeholder_analysis_periods (lower(btrim(period_name)))
  WHERE account_id IS NULL AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stakeholder_analysis_periods_org_name
  ON public.stakeholder_analysis_periods (account_id, lower(btrim(period_name)))
  WHERE account_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_periods_account
  ON public.stakeholder_analysis_periods (account_id)
  WHERE is_deleted = FALSE;

ALTER TABLE public.stakeholder_analysis_periods ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.stakeholder_analysis_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholder_analysis_periods TO service_role;

CREATE OR REPLACE FUNCTION public.stakeholder_analysis_period_caller_id()
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

CREATE OR REPLACE FUNCTION public.user_can_edit_analysis_periods(p_user_id UUID, p_account_id UUID)
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

CREATE OR REPLACE FUNCTION public.user_can_read_analysis_periods(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_edit_analysis_periods(p_user_id, p_account_id)
  OR EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.projects pr ON pr.id = pm.project_id
    WHERE pm.user_id = p_user_id
      AND pm.is_active = TRUE
      AND pr.account_id = p_account_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
  );
$$;

DROP POLICY IF EXISTS stakeholder_analysis_periods_select_system ON public.stakeholder_analysis_periods;
DROP POLICY IF EXISTS stakeholder_analysis_periods_select_org ON public.stakeholder_analysis_periods;
DROP POLICY IF EXISTS stakeholder_analysis_periods_insert ON public.stakeholder_analysis_periods;
DROP POLICY IF EXISTS stakeholder_analysis_periods_update ON public.stakeholder_analysis_periods;

CREATE POLICY stakeholder_analysis_periods_select_system ON public.stakeholder_analysis_periods
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND account_id IS NULL AND is_system = TRUE);

CREATE POLICY stakeholder_analysis_periods_select_org ON public.stakeholder_analysis_periods
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND account_id IS NOT NULL
    AND public.user_can_read_analysis_periods(public.stakeholder_analysis_period_caller_id(), account_id)
  );

CREATE POLICY stakeholder_analysis_periods_insert ON public.stakeholder_analysis_periods
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system = FALSE
    AND account_id IS NOT NULL
    AND public.user_can_edit_analysis_periods(public.stakeholder_analysis_period_caller_id(), account_id)
  );

CREATE POLICY stakeholder_analysis_periods_update ON public.stakeholder_analysis_periods
  FOR UPDATE TO authenticated
  USING (
    is_system = FALSE
    AND account_id IS NOT NULL
    AND public.user_can_edit_analysis_periods(public.stakeholder_analysis_period_caller_id(), account_id)
  )
  WITH CHECK (
    is_system = FALSE
    AND account_id IS NOT NULL
    AND public.user_can_edit_analysis_periods(public.stakeholder_analysis_period_caller_id(), account_id)
  );

CREATE OR REPLACE FUNCTION public.add_stakeholder_analysis_period(
  p_account_id UUID,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := public.stakeholder_analysis_period_caller_id();
  v_name TEXT := btrim(COALESCE(p_name, ''));
  v_row public.stakeholder_analysis_periods%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to add an analysis period';
  END IF;
  IF NOT public.user_can_edit_analysis_periods(v_user, p_account_id) THEN
    RAISE EXCEPTION 'You cannot add analysis periods for this organisation';
  END IF;
  IF v_name = '' OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Enter a period name of 1 to 100 characters';
  END IF;

  SELECT * INTO v_row
  FROM public.stakeholder_analysis_periods
  WHERE is_deleted = FALSE
    AND lower(btrim(period_name)) = lower(v_name)
    AND (account_id IS NULL OR account_id = p_account_id)
  ORDER BY (account_id IS NULL) DESC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_row.id,
      'period_name', v_row.period_name,
      'is_system', v_row.is_system
    );
  END IF;

  SELECT * INTO v_row
  FROM public.stakeholder_analysis_periods
  WHERE account_id = p_account_id
    AND lower(btrim(period_name)) = lower(v_name)
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.stakeholder_analysis_periods
    SET period_name = v_name,
        is_deleted = FALSE,
        is_system = FALSE,
        updated_by = v_user,
        updated_at = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.stakeholder_analysis_periods (
      account_id, period_name, is_system, created_by, updated_by
    )
    VALUES (p_account_id, v_name, FALSE, v_user, v_user)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'period_name', v_row.period_name,
    'is_system', v_row.is_system
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.stakeholder_analysis_period_caller_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_edit_analysis_periods(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_read_analysis_periods(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_stakeholder_analysis_period(UUID, TEXT) TO authenticated, service_role;

INSERT INTO public.stakeholder_analysis_periods (period_name, is_system, account_id)
SELECT seed.period_name, TRUE, NULL
FROM (
  VALUES
    ('Initiation'),
    ('Planning'),
    ('Execution'),
    ('Monitoring and control'),
    ('Closure'),
    ('Weekly'),
    ('Fortnightly'),
    ('Monthly'),
    ('Quarterly'),
    ('Annual'),
    ('Stage review'),
    ('Benefits review')
) AS seed(period_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stakeholder_analysis_periods existing
  WHERE existing.account_id IS NULL
    AND existing.is_deleted = FALSE
    AND lower(btrim(existing.period_name)) = lower(btrim(seed.period_name))
);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'stakeholder_analysis_periods',
  'Shared and organisation-added periods used on Stakeholder Analysis',
  FALSE,
  TRUE
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
