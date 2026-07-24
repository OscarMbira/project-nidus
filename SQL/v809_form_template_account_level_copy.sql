-- =============================================================================
-- v809: Account-level ownership + RLS shape for form_templates (Platform + Simulator)
-- Plan: Template Library "Copy not supported for domain: form_template" follow-up
-- Depends on: v754 (existing form_templates/form_template_versions RLS)
--
-- Why: form_templates had no ownership column at all — write access was gated
-- purely by public.is_user_pmo_admin(auth.uid()), global-master-only, same gap
-- v804 already fixed for the 24 process_template tables. This adds the same
-- third shape here: account_id set + created_by = the copying user, still
-- gated by is_user_pmo_admin() (org-level template customisation is a PMO
-- admin action, consistent with process_template/fields' own account-copy
-- pattern) — not a general "any account member can write" policy.
--
-- form_template_versions' SELECT is already fully open (USING (TRUE)); only
-- its write policy needs the same third shape, keyed via the parent
-- form_templates row's account_id (versions have no account_id of their own).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) New columns (public + sim)
-- ---------------------------------------------------------------------------
ALTER TABLE public.form_templates ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.form_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE sim.form_templates ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE sim.form_templates ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_form_templates_account_id ON public.form_templates(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sim_form_templates_account_id ON sim.form_templates(account_id) WHERE account_id IS NOT NULL;

COMMENT ON COLUMN public.form_templates.account_id IS
  'NULL = global master (staff-managed catalog). Set = this account''s own customised copy.';
COMMENT ON COLUMN sim.form_templates.account_id IS
  'NULL = global master (staff-managed catalog). Set = this account''s own customised copy.';

-- ---------------------------------------------------------------------------
-- 2) public.form_templates — split the old single "pmo admin, FOR ALL" policy
--    into per-action policies that also recognise the account-copy shape.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_form_templates_select_authenticated ON public.form_templates;
CREATE POLICY policy_form_templates_select_authenticated
    ON public.form_templates
    FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        OR public.is_user_pmo_admin(auth.uid())
        OR (account_id IS NOT NULL AND public.user_has_access_to_account(account_id))
    );

DROP POLICY IF EXISTS policy_form_templates_pmo_admin_write ON public.form_templates;

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
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_form_templates_update ON public.form_templates;
CREATE POLICY policy_form_templates_update
    ON public.form_templates
    FOR UPDATE
    TO authenticated
    USING (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    )
    WITH CHECK (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_form_templates_delete ON public.form_templates;
CREATE POLICY policy_form_templates_delete
    ON public.form_templates
    FOR DELETE
    TO authenticated
    USING (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

-- ---------------------------------------------------------------------------
-- 3) public.form_template_versions — write policy gains the same account-copy
--    shape, checked via the parent form_templates row (versions carry no
--    account_id of their own).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_form_template_versions_pmo_admin_write ON public.form_template_versions;
CREATE POLICY policy_form_template_versions_write
    ON public.form_template_versions
    FOR ALL
    TO authenticated
    USING (
        public.is_user_pmo_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.form_templates t
            WHERE t.id = form_template_versions.template_id
              AND t.account_id IS NOT NULL
              AND (t.created_by = auth.uid() OR public.user_has_access_to_account(t.account_id))
        )
    )
    WITH CHECK (
        public.is_user_pmo_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.form_templates t
            WHERE t.id = form_template_versions.template_id
              AND t.account_id IS NOT NULL
              AND (t.created_by = auth.uid() OR public.user_has_access_to_account(t.account_id))
        )
    );

-- ---------------------------------------------------------------------------
-- 4) sim schema — parity (rule 34.1)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_sim_form_templates_select_authenticated ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_select_authenticated
    ON sim.form_templates
    FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        OR public.is_user_pmo_admin(auth.uid())
        OR (account_id IS NOT NULL AND public.user_has_access_to_account(account_id))
    );

DROP POLICY IF EXISTS policy_sim_form_templates_pmo_admin_write ON sim.form_templates;

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
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_sim_form_templates_update ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_update
    ON sim.form_templates
    FOR UPDATE
    TO authenticated
    USING (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    )
    WITH CHECK (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_sim_form_templates_delete ON sim.form_templates;
CREATE POLICY policy_sim_form_templates_delete
    ON sim.form_templates
    FOR DELETE
    TO authenticated
    USING (
        (account_id IS NULL AND public.is_user_pmo_admin(auth.uid()))
        OR (account_id IS NOT NULL AND created_by = auth.uid())
        OR (
            account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
            AND public.is_user_pmo_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_sim_form_template_versions_pmo_admin_write ON sim.form_template_versions;
CREATE POLICY policy_sim_form_template_versions_write
    ON sim.form_template_versions
    FOR ALL
    TO authenticated
    USING (
        public.is_user_pmo_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM sim.form_templates t
            WHERE t.id = form_template_versions.template_id
              AND t.account_id IS NOT NULL
              AND (t.created_by = auth.uid() OR public.user_has_access_to_account(t.account_id))
        )
    )
    WITH CHECK (
        public.is_user_pmo_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM sim.form_templates t
            WHERE t.id = form_template_versions.template_id
              AND t.account_id IS NOT NULL
              AND (t.created_by = auth.uid() OR public.user_has_access_to_account(t.account_id))
        )
    );

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_public_policies INTEGER;
    v_sim_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_public_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('form_templates', 'form_template_versions');

    SELECT COUNT(*) INTO v_sim_policies
    FROM pg_policies
    WHERE schemaname = 'sim'
      AND tablename IN ('form_templates', 'form_template_versions');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v809 form_templates account-level copy RLS complete';
    RAISE NOTICE 'public schema policies: %', v_public_policies;
    RAISE NOTICE 'sim schema policies: %', v_sim_policies;
    RAISE NOTICE '================================================';
END $$;
