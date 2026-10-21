-- ============================================================================
-- v1295: Ask Nidus result drill-down + register list pages (Platform + Simulator)
-- ============================================================================
-- Owner decision (2026-10-21): clicking a grouped Ask Nidus / Report Builder row (e.g.
-- "Velocity Freight · high · 6") lists those exact records under the answer, each linking to its
-- record page, plus an "Open register" link to that register's list page. Works for every
-- register in the catalogue; no AI call, so no AI credits.
--
-- This file:
--   1. ai_catalogue_entities.list_route (public + sim) — the register's list page, seeded only
--      where the page is certain; NULL hides the link. {project_id} is filled in when all the
--      records shown belong to one project.
--   2. public.ai_run_query_in — copied unchanged from v1294 except:
--        * "drill": {group key: value, …} returns the records behind one grouped row (same
--          filters and project limits, group values matched exactly as results print them);
--        * the result also returns "list_route".
-- Prerequisites: v1274, v1276, v1294. Idempotent.
-- Tests: SQL/v1295_ai_result_drilldown_tests.sql.
-- ============================================================================

-- ── 1. Register list pages ───────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_catalogue_entities ADD COLUMN IF NOT EXISTS list_route TEXT;
ALTER TABLE sim.ai_catalogue_entities ADD COLUMN IF NOT EXISTS list_route TEXT;
COMMENT ON COLUMN public.ai_catalogue_entities.list_route IS
  'v1295: the register''s list page, e.g. /platform/risks; {project_id} = the project of the records shown. NULL = no "Open register" link.';
COMMENT ON COLUMN sim.ai_catalogue_entities.list_route IS
  'v1295: the register''s list page, e.g. /simulator/practice-risk-register; {project_id} = the practice project. NULL = no link.';

UPDATE public.ai_catalogue_entities e SET list_route = v.route, updated_at = NOW()
FROM (VALUES
  ('projects',        '/platform/projects'),
  ('tasks',           '/platform/tasks'),
  ('milestones',      '/platform/milestones'),
  ('risks',           '/platform/risks'),
  ('issues',          '/platform/issues'),
  ('change_requests', '/platform/change-requests'),
  ('actions',         '/platform/governance-actions'),
  ('decisions',       '/platform/governance/decisions'),
  ('lessons',         '/pm/controls/lessons-log'),
  ('stakeholders',    '/platform/stakeholders/register'),
  ('budget_summary',  '/platform/budget'),
  ('delays',          '/platform/delays')
) AS v(entity_key, route)
WHERE e.entity_key = v.entity_key AND e.list_route IS NULL;

UPDATE sim.ai_catalogue_entities e SET list_route = v.route, updated_at = NOW()
FROM (VALUES
  ('projects',        '/simulator/practice-projects'),
  ('risks',           '/simulator/practice-risk-register'),
  ('issues',          '/simulator/practice-issue-register'),
  ('change_requests', '/simulator/practice-change-requests'),
  ('decisions',       '/simulator/governance/decisions'),
  ('lessons',         '/simulator/practice-lessons-log'),
  ('stakeholders',    '/simulator/practice-stakeholders'),
  ('milestones',      '/simulator/practice-projects/{project_id}/milestones')
) AS v(entity_key, route)
WHERE e.entity_key = v.entity_key AND e.list_route IS NULL;

