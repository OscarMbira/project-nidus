-- =============================================================================
-- v593_invitation_tracker_rls.sql
-- RLS: senders can read/update their pending invitations; PMO org-scoped SELECT
-- Prerequisites: v592, user_has_access_to_account, is_user_pmo_admin
-- =============================================================================

DROP POLICY IF EXISTS policy_project_invitations_sender_select ON project_invitations;
CREATE POLICY policy_project_invitations_sender_select
  ON project_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.id = project_invitations.invited_by_user_id
    )
  );

DROP POLICY IF EXISTS policy_project_invitations_sender_update ON project_invitations;
CREATE POLICY policy_project_invitations_sender_update
  ON project_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.id = project_invitations.invited_by_user_id
    )
    AND invitation_status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.id = project_invitations.invited_by_user_id
    )
  );

DROP POLICY IF EXISTS policy_project_invitations_pmo_org_select ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_org_select
  ON project_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    AND (
      (entity_type = 'project' AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_id
          AND public.user_has_access_to_account(p.account_id)
      ))
      OR (entity_type = 'portfolio' AND EXISTS (
        SELECT 1
        FROM portfolio_projects pp
        JOIN projects p ON p.id = pp.project_id
        WHERE pp.portfolio_id = portfolio_id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND public.user_has_access_to_account(p.account_id)
        LIMIT 1
      ))
      OR (entity_type = 'programme' AND EXISTS (
        SELECT 1
        FROM programme_projects prp
        JOIN projects p ON p.id = prp.project_id
        WHERE prp.programme_id = programme_id
          AND COALESCE(prp.is_deleted, FALSE) = FALSE
          AND public.user_has_access_to_account(p.account_id)
        LIMIT 1
      ))
    )
  );

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v593_invitation_tracker_rls.sql applied';
END $$;
