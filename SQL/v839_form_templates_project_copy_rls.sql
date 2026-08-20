-- =============================================================================
-- v839: Allow project members to INSERT account-scoped form_templates copies
--
-- Symptom: "Copy down to my project" on Organisational Templates fails with
--   new row violates row-level security policy for table "form_templates"
-- for Project Managers (and other non-PMO users).
--
-- Cause: v809 INSERT required is_user_pmo_admin() for every account-level copy.
-- That matched org-wide PMO customisation, but v824 intentionally lets a PM fork
-- an organisational form template down to project tier. The copy service inserts
-- form_templates (account_id + created_by = auth.uid()) *before* the project-tier
-- pm_template_nodes row — so PMs hit this RLS wall first.
--
-- Fix: keep global-master writes PMO-admin-only; for account-scoped rows allow
-- INSERT when the caller has account access AND (is PMO admin OR created_by =
-- auth.uid()). Aligns with the existing UPDATE/DELETE creator clause in v809.
--
-- Platform–Simulator parity (rule 34.1).
-- Apply after: v809_form_template_account_level_copy.sql
-- =============================================================================

DROP POLICY IF EXISTS policy_form_templates_insert ON public.form_templates;
CREATE POLICY policy_form_templates_insert
    ON public.form_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND (
                public.is_user_pmo_admin(auth.uid())
                OR created_by = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS policy_sim_form_templates_insert ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_insert
    ON sim.form_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND (
                public.is_user_pmo_admin(auth.uid())
                OR created_by = auth.uid()
            )
        )
    );

COMMENT ON POLICY policy_form_templates_insert ON public.form_templates IS
  'Global masters: PMO admin only. Account copies: PMO admin, or the creating user (created_by = auth.uid()) with account access — enables v824 project-tier copy-down.';

DO $$
BEGIN
  RAISE NOTICE 'v839_form_templates_project_copy_rls.sql applied';
END $$;