-- ── 2. Query runner: drill-down + list_route (rest unchanged from v1294) ─────────────────────
CREATE OR REPLACE FUNCTION public.ai_run_query_in(p_schema TEXT, p_spec JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entity    JSONB;
  v_settings  RECORD;
  v_edition   TEXT;
  v_ref       JSONB;
  v_item      JSONB;
  v_i         INTEGER;
  v_op        TEXT;
  v_val       TEXT;
  v_cast      TEXT;
  v_pred      TEXT;
  v_joins     JSONB := '{}'::jsonb;     -- alias → join sql
  v_select    TEXT[] := ARRAY[]::TEXT[];
  v_columns   JSONB := '[]'::jsonb;
  v_where     TEXT[] := ARRAY[]::TEXT[];
  v_group     TEXT[] := ARRAY[]::TEXT[];
  v_having    TEXT[] := ARRAY[]::TEXT[];
  v_order     TEXT[] := ARRAY[]::TEXT[];
  v_keys      JSONB := '{}'::jsonb;     -- output key → sql expression (for sort/having)
  v_explain_f TEXT[] := ARRAY[]::TEXT[];
  v_explain_g TEXT[] := ARRAY[]::TEXT[];
  v_explain_a TEXT[] := ARRAY[]::TEXT[];
  v_explain_s TEXT[] := ARRAY[]::TEXT[];
  v_grouped   BOOLEAN;
  v_drill     BOOLEAN := FALSE;
  v_fn        TEXT;
  v_alias     TEXT;
  v_agg       TEXT;
  v_limit     INTEGER;
  v_from      TEXT;
  v_sql       TEXT;
  v_rows      JSONB;
  v_total     BIGINT;
  v_dir       TEXT;
  v_label     TEXT;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'AIQ: unknown schema'; END IF;
  IF p_spec IS NULL OR jsonb_typeof(p_spec) <> 'object' THEN RAISE EXCEPTION 'AIQ: the query must be a JSON object'; END IF;

  v_entity := public.ai_catalogue_entity(p_schema, p_spec ->> 'entity');
  IF v_entity IS NULL THEN
    RAISE EXCEPTION 'AIQ: "%" is not an available register. Use one of: %', COALESCE(p_spec ->> 'entity', '(none)'),
      (SELECT string_agg(e ->> 'entity', ', ') FROM jsonb_array_elements(public.ai_catalogue_for(p_schema) -> 'entities') e);
  END IF;

  IF p_schema = 'public' THEN
    v_edition := COALESCE(public.auth_user_account_edition(), 'platform');
    IF NOT (v_edition = ANY (ARRAY(SELECT jsonb_array_elements_text(v_entity -> 'editions')))) THEN
      RAISE EXCEPTION 'AIQ_EDITION: % is not available in the % edition', v_entity ->> 'label', v_edition;
    END IF;
  END IF;

  SELECT query_row_cap, query_timeout_ms INTO v_settings FROM public.ai_platform_settings WHERE id;
  PERFORM set_config('statement_timeout', COALESCE(v_settings.query_timeout_ms, 5000)::text || 'ms', TRUE);

  v_grouped := jsonb_typeof(p_spec -> 'aggregates') = 'array' AND jsonb_array_length(p_spec -> 'aggregates') > 0;

  -- Filters ------------------------------------------------------------------
  IF jsonb_typeof(p_spec -> 'filters') = 'array' THEN
    v_i := -1;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'filters') LOOP
      v_i := v_i + 1;
      v_ref := public.ai_query_ref(p_schema, v_entity, v_item ->> 'field');
      IF NOT COALESCE((v_ref ->> 'filterable')::boolean, FALSE) THEN
        RAISE EXCEPTION 'AIQ: "%" cannot be used as a filter', v_item ->> 'field';
      END IF;
      IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
      v_op := lower(COALESCE(v_item ->> 'op', 'eq'));
      v_cast := public.ai_query_cast(v_ref ->> 'type');
      v_val := format('($1->''filters''->%s->>''value'')', v_i);

      IF v_op NOT IN ('is_null', 'not_null', 'before_today', 'after_today') AND NOT (v_item ? 'value') THEN
        RAISE EXCEPTION 'AIQ: filter on "%" with op "%" needs a value', v_item ->> 'field', v_op;
      END IF;
      IF v_op IN ('in', 'not_in', 'between') AND jsonb_typeof(v_item -> 'value') <> 'array' THEN
        RAISE EXCEPTION 'AIQ: op "%" needs a list value', v_op;
      END IF;
      IF v_op IN ('within_last_days', 'within_next_days', 'before_today', 'after_today') AND (v_ref ->> 'type') NOT IN ('date', 'datetime') THEN
        RAISE EXCEPTION 'AIQ: op "%" only works on date fields', v_op;
      END IF;

      v_pred := CASE v_op
        WHEN 'eq'  THEN CASE WHEN v_cast = 'text' THEN format('lower(%s::text) = lower(%s)', v_ref ->> 'expr', v_val)
                             ELSE format('%s = %s::%s', v_ref ->> 'expr', v_val, v_cast) END
        WHEN 'neq' THEN CASE WHEN v_cast = 'text' THEN format('lower(%s::text) IS DISTINCT FROM lower(%s)', v_ref ->> 'expr', v_val)
                             ELSE format('%s IS DISTINCT FROM %s::%s', v_ref ->> 'expr', v_val, v_cast) END
        WHEN 'gt'  THEN format('%s > %s::%s',  v_ref ->> 'expr', v_val, v_cast)
        WHEN 'gte' THEN format('%s >= %s::%s', v_ref ->> 'expr', v_val, v_cast)
        WHEN 'lt'  THEN format('%s < %s::%s',  v_ref ->> 'expr', v_val, v_cast)
        WHEN 'lte' THEN format('%s <= %s::%s', v_ref ->> 'expr', v_val, v_cast)
        WHEN 'in'  THEN CASE WHEN v_cast = 'text'
                             THEN format('lower(%s::text) = ANY (ARRAY(SELECT lower(x) FROM jsonb_array_elements_text($1->''filters''->%s->''value'') x))', v_ref ->> 'expr', v_i)
                             ELSE format('%s = ANY (ARRAY(SELECT x::%s FROM jsonb_array_elements_text($1->''filters''->%s->''value'') x))', v_ref ->> 'expr', v_cast, v_i) END
        WHEN 'not_in' THEN CASE WHEN v_cast = 'text'
                             THEN format('NOT (COALESCE(lower(%s::text), '''') = ANY (ARRAY(SELECT lower(x) FROM jsonb_array_elements_text($1->''filters''->%s->''value'') x)))', v_ref ->> 'expr', v_i)
                             ELSE format('NOT (%s = ANY (ARRAY(SELECT x::%s FROM jsonb_array_elements_text($1->''filters''->%s->''value'') x)))', v_ref ->> 'expr', v_cast, v_i) END
        WHEN 'contains'    THEN format('%s::text ILIKE (''%%'' || replace(replace(replace(%s, ''\'', ''\\''), ''%%'', ''\%%''), ''_'', ''\_'') || ''%%'')', v_ref ->> 'expr', v_val)
        WHEN 'starts_with' THEN format('%s::text ILIKE (replace(replace(replace(%s, ''\'', ''\\''), ''%%'', ''\%%''), ''_'', ''\_'') || ''%%'')', v_ref ->> 'expr', v_val)
        WHEN 'is_null'  THEN format('%s IS NULL', v_ref ->> 'expr')
        WHEN 'not_null' THEN format('%s IS NOT NULL', v_ref ->> 'expr')
        WHEN 'between'  THEN format('%s BETWEEN ($1->''filters''->%s->''value''->>0)::%s AND ($1->''filters''->%s->''value''->>1)::%s',
                                    v_ref ->> 'expr', v_i, v_cast, v_i, v_cast)
        WHEN 'within_last_days' THEN format('(%s >= CURRENT_DATE - (%s)::int AND %s <= NOW())', v_ref ->> 'expr', v_val, v_ref ->> 'expr')
        WHEN 'within_next_days' THEN format('(%s >= CURRENT_DATE AND %s <= CURRENT_DATE + (%s)::int)', v_ref ->> 'expr', v_ref ->> 'expr', v_val)
        WHEN 'before_today' THEN format('%s < CURRENT_DATE', v_ref ->> 'expr')
        WHEN 'after_today'  THEN format('%s > CURRENT_DATE', v_ref ->> 'expr')
        ELSE NULL END;
      IF v_pred IS NULL THEN RAISE EXCEPTION 'AIQ: unknown filter op "%"', v_op; END IF;
      v_where := v_where || v_pred;
      v_explain_f := v_explain_f || (lower(v_ref ->> 'label') || ' ' || replace(v_op, '_', ' ')
                     || COALESCE(' ' || CASE WHEN jsonb_typeof(v_item -> 'value') = 'array'
                                             THEN (SELECT string_agg(x, ', ') FROM jsonb_array_elements_text(v_item -> 'value') x)
                                             ELSE v_item ->> 'value' END, ''));
    END LOOP;
  END IF;

  IF COALESCE(p_spec ->> 'project_id', '') <> '' THEN
    IF (p_spec ->> 'project_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'AIQ: project_id must be a project id (uuid)';
    END IF;
    v_where := v_where || 't.project_id = ($1->>''project_id'')::uuid'::text;   -- ::text: an untyped literal is read as an array
    v_explain_f := v_explain_f || 'current project only'::text;
  END IF;

  -- v1294: the projects this conversation may use (set by agent-run from ai_project_scope).
  -- An empty list means no project is allowed, so nothing is returned (fails closed).
  IF jsonb_typeof(p_spec -> 'project_ids') = 'array' THEN
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_spec -> 'project_ids') x
                WHERE x !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
      RAISE EXCEPTION 'AIQ: project_ids must be project ids (uuid)';
    END IF;
    v_where := v_where || 't.project_id = ANY (ARRAY(SELECT jsonb_array_elements_text($1->''project_ids''))::uuid[])'::text;
    IF COALESCE(p_spec ->> 'project_id', '') = '' THEN
      v_explain_f := v_explain_f || (CASE WHEN jsonb_array_length(p_spec -> 'project_ids') = 1 THEN 'current project only'
                                          ELSE 'your projects only' END)::text;
    END IF;
  END IF;

  -- v1295: drill-down — the records behind one grouped row. "drill" holds that row's group
  -- values ({"project_name": "…", "level": "high"}); they are matched exactly as results print
  -- them (to_jsonb), every original filter and project limit still applies, and the rows come
  -- back as records. Aggregates, having and the grouped sort are ignored.
  IF jsonb_typeof(p_spec -> 'drill') = 'object' THEN
    v_drill := TRUE;
    v_grouped := FALSE;
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_spec -> 'group_by', '[]'::jsonb)) LOOP
      v_ref := public.ai_query_ref(p_schema, v_entity, v_item #>> '{}');
      IF NOT COALESCE((v_ref ->> 'groupable')::boolean, FALSE) THEN
        RAISE EXCEPTION 'AIQ: "%" cannot be used to group results', v_item #>> '{}';
      END IF;
      IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
      v_where := v_where || format(
        'CASE WHEN COALESCE(jsonb_typeof($1->''drill''->%L), ''null'') = ''null'' THEN (%s) IS NULL ELSE to_jsonb(%s) = $1->''drill''->%L END',
        v_ref ->> 'key', v_ref ->> 'expr', v_ref ->> 'expr', v_ref ->> 'key');
      v_explain_f := v_explain_f || (lower(v_ref ->> 'label') || ' is ' || COALESCE(p_spec -> 'drill' ->> (v_ref ->> 'key'), 'blank'));
    END LOOP;
  END IF;

  -- Select list --------------------------------------------------------------
  IF v_grouped THEN
    IF jsonb_typeof(p_spec -> 'group_by') = 'array' THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'group_by') LOOP
        v_ref := public.ai_query_ref(p_schema, v_entity, v_item #>> '{}');
        IF NOT COALESCE((v_ref ->> 'groupable')::boolean, FALSE) THEN
          RAISE EXCEPTION 'AIQ: "%" cannot be used to group results', v_item #>> '{}';
        END IF;
        IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
        v_select := v_select || format('%s AS %I', v_ref ->> 'expr', v_ref ->> 'key');
        v_group  := v_group || (v_ref ->> 'expr');
        v_keys   := v_keys || jsonb_build_object(v_ref ->> 'key', v_ref ->> 'expr');
        v_columns := v_columns || jsonb_build_object('key', v_ref ->> 'key', 'label', v_ref ->> 'label', 'type', v_ref ->> 'type');
        v_explain_g := v_explain_g || lower(v_ref ->> 'label');
      END LOOP;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'aggregates') LOOP
      v_fn := lower(COALESCE(v_item ->> 'fn', ''));
      IF v_fn NOT IN ('count', 'count_distinct', 'sum', 'avg', 'min', 'max') THEN
        RAISE EXCEPTION 'AIQ: unknown aggregate "%" (use count, count_distinct, sum, avg, min, max)', v_fn;
      END IF;
      IF COALESCE(v_item ->> 'field', '') = '' THEN
        IF v_fn <> 'count' THEN RAISE EXCEPTION 'AIQ: aggregate "%" needs a field', v_fn; END IF;
        v_agg := 'COUNT(*)';
        v_label := 'Count';
        v_ref := jsonb_build_object('type', 'number', 'key', 'rows');
      ELSE
        v_ref := public.ai_query_ref(p_schema, v_entity, v_item ->> 'field');
        IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
        IF v_fn IN ('sum', 'avg') AND ((v_ref ->> 'type') <> 'number' OR NOT COALESCE((v_ref ->> 'summable')::boolean, FALSE)) THEN
          RAISE EXCEPTION 'AIQ: "%" cannot be summed or averaged', v_item ->> 'field';
        END IF;
        IF v_fn IN ('min', 'max') AND (v_ref ->> 'type') NOT IN ('number', 'date', 'datetime') THEN
          RAISE EXCEPTION 'AIQ: min/max need a number or date field, not "%"', v_item ->> 'field';
        END IF;
        v_agg := CASE v_fn WHEN 'count' THEN format('COUNT(%s)', v_ref ->> 'expr')
                           WHEN 'count_distinct' THEN format('COUNT(DISTINCT %s)', v_ref ->> 'expr')
                           WHEN 'avg' THEN format('ROUND(AVG(%s)::numeric, 2)', v_ref ->> 'expr')
                           ELSE format('%s(%s)', upper(v_fn), v_ref ->> 'expr') END;
        v_label := initcap(replace(v_fn, '_', ' ')) || ' of ' || lower(v_ref ->> 'label');
      END IF;
      v_alias := COALESCE(NULLIF(v_item ->> 'alias', ''), v_fn || '_' || (v_ref ->> 'key'));
      IF v_alias !~ '^[a-z][a-z0-9_]{0,62}$' THEN RAISE EXCEPTION 'AIQ: aggregate alias "%" must be lower_snake_case', v_alias; END IF;
      IF v_keys ? v_alias THEN RAISE EXCEPTION 'AIQ: duplicate column name "%"', v_alias; END IF;
      v_select := v_select || format('%s AS %I', v_agg, v_alias);
      v_keys := v_keys || jsonb_build_object(v_alias, v_agg);
      v_columns := v_columns || jsonb_build_object('key', v_alias, 'label', v_label,
                     'type', CASE WHEN v_fn IN ('count', 'count_distinct') THEN 'number' ELSE v_ref ->> 'type' END, 'aggregate', TRUE);
      v_explain_a := v_explain_a || lower(v_label);
    END LOOP;

    IF jsonb_typeof(p_spec -> 'having') = 'array' THEN
      v_i := -1;
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'having') LOOP
        v_i := v_i + 1;
        IF NOT (v_keys ? (v_item ->> 'aggregate')) THEN
          RAISE EXCEPTION 'AIQ: having must name an aggregate alias, not "%"', v_item ->> 'aggregate';
        END IF;
        v_op := lower(COALESCE(v_item ->> 'op', 'gt'));
        IF v_op NOT IN ('eq', 'neq', 'gt', 'gte', 'lt', 'lte') THEN RAISE EXCEPTION 'AIQ: unknown having op "%"', v_op; END IF;
        v_having := v_having || format('%s %s ($1->''having''->%s->>''value'')::numeric', v_keys ->> (v_item ->> 'aggregate'),
          CASE v_op WHEN 'eq' THEN '=' WHEN 'neq' THEN '<>' WHEN 'gt' THEN '>' WHEN 'gte' THEN '>=' WHEN 'lt' THEN '<' ELSE '<=' END, v_i);
        v_explain_f := v_explain_f || ((v_item ->> 'aggregate') || ' ' || v_op || ' ' || (v_item ->> 'value'));
      END LOOP;
    END IF;
  ELSE
    -- Row mode: requested fields, or the catalogue defaults; plus hidden id / project_id / display id for links.
    IF jsonb_typeof(p_spec -> 'fields') = 'array' AND jsonb_array_length(p_spec -> 'fields') > 0 THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'fields') LOOP
        v_ref := public.ai_query_ref(p_schema, v_entity, v_item #>> '{}');
        IF v_keys ? (v_ref ->> 'key') THEN CONTINUE; END IF;
        IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
        v_select := v_select || format('%s AS %I', v_ref ->> 'expr', v_ref ->> 'key');
        v_keys := v_keys || jsonb_build_object(v_ref ->> 'key', v_ref ->> 'expr');
        v_columns := v_columns || jsonb_build_object('key', v_ref ->> 'key', 'label', v_ref ->> 'label', 'type', v_ref ->> 'type');
      END LOOP;
    ELSE
      FOR v_item IN SELECT f FROM jsonb_array_elements(v_entity -> 'fields') f WHERE (f ->> 'is_default')::boolean LOOP
        v_select := v_select || format('t.%I AS %I', v_item ->> 'field_key', v_item ->> 'field_key');
        v_keys := v_keys || jsonb_build_object(v_item ->> 'field_key', 't.' || quote_ident(v_item ->> 'field_key'));
        v_columns := v_columns || jsonb_build_object('key', v_item ->> 'field_key', 'label', v_item ->> 'label', 'type', v_item ->> 'data_type');
      END LOOP;
    END IF;
    v_select := v_select || 't.id AS "__id"'::text || 't.project_id AS "__project_id"'::text;
    IF COALESCE(v_entity ->> 'display_id_field', '') <> '' THEN
      v_select := v_select || format('t.%I AS "__display_id"', v_entity ->> 'display_id_field');
    END IF;
  END IF;

  -- Sort -----------------------------------------------------------------------
  IF jsonb_typeof(p_spec -> 'sort') = 'array' AND NOT v_drill THEN   -- v1295: grouped sort does not apply to drill rows
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_spec -> 'sort') LOOP
      v_dir := CASE WHEN lower(COALESCE(v_item ->> 'dir', 'asc')) = 'desc' THEN 'DESC' ELSE 'ASC' END;
      IF v_keys ? (v_item ->> 'field') THEN
        v_order := v_order || format('%s %s NULLS LAST', v_keys ->> (v_item ->> 'field'), v_dir);
        v_explain_s := v_explain_s || ((v_item ->> 'field') || ' ' || lower(v_dir));
      ELSIF v_grouped THEN
        RAISE EXCEPTION 'AIQ: grouped results can only be sorted by a group field or aggregate alias, not "%"', v_item ->> 'field';
      ELSE
        v_ref := public.ai_query_ref(p_schema, v_entity, v_item ->> 'field');
        IF v_ref ? 'join_alias' THEN v_joins := v_joins || jsonb_build_object(v_ref ->> 'join_alias', v_ref ->> 'join_sql'); END IF;
        v_order := v_order || format('%s %s NULLS LAST', v_ref ->> 'expr', v_dir);
        v_explain_s := v_explain_s || (lower(v_ref ->> 'label') || ' ' || lower(v_dir));
      END IF;
    END LOOP;
  END IF;
  IF cardinality(v_order) = 0 THEN
    -- Default (rule 40.1): alphabetical on the display field, then oldest first.
    IF v_grouped THEN
      v_order := ARRAY[CASE WHEN cardinality(v_group) > 0 THEN v_group[1] || ' ASC NULLS LAST' ELSE '1' END];
    ELSE
      v_order := ARRAY[format('lower(t.%I::text) ASC NULLS LAST', v_entity ->> 'display_field')];
    END IF;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE((p_spec ->> 'limit')::int, 50), 1), COALESCE(v_settings.query_row_cap, 500));

  -- Build and run -----------------------------------------------------------------
  v_from := format('%I.%I t', p_schema, v_entity ->> 'view_name')
            || COALESCE((SELECT string_agg(value, '' ORDER BY key) FROM jsonb_each_text(v_joins)), '');
  v_sql := format('SELECT %s, row_number() OVER (ORDER BY %s) AS "__rn" FROM %s%s%s%s',
    array_to_string(v_select, ', '), array_to_string(v_order, ', '), v_from,
    CASE WHEN cardinality(v_where) > 0 THEN ' WHERE ' || array_to_string(v_where, ' AND ') ELSE '' END,
    CASE WHEN cardinality(v_group) > 0 THEN ' GROUP BY ' || array_to_string(v_group, ', ') ELSE '' END,
    CASE WHEN cardinality(v_having) > 0 THEN ' HAVING ' || array_to_string(v_having, ' AND ') ELSE '' END);

  EXECUTE format('SELECT COUNT(*) FROM (%s) c', v_sql) INTO v_total USING p_spec;
  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(q) - ''__rn'' ORDER BY q."__rn"), ''[]''::jsonb) FROM (%s ORDER BY %s LIMIT %s) q',
                 v_sql, array_to_string(v_order, ', '), v_limit)
     INTO v_rows USING p_spec;

  RETURN jsonb_build_object(
    'entity',           v_entity ->> 'entity_key',
    'entity_label',     v_entity ->> 'label',
    'entity_singular',  v_entity ->> 'label_singular',
    'route_template',   v_entity ->> 'route_template',
    'list_route',       v_entity ->> 'list_route',          -- v1295: the register's list page
    'display_field',    v_entity ->> 'display_field',
    'mode',             CASE WHEN v_grouped THEN 'grouped' ELSE 'rows' END,
    'columns',          v_columns,
    'rows',             v_rows,
    'row_count',        jsonb_array_length(v_rows),
    'total_count',      v_total,
    'truncated',        v_total > jsonb_array_length(v_rows),
    'limit',            v_limit,
    'explanation',      (v_entity ->> 'label')
                        || CASE WHEN cardinality(v_explain_f) > 0 THEN ' where ' || array_to_string(v_explain_f, '; ') ELSE '' END
                        || CASE WHEN cardinality(v_explain_g) > 0 THEN ', grouped by ' || array_to_string(v_explain_g, ', ') ELSE '' END
                        || CASE WHEN cardinality(v_explain_a) > 0 THEN ', showing ' || array_to_string(v_explain_a, ', ') ELSE '' END
                        || CASE WHEN cardinality(v_explain_s) > 0 THEN ', sorted by ' || array_to_string(v_explain_s, ', ') ELSE '' END,
    'spec',             p_spec
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_run_query_in(TEXT, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1295_ai_result_drilldown.sql completed — run v1295_ai_result_drilldown_tests.sql'; END $$;
