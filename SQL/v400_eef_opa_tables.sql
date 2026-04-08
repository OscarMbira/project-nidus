-- ============================================================================
-- v400: Enterprise Environment Factors (EEF) & Organisational Process Assets (OPA)
-- Platform (public) + Simulator (sim). PostgreSQL 15+ / Supabase.
-- Prerequisites: accounts, projects, auth.users, users, roles, permissions, role_permissions, user_roles
-- After v400, run v403_eef_opa_rls_member_access.sql if users join via project_memberships / user_projects (fixes 403 on EEF/OPA).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: user belongs to organisation (owner or project member under account)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_access_to_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = p_account_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
      AND (
        a.owner_user_id = v_uid
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.user_roles ur ON ur.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND ur.user_id = v_uid
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_access_to_account(UUID) IS
  'TRUE if current user owns the account or is an active member of any project under the account.';

-- ---------------------------------------------------------------------------
-- Permission check scoped to organisation (project roles under account + global project_id IS NULL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_permission_for_account(p_account_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      AND COALESCE(rp.is_deleted, FALSE) = FALSE
      AND rp.is_active = TRUE
    INNER JOIN public.permissions perm ON perm.id = rp.permission_id
      AND COALESCE(perm.is_deleted, FALSE) = FALSE
      AND perm.is_active = TRUE
    LEFT JOIN public.projects pr ON pr.id = ur.project_id
    WHERE ur.user_id = v_uid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND perm.permission_code = p_permission_code
      AND (
        ur.project_id IS NULL
        OR (pr.account_id = p_account_id AND COALESCE(pr.is_deleted, FALSE) = FALSE)
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_permission_for_account(UUID, TEXT) IS
  'TRUE if current user has the permission via a global role or a project role under the given account.';

-- ---------------------------------------------------------------------------
-- Full org-wide edit (not “own record only” for team_member)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_eef_opa_full_edit_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.user_roles ur ON ur.user_id = u.id
    INNER JOIN public.roles r ON r.id = ur.role_id
    WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('system_admin', 'pmo_admin', 'project_manager', 'team_lead')
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  );
END;
$$;

-- ============================================================================
-- PLATFORM: lookup tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eef_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  code VARCHAR(80),
  name TEXT NOT NULL,
  description TEXT,
  eef_kind TEXT NOT NULL DEFAULT 'internal' CHECK (eef_kind IN ('internal', 'external')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eef_categories_global_code
  ON public.eef_categories(code) WHERE organisation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eef_categories_org_code
  ON public.eef_categories(organisation_id, code) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eef_categories_org ON public.eef_categories(organisation_id);

CREATE TABLE IF NOT EXISTS public.opa_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  code VARCHAR(80),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opa_categories_global_code
  ON public.opa_categories(code) WHERE organisation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_opa_categories_org_code
  ON public.opa_categories(organisation_id, code) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opa_categories_org ON public.opa_categories(organisation_id);

-- ============================================================================
-- PLATFORM: main tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enterprise_environment_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.eef_categories(id) ON DELETE SET NULL,
  eef_type TEXT NOT NULL DEFAULT 'internal' CHECK (eef_type IN ('internal', 'external')),
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high', 'medium', 'low')),
  impact_direction TEXT NOT NULL DEFAULT 'neutral' CHECK (impact_direction IN ('positive', 'negative', 'neutral')),
  source_reference TEXT,
  related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'inactive')),
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eef_org ON public.enterprise_environment_factors(organisation_id);
CREATE INDEX IF NOT EXISTS idx_eef_created_by ON public.enterprise_environment_factors(created_by);
CREATE INDEX IF NOT EXISTS idx_eef_on_hold ON public.enterprise_environment_factors(organisation_id, is_on_hold);

CREATE TABLE IF NOT EXISTS public.organisational_process_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.opa_categories(id) ON DELETE SET NULL,
  opa_type TEXT NOT NULL DEFAULT 'other' CHECK (opa_type IN (
    'template', 'guideline', 'standard', 'procedure', 'policy', 'historical_info', 'lessons_learned', 'other'
  )),
  version TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'deprecated')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  effective_date DATE,
  expiry_date DATE,
  document_reference TEXT,
  tags TEXT[] DEFAULT '{}',
  related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opa_org ON public.organisational_process_assets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_opa_created_by ON public.organisational_process_assets(created_by);
CREATE INDEX IF NOT EXISTS idx_opa_on_hold ON public.organisational_process_assets(organisation_id, is_on_hold);
CREATE INDEX IF NOT EXISTS idx_opa_tags ON public.organisational_process_assets USING GIN (tags);

CREATE OR REPLACE FUNCTION public.trg_eef_opa_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eef_updated ON public.enterprise_environment_factors;
CREATE TRIGGER trg_eef_updated
  BEFORE UPDATE ON public.enterprise_environment_factors
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_opa_updated ON public.organisational_process_assets;
CREATE TRIGGER trg_opa_updated
  BEFORE UPDATE ON public.organisational_process_assets
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_eef_cat_updated ON public.eef_categories;
CREATE TRIGGER trg_eef_cat_updated
  BEFORE UPDATE ON public.eef_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_opa_cat_updated ON public.opa_categories;
CREATE TRIGGER trg_opa_cat_updated
  BEFORE UPDATE ON public.opa_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

-- ============================================================================
-- SIMULATOR: mirror tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.eef_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  code VARCHAR(80),
  name TEXT NOT NULL,
  description TEXT,
  eef_kind TEXT NOT NULL DEFAULT 'internal' CHECK (eef_kind IN ('internal', 'external')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_eef_categories_global_code
  ON sim.eef_categories(code) WHERE organisation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_eef_categories_org_code
  ON sim.eef_categories(organisation_id, code) WHERE organisation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.opa_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  code VARCHAR(80),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_opa_categories_global_code
  ON sim.opa_categories(code) WHERE organisation_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_opa_categories_org_code
  ON sim.opa_categories(organisation_id, code) WHERE organisation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.enterprise_environment_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES sim.eef_categories(id) ON DELETE SET NULL,
  eef_type TEXT NOT NULL DEFAULT 'internal' CHECK (eef_type IN ('internal', 'external')),
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high', 'medium', 'low')),
  impact_direction TEXT NOT NULL DEFAULT 'neutral' CHECK (impact_direction IN ('positive', 'negative', 'neutral')),
  source_reference TEXT,
  related_simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'inactive')),
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_eef_org ON sim.enterprise_environment_factors(organisation_id);

