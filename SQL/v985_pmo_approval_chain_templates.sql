-- ============================================================================
-- v985: Approval Chain Templates (Workflows sub-area) — Phase 2 of v982 SaaS User
-- Journey — PMO Configuration Zone
-- ============================================================================
-- projectplan/v982_phase2_pmo_configuration_zone_plan.md, task A, item 4.
--
-- A reusable, named, ordered approval chain a PMO Admin can define once and reference from a
-- template governance profile (v984.required_approval_chain_template_id) instead of building a
-- per-record approval chain by hand every time. This is deliberately a lightweight REFERENCE/
-- CONFIG construct — it does not touch the live per-record authorization mechanism
-- (record_lifecycle_config / record_authorisers / record_authorisation_requests, v651) or its
-- RLS/enforcement, matching this phase's authorization instruction: no changes to live
-- authorization/RLS surfaces, implementation-shape only. Applying a chain template's steps onto
-- an actual project's record_authorisers rows is a natural Phase 2b/3 follow-on once a concrete
-- "apply this chain to project X" UX is designed, not built here.
--
-- Two tables, matching the existing one-concern-per-child-table family style (v575/v984):
--   pmo_approval_chain_templates — the named chain (account-scoped)
--   pmo_approval_chain_steps     — its ordered steps (role + approval level)
--
-- Prerequisites: public.accounts, public.users, public.is_pmo_admin_user(),
-- public.get_user_accounts(uuid).
-- ============================================================================

-- ── 1. public.pmo_approval_chain_templates ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pmo_approval_chain_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  chain_name    VARCHAR(150) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES public.users(id),
  updated_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_chain_templates_name_per_account UNIQUE (account_id, chain_name)
);

COMMENT ON TABLE public.pmo_approval_chain_templates IS
  'v985/v982 Phase 2: reusable, named, ordered approval-chain definitions a PMO Admin can '
  'reference from a template governance profile (pmo_industry_template_governance). Reference '
  'data only — does not itself enforce authorization.';

CREATE INDEX IF NOT EXISTS idx_chain_templates_account ON public.pmo_approval_chain_templates(account_id) WHERE is_deleted = FALSE;

-- Now that the table exists, attach the FK deferred from v984.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_governance_required_chain_template'
  ) THEN
    ALTER TABLE public.pmo_industry_template_governance
      ADD CONSTRAINT fk_governance_required_chain_template
      FOREIGN KEY (required_approval_chain_template_id)
      REFERENCES public.pmo_approval_chain_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. public.pmo_approval_chain_steps ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pmo_approval_chain_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_template_id UUID NOT NULL REFERENCES public.pmo_approval_chain_templates(id) ON DELETE CASCADE,
  step_order        INTEGER NOT NULL CHECK (step_order >= 1),
  approval_level    INTEGER NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  role_name         VARCHAR(100) NOT NULL,
  role_label        VARCHAR(150),
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_chain_steps_order UNIQUE (chain_template_id, step_order)
);

COMMENT ON TABLE public.pmo_approval_chain_steps IS
  'v985: ordered steps (role + approval level) belonging to a pmo_approval_chain_templates row.';

CREATE INDEX IF NOT EXISTS idx_chain_steps_chain ON public.pmo_approval_chain_steps(chain_template_id);

-- ── 3. RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_approval_chain_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmo_approval_chain_steps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_approval_chain_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_approval_chain_steps TO authenticated;

DROP POLICY IF EXISTS policy_chain_templates_select ON public.pmo_approval_chain_templates;
CREATE POLICY policy_chain_templates_select ON public.pmo_approval_chain_templates
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

DROP POLICY IF EXISTS policy_chain_templates_write ON public.pmo_approval_chain_templates;
CREATE POLICY policy_chain_templates_write ON public.pmo_approval_chain_templates
  FOR ALL TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

DROP POLICY IF EXISTS policy_chain_steps_select ON public.pmo_approval_chain_steps;
CREATE POLICY policy_chain_steps_select ON public.pmo_approval_chain_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pmo_approval_chain_templates t
      WHERE t.id = pmo_approval_chain_steps.chain_template_id
        AND t.is_deleted = FALSE
        AND t.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
    )
  );

DROP POLICY IF EXISTS policy_chain_steps_write ON public.pmo_approval_chain_steps;
CREATE POLICY policy_chain_steps_write ON public.pmo_approval_chain_steps
  FOR ALL TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND EXISTS (
      SELECT 1 FROM public.pmo_approval_chain_templates t
      WHERE t.id = pmo_approval_chain_steps.chain_template_id
        AND t.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
    )
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND EXISTS (
      SELECT 1 FROM public.pmo_approval_chain_templates t
      WHERE t.id = pmo_approval_chain_steps.chain_template_id
        AND t.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
    )
  );

-- ── 4. database_tables registry (mandatory) ─────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('pmo_approval_chain_templates', 'Reusable, named, ordered approval-chain definitions a PMO Admin can reference from template governance profiles (PMO Configuration Zone, v982 Phase 2)', false, true),
  ('pmo_approval_chain_steps', 'Ordered steps (role + approval level) belonging to a pmo_approval_chain_templates row (v982 Phase 2)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v985_pmo_approval_chain_templates.sql applied successfully'; END $$;
