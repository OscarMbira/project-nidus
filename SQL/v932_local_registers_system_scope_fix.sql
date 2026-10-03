-- =============================================================================
-- v932: Local Register Engine — fix system-defined register scoping
-- =============================================================================
-- Two bugs found while writing the v931 seed data:
--
-- 1. local_registers.account_id was NOT NULL, which assumed every register (including the 28
--    system-defined ones) belongs to exactly one organisation. System-defined registers must
--    instead be available to ANY organisation with the matching industry pack enabled — the
--    same reason industry_packs itself carries no account_id.
--
-- 2. local_registers.industry_pack_id was a single nullable FK column, which cannot represent a
--    register shared across multiple industries (Permits: Construction + Energy & Utilities;
--    Readiness Checklist: Banking/Financial Services + IT & Software + Education; Data
--    Migration: Financial Services + Education; Commissioning: Manufacturing + Energy &
--    Utilities — all confirmed cross-industry consolidations in the PRD). Replaced with a join
--    table, industry_pack_menu_items' own pattern.
--
-- Prerequisites: v931_local_register_engine_schema.sql
-- =============================================================================

-- ── 1. account_id becomes nullable ──────────────────────────────────────────────

ALTER TABLE public.local_registers ALTER COLUMN account_id DROP NOT NULL;

COMMENT ON COLUMN public.local_registers.account_id IS
  'v931/v932: NULL for system-defined registers (available to any account via '
  'local_register_industry_packs, like industry_packs itself carries no account_id). Set for '
  'member-created local registers, scoped to that one organisation.';

DROP INDEX IF EXISTS public.uq_local_registers_key_per_scope;
CREATE UNIQUE INDEX uq_local_registers_key_per_scope
  ON public.local_registers(
    COALESCE(account_id, '00000000-0000-0000-0000-000000000000'),
    register_key,
    COALESCE(scope_portfolio_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_programme_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(scope_project_id, '00000000-0000-0000-0000-000000000000')
  )
  WHERE is_deleted = FALSE;

ALTER TABLE public.local_registers DROP CONSTRAINT IF EXISTS chk_local_registers_system_scope;
ALTER TABLE public.local_registers ADD CONSTRAINT chk_local_registers_system_scope CHECK (
  (is_system_defined = TRUE AND account_id IS NULL)
  OR (is_system_defined = FALSE AND account_id IS NOT NULL)
);

-- ── 2. Replace the single industry_pack_id column with a join table ────────────

CREATE TABLE IF NOT EXISTS public.local_register_industry_packs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id      UUID NOT NULL REFERENCES public.local_registers(id) ON DELETE CASCADE,
  industry_pack_id UUID NOT NULL REFERENCES public.industry_packs(id) ON DELETE CASCADE,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.local_register_industry_packs IS
  'v932: which industry pack(s) a system-defined local register belongs to — a register can '
  'serve more than one industry (e.g. Permits: Construction + Energy & Utilities), mirroring '
  'industry_pack_menu_items'' own many-to-many shape.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_local_register_industry_packs
  ON public.local_register_industry_packs(register_id, industry_pack_id);
CREATE INDEX IF NOT EXISTS idx_local_register_industry_packs_pack
  ON public.local_register_industry_packs(industry_pack_id);

ALTER TABLE public.local_register_industry_packs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.local_register_industry_packs TO authenticated;
GRANT ALL ON public.local_register_industry_packs TO service_role;

DROP POLICY IF EXISTS policy_local_register_industry_packs_select ON public.local_register_industry_packs;
CREATE POLICY policy_local_register_industry_packs_select ON public.local_register_industry_packs
  FOR SELECT TO authenticated
  USING (TRUE);

-- Register the new table
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('local_register_industry_packs', 'Local Register Engine: which industry pack(s) a system-defined register belongs to (v932)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- Drop the old single-pack column now that the join table replaces it (no data to migrate —
-- nothing has been seeded onto local_registers yet).
ALTER TABLE public.local_registers DROP COLUMN IF EXISTS industry_pack_id;
DROP INDEX IF EXISTS public.idx_local_registers_industry_pack;

-- ── 3. local_register_records needs its own scope-entity columns ───────────────
-- A member-created register is already tied to one specific portfolio/programme/project (its
-- own scope_*_id), so every one of its records trivially belongs to that same entity. But a
-- system-defined register (Permits, Core Banking, ...) is now account-agnostic and reusable
-- across every project/org with the matching industry pack — its OWN scope_*_id columns are
-- NULL. Each individual RECORD of a system-defined register must therefore carry its own scope
-- reference (which project it was actually created for). Records now always carry their own
-- scope columns — for member-created registers these are simply copied from the parent
-- register at insert time; for system-defined registers they're chosen by whoever creates the
-- record.

ALTER TABLE public.local_register_records
  ADD COLUMN IF NOT EXISTS record_portfolio_id UUID REFERENCES public.portfolios(id),
  ADD COLUMN IF NOT EXISTS record_programme_id UUID REFERENCES public.programmes(id),
  ADD COLUMN IF NOT EXISTS record_project_id UUID REFERENCES public.projects(id);

COMMENT ON COLUMN public.local_register_records.record_portfolio_id IS
  'v932: this specific record''s portfolio, populated regardless of whether the parent register '
  'is system-defined (account-agnostic) or member-created (already portfolio-scoped, copied '
  'through at insert time). Exactly one of record_portfolio_id/record_programme_id/'
  'record_project_id is set, matching the parent register''s scope_level.';

CREATE INDEX IF NOT EXISTS idx_local_register_records_project ON public.local_register_records(record_project_id) WHERE record_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_register_records_programme ON public.local_register_records(record_programme_id) WHERE record_programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_register_records_portfolio ON public.local_register_records(record_portfolio_id) WHERE record_portfolio_id IS NOT NULL;

-- ── 4. Replace local_register_records RLS to check the RECORD's own scope columns ──
-- (superseding v931's version, which incorrectly assumed every record inherits its scope
-- purely from the parent register — only true for member-created registers.)

DROP POLICY IF EXISTS policy_local_register_records_select ON public.local_register_records;
CREATE POLICY policy_local_register_records_select ON public.local_register_records
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(
          auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id)
        )
    )
  );

