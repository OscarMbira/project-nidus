-- =============================================================================
-- v1075: Team-scoped Document Signatory Requirements — PUBLIC schema only
-- PRD/plan: projectprd/v1067_project_team_document_signatory_scoping_PRD.md
--           projectplan/v1067_project_team_document_signatory_scoping_plan.md
--
-- Adds scope_type = 'team' to the existing organisation/portfolio/programme/project
-- hierarchy from v880. "Team" reuses the existing public.teams / public.team_members
-- tables (team leadership already tracked via teams.team_lead_user_id) — no new table.
-- teams.id is used directly as scope_id, so no schema change is needed on either
-- signatory table beyond the CHECK constraints; a team lead can lead more than one
-- team on the same project, and each team's id already disambiguates that.
--
-- Apply order:
--   1) THIS FILE (public)
--   2) SQL/v1076_sim_team_scope_signatory_requirements.sql
--   3) SQL/v1077_document_signatory_pm_menu.sql
-- =============================================================================

SET lock_timeout = '30s';
SET deadlock_timeout = '200ms';

-- ---------------------------------------------------------------------------
-- A) Allow scope_type = 'team' on both tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_ptsr_scope_type;

ALTER TABLE public.process_template_signatory_requirements
  ADD CONSTRAINT chk_ptsr_scope_type CHECK (
    scope_type IN ('organisation', 'portfolio', 'programme', 'project', 'team')
  );

ALTER TABLE public.process_template_signatory_scope_policies
  DROP CONSTRAINT IF EXISTS chk_ptssp_scope_type;

ALTER TABLE public.process_template_signatory_scope_policies
  ADD CONSTRAINT chk_ptssp_scope_type CHECK (
    scope_type IN ('portfolio', 'programme', 'project', 'team')
  );

-- chk_ptsr_scope_id (scope_type = 'organisation' <=> scope_id IS NULL) already covers
-- 'team' correctly as a non-organisation scope requiring scope_id — no change needed.

-- ---------------------------------------------------------------------------
-- B) Extend can_manage_signatory_requirements() with a 'team' branch.
-- Same signature as v880 (no new parameter) — teams.id slots directly into the
-- existing scope_id column, so no scope_project_id / composite-key column is needed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_signatory_requirements(
  p_account_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_user()
      OR (
        p_scope_type = 'portfolio'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.portfolios p
          INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
          WHERE p.id = p_scope_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND u.auth_user_id = auth.uid()
        )
      )
      OR (
        p_scope_type = 'programme'
        AND p_scope_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.programmes prog
            INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
            WHERE prog.id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programmes prog
            INNER JOIN public.portfolios p ON p.id = prog.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE prog.id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
        )
      )
      OR (
        p_scope_type = 'project'
        AND p_scope_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.projects proj
            INNER JOIN public.users u ON u.id = proj.project_manager_user_id
            WHERE proj.id = p_scope_id
              AND COALESCE(proj.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programme_projects pp
            INNER JOIN public.programmes prog ON prog.id = pp.programme_id
            INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.portfolio_projects pp
            INNER JOIN public.portfolios p ON p.id = pp.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programme_projects pp
            INNER JOIN public.programmes prog ON prog.id = pp.programme_id
            INNER JOIN public.portfolios p ON p.id = prog.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
        )
      )
      OR (
        -- v1067: a team's lead may manage that team's own signatory scope.
        -- scope_id here is teams.id, which already uniquely identifies one team on
        -- one project — a person leading teams on two different projects (or two
        -- teams on the same project) simply leads two different teams.id values.
        p_scope_type = 'team'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.teams t
          INNER JOIN public.users u ON u.id = t.team_lead_user_id
          WHERE t.id = p_scope_id
            AND COALESCE(t.is_deleted, FALSE) = FALSE
            AND COALESCE(t.is_active, TRUE) = TRUE
            AND u.auth_user_id = auth.uid()
        )
      )
    );
$$;

COMMENT ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) IS
  'v880/v1067: whether caller may write Document Signatory requirements/policies for this account+scope. v1067 added the team branch (teams.team_lead_user_id).';

REVOKE ALL ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) TO authenticated;

-- policy_ptssp_write and policy_ptsr_write (v880) already call this function
-- positionally with (account_id, scope_type, scope_id) — no policy changes needed;
-- the new 'team' branch activates automatically once scope_type = 'team' rows exist.

-- ---------------------------------------------------------------------------
-- C) Registry description update (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('process_template_signatory_requirements', 'Ordered signatory role-slots per document type, scoped to Organisation/Portfolio/Programme/Project/Team (v880/v1067).', false, true),
  ('process_template_signatory_scope_policies', 'Per-scope Document Signatory override policy (custom list or no signatories) for Portfolio/Programme/Project/Team (v880/v1067).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1075 public team-scope signatory requirements applied — next: v1076 (sim), then v1077 (menu)';
END $$;
