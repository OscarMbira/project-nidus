-- ============================================================================
-- v1490: Field-level contextual help — tables (v1345, slice 1)
-- ============================================================================
-- PRD projectprd/v1345_field_level_contextual_help_PRD.md · plan projectplan/v1345_field_level_contextual_help_plan.md
--
-- 1. public.field_help          — system help text per field (G-D1/G-D2). Key: public.table.column,
--                                  or register:<register_key>:<field_key> for register fields (G-D3).
--                                  form_key '' = shared default; a form may override (G-D1, P7).
--                                  Rules (required / max length / allowed values) are NOT stored —
--                                  forms supply them live (G-D7). Text is plain text + "- " bullets (G-D12).
-- 2. public.field_help_aliases  — Simulator keys (sim.table.column) mapped to the Platform key, so
--                                  both apps share one help row (PD1).
-- 3. public.field_help_events   — Platform / Planner usage: popover opens and helpful votes (G-D13).
--    sim.field_help_events      — the same for the Simulator (PD5: Simulator data stays in sim).
--
-- Access: help and aliases are readable by signed-in users and have no client write policies
-- (written by SQL seeds; Admin RPCs later). Events: users insert their own rows; a user may
-- delete only their own helpful votes (so a vote can be changed — P9). Reporting reads events
-- through SECURITY DEFINER functions in phase 5.
-- No Admin ID Generation: these tables have no reference column (P18).
-- After running: re-run SQL/v1251_planner_table_wall.sql only once Planner screens use field help
-- (PD3; the generator script adds the tables to the Planner allow-list then).
-- Rollback: v1490r_field_help_tables_rollback.sql. Idempotent.
-- ============================================================================

-- ── 1. Help text ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.field_help (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_key        TEXT NOT NULL,
  form_key        TEXT NOT NULL DEFAULT '',
  locale          TEXT NOT NULL DEFAULT 'en',
  title           TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  examples        TEXT NOT NULL,
  format_notes    TEXT,
  extra_notes     TEXT,
  learn_more_kind TEXT CHECK (learn_more_kind IN ('article', 'documentation')),
  learn_more_key  TEXT,
  module_code     TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_field_help_key UNIQUE (help_key, form_key, locale),
  CONSTRAINT chk_field_help_learn_more CHECK ((learn_more_kind IS NULL) = (learn_more_key IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_field_help_module ON public.field_help (module_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_field_help_updated ON public.field_help (updated_at DESC);

ALTER TABLE public.field_help ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS field_help_select ON public.field_help;
CREATE POLICY field_help_select ON public.field_help
  FOR SELECT TO authenticated
  USING (is_active);

-- ── 2. Simulator aliases ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.field_help_aliases (
  alias_key  TEXT PRIMARY KEY,
  help_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_field_help_aliases_help_key ON public.field_help_aliases (help_key);

ALTER TABLE public.field_help_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS field_help_aliases_select ON public.field_help_aliases;
CREATE POLICY field_help_aliases_select ON public.field_help_aliases
  FOR SELECT TO authenticated
  USING (TRUE);

-- ── 3. Usage events (Platform / Planner) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.field_help_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_key   TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'helpful_yes', 'helpful_no')),
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_field_help_events_key ON public.field_help_events (help_key, event_type);
CREATE INDEX IF NOT EXISTS idx_field_help_events_user ON public.field_help_events (user_id, help_key);

ALTER TABLE public.field_help_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS field_help_events_insert_own ON public.field_help_events;
CREATE POLICY field_help_events_insert_own ON public.field_help_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS field_help_events_select_own_votes ON public.field_help_events;
CREATE POLICY field_help_events_select_own_votes ON public.field_help_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND event_type IN ('helpful_yes', 'helpful_no'));
DROP POLICY IF EXISTS field_help_events_delete_own_votes ON public.field_help_events;
CREATE POLICY field_help_events_delete_own_votes ON public.field_help_events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND event_type IN ('helpful_yes', 'helpful_no'));

-- ── 4. Usage events (Simulator) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.field_help_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_key   TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'helpful_yes', 'helpful_no')),
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_field_help_events_key ON sim.field_help_events (help_key, event_type);
CREATE INDEX IF NOT EXISTS idx_sim_field_help_events_user ON sim.field_help_events (user_id, help_key);

ALTER TABLE sim.field_help_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sim_field_help_events_insert_own ON sim.field_help_events;
CREATE POLICY sim_field_help_events_insert_own ON sim.field_help_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS sim_field_help_events_select_own_votes ON sim.field_help_events;
CREATE POLICY sim_field_help_events_select_own_votes ON sim.field_help_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND event_type IN ('helpful_yes', 'helpful_no'));
DROP POLICY IF EXISTS sim_field_help_events_delete_own_votes ON sim.field_help_events;
CREATE POLICY sim_field_help_events_delete_own_votes ON sim.field_help_events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND event_type IN ('helpful_yes', 'helpful_no'));

GRANT SELECT ON public.field_help, public.field_help_aliases TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.field_help_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON sim.field_help_events TO authenticated;

-- ── 5. Keep updated_at current (drives the client cache version check, P8) ──
CREATE OR REPLACE FUNCTION public.trg_field_help_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_field_help_touch ON public.field_help;
CREATE TRIGGER trg_field_help_touch BEFORE UPDATE ON public.field_help
  FOR EACH ROW EXECUTE FUNCTION public.trg_field_help_touch();

-- ── 6. Table registry ───────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('field_help', 'Field-level contextual help text per form field (v1345)', true, true),
  ('field_help_aliases', 'Simulator field keys mapped to the Platform field-help key (v1345)', true, true),
  ('field_help_events', 'Field help usage: popover opens and helpful votes, Platform (v1345)', true, true),
  ('sim.field_help_events', 'Field help usage: popover opens and helpful votes, Simulator (v1345)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- Check
SELECT c.relname AS table_name, n.nspname AS schema_name, c.relrowsecurity AS rls_on
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('field_help', 'field_help_aliases', 'field_help_events') AND n.nspname IN ('public', 'sim')
ORDER BY 2, 1;
