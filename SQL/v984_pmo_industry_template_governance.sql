-- ============================================================================
-- v984: Template Governance extension (Phase 2 of v982 SaaS User Journey — PMO
-- Configuration Zone)
-- ============================================================================
-- projectplan/v982_phase2_pmo_configuration_zone_plan.md, task A/decision 1.
--
-- Decision 1 (accepted by default per user authorization): a NEW child table,
-- pmo_industry_template_governance, rather than extending public.pmo_industry_templates
-- directly — keeps the existing, already-stable template tables untouched and matches this
-- table family's existing one-concern-per-child-table pattern (phases/activities/deliverables/
-- risks/milestones/roles are already separate child tables, see v575_industry_template_tables.sql).
--
-- SCOPE: public.pmo_industry_templates is a GLOBAL content library (industry_code UNIQUE, no
-- account_id — confirmed by investigation, synced from Admin's global_template_library per
-- CLAUDE.md's narrow write exception). A governance PROFILE for a template is organisation-
-- specific, though (two orgs using the same "Construction" template may want different required
-- gates) — so this table is account_id-scoped (NOT NULL, no shared/global row), one row per
-- (account_id, template_id, classification_id) combination. classification_id is nullable: a
-- NULL row is that account's default governance for the template; a non-null row overrides the
-- default for projects carrying that specific classification (decision 3's "classification
-- drives which template governance a project inherits").
--
-- required_stage_gate_names is a TEXT[] (not a further child table) — the plan's task A
-- explicitly allowed "array or join table", left to implementation judgment; an array is enough
-- for "provision a stage_gate_reviews row per declared gate name" and avoids a fourth new table
-- for what is, today, an ordered list of names with no gate-specific metadata of its own (rule 62).
--
-- STAGE GATE TARGET TABLE: the plan's facts section named `stage_gates` / stageGateService.js as
-- the "fully built and wired" stage gate feature. Investigation for this file found no CREATE
-- TABLE for `stage_gates` anywhere in SQL/ history, and stageGateService.js's consumer
-- (StageGateOversight.jsx, a dashboard widget) is the only other reference — while the actual
-- routed CRUD pages (StageGateList.jsx/StageGateForm.jsx at /platform/stage-gates, menu-wired in
-- v681/v683/v966al) read/write `stage_gate_reviews` (DDL confirmed in v685_stage_gate_reviews_
-- table.sql, RLS-enabled, live route). This migration and its JS auto-provisioning wiring
-- (industryTemplateService.js) target the verified, DDL-backed `stage_gate_reviews` table.
-- `stage_gates`/stageGateService.js appear to be an orphaned earlier iteration — flagged in the
-- implementation report, not otherwise touched by this phase (out of scope to fix/remove).
--
-- Prerequisites: public.pmo_industry_templates (v575), public.project_classifications (v983),
-- public.stage_gate_reviews (v685), public.accounts/users, public.is_pmo_admin_user(),
-- public.get_user_accounts(uuid).
-- ============================================================================

-- ── 1. public.pmo_industry_template_governance ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_governance (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  template_id                         UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  classification_id                   UUID REFERENCES public.project_classifications(id) ON DELETE CASCADE,
  required_stage_gate_names           TEXT[] NOT NULL DEFAULT '{}',
  required_approval_chain_template_id UUID, -- FK added in v985 after pmo_approval_chain_templates exists
  notes                                TEXT,
  is_active                           BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted                          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                          UUID REFERENCES public.users(id),
  updated_by                          UUID REFERENCES public.users(id),
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NULLS NOT DISTINCT would be ideal (PG15+) for the classification_id IS NULL "default row"
  -- case, but this codebase does not assume PG15 uniformly elsewhere; a partial unique index
  -- below covers the NULL case explicitly instead.
  CONSTRAINT uq_governance_account_template_classification UNIQUE (account_id, template_id, classification_id)
);

COMMENT ON TABLE public.pmo_industry_template_governance IS
  'v984/v982 Phase 2: per-organisation governance profile for a global pmo_industry_templates '
  'row — declared required stage gates + an optional required approval-chain template. '
  'classification_id NULL = this account''s default profile for the template; non-null = '
  'override for projects carrying that classification.';

-- Partial unique index so only one NULL-classification (default) row exists per account+template
-- (the table UNIQUE constraint above treats NULLs as distinct, so it alone would not prevent
-- duplicate default rows).
CREATE UNIQUE INDEX IF NOT EXISTS uq_governance_account_template_default
  ON public.pmo_industry_template_governance(account_id, template_id)
  WHERE classification_id IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_governance_account ON public.pmo_industry_template_governance(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_governance_template ON public.pmo_industry_template_governance(template_id) WHERE is_deleted = FALSE;

-- ── 2. RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_governance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_industry_template_governance TO authenticated;

DROP POLICY IF EXISTS policy_template_governance_select ON public.pmo_industry_template_governance;
CREATE POLICY policy_template_governance_select ON public.pmo_industry_template_governance
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

DROP POLICY IF EXISTS policy_template_governance_write ON public.pmo_industry_template_governance;
CREATE POLICY policy_template_governance_write ON public.pmo_industry_template_governance
  FOR ALL TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

-- ── 3. database_tables registry (mandatory) ─────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('pmo_industry_template_governance', 'Per-organisation governance profile (required stage gates + approval chain) for a global industry template, optionally scoped by project classification (PMO Configuration Zone, v982 Phase 2)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v984_pmo_industry_template_governance.sql applied successfully'; END $$;
