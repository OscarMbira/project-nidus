-- ============================================================================
-- v1277: search_index population + Ask Nidus keyword search (PRD story 20, D23 prep; plan SQL #6)
--
-- The v643 search_index table existed but nothing wrote to it. This file:
--   1. SECURITY FIX: the v643 read policy let every signed-in user read every row (all tenants).
--      Rows are now readable only by people who can access the row's project (or account).
--      The PMO-admin write policy is dropped: rows are written only by the triggers below.
--   2. Creates sim.search_index (same shape) for the Simulator.
--   3. Adds two search-only views: ai_v_daily_log (all daily-log entries that are not actions)
--      and ai_v_meeting_summaries.
--   4. ai_search_touch(schema, entity, id): rebuilds one row from the curated ai_v_* view.
--      AFTER INSERT/UPDATE/DELETE triggers on the source tables call it, so the index stays
--      current with no manual re-index. Deleted / soft-deleted records are marked is_deleted.
--   5. Backfills every existing record.
--   6. public|sim.ai_search_records(text, entity_types, project_id, limit): keyword search used
--      by Ask Nidus. SECURITY INVOKER, and every hit is re-checked against its RLS-protected view.
--      (v1283 upgrades it to hybrid keyword + meaning search.)
--
-- Prerequisites: v643, v1272, v1274, v1275. Idempotent. Run v1277_search_index_population_tests.sql.
-- ============================================================================

-- ── 1. Security fix on public.search_index ──────────────────────────────────
DROP POLICY IF EXISTS policy_search_index_select ON public.search_index;
DROP POLICY IF EXISTS policy_search_index_pmo_write ON public.search_index;
CREATE POLICY policy_search_index_select ON public.search_index
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE AND (
      (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
      OR (project_id IS NULL AND account_id IS NOT NULL AND public.auth_user_can_access_account(account_id))
    )
  );

ALTER TABLE public.search_index ADD COLUMN IF NOT EXISTS display_ref TEXT;

-- ── 2. sim.search_index ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.search_index (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID,
  project_id    UUID,          -- sim.practice_projects.id
  entity_type   VARCHAR(60) NOT NULL,
  entity_id     UUID NOT NULL,
  title         TEXT NOT NULL,
  keywords      TEXT,
  breadcrumb    TEXT,
  route_path    TEXT,
  search_vector TSVECTOR,
  indexed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_search_index_entity UNIQUE (entity_type, entity_id)
);
ALTER TABLE sim.search_index ADD COLUMN IF NOT EXISTS display_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_sim_search_index_project ON sim.search_index (project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_search_index_vector ON sim.search_index USING GIN (search_vector);
DROP TRIGGER IF EXISTS trg_sim_search_index_vector ON sim.search_index;
CREATE TRIGGER trg_sim_search_index_vector
  BEFORE INSERT OR UPDATE OF title, keywords ON sim.search_index
  FOR EACH ROW EXECUTE FUNCTION public.search_index_sync_vector();
ALTER TABLE sim.search_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sim_search_index_select ON sim.search_index;
-- The sub-select runs with the caller's RLS on practice_projects, so learners only see their own.
CREATE POLICY sim_search_index_select ON sim.search_index
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND project_id IS NOT NULL AND EXISTS (SELECT 1 FROM sim.practice_projects p WHERE p.id = project_id));
GRANT SELECT ON sim.search_index TO authenticated;
GRANT ALL ON sim.search_index TO service_role;

-- ── 3. Search-only views ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.ai_v_daily_log WITH (security_invoker = true) AS
SELECT e.id, d.project_id, p.account_id, p.project_name,
       e.entry_code AS display_id, initcap(e.entry_type) || ': ' || LEFT(e.description, 160) AS title,
       e.entry_type, e.status, e.description, e.results, e.entry_date, e.created_at
  FROM public.daily_log_entries e
  JOIN public.daily_logs d ON d.id = e.daily_log_id
  JOIN public.projects p ON p.id = d.project_id
 WHERE lower(e.entry_type) <> 'action' AND COALESCE(e.is_deleted, FALSE) = FALSE
   AND COALESCE(e.is_private, FALSE) = FALSE AND COALESCE(d.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_daily_log WITH (security_invoker = true) AS
SELECT e.id, d.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       NULL::text AS display_id, initcap(e.entry_type) || ': ' || LEFT(e.description, 160) AS title,
       e.entry_type, e.status, e.description, e.results, e.entry_date, e.created_at
  FROM sim.practice_daily_log_entries e
  JOIN sim.practice_daily_logs d ON d.id = e.practice_daily_log_id
  JOIN sim.practice_projects p ON p.id = d.practice_project_id
 WHERE lower(e.entry_type) <> 'action' AND COALESCE(d.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_meeting_summaries WITH (security_invoker = true) AS
SELECT s.id, m.project_id, m.account_id, p.project_name,
       m.meeting_code AS display_id, 'Meeting: ' || m.title AS title,
       s.summary_text AS description, m.scheduled_start, s.generated_at AS created_at
  FROM public.comm_meeting_summaries s
  JOIN public.comm_meetings m ON m.id = s.meeting_id
  LEFT JOIN public.projects p ON p.id = m.project_id;

CREATE OR REPLACE VIEW sim.ai_v_meeting_summaries WITH (security_invoker = true) AS
SELECT s.id, NULL::uuid AS project_id, m.account_id, NULL::text AS project_name,
       NULL::text AS display_id, 'Meeting: ' || m.title AS title,
       s.summary_text AS description, m.scheduled_start, s.generated_at AS created_at
  FROM sim.comm_meeting_summaries s
  JOIN sim.comm_meetings m ON m.id = s.meeting_id;

GRANT SELECT ON public.ai_v_daily_log, sim.ai_v_daily_log, public.ai_v_meeting_summaries, sim.ai_v_meeting_summaries
  TO authenticated, service_role;

-- ── 4. Index maintenance ────────────────────────────────────────────────────
-- Entities kept in the index (search-only ones have no catalogue row).
CREATE OR REPLACE FUNCTION public.ai_search_entities()
RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['projects', 'tasks', 'milestones', 'risks', 'issues', 'change_requests', 'actions', 'decisions',
               'lessons', 'stakeholders', 'delays', 'daily_log', 'meeting_summaries'];
$$;

-- Rebuild one index row from its curated view. Runs as the owner (row_security off), so the index
-- is complete; reads of the index are filtered by the policies above and by ai_search_records.
CREATE OR REPLACE FUNCTION public.ai_search_touch(p_schema TEXT, p_entity TEXT, p_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_row   JSONB;
  v_route TEXT;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF p_id IS NULL OR p_schema NOT IN ('public', 'sim') OR NOT (p_entity = ANY (public.ai_search_entities())) THEN
    RETURN;
  END IF;
  EXECUTE format('SELECT to_jsonb(v) FROM %I.%I v WHERE v.id = $1', p_schema, 'ai_v_' || p_entity) INTO v_row USING p_id;

  IF v_row IS NULL THEN
    EXECUTE format('UPDATE %I.search_index SET is_deleted = TRUE, updated_at = NOW() WHERE entity_type = $1 AND entity_id = $2 AND NOT is_deleted', p_schema)
      USING p_entity, p_id;
    RETURN;
  END IF;

  EXECUTE format('SELECT route_template FROM %I.ai_catalogue_entities WHERE entity_key = $1', p_schema) INTO v_route USING p_entity;
  IF v_route IS NOT NULL THEN
    v_route := replace(replace(v_route, '{id}', p_id::text), '{project_id}', COALESCE(v_row ->> 'project_id', ''));
    IF v_route LIKE '%//%' THEN v_route := NULL; END IF;
  END IF;

  v_title := LEFT(COALESCE(v_row ->> 'title', v_row ->> 'task_name', v_row ->> 'milestone_name', v_row ->> 'name',
                           v_row ->> 'project_name', v_row ->> 'display_id', '(untitled)'), 500);
  v_body := LEFT(concat_ws(' ',
              v_row ->> 'display_id', v_row ->> 'description', v_row ->> 'cause_description', v_row ->> 'effect_description',
              v_row ->> 'rationale', v_row ->> 'impact', v_row ->> 'recommendation', v_row ->> 'impact_summary',
              v_row ->> 'results', v_row ->> 'expectations', v_row ->> 'cause', v_row ->> 'resolution_plan',
              v_row ->> 'responsible_party', v_row ->> 'organisation', v_row ->> 'role', v_row ->> 'category',
              v_row ->> 'owner', v_row ->> 'assigned_to', v_row ->> 'wbs_code'), 20000);

  EXECUTE format($q$
    INSERT INTO %I.search_index (account_id, project_id, entity_type, entity_id, title, keywords, breadcrumb, route_path,
                                 display_ref, is_deleted, indexed_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW(), NOW())
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      account_id = EXCLUDED.account_id, project_id = EXCLUDED.project_id, title = EXCLUDED.title,
      keywords = EXCLUDED.keywords, breadcrumb = EXCLUDED.breadcrumb, route_path = EXCLUDED.route_path,
      display_ref = EXCLUDED.display_ref, is_deleted = FALSE, indexed_at = NOW(), updated_at = NOW()$q$, p_schema)
  USING NULLIF(v_row ->> 'account_id', '')::uuid, NULLIF(v_row ->> 'project_id', '')::uuid, p_entity, p_id,
        v_title, v_body, v_row ->> 'project_name', v_route, v_row ->> 'display_id';
END;
$$;
REVOKE ALL ON FUNCTION public.ai_search_touch(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_search_touch(TEXT, TEXT, UUID) TO service_role;

-- Generic row trigger: TG_ARGV[0] = schema, TG_ARGV[1] = entity ('daily' = daily-log table).
CREATE OR REPLACE FUNCTION public.trg_ai_search_touch()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE v_id UUID;
BEGIN
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  BEGIN
    IF TG_ARGV[1] = 'daily' THEN
      -- A daily-log entry is indexed as an action or as a plain log entry, never both.
      PERFORM public.ai_search_touch(TG_ARGV[0], 'actions', v_id);
      PERFORM public.ai_search_touch(TG_ARGV[0], 'daily_log', v_id);
    ELSE
      PERFORM public.ai_search_touch(TG_ARGV[0], TG_ARGV[1], v_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Indexing must never block a user's save.
    RAISE WARNING 'search index update skipped for %.%: %', TG_ARGV[0], TG_ARGV[1], SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT * FROM (VALUES
      ('public', 'projects', 'projects'), ('public', 'tasks', 'tasks'), ('public', 'milestones', 'milestones'),
      ('public', 'risks', 'risks'), ('public', 'issues', 'issues'), ('public', 'change_requests', 'change_requests'),
      ('public', 'daily_log_entries', 'daily'), ('public', 'project_decisions', 'decisions'),
      ('public', 'lessons_learned', 'lessons'), ('public', 'stakeholders', 'stakeholders'),
      ('public', 'project_delays', 'delays'), ('public', 'comm_meeting_summaries', 'meeting_summaries'),
      ('sim', 'practice_projects', 'projects'), ('sim', 'tasks', 'tasks'), ('sim', 'milestones', 'milestones'),
      ('sim', 'practice_risks', 'risks'), ('sim', 'practice_issues', 'issues'), ('sim', 'practice_change_requests', 'change_requests'),
      ('sim', 'practice_daily_log_entries', 'daily'), ('sim', 'project_decisions', 'decisions'),
      ('sim', 'practice_lesson_entries', 'lessons'), ('sim', 'practice_stakeholder_register', 'stakeholders'),
      ('sim', 'project_delays', 'delays'), ('sim', 'comm_meeting_summaries', 'meeting_summaries')
    ) AS x(schema_name, table_name, entity)
  LOOP
    IF to_regclass(format('%I.%I', t.schema_name, t.table_name)) IS NULL THEN
      RAISE NOTICE 'v1277: %.% not found — skipped', t.schema_name, t.table_name;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_ai_search_index ON %I.%I', t.schema_name, t.table_name);
    EXECUTE format('CREATE TRIGGER trg_ai_search_index AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.trg_ai_search_touch(%L, %L)',
                   t.schema_name, t.table_name, t.schema_name, t.entity);
  END LOOP;
END $$;

-- ── 5. Backfill ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_search_backfill(p_schema TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  s TEXT; e TEXT; v_id UUID; v_counts JSONB := '{}'::jsonb; n INT;
BEGIN
  FOREACH s IN ARRAY CASE WHEN p_schema IS NULL THEN ARRAY['public', 'sim'] ELSE ARRAY[p_schema] END LOOP
    FOREACH e IN ARRAY public.ai_search_entities() LOOP
      n := 0;
      FOR v_id IN EXECUTE format('SELECT id FROM %I.%I', s, 'ai_v_' || e) LOOP
        PERFORM public.ai_search_touch(s, e, v_id);
        n := n + 1;
      END LOOP;
      v_counts := v_counts || jsonb_build_object(s || '.' || e, n);
    END LOOP;
  END LOOP;
  RETURN v_counts;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_search_backfill(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_search_backfill(TEXT) TO service_role;

SELECT public.ai_search_backfill();

-- ── 6. Keyword search for Ask Nidus ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_search_records_in(
  p_schema TEXT, p_text TEXT, p_entity_types TEXT[] DEFAULT NULL, p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15
)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID,
               project_name TEXT, route_path TEXT, score REAL)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_query tsquery;
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 50);
  c RECORD;
  v_visible BOOLEAN;
  v_label TEXT;
  v_returned INT := 0;
BEGIN
  IF p_schema NOT IN ('public', 'sim') OR COALESCE(btrim(p_text), '') = '' THEN RETURN; END IF;
  v_query := websearch_to_tsquery('english', p_text);

  FOR c IN EXECUTE format($q$
      SELECT si.entity_type::text AS entity_type, si.entity_id, si.title, si.breadcrumb, si.project_id, si.route_path,
             (ts_rank(si.search_vector, $1) + CASE WHEN si.title ILIKE '%%' || $2 || '%%' OR si.display_ref ILIKE $2 THEN 1 ELSE 0 END)::real AS score,
             si.display_ref
        FROM %I.search_index si
       WHERE si.is_deleted = FALSE
         AND (si.search_vector @@ $1 OR si.title ILIKE '%%' || $2 || '%%' OR si.display_ref ILIKE $2)
         AND ($3::text[] IS NULL OR si.entity_type = ANY ($3))
         AND ($4::uuid IS NULL OR si.project_id = $4)
       ORDER BY score DESC, si.title
       LIMIT $5$q$, p_schema)
    USING v_query, p_text, p_entity_types, p_project_id, v_limit * 4
  LOOP
    -- Re-check with the caller's RLS through the curated view.
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I v WHERE v.id = $1)', p_schema, 'ai_v_' || c.entity_type)
      INTO v_visible USING c.entity_id;
    CONTINUE WHEN NOT v_visible;
    EXECUTE format('SELECT label FROM %I.ai_catalogue_entities WHERE entity_key = $1', p_schema) INTO v_label USING c.entity_type;
    entity_type := c.entity_type;
    entity_label := COALESCE(v_label, CASE c.entity_type WHEN 'daily_log' THEN 'Daily log' WHEN 'meeting_summaries' THEN 'Meeting summary' ELSE initcap(replace(c.entity_type, '_', ' ')) END);
    entity_id := c.entity_id;
    display_id := c.display_ref;
    title := c.title;
    project_id := c.project_id;
    project_name := c.breadcrumb;
    route_path := c.route_path;
    score := c.score;
    RETURN NEXT;
    v_returned := v_returned + 1;
    EXIT WHEN v_returned >= v_limit;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_search_records(p_text TEXT, p_entity_types TEXT[] DEFAULT NULL, p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID, project_name TEXT, route_path TEXT, score REAL)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM public.ai_search_records_in('public', p_text, p_entity_types, p_project_id, p_limit); $$;

CREATE OR REPLACE FUNCTION sim.ai_search_records(p_text TEXT, p_entity_types TEXT[] DEFAULT NULL, p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID, project_name TEXT, route_path TEXT, score REAL)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public
AS $$ SELECT * FROM public.ai_search_records_in('sim', p_text, p_entity_types, p_project_id, p_limit); $$;

GRANT EXECUTE ON FUNCTION public.ai_search_records_in(TEXT, TEXT, TEXT[], UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_search_records(TEXT, TEXT[], UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.ai_search_records(TEXT, TEXT[], UUID, INT) TO authenticated, service_role;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('sim.search_index', 'Simulator denormalized search index for Ask Nidus search (v1277)', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1277_search_index_population.sql completed'; END $$;
