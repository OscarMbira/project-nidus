-- ============================================================================
-- v918: SaaS Industry-Aware Tenant Provisioning — Phase 1a (industry_segments +
-- account_industries schema)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md and
-- projectplan/v918_saas_industry_tenant_provisioning_plan.md.
--
-- industry_segments: optional sub-industries under an existing industry_categories row
-- (e.g. "Banking & Financial Services" -> "Retail Banking", "FinTech"). Never mandatory
-- (PRD decision 5).
--
-- account_industries: an organisation can select MULTIPLE industries (PRD decision 1), one
-- flagged primary (decision 2). Replaces the disconnected accounts.metadata.industry blob as
-- the real, queryable industry relationship. Writes go exclusively through
-- update_account_industries() (v923) and the provisioning RPC — this table stays
-- RLS-restricted for direct client writes (rule 42), matching every other write-gated table
-- this session.
-- Prerequisites: v906_industry_categories_schema.sql (industry_categories), v84_accounts_and_extensions.sql (accounts)
-- ============================================================================

-- ── 1. industry_segments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.industry_segments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_category_id UUID NOT NULL REFERENCES public.industry_categories(id) ON DELETE CASCADE,
  name                 VARCHAR(150) NOT NULL,
  description          TEXT,
  display_order        INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES public.users(id),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.industry_segments IS
  'v918: optional sub-industries under an industry_categories row (e.g. Banking & Financial '
  'Services -> Retail Banking / Corporate Banking / FinTech). Always optional, never required '
  'at registration or org-industry-selection time.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_industry_segments_name_per_industry
  ON public.industry_segments (industry_category_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_industry_segments_industry_category
  ON public.industry_segments(industry_category_id) WHERE is_active = TRUE;

ALTER TABLE public.industry_segments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.industry_segments TO authenticated, anon;
GRANT ALL ON public.industry_segments TO service_role;

DROP POLICY IF EXISTS policy_industry_segments_select_all ON public.industry_segments;
CREATE POLICY policy_industry_segments_select_all
  ON public.industry_segments FOR SELECT
  USING (is_active = TRUE);

-- ── 2. account_industries ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_industries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  industry_category_id UUID NOT NULL REFERENCES public.industry_categories(id),
  industry_segment_id  UUID REFERENCES public.industry_segments(id),
  is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
  added_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  added_by             UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.account_industries IS
  'v918: the organisation-level industry relationship (PRD decision 1: multi-industry; '
  'decision 2: one primary + N secondary). Real replacement for the old, disconnected '
  'accounts.metadata.industry JSONB value. Writes go through update_account_industries() '
  '(v923) and the tenant provisioning RPC only.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_account_industries_account_industry
  ON public.account_industries (account_id, industry_category_id);

-- At most one primary industry per account.
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_industries_one_primary
  ON public.account_industries (account_id) WHERE is_primary = TRUE;

-- A segment must belong to the same industry as the account_industries row it's attached to —
-- enforced in the RPC layer (v923), since a cross-table CHECK constraint can't express this
-- directly in Postgres without a trigger; documented here so the invariant isn't lost.

CREATE INDEX IF NOT EXISTS idx_account_industries_account_id
  ON public.account_industries(account_id);
CREATE INDEX IF NOT EXISTS idx_account_industries_industry_category
  ON public.account_industries(industry_category_id);

ALTER TABLE public.account_industries ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.account_industries TO authenticated;
GRANT ALL ON public.account_industries TO service_role;

-- Broad authenticated read + JS-layer account_id filtering, matching the established pattern
-- for org-scoped reference data in this codebase (org_menu_bundles, v914) — there is no
-- organisation-membership table to join against for a tighter policy (confirmed by this
-- initiative's own audit), and writes are fully RPC-gated regardless (rule 42).
DROP POLICY IF EXISTS policy_account_industries_authenticated_read ON public.account_industries;
CREATE POLICY policy_account_industries_authenticated_read
  ON public.account_industries FOR SELECT TO authenticated
  USING (true);

-- ── 3. Database table registration (mandatory) ──────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('industry_segments', 'Optional sub-industries under an industry_categories row (v918)', false, true),
  ('account_industries', 'Organisation-level multi-industry relationship, one flagged primary (v918)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v918: industry_segments + account_industries schema installed';
END $$;
