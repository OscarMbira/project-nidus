-- ============================================================================
-- v986: Organisation Authorities (delegated authority / approval thresholds /
-- escalation) — Phase 2 of v982 SaaS User Journey — PMO Configuration Zone
-- ============================================================================
-- projectplan/v982_phase2_pmo_configuration_zone_plan.md, task A, item 5 / decision 2.
--
-- Decision 2 (accepted by default per user authorization): public.expense_approval_thresholds
-- (v420, "pmo-admin/expense-thresholds") is left exactly as-is — a working, live feature, not
-- disturbed. This table is a NEW, PARALLEL, more general construct: an authority/threshold is
-- scoped by a record/authority TYPE (not hardcoded to expenses), with an amount band, required
-- approval level, and an optional escalation target — usable for change requests, procurement,
-- or any other threshold-shaped authority an org wants to define, generalizing the shape
-- ExpenseApprovalThresholds.jsx/expenseClaimService.js already established as this codebase's
-- working pattern for "amount band -> approval level". expense_approval_thresholds can migrate
-- onto this later, opportunistically — not part of this phase.
--
-- Prerequisites: public.accounts, public.users, public.is_pmo_admin_user(),
-- public.get_user_accounts(uuid).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organisation_authorities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  authority_name           VARCHAR(150) NOT NULL,
  authority_type           VARCHAR(50) NOT NULL DEFAULT 'general'
                             CHECK (authority_type IN ('general', 'expense', 'change_request', 'procurement', 'contract', 'other')),
  min_amount               NUMERIC(15, 2) NOT NULL DEFAULT 0,
  max_amount                NUMERIC(15, 2),
  currency                 VARCHAR(3) NOT NULL DEFAULT 'USD',
  required_approval_level  INTEGER NOT NULL DEFAULT 1 CHECK (required_approval_level >= 1),
  delegated_role_name      VARCHAR(100),
  escalation_role_name     VARCHAR(100),
  escalation_after_days    INTEGER CHECK (escalation_after_days IS NULL OR escalation_after_days > 0),
  description               TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                UUID REFERENCES public.users(id),
  updated_by                UUID REFERENCES public.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_org_authorities_amount_band CHECK (max_amount IS NULL OR max_amount >= min_amount)
);

COMMENT ON TABLE public.organisation_authorities IS
  'v986/v982 Phase 2: generalised delegated authority / approval threshold / escalation '
  'definitions, parallel to (not replacing) public.expense_approval_thresholds (v420).';

CREATE INDEX IF NOT EXISTS idx_org_authorities_account ON public.organisation_authorities(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_org_authorities_type ON public.organisation_authorities(account_id, authority_type) WHERE is_deleted = FALSE;

-- ── RLS ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.organisation_authorities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_authorities TO authenticated;

DROP POLICY IF EXISTS policy_org_authorities_select ON public.organisation_authorities;
CREATE POLICY policy_org_authorities_select ON public.organisation_authorities
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

DROP POLICY IF EXISTS policy_org_authorities_write ON public.organisation_authorities;
CREATE POLICY policy_org_authorities_write ON public.organisation_authorities
  FOR ALL TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

-- ── database_tables registry (mandatory) ─────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('organisation_authorities', 'Generalised delegated authority / approval threshold / escalation definitions, parallel to expense_approval_thresholds (PMO Configuration Zone, v982 Phase 2)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v986_organisation_authorities.sql applied successfully'; END $$;