CREATE TABLE IF NOT EXISTS sim.organisational_process_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES sim.opa_categories(id) ON DELETE SET NULL,
  opa_type TEXT NOT NULL DEFAULT 'other' CHECK (opa_type IN (
    'template', 'guideline', 'standard', 'procedure', 'policy', 'historical_info', 'lessons_learned', 'other'
  )),
  version TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'deprecated')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  effective_date DATE,
  expiry_date DATE,
  document_reference TEXT,
  tags TEXT[] DEFAULT '{}',
  related_simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE SET NULL,
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_opa_org ON sim.organisational_process_assets(organisation_id);

DROP TRIGGER IF EXISTS trg_sim_eef_updated ON sim.enterprise_environment_factors;
CREATE TRIGGER trg_sim_eef_updated
  BEFORE UPDATE ON sim.enterprise_environment_factors
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_opa_updated ON sim.organisational_process_assets;
CREATE TRIGGER trg_sim_opa_updated
  BEFORE UPDATE ON sim.organisational_process_assets
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_eef_cat_updated ON sim.eef_categories;
CREATE TRIGGER trg_sim_eef_cat_updated
  BEFORE UPDATE ON sim.eef_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_opa_cat_updated ON sim.opa_categories;
CREATE TRIGGER trg_sim_opa_cat_updated
  BEFORE UPDATE ON sim.opa_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eef_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opa_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_environment_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisational_process_assets TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.eef_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.opa_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.enterprise_environment_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.organisational_process_assets TO authenticated;

-- ============================================================================
-- RLS: PLATFORM
-- ============================================================================

