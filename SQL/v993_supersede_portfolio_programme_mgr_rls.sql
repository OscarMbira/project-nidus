-- ============================================================================
-- v993: Supersede the automatic portfolio/programme manager write-cascade RLS
-- (v592a/v592b) with the explicit scope+role model — Phase 3 of v982
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A, material-conflict
-- resolution. CONFIRMED BY THE USER: option 1 (supersede), not option 2 or 3 — see the
-- coordinator's explicit instruction. v592a/v592b granted a portfolio's/programme's
-- manager_user_id automatic UPDATE authority on every child programme/project underneath it, the
-- exact "automatic downward authority" the brief's §16 principle forbids. This file:
--   1. Migrates every CURRENT manager relying on that automatic grant into an equivalent explicit
--      portfolio_memberships/programme_memberships row FIRST (so no one silently loses access).
--   2. Drops v592a's and v592b's policies.
--   3. Replaces them with policies keyed off has_portfolio_role()/has_programme_role() (v992) —
--      same reachability (portfolio -> programme -> project chain), but gated by an explicit,
--      auditable membership grant instead of an implicit field match.
--
-- Prerequisites: v989 (account_id columns), v990/v991 (membership tables), v992 (RLS helpers).
-- MUST run after v992. Depends on the 'portfolio_manager'/'programme_manager' template roles
-- seeded by v990/v991.
-- ============================================================================

-- ── 1. Migration: preserve every current manager's access as an explicit grant ──

INSERT INTO public.portfolio_memberships (portfolio_id, user_id, portfolio_role_id, invitation_status, is_active, accepted_at)
SELECT p.id, p.portfolio_manager_user_id, pr.id, 'accepted', TRUE, NOW()
FROM public.portfolios p
INNER JOIN public.portfolio_roles pr ON pr.role_name = 'portfolio_manager' AND pr.is_template = TRUE AND pr.portfolio_id IS NULL
WHERE p.is_deleted = FALSE
  AND p.portfolio_manager_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.portfolio_manager_user_id AND u.is_deleted = FALSE)
ON CONFLICT (portfolio_id, user_id) DO NOTHING;

INSERT INTO public.programme_memberships (programme_id, user_id, programme_role_id, invitation_status, is_active, accepted_at)
SELECT pr.id, pr.programme_manager_user_id, prole.id, 'accepted', TRUE, NOW()
FROM public.programmes pr
INNER JOIN public.programme_roles prole ON prole.role_name = 'programme_manager' AND prole.is_template = TRUE AND prole.programme_id IS NULL
WHERE pr.is_deleted = FALSE
  AND pr.programme_manager_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = pr.programme_manager_user_id AND u.is_deleted = FALSE)
ON CONFLICT (programme_id, user_id) DO NOTHING;

-- Also migrate portfolio_manager_user_id's implicit authority over programmes DIRECTLY under
-- their portfolio into an explicit programme_memberships row too — v592a let a portfolio manager
-- UPDATE child programmes; without this, that specific access (distinct from portfolio-level
-- membership) would be lost on cutover for a portfolio manager who was never separately a
-- programme member. This preserves it as an explicit programme-level grant, same target end
-- state as if they had been granted it directly.
INSERT INTO public.programme_memberships (programme_id, user_id, programme_role_id, invitation_status, is_active, accepted_at)
SELECT prog.id, p.portfolio_manager_user_id, prole.id, 'accepted', TRUE, NOW()
FROM public.programmes prog
INNER JOIN public.portfolios p ON p.id = prog.portfolio_id AND p.is_deleted = FALSE
INNER JOIN public.programme_roles prole ON prole.role_name = 'programme_manager' AND prole.is_template = TRUE AND prole.programme_id IS NULL
WHERE prog.is_deleted = FALSE
  AND p.portfolio_manager_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.portfolio_manager_user_id AND u.is_deleted = FALSE)
ON CONFLICT (programme_id, user_id) DO NOTHING;

-- ── 2. Drop the superseded policies (v592a, v592b) ───────────────────────────

DROP POLICY IF EXISTS programmes_update_portfolio_manager ON public.programmes;
DROP POLICY IF EXISTS projects_update_portfolio_manager ON public.projects;
DROP POLICY IF EXISTS projects_update_programme_manager ON public.projects;

-- ── 3. Replacement policies — same reachability, explicit-grant gated ───────

-- Programmes: portfolio manager (explicit portfolio_memberships grant) may UPDATE programmes
-- under their portfolio.
CREATE POLICY programmes_update_portfolio_role ON public.programmes
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND portfolio_id IS NOT NULL
    AND public.has_portfolio_role(auth.uid(), portfolio_id, ARRAY['portfolio_manager'])
  )
  WITH CHECK (
    is_deleted = FALSE
    AND portfolio_id IS NOT NULL
    AND public.has_portfolio_role(auth.uid(), portfolio_id, ARRAY['portfolio_manager'])
  );

-- Projects: portfolio manager (explicit grant) may UPDATE projects reachable via
-- programme_projects -> programmes -> portfolios (same chain v592a used, now explicit-gated).
CREATE POLICY projects_update_portfolio_role ON public.projects
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      INNER JOIN public.programmes prog ON prog.id = pp.programme_id AND prog.is_deleted = FALSE
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND prog.portfolio_id IS NOT NULL
        AND public.has_portfolio_role(auth.uid(), prog.portfolio_id, ARRAY['portfolio_manager'])
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      INNER JOIN public.programmes prog ON prog.id = pp.programme_id AND prog.is_deleted = FALSE
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND prog.portfolio_id IS NOT NULL
        AND public.has_portfolio_role(auth.uid(), prog.portfolio_id, ARRAY['portfolio_manager'])
    )
  );

-- Projects: programme manager (explicit grant) may UPDATE projects under their programme.
CREATE POLICY projects_update_programme_role ON public.projects
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND public.has_programme_role(auth.uid(), pp.programme_id, ARRAY['programme_manager'])
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND public.has_programme_role(auth.uid(), pp.programme_id, ARRAY['programme_manager'])
    )
  );

DO $$ BEGIN RAISE NOTICE 'v993_supersede_portfolio_programme_mgr_rls.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   -- Every legacy manager now has an explicit membership row:
--   SELECT COUNT(*) FROM public.portfolios WHERE portfolio_manager_user_id IS NOT NULL AND is_deleted = FALSE
--     AND NOT EXISTS (SELECT 1 FROM public.portfolio_memberships pm WHERE pm.portfolio_id = portfolios.id AND pm.user_id = portfolios.portfolio_manager_user_id AND pm.is_active = TRUE);
--   -- expect 0 rows (every legacy manager migrated).
--   SELECT COUNT(*) FROM public.programmes WHERE programme_manager_user_id IS NOT NULL AND is_deleted = FALSE
--     AND NOT EXISTS (SELECT 1 FROM public.programme_memberships pm WHERE pm.programme_id = programmes.id AND pm.user_id = programmes.programme_manager_user_id AND pm.is_active = TRUE);
--   -- expect 0 rows.
