-- =============================================================================
-- v837: Fix document-governance RLS helpers (missing user_role_assignments)
-- Plan: projectplan/v838_governance_documents_project_memberships_rls_plan.md
--
-- Symptom: GET risk_management_strategies → relation "user_role_assignments"
-- does not exist (v226 helpers). CREATE OR REPLACE also cannot rename params,
-- so this script DROP … CASCADE then recreates helpers + dependent policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Drop broken helpers (CASCADE removes policies that call them)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.user_has_pmo_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_pm_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS sim.user_has_pmo_role_practice(UUID) CASCADE;
DROP FUNCTION IF EXISTS sim.user_has_pm_role_practice(UUID) CASCADE;

-- ---------------------------------------------------------------------------
-- 2) Recreate helpers on user_roles / project_memberships
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.user_has_pmo_role(auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.auth_user_id = user_has_pmo_role.auth_user_id
      AND LOWER(REPLACE(TRIM(r.role_name), ' ', '_')) IN (
        'pmo_admin', 'system_admin', 'super_admin'
      )
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  );
$$;

CREATE FUNCTION public.user_has_pm_role(auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.auth_user_id = user_has_pm_role.auth_user_id
      AND LOWER(REPLACE(TRIM(r.role_name), ' ', '_')) IN (
        'project_manager', 'programme_manager', 'program_manager'
      )
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    INNER JOIN public.project_roles pr ON pr.id = pm.project_role_id
    WHERE u.auth_user_id = user_has_pm_role.auth_user_id
      AND pm.is_active = TRUE
      AND COALESCE(pr.is_active, TRUE) = TRUE
      AND LOWER(REPLACE(TRIM(pr.role_name), ' ', '_')) IN (
        'project_manager', 'programme_manager', 'program_manager',
        'project_sponsor', 'project_board_member'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_pmo_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_pmo_role(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_has_pm_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_pm_role(UUID) TO authenticated, service_role;

CREATE FUNCTION sim.user_has_pmo_role_practice(auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.auth_user_id = user_has_pmo_role_practice.auth_user_id
      AND LOWER(REPLACE(TRIM(r.role_name), ' ', '_')) IN (
        'pmo_admin', 'system_admin', 'super_admin', 'sim_pmo_admin'
      )
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  );
$$;

CREATE FUNCTION sim.user_has_pm_role_practice(auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.auth_user_id = user_has_pm_role_practice.auth_user_id
      AND LOWER(REPLACE(TRIM(r.role_name), ' ', '_')) IN (
        'project_manager', 'programme_manager', 'program_manager', 'sim_project_manager'
      )
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    INNER JOIN public.project_roles pr ON pr.id = pm.project_role_id
    WHERE u.auth_user_id = user_has_pm_role_practice.auth_user_id
      AND pm.is_active = TRUE
      AND COALESCE(pr.is_active, TRUE) = TRUE
      AND LOWER(REPLACE(TRIM(pr.role_name), ' ', '_')) IN (
        'project_manager', 'programme_manager', 'program_manager',
        'project_sponsor', 'project_board_member'
      )
  );
$$;

REVOKE ALL ON FUNCTION sim.user_has_pmo_role_practice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.user_has_pmo_role_practice(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION sim.user_has_pm_role_practice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.user_has_pm_role_practice(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Restore v226-style governance policies (idempotent DROP + CREATE)
-- ---------------------------------------------------------------------------

-- risk_management_strategies
DROP POLICY IF EXISTS "rms_pmo_read_all" ON risk_management_strategies;
DROP POLICY IF EXISTS "rms_pmo_write" ON risk_management_strategies;
DROP POLICY IF EXISTS "rms_pm_read" ON risk_management_strategies;
DROP POLICY IF EXISTS "rms_pm_write" ON risk_management_strategies;
DROP POLICY IF EXISTS "rms_pm_no_baseline_modify" ON risk_management_strategies;
DROP POLICY IF EXISTS "rms_only_pmo_baseline" ON risk_management_strategies;

CREATE POLICY "rms_pmo_read_all" ON risk_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "rms_pmo_write" ON risk_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "rms_pm_read" ON risk_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "rms_pm_write" ON risk_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "rms_pm_no_baseline_modify" ON risk_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
  WITH CHECK (user_has_pm_role(auth.uid()) AND is_baseline = FALSE);

CREATE POLICY "rms_only_pmo_baseline" ON risk_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- quality_management_strategies
DROP POLICY IF EXISTS "qms_pmo_read_all" ON quality_management_strategies;
DROP POLICY IF EXISTS "qms_pmo_write" ON quality_management_strategies;
DROP POLICY IF EXISTS "qms_pm_read" ON quality_management_strategies;
DROP POLICY IF EXISTS "qms_pm_write" ON quality_management_strategies;
DROP POLICY IF EXISTS "qms_pm_no_baseline_modify" ON quality_management_strategies;
DROP POLICY IF EXISTS "qms_only_pmo_baseline" ON quality_management_strategies;

CREATE POLICY "qms_pmo_read_all" ON quality_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "qms_pmo_write" ON quality_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "qms_pm_read" ON quality_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "qms_pm_write" ON quality_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "qms_pm_no_baseline_modify" ON quality_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
  WITH CHECK (user_has_pm_role(auth.uid()) AND is_baseline = FALSE);

CREATE POLICY "qms_only_pmo_baseline" ON quality_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- communication_management_strategies
DROP POLICY IF EXISTS "cms_pmo_read_all" ON communication_management_strategies;
DROP POLICY IF EXISTS "cms_pmo_write" ON communication_management_strategies;
DROP POLICY IF EXISTS "cms_pm_read" ON communication_management_strategies;
DROP POLICY IF EXISTS "cms_pm_write" ON communication_management_strategies;
DROP POLICY IF EXISTS "cms_pm_no_baseline_modify" ON communication_management_strategies;
DROP POLICY IF EXISTS "cms_only_pmo_baseline" ON communication_management_strategies;

CREATE POLICY "cms_pmo_read_all" ON communication_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "cms_pmo_write" ON communication_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "cms_pm_read" ON communication_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "cms_pm_write" ON communication_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "cms_pm_no_baseline_modify" ON communication_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
  WITH CHECK (user_has_pm_role(auth.uid()) AND is_baseline = FALSE);

CREATE POLICY "cms_only_pmo_baseline" ON communication_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- configuration_management_strategies (if present)
DO $$
BEGIN
  IF to_regclass('public.configuration_management_strategies') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "cfgms_pmo_read_all" ON configuration_management_strategies';
  EXECUTE 'DROP POLICY IF EXISTS "cfgms_pmo_write" ON configuration_management_strategies';
  EXECUTE 'DROP POLICY IF EXISTS "cfgms_pm_read" ON configuration_management_strategies';
  EXECUTE 'DROP POLICY IF EXISTS "cfgms_pm_write" ON configuration_management_strategies';
  EXECUTE 'DROP POLICY IF EXISTS "cfgms_pm_no_baseline_modify" ON configuration_management_strategies';
  EXECUTE 'DROP POLICY IF EXISTS "cfgms_only_pmo_baseline" ON configuration_management_strategies';

  EXECUTE $p$
    CREATE POLICY "cfgms_pmo_read_all" ON configuration_management_strategies
      FOR SELECT TO authenticated
      USING (user_has_pmo_role(auth.uid()))
  $p$;
  EXECUTE $p$
    CREATE POLICY "cfgms_pmo_write" ON configuration_management_strategies
      FOR ALL TO authenticated
      USING (
        user_has_pmo_role(auth.uid())
        AND (pmo_permission = 'write' OR pmo_permission = 'approve')
      )
      WITH CHECK (
        user_has_pmo_role(auth.uid())
        AND (pmo_permission = 'write' OR pmo_permission = 'approve')
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "cfgms_pm_read" ON configuration_management_strategies
      FOR SELECT TO authenticated
      USING (
        user_has_pm_role(auth.uid())
        AND pm_permission IN ('read', 'write', 'tailor')
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "cfgms_pm_write" ON configuration_management_strategies
      FOR ALL TO authenticated
      USING (
        user_has_pm_role(auth.uid())
        AND pm_permission = 'write'
        AND is_baseline = FALSE
      )
      WITH CHECK (
        user_has_pm_role(auth.uid())
        AND pm_permission = 'write'
        AND is_baseline = FALSE
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "cfgms_pm_no_baseline_modify" ON configuration_management_strategies
      FOR UPDATE TO authenticated
      USING (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
      WITH CHECK (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
  $p$;
  EXECUTE $p$
    CREATE POLICY "cfgms_only_pmo_baseline" ON configuration_management_strategies
      FOR UPDATE TO authenticated
      USING (user_has_pmo_role(auth.uid()))
      WITH CHECK (
        (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
      )
  $p$;
END $$;

-- project_mandates (if present)
DO $$
BEGIN
  IF to_regclass('public.project_mandates') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "mandates_pmo_read_all" ON project_mandates';
  EXECUTE 'DROP POLICY IF EXISTS "mandates_pmo_write" ON project_mandates';
  EXECUTE 'DROP POLICY IF EXISTS "mandates_pm_read" ON project_mandates';
  EXECUTE 'DROP POLICY IF EXISTS "mandates_pm_write" ON project_mandates';
  EXECUTE 'DROP POLICY IF EXISTS "mandates_pm_no_baseline_modify" ON project_mandates';
  EXECUTE 'DROP POLICY IF EXISTS "mandates_only_pmo_baseline" ON project_mandates';

  EXECUTE $p$
    CREATE POLICY "mandates_pmo_read_all" ON project_mandates
      FOR SELECT TO authenticated
      USING (user_has_pmo_role(auth.uid()))
  $p$;
  EXECUTE $p$
    CREATE POLICY "mandates_pmo_write" ON project_mandates
      FOR ALL TO authenticated
      USING (
        user_has_pmo_role(auth.uid())
        AND (pmo_permission = 'write' OR pmo_permission = 'approve')
      )
      WITH CHECK (
        user_has_pmo_role(auth.uid())
        AND (pmo_permission = 'write' OR pmo_permission = 'approve')
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "mandates_pm_read" ON project_mandates
      FOR SELECT TO authenticated
      USING (
        user_has_pm_role(auth.uid())
        AND pm_permission IN ('read', 'write', 'tailor')
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "mandates_pm_write" ON project_mandates
      FOR ALL TO authenticated
      USING (
        user_has_pm_role(auth.uid())
        AND pm_permission = 'write'
        AND is_baseline = FALSE
      )
      WITH CHECK (
        user_has_pm_role(auth.uid())
        AND pm_permission = 'write'
        AND is_baseline = FALSE
      )
  $p$;
  EXECUTE $p$
    CREATE POLICY "mandates_pm_no_baseline_modify" ON project_mandates
      FOR UPDATE TO authenticated
      USING (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
      WITH CHECK (user_has_pm_role(auth.uid()) AND is_baseline = FALSE)
  $p$;
  EXECUTE $p$
    CREATE POLICY "mandates_only_pmo_baseline" ON project_mandates
      FOR UPDATE TO authenticated
      USING (user_has_pmo_role(auth.uid()))
      WITH CHECK (
        (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
      )
  $p$;
END $$;

-- project_briefs
DROP POLICY IF EXISTS "briefs_pmo_read_all" ON project_briefs;
DROP POLICY IF EXISTS "briefs_pmo_approve" ON project_briefs;
DROP POLICY IF EXISTS "briefs_pm_read" ON project_briefs;
DROP POLICY IF EXISTS "briefs_pm_write" ON project_briefs;

CREATE POLICY "briefs_pmo_read_all" ON project_briefs
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "briefs_pmo_approve" ON project_briefs
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()) AND pmo_permission = 'approve')
  WITH CHECK (user_has_pmo_role(auth.uid()) AND pmo_permission = 'approve');

CREATE POLICY "briefs_pm_read" ON project_briefs
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "briefs_pm_write" ON project_briefs
  FOR ALL TO authenticated
  USING (user_has_pm_role(auth.uid()) AND pm_permission = 'write')
  WITH CHECK (user_has_pm_role(auth.uid()) AND pm_permission = 'write');

-- benefits_review_plans
DROP POLICY IF EXISTS "benefits_pmo_read_all" ON benefits_review_plans;
DROP POLICY IF EXISTS "benefits_pmo_approve" ON benefits_review_plans;
DROP POLICY IF EXISTS "benefits_pm_read" ON benefits_review_plans;
DROP POLICY IF EXISTS "benefits_pm_write" ON benefits_review_plans;

CREATE POLICY "benefits_pmo_read_all" ON benefits_review_plans
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "benefits_pmo_approve" ON benefits_review_plans
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()) AND pmo_permission = 'approve')
  WITH CHECK (user_has_pmo_role(auth.uid()) AND pmo_permission = 'approve');

CREATE POLICY "benefits_pm_read" ON benefits_review_plans
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "benefits_pm_write" ON benefits_review_plans
  FOR ALL TO authenticated
  USING (user_has_pm_role(auth.uid()) AND pm_permission = 'write')
  WITH CHECK (user_has_pm_role(auth.uid()) AND pm_permission = 'write');

-- ---------------------------------------------------------------------------
-- 4) Restore v835 project_memberships SELECT policies (also may have cascaded)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_rms_select_project_membership ON risk_management_strategies;
CREATE POLICY policy_rms_select_project_membership
    ON risk_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = risk_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_qms_select_project_membership ON quality_management_strategies;
CREATE POLICY policy_qms_select_project_membership
    ON quality_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = quality_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_cms_select_project_membership ON communication_management_strategies;
CREATE POLICY policy_cms_select_project_membership
    ON communication_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = communication_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_business_cases_select_project_membership ON business_cases;
CREATE POLICY policy_business_cases_select_project_membership
    ON business_cases FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND project_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = business_cases.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_project_briefs_select_project_membership ON project_briefs;
CREATE POLICY policy_project_briefs_select_project_membership
    ON project_briefs FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = project_briefs.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_pid_select_project_membership ON project_initiation_documents;
CREATE POLICY policy_pid_select_project_membership
    ON project_initiation_documents FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = project_initiation_documents.project_id
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_brp_select_project_membership ON benefits_review_plans;
CREATE POLICY policy_brp_select_project_membership
    ON benefits_review_plans FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND project_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = benefits_review_plans.project_id
              AND pm.is_active = TRUE
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v837_fix_document_governance_role_helpers.sql applied (DROP CASCADE + recreate)';
END $$;
