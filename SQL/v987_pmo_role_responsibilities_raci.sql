-- ============================================================================
-- v987: Roles & Responsibilities — default RACI — Phase 2 of v982 SaaS User
-- Journey — PMO Configuration Zone
-- ============================================================================
-- projectplan/v982_phase2_pmo_configuration_zone_plan.md, task A, item 6.
--
-- Default RACI (Responsible/Accountable/Consulted/Informed) per role x record-type — a simple
-- reference table, not a new engine (per the plan's own framing). One row per
-- (account_id, record_type, role_name) with a single raci_code column, rather than four boolean
-- columns — a role's RACI designation for a record type is exactly one letter in the classic
-- RACI model, matching that domain directly.
--
-- Prerequisites: public.accounts, public.users, public.is_pmo_admin_user(),
-- public.get_user_accounts(uuid).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pmo_role_responsibilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  record_type   VARCHAR(100) NOT NULL,
  role_name     VARCHAR(100) NOT NULL,
  raci_code     VARCHAR(1) NOT NULL CHECK (raci_code IN ('R', 'A', 'C', 'I')),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES public.users(id),
  updated_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_role_responsibilities_scope UNIQUE (account_id, record_type, role_name)
);

COMMENT ON TABLE public.pmo_role_responsibilities IS
  'v987/v982 Phase 2: default RACI designation (one of R/A/C/I) per role x record-type, defined '
  'once by a PMO Admin for their organisation. Metadata/reference only — no field-level change '
  'log, no enforcement of the designation anywhere yet.';

CREATE INDEX IF NOT EXISTS idx_role_responsibilities_account ON public.pmo_role_responsibilities(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_role_responsibilities_record_type ON public.pmo_role_responsibilities(account_id, record_type) WHERE is_deleted = FALSE;

-- ── RLS ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_role_responsibilities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_role_responsibilities TO authenticated;

DROP POLICY IF EXISTS policy_role_responsibilities_select ON public.pmo_role_responsibilities;
CREATE POLICY policy_role_responsibilities_select ON public.pmo_role_responsibilities
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  );

DROP POLICY IF EXISTS policy_role_responsibilities_write ON public.pmo_role_responsibilities;
CREATE POLICY policy_role_responsibilities_write ON public.pmo_role_responsibilities
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
  ('pmo_role_responsibilities', 'Default RACI designation per role x record-type, defined once per organisation (PMO Configuration Zone, v982 Phase 2)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v987_pmo_role_responsibilities_raci.sql applied successfully'; END $$;
