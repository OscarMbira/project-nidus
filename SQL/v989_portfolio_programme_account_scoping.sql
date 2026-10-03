-- ============================================================================
-- v989: Portfolio/Programme account scoping — Phase 3 of v982 SaaS User Journey
-- (Portfolio/Programme-Scoped Roles & Authority Model)
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A.
--
-- UNANTICIPATED STRUCTURAL FINDING (not in the plan's own facts section, discovered during this
-- phase's implementation): `portfolios` and `programmes` have NO `account_id` column anywhere in
-- this codebase's SQL history (confirmed: no ALTER TABLE ever added one; portfolioService.js's
-- own `PORTFOLIO_COLUMNS` write-whitelist does not include it). This means the coordinator's
-- instruction to scope `portfolios` SELECT RLS "to account membership... preserve legitimate
-- access for account owners/PMO admins within their own org" has no existing column to key off.
--
-- RESOLUTION (proceeding, not stopping — this is an implementation-shape gap-fill consistent with
-- the coordinator's own explicit direction to close the scoping gap, not a new product/security
-- decision): add a nullable `account_id` column to both tables, backfilled best-effort from
-- existing relationships, and wire new creates to set it going forward. This is additive and
-- backward-compatible (nullable FK, no existing column removed/renamed) — flagged clearly here and
-- in the implementation report rather than silently assumed.
--
-- Backfill precedence per row (first non-null wins):
--   portfolios:  1) any linked project's account_id (portfolio_projects -> projects.account_id)
--                2) the account owned by portfolio_owner_user_id (accounts.owner_user_id)
--                3) the account owned by portfolio_manager_user_id
--   programmes:  1) its own portfolio's account_id (now resolved by the block above)
--                2) any linked project's account_id (programme_projects -> projects.account_id)
--                3) the account owned by programme_owner_user_id
--                4) the account owned by programme_manager_user_id
-- A portfolio/programme that matches none of these (no projects, no owner/manager with an owned
-- account) is left with account_id = NULL — an intentional edge case (effectively orphaned data);
-- v994's RLS fix treats a NULL account_id row as visible only to its direct owner/manager/
-- system_admin, never opened platform-wide (closing the gap even for unbackfillable rows).
--
-- Prerequisites: public.portfolios (v36), public.programmes (v37), public.portfolio_projects,
-- public.programme_projects, public.projects, public.accounts.
-- ============================================================================

-- ── 1. Add columns ────────────────────────────────────────────────────────────

ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.programmes ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.portfolios.account_id IS
  'v989/v982 Phase 3: the organisation this portfolio belongs to. Added because no such column '
  'existed pre-v989 (portfolios were structurally tenant-unaware) — backfilled best-effort, see '
  'file header. NULL only for unbackfillable legacy rows.';
COMMENT ON COLUMN public.programmes.account_id IS
  'v989/v982 Phase 3: the organisation this programme belongs to. Same rationale as '
  'portfolios.account_id.';

CREATE INDEX IF NOT EXISTS idx_portfolios_account_id ON public.portfolios(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_programmes_account_id ON public.programmes(account_id) WHERE is_deleted = FALSE;

-- ── 2. Backfill portfolios.account_id ────────────────────────────────────────

UPDATE public.portfolios p
SET account_id = sub.account_id
FROM (
  SELECT DISTINCT ON (pp.portfolio_id) pp.portfolio_id, proj.account_id
  FROM public.portfolio_projects pp
  INNER JOIN public.projects proj ON proj.id = pp.project_id AND proj.is_deleted = FALSE
  WHERE (pp.is_deleted = FALSE OR pp.is_deleted IS NULL) AND proj.account_id IS NOT NULL
  ORDER BY pp.portfolio_id, pp.assignment_date ASC NULLS LAST
) sub
WHERE p.id = sub.portfolio_id AND p.account_id IS NULL;

UPDATE public.portfolios p
SET account_id = a.id
FROM public.accounts a
WHERE p.account_id IS NULL
  AND p.portfolio_owner_user_id IS NOT NULL
  AND a.owner_user_id = p.portfolio_owner_user_id
  AND a.is_deleted = FALSE;

UPDATE public.portfolios p
SET account_id = a.id
FROM public.accounts a
WHERE p.account_id IS NULL
  AND p.portfolio_manager_user_id IS NOT NULL
  AND a.owner_user_id = p.portfolio_manager_user_id
  AND a.is_deleted = FALSE;

-- ── 3. Backfill programmes.account_id ────────────────────────────────────────

UPDATE public.programmes pr
SET account_id = p.account_id
FROM public.portfolios p
WHERE pr.account_id IS NULL AND pr.portfolio_id = p.id AND p.account_id IS NOT NULL;

UPDATE public.programmes pr
SET account_id = sub.account_id
FROM (
  SELECT DISTINCT ON (pp.programme_id) pp.programme_id, proj.account_id
  FROM public.programme_projects pp
  INNER JOIN public.projects proj ON proj.id = pp.project_id AND proj.is_deleted = FALSE
  WHERE (pp.is_deleted = FALSE OR pp.is_deleted IS NULL) AND proj.account_id IS NOT NULL
  ORDER BY pp.programme_id
) sub
WHERE pr.id = sub.programme_id AND pr.account_id IS NULL;

UPDATE public.programmes pr
SET account_id = a.id
FROM public.accounts a
WHERE pr.account_id IS NULL
  AND pr.programme_owner_user_id IS NOT NULL
  AND a.owner_user_id = pr.programme_owner_user_id
  AND a.is_deleted = FALSE;

UPDATE public.programmes pr
SET account_id = a.id
FROM public.accounts a
WHERE pr.account_id IS NULL
  AND pr.programme_manager_user_id IS NOT NULL
  AND a.owner_user_id = pr.programme_manager_user_id
  AND a.is_deleted = FALSE;

DO $$ BEGIN RAISE NOTICE 'v989_portfolio_programme_account_scoping.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT COUNT(*) FILTER (WHERE account_id IS NULL) AS unbackfilled, COUNT(*) AS total
--   FROM public.portfolios WHERE is_deleted = FALSE;
--   SELECT COUNT(*) FILTER (WHERE account_id IS NULL) AS unbackfilled, COUNT(*) AS total
--   FROM public.programmes WHERE is_deleted = FALSE;
