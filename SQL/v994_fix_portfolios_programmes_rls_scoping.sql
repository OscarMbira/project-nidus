-- ============================================================================
-- v994: Close the open-to-every-authenticated-user SELECT gap on portfolios AND
-- programmes — Phase 3 of v982 SaaS User Journey
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A. The coordinator's
-- instruction named `portfolios` SELECT (SQL/v278) specifically as the incidental gap to close.
-- This file ALSO closes the identical, symmetric gap on `programmes` SELECT (SQL/v249's
-- `policy_programmes_select`, same `USING (is_deleted = FALSE)` for role `authenticated`, no
-- scoping at all) — found during this phase's own investigation of the "same exact area" the
-- coordinator was already asking to fix. Leaving programmes open while closing portfolios would
-- be the same incoherence the coordinator flagged as the reason to fix portfolios in the first
-- place, so both are closed in the same pass. `portfolio_projects`/`programme_projects` INSERT
-- policies (also fully open, `WITH CHECK (true)`) are a related but separate, unflagged gap — NOT
-- touched here, noted in the implementation report as an out-of-scope finding for this pass.
--
-- Scoping model: visible to (a) anyone in the owning account (account_id IN get_user_accounts —
-- "account owners/PMO admins retain full visibility within their own org", the coordinator's
-- explicit preservation requirement — this also covers every ordinary member of that account, not
-- just owners/PMO admins, matching the pre-existing "everyone in the account can see everything"
-- norm this codebase otherwise uses for account-scoped data), (b) an explicit portfolio/programme
-- member regardless of which account they're primarily in (covers a genuinely cross-account
-- consultant scenario without requiring full account membership), (c) the entity's own direct
-- owner/manager field (legacy compatibility), (d) system_admin. A portfolio/programme with NULL
-- account_id (unbackfillable legacy row, see v989) is reachable only via (b)/(c)/(d) — never
-- platform-wide-open, closing the gap even for those rows.
--
-- Prerequisites: v989 (account_id columns), v992 (is_portfolio_member/is_programme_member).
-- ============================================================================

-- ── 1. portfolios SELECT ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS policy_portfolios_select ON public.portfolios;
CREATE POLICY policy_portfolios_select ON public.portfolios
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      (account_id IS NOT NULL AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga))
      OR public.is_portfolio_member(auth.uid(), id)
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = portfolio_owner_user_id OR u.id = portfolio_manager_user_id))
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
      )
    )
  );

-- ── 2. programmes SELECT ─────────────────────────────────────────────────────
-- Includes is_portfolio_member() as an additional visibility path — the brief's "read-only
-- roll-up visibility" principle (PRD Phase 3 open decision 5): a Portfolio Manager/Viewer can SEE
-- (never write/approve, this is a SELECT-only policy) the programmes under their own portfolio,
-- without a separate programme-level grant.

DROP POLICY IF EXISTS policy_programmes_select ON public.programmes;
CREATE POLICY policy_programmes_select ON public.programmes
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      (account_id IS NOT NULL AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga))
      OR public.is_programme_member(auth.uid(), id)
      OR (portfolio_id IS NOT NULL AND public.is_portfolio_member(auth.uid(), portfolio_id))
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND (u.id = programme_owner_user_id OR u.id = programme_manager_user_id))
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur INNER JOIN public.users u ON u.id = ur.user_id INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE u.auth_user_id = auth.uid() AND r.role_name = 'system_admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
      )
    )
  );

DO $$ BEGIN RAISE NOTICE 'v994_fix_portfolios_programmes_rls_scoping.sql applied successfully'; END $$;

-- Post-run verification (run manually, as two different test users from two different accounts):
--   SELECT id, portfolio_name, account_id FROM public.portfolios; -- each account's user should
--   only see their own account's portfolios (+ any they're an explicit member of).