ALTER TABLE public.eef_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_environment_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisational_process_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eef_categories_select ON public.eef_categories;
CREATE POLICY eef_categories_select ON public.eef_categories
  FOR SELECT TO authenticated
  USING (
    organisation_id IS NULL
    OR public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS eef_categories_insert ON public.eef_categories;
CREATE POLICY eef_categories_insert ON public.eef_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS eef_categories_update ON public.eef_categories;
CREATE POLICY eef_categories_update ON public.eef_categories
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS eef_categories_delete ON public.eef_categories;
CREATE POLICY eef_categories_delete ON public.eef_categories
  FOR DELETE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND organisation_id IS NOT NULL
    AND public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS opa_categories_select ON public.opa_categories;
CREATE POLICY opa_categories_select ON public.opa_categories
  FOR SELECT TO authenticated
  USING (
    organisation_id IS NULL
    OR public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS opa_categories_insert ON public.opa_categories;
CREATE POLICY opa_categories_insert ON public.opa_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS opa_categories_update ON public.opa_categories;
CREATE POLICY opa_categories_update ON public.opa_categories
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS opa_categories_delete ON public.opa_categories;
CREATE POLICY opa_categories_delete ON public.opa_categories
  FOR DELETE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND organisation_id IS NOT NULL
    AND public.user_has_access_to_account(organisation_id)
  );

-- EEF rows
DROP POLICY IF EXISTS enterprise_environment_factors_select ON public.enterprise_environment_factors;
CREATE POLICY enterprise_environment_factors_select ON public.enterprise_environment_factors
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS enterprise_environment_factors_insert ON public.enterprise_environment_factors;
CREATE POLICY enterprise_environment_factors_insert ON public.enterprise_environment_factors
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.create')
  );

DROP POLICY IF EXISTS enterprise_environment_factors_update ON public.enterprise_environment_factors;
CREATE POLICY enterprise_environment_factors_update ON public.enterprise_environment_factors
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.update')
    AND (
      public.user_has_eef_opa_full_edit_role()
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.update')
    AND (
      public.user_has_eef_opa_full_edit_role()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS enterprise_environment_factors_delete ON public.enterprise_environment_factors;
CREATE POLICY enterprise_environment_factors_delete ON public.enterprise_environment_factors
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.delete')
  );

-- OPA rows
DROP POLICY IF EXISTS organisational_process_assets_select ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_select ON public.organisational_process_assets
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS organisational_process_assets_insert ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_insert ON public.organisational_process_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.create')
  );

DROP POLICY IF EXISTS organisational_process_assets_update ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_update ON public.organisational_process_assets
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.update')
    AND (
      public.user_has_eef_opa_full_edit_role()
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.update')
    AND (
      public.user_has_eef_opa_full_edit_role()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS organisational_process_assets_delete ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_delete ON public.organisational_process_assets
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.delete')
  );

-- ============================================================================
-- RLS: SIMULATOR (same logic, sim schema tables)
-- ============================================================================

ALTER TABLE sim.eef_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.opa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.enterprise_environment_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.organisational_process_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_eef_categories_select ON sim.eef_categories;
CREATE POLICY sim_eef_categories_select ON sim.eef_categories
  FOR SELECT TO authenticated
  USING (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_eef_categories_insert ON sim.eef_categories;
CREATE POLICY sim_eef_categories_insert ON sim.eef_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS sim_eef_categories_update ON sim.eef_categories;
CREATE POLICY sim_eef_categories_update ON sim.eef_categories
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS sim_eef_categories_delete ON sim.eef_categories;
CREATE POLICY sim_eef_categories_delete ON sim.eef_categories
  FOR DELETE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND organisation_id IS NOT NULL
    AND public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS sim_opa_categories_select ON sim.opa_categories;
CREATE POLICY sim_opa_categories_select ON sim.opa_categories
  FOR SELECT TO authenticated
  USING (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_opa_categories_insert ON sim.opa_categories;
CREATE POLICY sim_opa_categories_insert ON sim.opa_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS sim_opa_categories_update ON sim.opa_categories;
CREATE POLICY sim_opa_categories_update ON sim.opa_categories
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS sim_opa_categories_delete ON sim.opa_categories;
CREATE POLICY sim_opa_categories_delete ON sim.opa_categories
  FOR DELETE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND organisation_id IS NOT NULL
    AND public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS sim_enterprise_environment_factors_select ON sim.enterprise_environment_factors;
CREATE POLICY sim_enterprise_environment_factors_select ON sim.enterprise_environment_factors
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_enterprise_environment_factors_insert ON sim.enterprise_environment_factors;
CREATE POLICY sim_enterprise_environment_factors_insert ON sim.enterprise_environment_factors
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.create')
  );

DROP POLICY IF EXISTS sim_enterprise_environment_factors_update ON sim.enterprise_environment_factors;
CREATE POLICY sim_enterprise_environment_factors_update ON sim.enterprise_environment_factors
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.update')
    AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.update')
    AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS sim_enterprise_environment_factors_delete ON sim.enterprise_environment_factors;
CREATE POLICY sim_enterprise_environment_factors_delete ON sim.enterprise_environment_factors
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'eef.delete')
  );

