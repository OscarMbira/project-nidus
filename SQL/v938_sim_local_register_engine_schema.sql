-- =============================================================================
-- v938: Local Register Engine — Simulator extension (member-created registers only)
-- =============================================================================
-- Simulator's Portfolio/Programme/Project hierarchy (sim.practice_portfolios,
-- sim.practice_programmes, sim.practice_projects — SQL/v239/v227) is a completely separate set
-- of tables from Platform's public.portfolios/programmes/projects, with a fundamentally
-- different access model: no account_id/tenant concept at all (confirmed — grepped both
-- schema files, zero matches), pure per-user ownership (practice_projects.user_id, and
-- portfolio_manager_user_id/programme_manager_user_id, all -> auth.users(id) directly, not
-- public.users(id)). public.local_registers' scope FKs (v931) point at public.portfolios/
-- programmes/projects and cannot reference these at all.
--
-- Design: the 28 SYSTEM-DEFINED registers are NOT duplicated into a second schema — they stay
-- as the single source of truth in public.local_registers (account-agnostic already, v932) and
-- are read cross-schema by Simulator exactly like industry_packs/menu_items already are (v930's
-- own finding: those are genuinely shared, not per-app copies). Only MEMBER-CREATED (local)
-- registers get a parallel sim.* set of tables, scoped to the practice hierarchy.
--
-- Prerequisites: v931/v932/v936/v937 (public.local_registers + corrections), v239/v227 (sim
-- practice hierarchy), v389 (current sim RLS convention: raw auth.uid(), not the older
-- sim.get_current_user_id() helper — v242's original policy is superseded)
-- =============================================================================

-- ── 1. sim.local_registers ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.local_registers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_key          VARCHAR(80) NOT NULL,
  label                 VARCHAR(150) NOT NULL,
  icon                  VARCHAR(50),
  description           TEXT,
  scope_level           VARCHAR(20) NOT NULL CHECK (scope_level IN ('pmo', 'portfolio', 'programme', 'project')),
  scope_portfolio_id    UUID REFERENCES sim.practice_portfolios(id),
  scope_programme_id    UUID REFERENCES sim.practice_programmes(id),
  scope_project_id      UUID REFERENCES sim.practice_projects(id),
  -- Cross-schema FK to the shared, global accounts table — same precedent already established
  -- by sim.practice_industry_plan.template_id -> public.pmo_industry_templates(id) (v575).
  -- Always set: unlike public.local_registers, EVERY row here is member-created (is_system_defined
  -- is always FALSE for this table — system content lives only in public.local_registers).
  account_id            UUID NOT NULL REFERENCES public.accounts(id),
  status_workflow       JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_approval     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES public.users(id),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES public.users(id),
  CONSTRAINT chk_sim_local_registers_scope_entity CHECK (
    (scope_level = 'pmo' AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'portfolio' AND scope_portfolio_id IS NOT NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'programme' AND scope_programme_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'project' AND scope_project_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL)
  )
);

COMMENT ON TABLE sim.local_registers IS
  'v938: member-created local register definitions for Simulator''s practice hierarchy. '
  'System-defined registers are NOT duplicated here — they live only in public.local_registers '
  'and are read cross-schema (see sim.local_register_records.register_id below).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_local_registers_key_per_scope
  ON sim.local_registers(account_id, register_key,
    COALESCE(scope_portfolio_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_programme_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_project_id, '00000000-0000-0000-0000-000000000000'))
  WHERE is_deleted = FALSE;

