-- =============================================================================
-- v530_invitation_message_templates_rls.sql
-- Phase 13 — RLS for invitation_message_templates
-- =============================================================================

DROP POLICY IF EXISTS invitation_message_templates_select ON public.invitation_message_templates;
CREATE POLICY invitation_message_templates_select
  ON public.invitation_message_templates
  FOR SELECT
  TO authenticated
  USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS invitation_message_templates_insert ON public.invitation_message_templates;
CREATE POLICY invitation_message_templates_insert
  ON public.invitation_message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS invitation_message_templates_update ON public.invitation_message_templates;
CREATE POLICY invitation_message_templates_update
  ON public.invitation_message_templates
  FOR UPDATE
  TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS invitation_message_templates_delete ON public.invitation_message_templates;
CREATE POLICY invitation_message_templates_delete
  ON public.invitation_message_templates
  FOR DELETE
  TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DO $$ BEGIN RAISE NOTICE 'v530_invitation_message_templates_rls.sql applied'; END $$;
