-- ============================================================================
-- v389: Simulator — allow practice project owner to add/update/remove other members
-- Prerequisites: v242, v227, auth.users
-- Date: 2026-04-05
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

DROP POLICY IF EXISTS "practice_memberships_user_access" ON sim.practice_project_memberships;

CREATE POLICY "practice_memberships_user_access" ON sim.practice_project_memberships
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR practice_project_id IN (
      SELECT id FROM sim.practice_projects
      WHERE user_id = auth.uid() AND COALESCE(is_deleted, FALSE) = FALSE
    )
    OR practice_project_id IN (
      SELECT practice_project_id FROM sim.practice_project_memberships m
      WHERE m.user_id = auth.uid() AND m.is_active = TRUE
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id
        AND pp.user_id = auth.uid()
        AND COALESCE(pp.is_deleted, FALSE) = FALSE
    )
  );

COMMENT ON POLICY "practice_memberships_user_access" ON sim.practice_project_memberships IS
  'Members see own rows; project owner (auth) may manage memberships for their practice projects';
