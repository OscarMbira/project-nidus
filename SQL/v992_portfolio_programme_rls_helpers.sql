-- ============================================================================
-- v992: Portfolio/Programme RLS helper functions + membership write policies +
-- database_tables registry — Phase 3 of v982 SaaS User Journey
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A.
--
-- SECURITY DEFINER helper-per-concern style, matching is_project_manager()
-- (SQL/v108_fix_project_memberships_rls_recursion.sql) exactly — not a single universal function,
-- specifically to dodge policy self-recursion on portfolio_memberships/programme_memberships.
--
-- Prerequisites: public.portfolio_memberships (v990), public.programme_memberships (v991),
-- public.portfolio_roles (v990), public.programme_roles (v991), public.is_pmo_admin_user()
-- (v258), public.get_user_accounts (v87).
-- ============================================================================

-- ── 1. Portfolio helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_portfolio_member(p_auth_user_id UUID, p_portfolio_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_member BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    WHERE pm.portfolio_id = p_portfolio_id
      AND u.auth_user_id = p_auth_user_id
      AND pm.is_active = TRUE
  ) INTO v_is_member;
  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_portfolio_member(UUID, UUID) IS
  'v992: TRUE if the auth user has ANY active portfolio_memberships row for this portfolio (any '
  'role). SECURITY DEFINER to bypass RLS and avoid policy self-recursion.';

CREATE OR REPLACE FUNCTION public.has_portfolio_role(p_auth_user_id UUID, p_portfolio_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    INNER JOIN public.portfolio_roles pr ON pr.id = pm.portfolio_role_id
    WHERE pm.portfolio_id = p_portfolio_id
      AND u.auth_user_id = p_auth_user_id
      AND pm.is_active = TRUE
      AND pr.is_active = TRUE
      AND pr.role_name = ANY(p_role_names)
  ) INTO v_has_role;
  RETURN v_has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_portfolio_role(UUID, UUID, TEXT[]) IS
  'v992: TRUE if the auth user has an active portfolio_memberships row on this portfolio whose '
  'role_name is in the given list. The explicit-grant replacement for the old automatic '
  'portfolio_manager_user_id-implies-write-everywhere behaviour (v592a, superseded by v993).';

-- ── 2. Programme helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_programme_member(p_auth_user_id UUID, p_programme_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_member BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.programme_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    WHERE pm.programme_id = p_programme_id
      AND u.auth_user_id = p_auth_user_id
      AND pm.is_active = TRUE
  ) INTO v_is_member;
  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_programme_member(UUID, UUID) IS
  'v992: TRUE if the auth user has ANY active programme_memberships row for this programme.';

CREATE OR REPLACE FUNCTION public.has_programme_role(p_auth_user_id UUID, p_programme_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.programme_memberships pm
    INNER JOIN public.users u ON u.id = pm.user_id
    INNER JOIN public.programme_roles pr ON pr.id = pm.programme_role_id
    WHERE pm.programme_id = p_programme_id
      AND u.auth_user_id = p_auth_user_id
      AND pm.is_active = TRUE
      AND pr.is_active = TRUE
      AND pr.role_name = ANY(p_role_names)
  ) INTO v_has_role;
  RETURN v_has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_programme_role(UUID, UUID, TEXT[]) IS
  'v992: TRUE if the auth user has an active programme_memberships row on this programme whose '
  'role_name is in the given list. The explicit-grant replacement for the old automatic '
  'programme_manager_user_id-implies-write-everywhere behaviour (v592b, superseded by v993).';

-- ── 3. Membership write policies (INSERT/UPDATE/DELETE) ────────────────────────
-- Who may grant/revoke a portfolio/programme role: an existing portfolio_manager/
-- programme_manager (explicit grant, self-perpetuating chain of custody), the entity's own
-- direct owner/manager field (bootstrap path — matches portfolios'/programmes' pre-existing
-- UPDATE policies, needed so the FIRST membership can ever be created), the owning account's
-- PMO Admin (account-scoped, not global — see the Phase 2 precedent for why a bare
-- is_pmo_admin_user() with no account match would be a cross-tenant hole), or system_admin.

DROP POLICY IF EXISTS policy_portfolio_memberships_write ON public.portfolio_memberships;
CREATE POLICY policy_portfolio_memberships_write ON public.portfolio_memberships
  FOR ALL TO authenticated
  USING (
    public.has_portfolio_role(auth.uid(), portfolio_memberships.portfolio_id, ARRAY['portfolio_manager'])
    OR EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = portfolio_memberships.portfolio_id
        AND (
          EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = p.portfolio_owner_user_id OR u.id = p.portfolio_manager_user_id))
          OR (p.account_id IS NOT NULL AND p.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga) AND public.is_pmo_admin_user())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  )
  WITH CHECK (
    public.has_portfolio_role(auth.uid(), portfolio_memberships.portfolio_id, ARRAY['portfolio_manager'])
    OR EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = portfolio_memberships.portfolio_id
        AND (
          EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = p.portfolio_owner_user_id OR u.id = p.portfolio_manager_user_id))
          OR (p.account_id IS NOT NULL AND p.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga) AND public.is_pmo_admin_user())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS policy_programme_memberships_write ON public.programme_memberships;
CREATE POLICY policy_programme_memberships_write ON public.programme_memberships
  FOR ALL TO authenticated
  USING (
    public.has_programme_role(auth.uid(), programme_memberships.programme_id, ARRAY['programme_manager'])
    OR EXISTS (
      SELECT 1 FROM public.programmes pr
      WHERE pr.id = programme_memberships.programme_id
        AND (
          EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = pr.programme_owner_user_id OR u.id = pr.programme_manager_user_id))
          OR (pr.account_id IS NOT NULL AND pr.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga) AND public.is_pmo_admin_user())
          OR (pr.portfolio_id IS NOT NULL AND public.has_portfolio_role(auth.uid(), pr.portfolio_id, ARRAY['portfolio_manager']))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  )
  WITH CHECK (
    public.has_programme_role(auth.uid(), programme_memberships.programme_id, ARRAY['programme_manager'])
    OR EXISTS (
      SELECT 1 FROM public.programmes pr
      WHERE pr.id = programme_memberships.programme_id
        AND (
          EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = pr.programme_owner_user_id OR u.id = pr.programme_manager_user_id))
          OR (pr.account_id IS NOT NULL AND pr.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga) AND public.is_pmo_admin_user())
          OR (pr.portfolio_id IS NOT NULL AND public.has_portfolio_role(auth.uid(), pr.portfolio_id, ARRAY['portfolio_manager']))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  );

-- Note: a Portfolio Manager's has_portfolio_role() grant on programme_memberships (via
-- pr.portfolio_id above) is deliberately membership-management-only, not a general programme
-- write grant — mirrors the brief's own worked example (portfolio authority does not imply
-- project-101-style write access) while still letting a Portfolio Manager set up programme-level
-- delegation within their own portfolio, which is a portfolio manager's normal job.

-- ── 4. database_tables registry (mandatory) ──────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('portfolio_roles', 'Portfolio-scoped role templates and per-portfolio custom roles (Phase 3 scope/authority model, v982)', false, true),
  ('portfolio_memberships', 'Explicit portfolio-scoped role grants — the only source of portfolio write authority (Phase 3, v982)', false, true),
  ('programme_roles', 'Programme-scoped role templates and per-programme custom roles (Phase 3 scope/authority model, v982)', false, true),
  ('programme_memberships', 'Explicit programme-scoped role grants — the only source of programme write authority (Phase 3, v982)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v992_portfolio_programme_rls_helpers.sql applied successfully'; END $$;
