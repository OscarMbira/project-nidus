-- ============================================================================
-- v1278: Report Builder on the Ask Nidus catalogue (PRD D11, story 16, 24; plan SQL #7)
--
--   * public.report_templates.query_spec JSONB — the ai_run_query description a template runs
--     (written by Report Builder and by Ask Nidus "Save as report").
--   * sim.report_templates — the Simulator's own templates (Report Builder is now mounted there).
--   * SECURITY FIX: public.report_templates had no RLS, so any signed-in user could read or change
--     any template. RLS is now on: people see their own templates plus public and system ones, and
--     change only their own. Same policies on sim.report_templates.
--
-- Prerequisites: v33 (report_templates), v1276. Idempotent.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new RLS-enabled tables, CLAUDE.md rule 6).
-- ============================================================================

ALTER TABLE public.report_templates ADD COLUMN IF NOT EXISTS query_spec JSONB;
COMMENT ON COLUMN public.report_templates.query_spec IS
  'v1272/D11: Ask Nidus query description (ai_run_query spec). Report Builder runs templates through ai_run_query.';

CREATE TABLE IF NOT EXISTS sim.report_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name         VARCHAR(255) NOT NULL,
  template_description  TEXT,
  template_type         VARCHAR(50) DEFAULT 'custom',
  primary_data_source   VARCHAR(100),
  query_spec            JSONB,
  chart_type            VARCHAR(50),
  is_system_template    BOOLEAN NOT NULL DEFAULT FALSE,
  is_public             BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count           INTEGER NOT NULL DEFAULT 0,
  owner_user_id         UUID,
  notes                 TEXT,
  tags                  TEXT[],
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID DEFAULT auth.uid(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID,
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID
);
CREATE INDEX IF NOT EXISTS idx_sim_report_templates_owner ON sim.report_templates (owner_user_id) WHERE is_deleted = FALSE;

-- Owner match accepts either id form (users.id or auth uid) because older rows used both.
CREATE OR REPLACE FUNCTION public.report_template_is_mine(p_owner UUID, p_created_by UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    p_owner IN (auth.uid(), public.current_internal_user_id())
    OR p_created_by IN (auth.uid(), public.current_internal_user_id())
  );
$$;
GRANT EXECUTE ON FUNCTION public.report_template_is_mine(UUID, UUID) TO authenticated;

DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.report_templates ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS report_templates_select ON %I.report_templates', s);
    EXECUTE format($p$CREATE POLICY report_templates_select ON %I.report_templates FOR SELECT TO authenticated
      USING (COALESCE(is_deleted, FALSE) = FALSE AND (COALESCE(is_public, FALSE) OR COALESCE(is_system_template, FALSE)
             OR public.report_template_is_mine(owner_user_id, created_by)))$p$, s);
    EXECUTE format('DROP POLICY IF EXISTS report_templates_insert ON %I.report_templates', s);
    EXECUTE format($p$CREATE POLICY report_templates_insert ON %I.report_templates FOR INSERT TO authenticated
      WITH CHECK (NOT COALESCE(is_system_template, FALSE) AND public.report_template_is_mine(owner_user_id, created_by))$p$, s);
    EXECUTE format('DROP POLICY IF EXISTS report_templates_update ON %I.report_templates', s);
    EXECUTE format($p$CREATE POLICY report_templates_update ON %I.report_templates FOR UPDATE TO authenticated
      USING (NOT COALESCE(is_system_template, FALSE) AND public.report_template_is_mine(owner_user_id, created_by))
      WITH CHECK (NOT COALESCE(is_system_template, FALSE) AND public.report_template_is_mine(owner_user_id, created_by))$p$, s);
    EXECUTE format('DROP POLICY IF EXISTS report_templates_delete ON %I.report_templates', s);
    EXECUTE format($p$CREATE POLICY report_templates_delete ON %I.report_templates FOR DELETE TO authenticated
      USING (NOT COALESCE(is_system_template, FALSE) AND public.report_template_is_mine(owner_user_id, created_by))$p$, s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I.report_templates TO authenticated', s);
    EXECUTE format('GRANT ALL ON %I.report_templates TO service_role', s);
  END LOOP;
END $$;

-- created_by defaults to the caller so "Save as report" rows always have an owner.
ALTER TABLE public.report_templates ALTER COLUMN created_by SET DEFAULT auth.uid();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('sim.report_templates', 'Simulator Report Builder templates and saved Ask Nidus reports (v1278)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1278_report_templates_query_spec.sql completed — re-run SQL/v1251_planner_table_wall.sql'; END $$;
