-- ============================================================================
-- v1283: Meaning search — embeddings on search_index + hybrid search (PRD D20–D25, stories 36–42;
-- plan SQL #12). Phase 2b.
--
--   * pgvector in the existing database (no separate vector store, D21). Columns on
--     public.search_index and sim.search_index:
--       embedding vector(384)   gte-small (D22), model name stored per row so it can be swapped
--       embed_text              the combined text for the 9 D23 record types (NULL = not embedded)
--       content_hash            md5(embed_text); a change re-queues the row (D24)
--       embedding_model, embedded_at, embed_attempts (max 3), embed_error, content_lang ('en'/'other')
--     HNSW cosine index on rows that have an embedding.
--   * public.ai_embed_text(schema, entity, id, view_row) — the D23 text builders:
--       risks (title + description + cause/effect), issues, actions, decisions (title + rationale),
--       lessons (title + description + recommendation), meeting summaries (summary only),
--       daily log entries, delay log (title + description + cause + impact scope + responsible party
--       + resolution plan), schedule tasks (name + description + notes + outline path).
--   * public.ai_search_touch() now also writes embed_text/content_hash (same rules as v1277).
--   * Queue RPCs for the ai-embed edge function (service_role only): ai_embed_pending,
--     ai_embed_store (only if the text has not changed meanwhile), ai_embed_failed.
--   * public|sim.ai_hybrid_search(text, query_embedding, entity_types, project_id, limit, exclude_id)
--     SECURITY INVOKER: search_index RLS filters rows first (access filter), then keyword and
--     meaning results are merged with reciprocal rank fusion (D25); an exact reference match
--     (e.g. RSK-0042) always ranks first. Every hit is re-checked against its RLS-protected view.
--     Without a query embedding it is keyword-only.
--
-- Prerequisites: v1277 (search_index population). Requires the pgvector extension (Supabase:
-- Database → Extensions → vector). Idempotent. Run v1283_search_index_embeddings_tests.sql next.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ── 1. Columns + indexes (type is schema-qualified wherever pgvector lives) ──
DO $$
DECLARE
  v_ns TEXT := (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector');
  s TEXT;
BEGIN
  IF v_ns IS NULL THEN RAISE EXCEPTION 'pgvector is not installed'; END IF;
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.search_index ADD COLUMN IF NOT EXISTS embedding %I.vector(384)', s, v_ns);
    EXECUTE format($a$ALTER TABLE %I.search_index
      ADD COLUMN IF NOT EXISTS embed_text TEXT,
      ADD COLUMN IF NOT EXISTS content_hash TEXT,
      ADD COLUMN IF NOT EXISTS embedding_model TEXT,
      ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS embed_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS embed_error TEXT,
      ADD COLUMN IF NOT EXISTS content_lang TEXT$a$, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.search_index USING hnsw (embedding %I.vector_cosine_ops) WHERE embedding IS NOT NULL AND is_deleted = FALSE',
                   'idx_' || s || '_search_index_embedding', s, v_ns);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.search_index (updated_at) WHERE embedding IS NULL AND embed_text IS NOT NULL AND is_deleted = FALSE',
                   'idx_' || s || '_search_index_embed_queue', s);
  END LOOP;
END $$;

-- ── 2. D23 text builders ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_embed_text(p_schema TEXT, p_entity TEXT, p_id UUID, p_row JSONB)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_base JSONB;
  v_path TEXT;
  v_text TEXT;
BEGIN
  IF p_row IS NULL THEN RETURN NULL; END IF;
  CASE p_entity
    WHEN 'risks' THEN
      v_text := concat_ws(E'\n', p_row ->> 'title', p_row ->> 'description', p_row ->> 'cause_description', p_row ->> 'effect_description');
    WHEN 'issues', 'actions', 'daily_log', 'meeting_summaries' THEN
      v_text := concat_ws(E'\n', CASE WHEN p_entity IN ('issues', 'actions') THEN p_row ->> 'title' END, p_row ->> 'description');
    WHEN 'decisions' THEN
      v_text := concat_ws(E'\n', p_row ->> 'title', p_row ->> 'rationale');
    WHEN 'lessons' THEN
      v_text := concat_ws(E'\n', p_row ->> 'title', p_row ->> 'description', p_row ->> 'recommendation');
    WHEN 'delays' THEN
      EXECUTE format('SELECT to_jsonb(d) FROM %I.project_delays d WHERE d.id = $1', p_schema) INTO v_base USING p_id;
      v_text := concat_ws(E'\n', p_row ->> 'title', p_row ->> 'description', p_row ->> 'cause',
                          v_base ->> 'impact_scope', p_row ->> 'responsible_party', p_row ->> 'resolution_plan');
    WHEN 'tasks' THEN
      EXECUTE format('SELECT to_jsonb(t) FROM %I.tasks t WHERE t.id = $1', p_schema) INTO v_base USING p_id;
      EXECUTE format($q$
        WITH RECURSIVE up AS (
          SELECT t.id, t.parent_task_id, t.task_name, 0 AS depth FROM %1$I.tasks t WHERE t.id = $1
          UNION ALL
          SELECT t.id, t.parent_task_id, t.task_name, up.depth + 1 FROM %1$I.tasks t JOIN up ON t.id = up.parent_task_id WHERE up.depth < 8
        )
        SELECT string_agg(task_name, ' > ' ORDER BY depth DESC) FROM up$q$, p_schema) INTO v_path USING p_id;
      v_text := concat_ws(E'\n', v_path, p_row ->> 'description', v_base ->> 'notes');
    ELSE
      RETURN NULL;  -- projects, milestones, change requests, stakeholders: keyword search only
  END CASE;
  v_text := NULLIF(btrim(regexp_replace(COALESCE(v_text, ''), '\s+', ' ', 'g')), '');
  RETURN LEFT(v_text, 4000);
END;
$$;
REVOKE ALL ON FUNCTION public.ai_embed_text(TEXT, TEXT, UUID, JSONB) FROM PUBLIC;

-- ── 3. Index maintenance: v1277 ai_search_touch + embedding text and re-queue ──
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
  v_embed TEXT;
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
  v_embed := public.ai_embed_text(p_schema, p_entity, p_id, v_row);

  EXECUTE format($q$
    INSERT INTO %1$I.search_index (account_id, project_id, entity_type, entity_id, title, keywords, breadcrumb, route_path,
                                   display_ref, embed_text, content_hash, is_deleted, indexed_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, md5(COALESCE($10, '')), FALSE, NOW(), NOW())
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      account_id = EXCLUDED.account_id, project_id = EXCLUDED.project_id, title = EXCLUDED.title,
      keywords = EXCLUDED.keywords, breadcrumb = EXCLUDED.breadcrumb, route_path = EXCLUDED.route_path,
      display_ref = EXCLUDED.display_ref, is_deleted = FALSE, indexed_at = NOW(), updated_at = NOW(),
      embed_text = EXCLUDED.embed_text,
      embedding      = CASE WHEN %1$I.search_index.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL ELSE %1$I.search_index.embedding END,
      embedded_at    = CASE WHEN %1$I.search_index.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL ELSE %1$I.search_index.embedded_at END,
      embed_attempts = CASE WHEN %1$I.search_index.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN 0 ELSE %1$I.search_index.embed_attempts END,
      embed_error    = CASE WHEN %1$I.search_index.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL ELSE %1$I.search_index.embed_error END,
      content_hash   = EXCLUDED.content_hash$q$, p_schema)
  USING NULLIF(v_row ->> 'account_id', '')::uuid, NULLIF(v_row ->> 'project_id', '')::uuid, p_entity, p_id,
        v_title, v_body, v_row ->> 'project_name', v_route, v_row ->> 'display_id', v_embed;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_search_touch(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_search_touch(TEXT, TEXT, UUID) TO service_role;

-- Fill embed_text for every existing row (embeddings are then made by ai-embed in the background).
SELECT public.ai_search_backfill();

-- ── 4. Embedding queue (ai-embed edge function, service_role only) ───────────
CREATE OR REPLACE FUNCTION public.ai_embed_pending(p_schema TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (id UUID, embed_text TEXT, content_hash TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RETURN; END IF;
  RETURN QUERY EXECUTE format($q$
    SELECT si.id, si.embed_text, si.content_hash FROM %I.search_index si
     WHERE si.embedding IS NULL AND si.embed_text IS NOT NULL AND si.is_deleted = FALSE AND si.embed_attempts < 3
     ORDER BY si.updated_at
     LIMIT $1$q$, p_schema) USING LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_embed_store(p_schema TEXT, p_id UUID, p_hash TEXT, p_embedding TEXT, p_model TEXT, p_lang TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim, extensions SET row_security = off
AS $$
DECLARE n INTEGER;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RETURN FALSE; END IF;
  EXECUTE format($q$
    UPDATE %I.search_index SET embedding = $1::vector, embedding_model = $2, embedded_at = NOW(),
           embed_error = NULL, content_lang = $3
     WHERE id = $4 AND content_hash = $5$q$, p_schema)
    USING p_embedding, p_model, p_lang, p_id, p_hash;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;   -- FALSE when the record changed meanwhile: it is still queued with the new text
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_embed_failed(p_schema TEXT, p_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RETURN; END IF;
  EXECUTE format('UPDATE %I.search_index SET embed_attempts = embed_attempts + 1, embed_error = LEFT($1, 500) WHERE id = $2', p_schema)
    USING p_error, p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_embed_pending(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_embed_store(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_embed_failed(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_embed_pending(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_embed_store(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_embed_failed(TEXT, UUID, TEXT) TO service_role;

-- ── 5. Hybrid search ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_hybrid_search_in(
  p_schema TEXT, p_text TEXT, p_embedding TEXT DEFAULT NULL, p_entity_types TEXT[] DEFAULT NULL,
  p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15, p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID,
               project_name TEXT, route_path TEXT, score REAL, similarity REAL, matched TEXT)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 50);
  v_pool  INT;
  v_query tsquery;
  c RECORD;
  v_visible BOOLEAN;
  v_label TEXT;
  v_returned INT := 0;
BEGIN
  IF p_schema NOT IN ('public', 'sim') OR (COALESCE(btrim(p_text), '') = '' AND p_embedding IS NULL) THEN RETURN; END IF;
  v_pool := v_limit * 4;
  v_query := websearch_to_tsquery('english', COALESCE(p_text, ''));
  BEGIN
    PERFORM set_config('hnsw.ef_search', '200', TRUE);  -- more candidates survive the RLS filter
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  FOR c IN EXECUTE format($q$
      WITH kw AS (
        SELECT si.id, row_number() OVER (ORDER BY ts_rank(si.search_vector, $1) DESC, si.title) AS rk
          FROM %1$I.search_index si
         WHERE si.is_deleted = FALSE AND $2 <> ''
           AND (si.search_vector @@ $1 OR si.title ILIKE '%%' || $2 || '%%')
           AND ($3::text[] IS NULL OR si.entity_type = ANY ($3)) AND ($4::uuid IS NULL OR si.project_id = $4)
           AND ($7::uuid IS NULL OR si.entity_id <> $7)
         LIMIT $5
      ),
      ex AS (
        SELECT si.id FROM %1$I.search_index si
         WHERE si.is_deleted = FALSE AND $2 <> '' AND si.display_ref ILIKE btrim($2)
           AND ($3::text[] IS NULL OR si.entity_type = ANY ($3)) AND ($4::uuid IS NULL OR si.project_id = $4)
      ),
      vec_raw AS (
        SELECT si.id, si.embedding <=> $6::vector AS dist
          FROM %1$I.search_index si
         WHERE $6 IS NOT NULL AND si.embedding IS NOT NULL AND si.is_deleted = FALSE
           AND ($3::text[] IS NULL OR si.entity_type = ANY ($3)) AND ($4::uuid IS NULL OR si.project_id = $4)
           AND ($7::uuid IS NULL OR si.entity_id <> $7)
         ORDER BY si.embedding <=> $6::vector
         LIMIT $5
      ),
      vec AS (SELECT id, dist, row_number() OVER (ORDER BY dist) AS rk FROM vec_raw),
      ids AS (SELECT id FROM kw UNION SELECT id FROM vec UNION SELECT id FROM ex)
      SELECT si.entity_type::text AS entity_type, si.entity_id, si.title, si.breadcrumb, si.project_id, si.route_path, si.display_ref,
             (COALESCE(1.0 / (60 + kw.rk), 0) + COALESCE(1.0 / (60 + vec.rk), 0) + CASE WHEN ex.id IS NOT NULL THEN 1 ELSE 0 END)::real AS score,
             CASE WHEN vec.id IS NOT NULL THEN (1 - vec.dist)::real END AS similarity,
             CASE WHEN ex.id IS NOT NULL THEN 'reference' WHEN kw.id IS NOT NULL AND vec.id IS NOT NULL THEN 'both'
                  WHEN vec.id IS NOT NULL THEN 'meaning' ELSE 'keyword' END AS matched
        FROM ids
        JOIN %1$I.search_index si ON si.id = ids.id
        LEFT JOIN kw ON kw.id = ids.id
        LEFT JOIN vec ON vec.id = ids.id
        LEFT JOIN ex ON ex.id = ids.id
       ORDER BY score DESC, si.title$q$, p_schema)
    USING v_query, COALESCE(btrim(p_text), ''), p_entity_types, p_project_id, v_pool, p_embedding, p_exclude_id
  LOOP
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
    similarity := c.similarity;
    matched := c.matched;
    RETURN NEXT;
    v_returned := v_returned + 1;
    EXIT WHEN v_returned >= v_limit;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_hybrid_search(p_text TEXT, p_embedding TEXT DEFAULT NULL, p_entity_types TEXT[] DEFAULT NULL,
                                                   p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15, p_exclude_id UUID DEFAULT NULL)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID,
               project_name TEXT, route_path TEXT, score REAL, similarity REAL, matched TEXT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions
AS $$ SELECT * FROM public.ai_hybrid_search_in('public', p_text, p_embedding, p_entity_types, p_project_id, p_limit, p_exclude_id); $$;

CREATE OR REPLACE FUNCTION sim.ai_hybrid_search(p_text TEXT, p_embedding TEXT DEFAULT NULL, p_entity_types TEXT[] DEFAULT NULL,
                                                p_project_id UUID DEFAULT NULL, p_limit INT DEFAULT 15, p_exclude_id UUID DEFAULT NULL)
RETURNS TABLE (entity_type TEXT, entity_label TEXT, entity_id UUID, display_id TEXT, title TEXT, project_id UUID,
               project_name TEXT, route_path TEXT, score REAL, similarity REAL, matched TEXT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public, extensions
AS $$ SELECT * FROM public.ai_hybrid_search_in('sim', p_text, p_embedding, p_entity_types, p_project_id, p_limit, p_exclude_id); $$;

GRANT EXECUTE ON FUNCTION public.ai_hybrid_search_in(TEXT, TEXT, TEXT, TEXT[], UUID, INT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_hybrid_search(TEXT, TEXT, TEXT[], UUID, INT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.ai_hybrid_search(TEXT, TEXT, TEXT[], UUID, INT, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1283_search_index_embeddings.sql completed — run v1284 to schedule embedding'; END $$;
