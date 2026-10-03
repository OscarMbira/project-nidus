-- =============================================================================
-- v1076: Team-scoped Document Signatory Requirements — SIM schema only
-- Run AFTER: SQL/v1075_team_scope_signatory_requirements.sql (public)
-- PRD/plan: projectprd/v1067_project_team_document_signatory_scoping_PRD.md
--           projectplan/v1067_project_team_document_signatory_scoping_plan.md
--
-- Mirrors v1075 for the sim schema. "Team" reuses sim.practice_teams /
-- sim.practice_team_members (team leadership via practice_teams.team_lead_user_id,
-- which references auth.users(id) directly — no public.users join needed here,
-- unlike the public-schema branch in v1075).
-- =============================================================================

SET lock_timeout = '30s';
SET deadlock_timeout = '200ms';

ALTER TABLE sim.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_sim_ptsr_scope_type;

ALTER TABLE sim.process_template_signatory_requirements
  ADD CONSTRAINT chk_sim_ptsr_scope_type CHECK (
    scope_type IN ('organisation', 'portfolio', 'programme', 'project', 'team')
  );

ALTER TABLE sim.process_template_signatory_scope_policies
  DROP CONSTRAINT IF EXISTS chk_sim_ptssp_scope_type;

ALTER TABLE sim.process_template_signatory_scope_policies
  ADD CONSTRAINT chk_sim_ptssp_scope_type CHECK (
    scope_type IN ('portfolio', 'programme', 'project', 'team')
  );

-- chk_sim_ptsr_scope_id (organisation <=> scope_id IS NULL) already covers 'team'
-- correctly as a non-organisation scope requiring scope_id — no change needed.

CREATE OR REPLACE FUNCTION sim.can_manage_signatory_requirements(
  p_account_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT
    public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_user()
      OR (
        p_scope_type = 'project'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM sim.practice_projects pp
          WHERE pp.id = p_scope_id
            AND (
              pp.user_id = auth.uid()
              OR sim.auth_user_can_access_practice_project(p_scope_id)
            )
        )
      )
      OR (
        p_scope_type IN ('portfolio', 'programme')
        AND public.is_pmo_admin_user()
      )
      OR (
        -- v1067: a practice team's lead may manage that team's own signatory scope.
        -- practice_teams.team_lead_user_id references auth.users(id) directly.
        p_scope_type = 'team'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM sim.practice_teams t
          WHERE t.id = p_scope_id
            AND COALESCE(t.is_deleted, FALSE) = FALSE
            AND t.team_lead_user_id = auth.uid()
        )
      )
    );
$$;

COMMENT ON FUNCTION sim.can_manage_signatory_requirements(uuid, text, uuid) IS
  'v880c/v1076: whether caller may write Document Signatory requirements/policies for this account+scope. v1076 added the team branch (practice_teams.team_lead_user_id).';

REVOKE ALL ON FUNCTION sim.can_manage_signatory_requirements(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.can_manage_signatory_requirements(uuid, text, uuid) TO authenticated;

-- policy_sim_ptssp_write and policy_sim_ptsr_write (v880c) already call this function
-- positionally with (account_id, scope_type, scope_id) — no policy changes needed;
-- the new 'team' branch activates automatically once scope_type = 'team' rows exist.

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.process_template_signatory_requirements', 'Simulator: ordered signatory role-slots per document type, scoped to Organisation/Portfolio/Programme/Project/Team (v880c/v1076).', false, true),
  ('sim.process_template_signatory_scope_policies', 'Simulator: per-scope Document Signatory override policy (custom or none) for Portfolio/Programme/Project/Team (v880c/v1076).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1076 sim team-scope signatory requirements applied — next: v1077 (menu)';
END $$;