DROP POLICY IF EXISTS sim_organisational_process_assets_select ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_select ON sim.organisational_process_assets
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_organisational_process_assets_insert ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_insert ON sim.organisational_process_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.create')
  );

DROP POLICY IF EXISTS sim_organisational_process_assets_update ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_update ON sim.organisational_process_assets
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.update')
    AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.update')
    AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS sim_organisational_process_assets_delete ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_delete ON sim.organisational_process_assets
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.user_has_permission_for_account(organisation_id, 'opa.delete')
  );

-- ============================================================================
-- PERMISSIONS & ROLE ASSIGNMENTS
-- ============================================================================

INSERT INTO public.permissions (
  permission_code, permission_name, permission_description,
  permission_category, permission_module, permission_type, is_active
)
VALUES
  ('eef.create', 'Create EEF', 'Create enterprise environment factor records', 'org_knowledge', 'eef', 'create', TRUE),
  ('eef.read', 'View EEF', 'View enterprise environment factors', 'org_knowledge', 'eef', 'read', TRUE),
  ('eef.update', 'Update EEF', 'Update enterprise environment factors', 'org_knowledge', 'eef', 'update', TRUE),
  ('eef.delete', 'Delete EEF', 'Delete enterprise environment factors', 'org_knowledge', 'eef', 'delete', TRUE),
  ('eef.export', 'Export EEF', 'Export enterprise environment factors', 'org_knowledge', 'eef', 'execute', TRUE),
  ('opa.create', 'Create OPA', 'Create organisational process asset records', 'org_knowledge', 'opa', 'create', TRUE),
  ('opa.read', 'View OPA', 'View organisational process assets', 'org_knowledge', 'opa', 'read', TRUE),
  ('opa.update', 'Update OPA', 'Update organisational process assets', 'org_knowledge', 'opa', 'update', TRUE),
  ('opa.delete', 'Delete OPA', 'Delete organisational process assets', 'org_knowledge', 'opa', 'delete', TRUE),
  ('opa.export', 'Export OPA', 'Export organisational process assets', 'org_knowledge', 'opa', 'execute', TRUE)
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  permission_category = EXCLUDED.permission_category,
  permission_module = EXCLUDED.permission_module,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'system_admin'
  AND (p.permission_code LIKE 'eef.%' OR p.permission_code LIKE 'opa.%')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'pmo_admin'
  AND (p.permission_code LIKE 'eef.%' OR p.permission_code LIKE 'opa.%')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'project_manager'
  AND (p.permission_code LIKE 'eef.%' OR p.permission_code LIKE 'opa.%')
  AND p.permission_code NOT IN ('eef.delete', 'opa.delete')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'team_lead'
  AND (p.permission_code LIKE 'eef.%' OR p.permission_code LIKE 'opa.%')
  AND p.permission_code NOT IN ('eef.delete', 'opa.delete')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'team_member'
  AND p.permission_code IN (
    'eef.create', 'eef.read', 'eef.update', 'eef.export',
    'opa.create', 'opa.read', 'opa.update', 'opa.export'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'stakeholder'
  AND p.permission_code IN ('eef.create', 'eef.read', 'opa.create', 'opa.read')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'viewer'
  AND p.permission_code IN ('eef.read', 'opa.read')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ============================================================================
-- SEED: default global categories (organisation_id NULL)
-- ============================================================================

INSERT INTO public.eef_categories (organisation_id, code, name, description, eef_kind, sort_order, is_active)
SELECT v.* FROM (VALUES
  (NULL::uuid, 'culture', 'Organisational culture', 'Norms, values, and ways of working', 'internal', 10, TRUE),
  (NULL, 'governance', 'Governance & policy', 'Corporate and regulatory context', 'internal', 20, TRUE),
  (NULL, 'market', 'Market conditions', 'Competition, demand, and industry trends', 'external', 30, TRUE),
  (NULL, 'regulatory', 'Regulatory & legal', 'Laws, compliance, and regulators', 'external', 40, TRUE),
  (NULL, 'infrastructure', 'Infrastructure & technology', 'IT, facilities, and tools landscape', 'external', 50, TRUE)
) AS v(organisation_id, code, name, description, eef_kind, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.eef_categories ec
  WHERE ec.organisation_id IS NULL AND ec.code = v.code
);

INSERT INTO public.opa_categories (organisation_id, code, name, description, sort_order, is_active)
SELECT v.* FROM (VALUES
  (NULL::uuid, 'templates', 'Templates', 'Reusable document and delivery templates', 10, TRUE),
  (NULL, 'processes', 'Processes & procedures', 'Standard operating procedures', 20, TRUE),
  (NULL, 'policies', 'Policies', 'Organisational policies', 30, TRUE),
  (NULL, 'knowledge', 'Knowledge bases', 'Historical information and lessons', 40, TRUE)
) AS v(organisation_id, code, name, description, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opa_categories oc
  WHERE oc.organisation_id IS NULL AND oc.code = v.code
);

INSERT INTO sim.eef_categories (organisation_id, code, name, description, eef_kind, sort_order, is_active)
SELECT v.* FROM (VALUES
  (NULL::uuid, 'culture', 'Organisational culture', 'Norms, values, and ways of working', 'internal', 10, TRUE),
  (NULL, 'governance', 'Governance & policy', 'Corporate and regulatory context', 'internal', 20, TRUE),
  (NULL, 'market', 'Market conditions', 'Competition, demand, and industry trends', 'external', 30, TRUE),
  (NULL, 'regulatory', 'Regulatory & legal', 'Laws, compliance, and regulators', 'external', 40, TRUE),
  (NULL, 'infrastructure', 'Infrastructure & technology', 'IT, facilities, and tools landscape', 'external', 50, TRUE)
) AS v(organisation_id, code, name, description, eef_kind, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM sim.eef_categories ec
  WHERE ec.organisation_id IS NULL AND ec.code = v.code
);

INSERT INTO sim.opa_categories (organisation_id, code, name, description, sort_order, is_active)
SELECT v.* FROM (VALUES
  (NULL::uuid, 'templates', 'Templates', 'Reusable document and delivery templates', 10, TRUE),
  (NULL, 'processes', 'Processes & procedures', 'Standard operating procedures', 20, TRUE),
  (NULL, 'policies', 'Policies', 'Organisational policies', 30, TRUE),
  (NULL, 'knowledge', 'Knowledge bases', 'Historical information and lessons', 40, TRUE)
) AS v(organisation_id, code, name, description, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM sim.opa_categories oc
  WHERE oc.organisation_id IS NULL AND oc.code = v.code
);

-- ============================================================================
-- REGISTER database_tables
-- ============================================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('eef_categories', 'Lookup categories for enterprise environment factors', FALSE, TRUE),
  ('enterprise_environment_factors', 'Enterprise environment factors (EEF) records', FALSE, TRUE),
  ('opa_categories', 'Lookup categories for organisational process assets', FALSE, TRUE),
  ('organisational_process_assets', 'Organisational process assets (OPA) records', FALSE, TRUE),
  ('sim.eef_categories', 'Simulator: EEF category lookup', FALSE, TRUE),
  ('sim.enterprise_environment_factors', 'Simulator: EEF records', FALSE, TRUE),
  ('sim.opa_categories', 'Simulator: OPA category lookup', FALSE, TRUE),
  ('sim.organisational_process_assets', 'Simulator: OPA records', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