DROP POLICY IF EXISTS policy_local_register_records_insert ON public.local_register_records;
CREATE POLICY policy_local_register_records_insert ON public.local_register_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(
          auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id)
        )
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
        AND public.has_local_register_scope_access(
          auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id
        AND public.has_local_register_scope_access(
          auth.uid(), lr.scope_level,
          COALESCE(lr.scope_portfolio_id, local_register_records.record_portfolio_id),
          COALESCE(lr.scope_programme_id, local_register_records.record_programme_id),
          COALESCE(lr.scope_project_id, local_register_records.record_project_id)
        )
    )
  );

-- ── 5. local_registers SELECT: system-defined rows visible org-wide only when the org has ──
-- the matching industry pack enabled (mirrors get_account_available_menu_item_ids' own
-- fail-open-for-Core, gated-for-industry-items philosophy, v924). Member-created rows remain
-- visible only within their own account (matches every other table's tenant-isolation pattern).

-- public.users has no direct account_id column — account membership is resolved through
-- get_user_accounts(p_auth_user_id) (SQL/v94_fix_get_user_accounts_ambiguous.sql), the same
-- function the JS-side getCurrentUserAccountId() ultimately falls back to. Reused here rather
-- than re-deriving account membership a second, different way.
DROP POLICY IF EXISTS policy_local_registers_select ON public.local_registers;
CREATE POLICY policy_local_registers_select ON public.local_registers
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      is_system_defined = TRUE
      OR EXISTS (
        SELECT 1 FROM get_user_accounts(auth.uid()) ga
        WHERE ga.account_id = local_registers.account_id
      )
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v932_local_registers_system_scope_fix.sql applied successfully';
END $$;