-- ── 2. sim.local_register_fields ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.local_register_fields (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id      UUID NOT NULL REFERENCES sim.local_registers(id) ON DELETE CASCADE,
  field_key        VARCHAR(80) NOT NULL,
  field_label      VARCHAR(150) NOT NULL,
  field_type       VARCHAR(20) NOT NULL CHECK (field_type IN
                     ('text', 'number', 'date', 'dropdown', 'boolean', 'user_picker', 'currency')),
  is_required      BOOLEAN NOT NULL DEFAULT FALSE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  dropdown_options JSONB,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_local_register_fields_key
  ON sim.local_register_fields(register_id, field_key);

-- ── 3. sim.local_register_records ───────────────────────────────────────────────
-- register_id is a PLAIN UUID column, NOT a foreign key — it may point at either
-- sim.local_registers (member-created) OR public.local_registers (system-defined), and
-- Postgres FKs cannot target "one of two tables". The application resolves which table a given
-- register_id belongs to (mirrors how the frontend already needs to know this to pick the
-- right query in the first place). This is the one deliberate departure from public.
-- local_register_records' shape (which has a real FK, since it only ever points at one table).

CREATE TABLE IF NOT EXISTS sim.local_register_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id          UUID NOT NULL,
  is_system_register   BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = register_id -> public.local_registers, FALSE -> sim.local_registers
  display_id           TEXT,
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  status               VARCHAR(50) NOT NULL,
  owner_user_id        UUID REFERENCES public.users(id),
  field_values         JSONB NOT NULL DEFAULT '{}'::jsonb,
  record_portfolio_id  UUID REFERENCES sim.practice_portfolios(id),
  record_programme_id  UUID REFERENCES sim.practice_programmes(id),
  record_project_id    UUID REFERENCES sim.practice_projects(id),
  is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES public.users(id),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES public.users(id)
);

COMMENT ON TABLE sim.local_register_records IS
  'v938: data rows for Simulator''s Local Register Engine — both system-defined (register_id ->
  public.local_registers, is_system_register = TRUE) and member-created (register_id ->
  sim.local_registers) registers'' records share this one table. Record-lifecycle
  (submit-for-authorisation) integration was deliberately not extended to Simulator in this
  pass — see plan Phase 6 Simulator note; record_status stays a plain display field here, not
  wired to public.transition_record_status().';

CREATE INDEX IF NOT EXISTS idx_sim_local_register_records_register ON sim.local_register_records(register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_local_register_records_project ON sim.local_register_records(record_project_id) WHERE record_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sim_local_register_records_programme ON sim.local_register_records(record_programme_id) WHERE record_programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sim_local_register_records_portfolio ON sim.local_register_records(record_portfolio_id) WHERE record_portfolio_id IS NOT NULL;

-- ── 4. Register new tables ──────────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.local_registers', 'Local Register Engine (Simulator): member-created register definitions for the practice hierarchy (v938)', false, true),
  ('sim.local_register_fields', 'Local Register Engine (Simulator): custom field definitions per register (v938)', false, true),
  ('sim.local_register_records', 'Local Register Engine (Simulator): data rows for both system-defined and member-created registers (v938)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────────
-- Access model: pmo -> public.is_pmo_admin_tier() (account-level role, shared across apps,
-- unaffected by the practice hierarchy having no account_id of its own). portfolio/programme ->
-- direct auth.uid() match against portfolio_manager_user_id/programme_manager_user_id (both
-- reference auth.users(id) directly, per v239). project -> auth.uid() match against
-- practice_projects.user_id (the owner) OR an active sim.practice_project_memberships row —
-- mirrors the "any project member, not just the owner" inclusivity of PRD decision 6, using the
-- CURRENT (v389) RLS convention (raw auth.uid()), not the superseded sim.get_current_user_id()
-- helper.

ALTER TABLE sim.local_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.local_register_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.local_register_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sim.local_registers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.local_register_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.local_register_records TO authenticated;
GRANT ALL ON sim.local_registers, sim.local_register_fields, sim.local_register_records TO service_role;

CREATE OR REPLACE FUNCTION sim.has_local_register_scope_access(
  p_auth_user_id UUID,
  p_scope_level VARCHAR,
  p_scope_portfolio_id UUID,
  p_scope_programme_id UUID,
  p_scope_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT CASE p_scope_level
    WHEN 'pmo' THEN public.is_pmo_admin_tier(p_auth_user_id)
    WHEN 'portfolio' THEN EXISTS (
      SELECT 1 FROM sim.practice_portfolios pf
      WHERE pf.id = p_scope_portfolio_id AND pf.portfolio_manager_user_id = p_auth_user_id
    )
    WHEN 'programme' THEN EXISTS (
      SELECT 1 FROM sim.practice_programmes prog
      WHERE prog.id = p_scope_programme_id AND prog.programme_manager_user_id = p_auth_user_id
    )
    WHEN 'project' THEN EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = p_scope_project_id
        AND (pp.user_id = p_auth_user_id OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = p_auth_user_id AND m.is_active = TRUE
        ))
    )
    ELSE FALSE
  END;
$$;

GRANT EXECUTE ON FUNCTION sim.has_local_register_scope_access(UUID, VARCHAR, UUID, UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS policy_sim_local_registers_select ON sim.local_registers;
CREATE POLICY policy_sim_local_registers_select ON sim.local_registers
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_sim_local_registers_insert ON sim.local_registers;
CREATE POLICY policy_sim_local_registers_insert ON sim.local_registers
  FOR INSERT TO authenticated
  WITH CHECK (sim.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id));

DROP POLICY IF EXISTS policy_sim_local_registers_update ON sim.local_registers;
CREATE POLICY policy_sim_local_registers_update ON sim.local_registers
  FOR UPDATE TO authenticated
  USING (sim.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id))
  WITH CHECK (sim.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id));

