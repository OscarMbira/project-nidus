-- =============================================================================
-- v841: Close remaining Organisational Templates "copy down" RLS gaps
-- Follow-up to v839 (form_templates) + v840 (pm_template_nodes project access).
--
-- Gaps covered:
--   1) sim.pm_template_entity_assignment — still PMO-admin-only (v764c); mirror
--      public v840 project access via auth_user_can_access_practice_project
--   2) sim.process_template_node_links — SELECT only (v766); add write via
--      sim.can_manage_pm_template_node
--   3) Harden sim.auth_user_can_access_practice_project — match auth.uid() and
--      public.users.id (get_current_user_id), plus named project_manager_user_id
--   4) public.auth_user_can_access_project — also allow named project_manager
--      (restores pre-v840 named-PM path when memberships are empty)
--   5) organisational_process_assets INSERT/UPDATE (public + sim) — allow
--      creator + account access without opa.create/update permission (same spirit
--      as v839 form_templates), so OPA domain copy-down works for PMs
--
-- Apply after: v839, v840, v520, v406, v400, v766, v764c.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Harden sim.auth_user_can_access_practice_project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.auth_user_can_access_practice_project(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT
    p_practice_project_id IS NOT NULL
    AND (
      public.is_pmo_admin_user()
      OR public.is_user_pmo_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM sim.practice_projects pp
        LEFT JOIN public.users mgr ON mgr.id = pp.project_manager_user_id
        WHERE pp.id = p_practice_project_id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND (
            pp.user_id = auth.uid()
            OR pp.user_id = sim.get_current_user_id()
            OR mgr.auth_user_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM sim.practice_project_memberships m
              WHERE m.practice_project_id = pp.id
                AND COALESCE(m.is_active, TRUE) = TRUE
                AND (
                  m.user_id = auth.uid()
                  OR m.user_id = sim.get_current_user_id()
                )
            )
          )
      )
    );
$$;

COMMENT ON FUNCTION sim.auth_user_can_access_practice_project(UUID) IS
  'TRUE if PMO/admin or the current user owns/manages/is a member of the practice project (auth.uid or users.id; v841).';

-- ---------------------------------------------------------------------------
-- 2) public.auth_user_can_access_project — include named project_manager_user_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      public.is_pmo_admin_user()
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        INNER JOIN public.users u ON u.id = p.project_manager_user_id
        WHERE p.id = p_project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        INNER JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(pm.is_active, TRUE) = TRUE
          AND pm.invitation_status = 'accepted'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        INNER JOIN public.users u ON u.id = up.user_id
        WHERE up.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(up.is_deleted, FALSE) = FALSE
          AND COALESCE(up.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    );
$$;

COMMENT ON FUNCTION public.auth_user_can_access_project(UUID) IS
  'TRUE if PMO/admin, named project manager, or linked via memberships / user_projects / user_roles (v841).';

-- ---------------------------------------------------------------------------
-- 3) sim.pm_template_entity_assignment write — project access parity with v840
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sim_pm_template_entity_assignment_write ON sim.pm_template_entity_assignment;
CREATE POLICY sim_pm_template_entity_assignment_write
    ON sim.pm_template_entity_assignment
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
            OR (
                entity_type IN ('portfolio', 'sub_portfolio')
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_portfolios p
                    WHERE p.id = entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND (
                          p.portfolio_manager_user_id = auth.uid()
                          OR p.user_id = auth.uid()
                      )
                )
            )
            OR (
                entity_type = 'programme'
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_programmes prog
                    WHERE prog.id = entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND (
                          prog.programme_manager_user_id = auth.uid()
                          OR prog.user_id = auth.uid()
                      )
                )
            )
            OR (
                entity_type = 'project'
                AND sim.auth_user_can_access_practice_project(entity_id)
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
            OR (
                entity_type IN ('portfolio', 'sub_portfolio')
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_portfolios p
                    WHERE p.id = entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND (
                          p.portfolio_manager_user_id = auth.uid()
                          OR p.user_id = auth.uid()
                      )
                )
            )
            OR (
                entity_type = 'programme'
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_programmes prog
                    WHERE prog.id = entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND (
                          prog.programme_manager_user_id = auth.uid()
                          OR prog.user_id = auth.uid()
                      )
                )
            )
            OR (
                entity_type = 'project'
                AND sim.auth_user_can_access_practice_project(entity_id)
            )
        )
    );

-- ---------------------------------------------------------------------------
-- 4) sim.process_template_node_links write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sim_process_template_node_links_write ON sim.process_template_node_links;
CREATE POLICY sim_process_template_node_links_write
    ON sim.process_template_node_links
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

-- ---------------------------------------------------------------------------
-- 5) organisational_process_assets — creator + account access (public + sim)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS organisational_process_assets_insert ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_insert ON public.organisational_process_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND (
      public.user_has_permission_for_account(organisation_id, 'opa.create')
      OR public.is_user_pmo_admin(auth.uid())
      OR public.is_pmo_admin_user()
      -- v824 copy-down: project members without opa.create may fork org OPA templates
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.account_id = organisation_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND public.auth_user_can_access_project(p.id)
      )
    )
  );

-- Creator can update their own row (e.g. set pm_template_node_id after copy)
-- without a separate opa.update grant — still requires account access.
DROP POLICY IF EXISTS organisational_process_assets_update ON public.organisational_process_assets;
CREATE POLICY organisational_process_assets_update ON public.organisational_process_assets
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND (
      created_by = auth.uid()
      OR (
        public.user_has_permission_for_account(organisation_id, 'opa.update')
        AND (
          public.user_has_eef_opa_full_edit_role()
          OR created_by = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND (
      created_by = auth.uid()
      OR (
        public.user_has_permission_for_account(organisation_id, 'opa.update')
        AND (
          public.user_has_eef_opa_full_edit_role()
          OR created_by = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS sim_organisational_process_assets_insert ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_insert ON sim.organisational_process_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_has_access_to_account(organisation_id)
    AND (
      public.user_has_permission_for_account(organisation_id, 'opa.create')
      OR public.is_user_pmo_admin(auth.uid())
      OR public.is_pmo_admin_user()
      OR EXISTS (
        SELECT 1
        FROM sim.practice_projects pp
        WHERE COALESCE(pp.is_deleted, FALSE) = FALSE
          AND sim.auth_user_can_access_practice_project(pp.id)
      )
    )
  );

DROP POLICY IF EXISTS sim_organisational_process_assets_update ON sim.organisational_process_assets;
CREATE POLICY sim_organisational_process_assets_update ON sim.organisational_process_assets
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND (
      created_by = auth.uid()
      OR (
        public.user_has_permission_for_account(organisation_id, 'opa.update')
        AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND (
      created_by = auth.uid()
      OR (
        public.user_has_permission_for_account(organisation_id, 'opa.update')
        AND (public.user_has_eef_opa_full_edit_role() OR created_by = auth.uid())
      )
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v841_template_copy_down_rls_parity.sql applied';
END $$;
