-- =============================================================================
-- v931: Local Register Engine — core schema
-- =============================================================================
-- See projectprd/v931_industry_capability_modules_PRD.md (decisions 4-11) and
-- projectplan/v931_local_register_engine_plan.md Phase 1.
--
-- One generic, no-code-configurable register system serving two purposes:
--   1. "System-defined" registers (is_system_defined = true) — the 28 industry capability
--      registers (Core Banking, Permits, Bill of Materials, ...), seeded by v931's companion
--      seed file, tagged to their owning industry pack(s), read-only at the structure level.
--   2. "Local" registers — any organisation member (PMO Admin, Portfolio Manager, Programme
--      Manager, or any project member including Team Manager/Lead and Team Member — PRD
--      decision 6) can define their own register scoped to whatever PMO/Portfolio/Programme/
--      Project context they already have access to, entirely through configuration.
--
-- Every register's records live in ONE shared table (local_register_records) with a JSONB
-- field_values column for its custom fields — deliberately not a dedicated table per register
-- (PRD decision 1, reversed from an earlier draft of this PRD once "any member can create their
-- own register at runtime" ruled out per-register migrations). One RLS policy set governs all
-- registers regardless of how many exist.
--
-- Prerequisites: v91 (project_memberships, project_roles), v37 (programmes), v36 (portfolios),
-- v592a/v592b (portfolio/programme manager RLS precedent this migration's policies mirror),
-- v920 (industry_packs, for the industry_pack_id link), v756 (Admin ID Generation trigger
-- helper).
-- =============================================================================

-- ── 1. local_registers — register definitions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.local_registers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_key       VARCHAR(80) NOT NULL,
  label              VARCHAR(150) NOT NULL,
  icon               VARCHAR(50),
  description        TEXT,
  scope_level        VARCHAR(20) NOT NULL CHECK (scope_level IN ('pmo', 'portfolio', 'programme', 'project')),
  -- Exactly one of these is set, matching scope_level. Both NULL for scope_level = 'pmo'.
  scope_portfolio_id UUID REFERENCES public.portfolios(id),
  scope_programme_id UUID REFERENCES public.programmes(id),
  scope_project_id   UUID REFERENCES public.projects(id),
  account_id         UUID NOT NULL REFERENCES public.accounts(id),
  is_system_defined  BOOLEAN NOT NULL DEFAULT FALSE,
  industry_pack_id   UUID REFERENCES public.industry_packs(id),
  status_workflow    JSONB NOT NULL DEFAULT '[]'::jsonb, -- ordered [{key, label}, ...]
  requires_approval  BOOLEAN NOT NULL DEFAULT FALSE, -- gates record-lifecycle participation (Phase 6)
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES public.users(id),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES public.users(id),
  CONSTRAINT chk_local_registers_scope_entity CHECK (
    (scope_level = 'pmo' AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'portfolio' AND scope_portfolio_id IS NOT NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'programme' AND scope_programme_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_project_id IS NULL)
    OR (scope_level = 'project' AND scope_project_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL)
  )
);

COMMENT ON TABLE public.local_registers IS
  'v931: register definitions for the Local Register Engine — both system-shipped industry '
  'registers and member-created local registers run through this same table.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_local_registers_key_per_scope
  ON public.local_registers(account_id, register_key, COALESCE(scope_portfolio_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_programme_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_project_id, '00000000-0000-0000-0000-000000000000'))
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_local_registers_account ON public.local_registers(account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_local_registers_industry_pack ON public.local_registers(industry_pack_id) WHERE industry_pack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_registers_scope_project ON public.local_registers(scope_project_id) WHERE scope_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_registers_scope_programme ON public.local_registers(scope_programme_id) WHERE scope_programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_registers_scope_portfolio ON public.local_registers(scope_portfolio_id) WHERE scope_portfolio_id IS NOT NULL;

-- ── 2. local_register_fields — field definitions per register ─────────────────

CREATE TABLE IF NOT EXISTS public.local_register_fields (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id      UUID NOT NULL REFERENCES public.local_registers(id) ON DELETE CASCADE,
  field_key        VARCHAR(80) NOT NULL,
  field_label      VARCHAR(150) NOT NULL,
  field_type       VARCHAR(20) NOT NULL CHECK (field_type IN
                     ('text', 'number', 'date', 'dropdown', 'boolean', 'user_picker', 'currency')),
  is_required      BOOLEAN NOT NULL DEFAULT FALSE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  dropdown_options JSONB, -- [{value, label}, ...], only used when field_type = 'dropdown'
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.local_register_fields IS
  'v931: one row per custom field on a local_registers definition, rendered generically by the '
  'Local Register Engine UI and stored per-record in local_register_records.field_values.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_local_register_fields_key
  ON public.local_register_fields(register_id, field_key);
CREATE INDEX IF NOT EXISTS idx_local_register_fields_register
  ON public.local_register_fields(register_id);

-- ── 3. local_register_records — the actual data rows ───────────────────────────

CREATE TABLE IF NOT EXISTS public.local_register_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id      UUID NOT NULL REFERENCES public.local_registers(id),
  display_id       TEXT,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  status           VARCHAR(50) NOT NULL, -- must match a key in the parent register's status_workflow
  owner_user_id    UUID REFERENCES public.users(id),
  field_values     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- record-lifecycle columns (Phase 6) — present on every row so the module can be adopted
  -- per-register via requires_approval without a later schema change.
  record_status    VARCHAR(20) NOT NULL DEFAULT 'authorised',
  root_record_id   UUID,
  record_version   INTEGER NOT NULL DEFAULT 1,
  parent_record_id UUID REFERENCES public.local_register_records(id),
  authorised_by    UUID REFERENCES public.users(id),
  authorised_at    TIMESTAMP,
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES public.users(id),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.local_register_records IS
  'v931: shared data table for every local register (system-defined and member-created alike). '
  'display_id is assigned by a single shared Admin ID Generation rule (all local registers get '
  'the same prefix family for v1 — see plan Phase 0 decision 1) rather than one rule per '
  'register, since generate_display_id() keys off table name, not row type.';

CREATE INDEX IF NOT EXISTS idx_local_register_records_register ON public.local_register_records(register_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_local_register_records_owner ON public.local_register_records(owner_user_id) WHERE is_deleted = FALSE;

-- Register new tables in database_tables registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('local_registers', 'Local Register Engine: register/entity-type definitions (v931)', false, true),
  ('local_register_fields', 'Local Register Engine: custom field definitions per register (v931)', false, true),
  ('local_register_records', 'Local Register Engine: data rows for every register, system-defined and member-created (v931)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── 4. Admin ID Generation wiring ───────────────────────────────────────────────
-- See plan Phase 0 decision 1 — one shared prefix for all local register records in v1.
-- Companion Admin id_generation_rules seed lives in E:\project-nidus-admin\SQL\ (rule 16.2).

DROP TRIGGER IF EXISTS trg_local_register_records_admin_display_id ON public.local_register_records;
CREATE TRIGGER trg_local_register_records_admin_display_id
  AFTER INSERT ON public.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.local_register_records', 'display_id');

-- ── 5. SQL-side PMO-admin-tier check ────────────────────────────────────────────
-- Mirrors matchesPmoSuiteAdminRole() (apps/platform/src/services/pmoSuiteRoleAccess.js) exactly
-- — this is the FIRST SQL-side equivalent of that JS-only check (none existed before v931).
-- Matches its role-name list (pmo_admin/org_admin/system_admin/super_admin) and its query shape
-- (getUserSystemRoles(): user_roles joined to roles, is_active = TRUE, project_id IS NULL —
-- neither table has an account_id column, matching the existing JS function's own signature).

CREATE OR REPLACE FUNCTION public.is_pmo_admin_tier(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE u.auth_user_id = p_auth_user_id
      AND ur.is_active = TRUE
      AND ur.project_id IS NULL
      AND lower(regexp_replace(r.role_name, '[\s-]+', '_', 'g')) IN
        ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

COMMENT ON FUNCTION public.is_pmo_admin_tier(UUID) IS
  'v931: SQL-side mirror of matchesPmoSuiteAdminRole() for use in RLS policies — the JS version '
  'was the only implementation before this. Keep both lists in sync if the admin role set ever '
  'changes (pmo_admin/org_admin/system_admin/super_admin).';

GRANT EXECUTE ON FUNCTION public.is_pmo_admin_tier(UUID) TO authenticated;

-- ── 6. RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.local_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_register_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_register_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.local_registers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_register_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.local_register_records TO authenticated;
GRANT ALL ON public.local_registers, public.local_register_fields, public.local_register_records TO service_role;

-- One shared "does this auth user have creation/management rights over this register's scope"
-- check, reused by every policy below instead of being duplicated per policy.
CREATE OR REPLACE FUNCTION public.has_local_register_scope_access(
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
SET search_path = public
AS $$
  SELECT CASE p_scope_level
    WHEN 'pmo' THEN public.is_pmo_admin_tier(p_auth_user_id)
    WHEN 'portfolio' THEN EXISTS (
      SELECT 1 FROM public.portfolios pf
      JOIN public.users u ON u.id = pf.portfolio_manager_user_id
      WHERE pf.id = p_scope_portfolio_id AND u.auth_user_id = p_auth_user_id
    )
    WHEN 'programme' THEN EXISTS (
      SELECT 1 FROM public.programmes prog
      JOIN public.users u ON u.id = prog.programme_manager_user_id
      WHERE prog.id = p_scope_programme_id AND u.auth_user_id = p_auth_user_id
    )
    WHEN 'project' THEN EXISTS (
      -- Any active project membership qualifies — PRD decision 6 explicitly includes Team
      -- Manager/Lead and Team Member, not just Project Manager.
      SELECT 1 FROM public.project_memberships pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.project_id = p_scope_project_id
        AND u.auth_user_id = p_auth_user_id
        AND pm.is_active = TRUE
    )
    ELSE FALSE
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_local_register_scope_access(UUID, VARCHAR, UUID, UUID, UUID) TO authenticated;

-- local_registers: broad authenticated read (needed so any member can see which registers
-- exist at a scope they're about to view), write gated by scope access. System-defined rows
-- are never writable by a plain client UPDATE/DELETE (rule 42 — enforced here, not just hidden
-- in the UI).
DROP POLICY IF EXISTS policy_local_registers_select ON public.local_registers;
CREATE POLICY policy_local_registers_select ON public.local_registers
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_local_registers_insert ON public.local_registers;
CREATE POLICY policy_local_registers_insert ON public.local_registers
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system_defined = FALSE
    AND public.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id)
  );

DROP POLICY IF EXISTS policy_local_registers_update ON public.local_registers;
CREATE POLICY policy_local_registers_update ON public.local_registers
  FOR UPDATE TO authenticated
  USING (
    is_system_defined = FALSE
    AND public.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id)
  )
  WITH CHECK (
    is_system_defined = FALSE
    AND public.has_local_register_scope_access(auth.uid(), scope_level, scope_portfolio_id, scope_programme_id, scope_project_id)
  );

-- local_register_fields: mirrors its parent local_registers row's write gate.
DROP POLICY IF EXISTS policy_local_register_fields_select ON public.local_register_fields;
CREATE POLICY policy_local_register_fields_select ON public.local_register_fields
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS policy_local_register_fields_write ON public.local_register_fields;
CREATE POLICY policy_local_register_fields_write ON public.local_register_fields
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_fields.register_id
        AND lr.is_system_defined = FALSE
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_fields.register_id
        AND lr.is_system_defined = FALSE
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  );

-- local_register_records: read/write gated by the OWNING register's scope access — a record
-- always inherits its parent register's scope, it never has independent access rules.
DROP POLICY IF EXISTS policy_local_register_records_select ON public.local_register_records;
CREATE POLICY policy_local_register_records_select ON public.local_register_records
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  );

DROP POLICY IF EXISTS policy_local_register_records_insert ON public.local_register_records;
CREATE POLICY policy_local_register_records_insert ON public.local_register_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  );

DROP POLICY IF EXISTS policy_local_register_records_update ON public.local_register_records;
CREATE POLICY policy_local_register_records_update ON public.local_register_records
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(auth.uid(), lr.scope_level, lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v931_local_register_engine_schema.sql applied successfully';
END $$;