DROP POLICY IF EXISTS policy_sim_local_register_fields_select ON sim.local_register_fields;
CREATE POLICY policy_sim_local_register_fields_select ON sim.local_register_fields
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_sim_local_register_fields_write ON sim.local_register_fields;
CREATE POLICY policy_sim_local_register_fields_write ON sim.local_register_fields
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_fields.register_id
      AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_fields.register_id
      AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
  ));

-- local_register_records: a member-created register's scope gates its records the normal way;
-- a system-defined register (is_system_register = TRUE, register_id -> public.local_registers,
-- which carries no scope itself) falls back entirely to the RECORD's own
-- record_portfolio_id/record_programme_id/record_project_id, same COALESCE pattern public.
-- local_register_records already uses (v932).

DROP POLICY IF EXISTS policy_sim_local_register_records_select ON sim.local_register_records;
CREATE POLICY policy_sim_local_register_records_select ON sim.local_register_records
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      (is_system_register = TRUE AND EXISTS (
        SELECT 1 FROM public.local_registers lr WHERE lr.id = local_register_records.register_id
          AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
            COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
            COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
            COALESCE(lr.scope_project_id, local_register_records.record_project_id))
      ))
      OR (is_system_register = FALSE AND EXISTS (
        SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_records.register_id
          AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
      ))
    )
  );

DROP POLICY IF EXISTS policy_sim_local_register_records_insert ON sim.local_register_records;
CREATE POLICY policy_sim_local_register_records_insert ON sim.local_register_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_system_register = TRUE AND EXISTS (
      SELECT 1 FROM public.local_registers lr WHERE lr.id = local_register_records.register_id
        AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id))
    ))
    OR (is_system_register = FALSE AND EXISTS (
      SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_records.register_id
        AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    ))
  );

DROP POLICY IF EXISTS policy_sim_local_register_records_update ON sim.local_register_records;
CREATE POLICY policy_sim_local_register_records_update ON sim.local_register_records
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      (is_system_register = TRUE AND EXISTS (
        SELECT 1 FROM public.local_registers lr WHERE lr.id = local_register_records.register_id
          AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
            COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
            COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
            COALESCE(lr.scope_project_id, local_register_records.record_project_id))
      ))
      OR (is_system_register = FALSE AND EXISTS (
        SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_records.register_id
          AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
      ))
    )
  )
  WITH CHECK (
    (is_system_register = TRUE AND EXISTS (
      SELECT 1 FROM public.local_registers lr WHERE lr.id = local_register_records.register_id
        AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id))
    ))
    OR (is_system_register = FALSE AND EXISTS (
      SELECT 1 FROM sim.local_registers lr WHERE lr.id = local_register_records.register_id
        AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    ))
  );

-- Admin ID Generation trigger — same shared prefix approach as public.local_register_records (v931 Phase 0 decision 1).
DROP TRIGGER IF EXISTS trg_sim_local_register_records_admin_display_id ON sim.local_register_records;
CREATE TRIGGER trg_sim_local_register_records_admin_display_id
  AFTER INSERT ON sim.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.local_register_records', 'display_id');

DO $$ BEGIN
  RAISE NOTICE 'v938_sim_local_register_engine_schema.sql applied successfully';
END $$;
