-- ============================================================================
-- v1279: Customisable highlight report layouts + Status Report agent support
-- PRD D12, D12a, stories 25–27c; plan SQL #8.
--
--   * New template domain 'report_layout' in the existing tiered template library
--     (pm_template_nodes / pm_template_entity_assignment, public + sim).
--   * public|sim.report_layouts — the layout content of a 'report_layout' template node:
--     sections (built-in or custom), order, enabled/optional, AI drafting instruction, and the
--     PMO switch allow_project_adjust.
--   * public.report_layout_defaults — the built-in default layout used when an organisation has
--     not made one (configuration data; Admin/PMO can override by creating a layout).
--   * public|sim.ai_resolve_report_layout(project_id) — nearest layout for a project:
--       1. a layout assigned to the project (pm_template_entity_assignment — this is also how a
--          programme layout is applied to its projects), else
--       2. a project-tier layout scoped to the project, else
--       3. the organisation's newest published PMO-tier layout, else
--       4. the built-in default.
--   * highlight_reports: layout_node_id, custom_values, ai_provenance, ai_proposed_rag, ai_drafted_at
--     sim.practice_highlight_reports: layout_node_id, ai_provenance, ai_proposed_rag, ai_drafted_at
--
-- Prerequisites: v406/v785 (template library), v222/v236 (highlight reports), v1272. Idempotent.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new tables, CLAUDE.md rule 6).
-- ============================================================================

-- ── 1. Template domain ──────────────────────────────────────────────────────
ALTER TABLE public.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_pm_template_nodes_domain;
ALTER TABLE public.pm_template_nodes ADD CONSTRAINT chk_pm_template_nodes_domain CHECK (
  domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template', 'legacy_document', 'structured_list',
             'portfolio_template', 'programme_template', 'project_template', 'report_layout'));

ALTER TABLE public.pm_template_entity_assignment DROP CONSTRAINT IF EXISTS chk_pm_template_entity_assignment_domain;
ALTER TABLE public.pm_template_entity_assignment ADD CONSTRAINT chk_pm_template_entity_assignment_domain CHECK (
  domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template', 'legacy_document', 'structured_list',
             'portfolio_template', 'programme_template', 'project_template', 'report_layout'));

ALTER TABLE sim.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_sim_pm_template_nodes_domain;
ALTER TABLE sim.pm_template_nodes ADD CONSTRAINT chk_sim_pm_template_nodes_domain CHECK (
  domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template', 'legacy_document', 'structured_list',
             'portfolio_template', 'programme_template', 'project_template', 'report_layout'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'sim'
              AND table_name = 'pm_template_entity_assignment' AND constraint_name = 'chk_sim_pm_template_entity_assignment_domain') THEN
    ALTER TABLE sim.pm_template_entity_assignment DROP CONSTRAINT chk_sim_pm_template_entity_assignment_domain;
  END IF;
  IF to_regclass('sim.pm_template_entity_assignment') IS NOT NULL THEN
    ALTER TABLE sim.pm_template_entity_assignment ADD CONSTRAINT chk_sim_pm_template_entity_assignment_domain CHECK (
      domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template', 'legacy_document', 'structured_list',
                 'portfolio_template', 'programme_template', 'project_template', 'report_layout'));
  END IF;
END $$;

-- ── 2. Layout content ───────────────────────────────────────────────────────
-- layout = { "sections": [ { "key", "title", "kind": "builtin"|"custom", "column"?, "enabled", "optional",
--                             "instruction", "field_type": "text" } ] }
DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$I.report_layouts (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        node_id               UUID NOT NULL UNIQUE REFERENCES %1$I.pm_template_nodes(id) ON DELETE CASCADE,
        account_id            UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
        report_type           TEXT NOT NULL DEFAULT 'highlight' CHECK (report_type IN ('highlight')),
        layout                JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
        allow_project_adjust  BOOLEAN NOT NULL DEFAULT TRUE,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by            UUID,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by            UUID,
        CONSTRAINT report_layouts_sections_array CHECK (jsonb_typeof(layout -> 'sections') = 'array')
      )$f$, s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_report_layouts_account ON %1$I.report_layouts (account_id)', s);
    EXECUTE format('ALTER TABLE %1$I.report_layouts ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %1$I.report_layouts TO authenticated', s);
    EXECUTE format('GRANT ALL ON %1$I.report_layouts TO service_role', s);
  END LOOP;
END $$;

-- Who may edit a layout: PMO Admin / Account Owner for organisation (pmo/portfolio/programme)
-- layouts; for a project-tier layout also anyone with access to that project, but only when the
-- organisation's PMO layout allows projects to adjust (D12a).
CREATE OR REPLACE FUNCTION public.ai_can_edit_report_layout(p_schema TEXT, p_node_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_node RECORD;
  v_allow BOOLEAN;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RETURN FALSE; END IF;
  EXECUTE format('SELECT id, account_id, tier, scope_entity_type, scope_entity_id FROM %I.pm_template_nodes WHERE id = $1', p_schema)
    INTO v_node USING p_node_id;
  IF v_node.id IS NULL THEN RETURN FALSE; END IF;
  IF public.is_pmo_admin_or_owner_for_account(v_node.account_id) THEN RETURN TRUE; END IF;
  IF v_node.tier <> 'project' OR v_node.scope_entity_type IS DISTINCT FROM 'project' THEN RETURN FALSE; END IF;
  EXECUTE format($q$
    SELECT COALESCE(bool_or(rl.allow_project_adjust), TRUE)
      FROM %I.report_layouts rl JOIN %I.pm_template_nodes n ON n.id = rl.node_id
     WHERE n.account_id = $1 AND n.tier = 'pmo' AND n.domain = 'report_layout' AND n.status = 'published'$q$, p_schema, p_schema)
    INTO v_allow USING v_node.account_id;
  IF NOT COALESCE(v_allow, TRUE) THEN RETURN FALSE; END IF;
  IF p_schema = 'public' THEN RETURN public.auth_user_can_access_project(v_node.scope_entity_id); END IF;
  RETURN EXISTS (SELECT 1 FROM sim.practice_projects p WHERE p.id = v_node.scope_entity_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.ai_can_edit_report_layout(TEXT, UUID) TO authenticated;

DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS report_layouts_select ON %1$I.report_layouts', s);
    EXECUTE format('CREATE POLICY report_layouts_select ON %1$I.report_layouts FOR SELECT TO authenticated USING (public.auth_user_can_access_account(account_id))', s);
    EXECUTE format('DROP POLICY IF EXISTS report_layouts_write ON %1$I.report_layouts', s);
    EXECUTE format('CREATE POLICY report_layouts_write ON %1$I.report_layouts FOR ALL TO authenticated USING (public.ai_can_edit_report_layout(%2$L, node_id)) WITH CHECK (public.ai_can_edit_report_layout(%2$L, node_id))', s, s);
  END LOOP;
END $$;

-- Built-in default layout (configuration, editable later; a published PMO layout replaces it).
CREATE TABLE IF NOT EXISTS public.report_layout_defaults (
  report_type  TEXT PRIMARY KEY,
  layout       JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.report_layout_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_layout_defaults_read ON public.report_layout_defaults;
CREATE POLICY report_layout_defaults_read ON public.report_layout_defaults FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.report_layout_defaults TO authenticated;
GRANT ALL ON public.report_layout_defaults TO service_role;

INSERT INTO public.report_layout_defaults (report_type, layout) VALUES ('highlight', '{
  "sections": [
    {"key": "executive_summary", "title": "Summary of the period", "kind": "builtin", "column": "executive_summary", "enabled": true, "optional": false,
     "instruction": "Two to four sentences on overall progress, the main achievements and the biggest concern."},
    {"key": "completed_this_period", "title": "Work completed this period", "kind": "builtin", "column": "completed_this_period", "enabled": true, "optional": false,
     "instruction": "Bullet list of tasks and milestones finished in the period."},
    {"key": "planned_next_period", "title": "Work planned for next period", "kind": "builtin", "column": "planned_next_period", "enabled": true, "optional": false,
     "instruction": "Bullet list of the main tasks and milestones due in the next period."},
    {"key": "schedule_status", "title": "Schedule", "kind": "builtin", "column": "schedule_status", "enabled": true, "optional": false,
     "instruction": "Where the schedule stands against the baseline, naming late critical tasks."},
    {"key": "budget_status", "title": "Budget", "kind": "builtin", "column": "budget_status", "enabled": true, "optional": false,
     "instruction": "Spend against budget and forecast, with the main variance."},
    {"key": "risks_summary", "title": "Risks needing attention", "kind": "builtin", "column": "risks_summary", "enabled": true, "optional": false,
     "instruction": "The highest open risks and what is being done about them."},
    {"key": "issues_summary", "title": "Issues needing attention", "kind": "builtin", "column": "issues_summary", "enabled": true, "optional": false,
     "instruction": "Open issues that need action or escalation."},
    {"key": "changes_summary", "title": "Changes", "kind": "builtin", "column": "changes_summary", "enabled": true, "optional": true,
     "instruction": "Change requests raised or decided in the period."},
    {"key": "decisions_required", "title": "Decisions needed", "kind": "builtin", "column": "decisions_required", "enabled": true, "optional": true,
     "instruction": "Decisions the board or sponsor needs to make, if any."},
    {"key": "recommendations", "title": "Recommendations", "kind": "builtin", "column": "recommendations", "enabled": false, "optional": true,
     "instruction": "Recommended next steps for the board."}
  ]
}'::jsonb)
ON CONFLICT (report_type) DO NOTHING;

-- ── 3. Report columns ───────────────────────────────────────────────────────
ALTER TABLE public.highlight_reports
  ADD COLUMN IF NOT EXISTS layout_node_id UUID,
  ADD COLUMN IF NOT EXISTS custom_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_provenance JSONB,
  ADD COLUMN IF NOT EXISTS ai_proposed_rag JSONB,
  ADD COLUMN IF NOT EXISTS ai_drafted_at TIMESTAMPTZ;
ALTER TABLE sim.practice_highlight_reports
  ADD COLUMN IF NOT EXISTS layout_node_id UUID,
  ADD COLUMN IF NOT EXISTS ai_provenance JSONB,
  ADD COLUMN IF NOT EXISTS ai_proposed_rag JSONB,
  ADD COLUMN IF NOT EXISTS ai_drafted_at TIMESTAMPTZ;
COMMENT ON COLUMN public.highlight_reports.custom_values IS 'v1272 D12a: values of custom layout sections, keyed by section key.';
COMMENT ON COLUMN public.highlight_reports.ai_provenance IS 'v1272 story 26: section key → source records [{entity, id, ref}] the AI draft used.';

-- ── 4. Layout resolution ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_resolve_report_layout_in(p_schema TEXT, p_project_id UUID, p_report_type TEXT DEFAULT 'highlight')
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_account UUID;
  v_row     JSONB;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RETURN NULL; END IF;
  IF p_schema = 'public' THEN
    IF NOT public.auth_user_can_access_project(p_project_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
    SELECT account_id INTO v_account FROM public.projects WHERE id = p_project_id;
  ELSE
    v_account := public.auth_user_current_account_id();
  END IF;

  EXECUTE format($q$
    SELECT jsonb_build_object('node_id', n.id, 'tier', n.tier, 'name', n.name, 'layout', rl.layout,
                              'allow_project_adjust', rl.allow_project_adjust, 'source', src)
      FROM (
        SELECT a.node_id, 1 AS prio, 'assigned' AS src FROM %1$I.pm_template_entity_assignment a
         WHERE a.entity_type = 'project' AND a.entity_id = $1 AND a.domain = 'report_layout'
        UNION ALL
        SELECT n2.id, 2, 'project' FROM %1$I.pm_template_nodes n2
         WHERE n2.domain = 'report_layout' AND n2.tier = 'project' AND n2.scope_entity_type = 'project' AND n2.scope_entity_id = $1
           AND COALESCE(n2.is_current, TRUE)
        UNION ALL
        SELECT n3.id, 3, 'organisation' FROM %1$I.pm_template_nodes n3
         WHERE n3.domain = 'report_layout' AND n3.tier = 'pmo' AND n3.account_id = $2 AND n3.status = 'published'
           AND COALESCE(n3.is_current, TRUE)
      ) c
      JOIN %1$I.pm_template_nodes n ON n.id = c.node_id
      JOIN %1$I.report_layouts rl ON rl.node_id = n.id AND rl.report_type = $3
     ORDER BY c.prio, n.updated_at DESC
     LIMIT 1$q$, p_schema)
    INTO v_row USING p_project_id, v_account, p_report_type;

  IF v_row IS NULL THEN
    SELECT jsonb_build_object('node_id', NULL, 'tier', 'default', 'name', 'Standard highlight report', 'layout', d.layout,
                              'allow_project_adjust', TRUE, 'source', 'default')
      INTO v_row FROM public.report_layout_defaults d WHERE d.report_type = p_report_type;
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_resolve_report_layout(p_project_id UUID, p_report_type TEXT DEFAULT 'highlight') RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT public.ai_resolve_report_layout_in('public', p_project_id, p_report_type); $$;
CREATE OR REPLACE FUNCTION sim.ai_resolve_report_layout(p_project_id UUID, p_report_type TEXT DEFAULT 'highlight') RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public AS $$ SELECT public.ai_resolve_report_layout_in('sim', p_project_id, p_report_type); $$;
GRANT EXECUTE ON FUNCTION public.ai_resolve_report_layout_in(TEXT, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_resolve_report_layout(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.ai_resolve_report_layout(UUID, TEXT) TO authenticated, service_role;

-- ── 5. Layout editor RPCs (D12a; one place for the permission rules) ───────
CREATE OR REPLACE FUNCTION public.ai_list_report_layouts_in(p_schema TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE v_account UUID := public.auth_user_current_account_id(); v JSONB;
BEGIN
  IF p_schema NOT IN ('public', 'sim') OR v_account IS NULL OR NOT public.auth_user_can_access_account(v_account) THEN
    RETURN '[]'::jsonb;
  END IF;
  EXECUTE format($q$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'node_id', n.id, 'name', n.name, 'description', n.description, 'tier', n.tier, 'status', n.status,
             'project_id', CASE WHEN n.scope_entity_type = 'project' THEN n.scope_entity_id END,
             'layout', rl.layout, 'allow_project_adjust', rl.allow_project_adjust,
             'created_at', rl.created_at, 'updated_at', rl.updated_at,
             'can_edit', public.ai_can_edit_report_layout(%1$L, n.id))
           ORDER BY lower(n.name), n.created_at), '[]'::jsonb)
      FROM %1$I.pm_template_nodes n JOIN %1$I.report_layouts rl ON rl.node_id = n.id
     WHERE n.domain = 'report_layout' AND n.account_id = $1 AND COALESCE(n.is_current, TRUE)$q$, p_schema)
    INTO v USING v_account;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_save_report_layout_in(
  p_schema TEXT, p_node_id UUID, p_name TEXT, p_tier TEXT, p_project_id UUID, p_layout JSONB,
  p_allow_project_adjust BOOLEAN, p_status TEXT, p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_account UUID := public.auth_user_current_account_id();
  v_user    UUID := public.current_internal_user_id();
  v_node    UUID := p_node_id;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema'; END IF;
  IF COALESCE(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'A layout name is required'; END IF;
  IF p_tier NOT IN ('pmo', 'project') THEN RAISE EXCEPTION 'Layouts are organisation (pmo) or project layouts'; END IF;
  IF p_status NOT IN ('draft', 'published') THEN RAISE EXCEPTION 'Status must be draft or published'; END IF;
  IF jsonb_typeof(p_layout -> 'sections') <> 'array' OR jsonb_array_length(p_layout -> 'sections') = 0 THEN
    RAISE EXCEPTION 'A layout needs at least one section';
  END IF;
  IF p_tier = 'project' AND p_project_id IS NULL THEN RAISE EXCEPTION 'Choose the project this layout is for'; END IF;

  IF v_node IS NULL THEN
    -- New layout: organisation layouts need PMO Admin / Account Owner; project layouts need project
    -- access and an organisation layout that allows projects to adjust.
    IF p_tier = 'pmo' AND NOT public.is_pmo_admin_or_owner_for_account(v_account) THEN
      RAISE EXCEPTION 'Only the Account Owner or a PMO Admin can create organisation layouts' USING ERRCODE = '42501';
    END IF;
    EXECUTE format($q$INSERT INTO %I.pm_template_nodes (account_id, tier, domain, name, description, status, scope_entity_type, scope_entity_id, created_by)
                     VALUES ($1, $2, 'report_layout', $3, $4, $5, $6, $7, $8) RETURNING id$q$, p_schema)
      INTO v_node USING v_account, p_tier, btrim(p_name), p_description, p_status,
                        CASE WHEN p_tier = 'project' THEN 'project' END, CASE WHEN p_tier = 'project' THEN p_project_id END, v_user;
    IF NOT public.ai_can_edit_report_layout(p_schema, v_node) THEN
      RAISE EXCEPTION 'You cannot create a layout for this project' USING ERRCODE = '42501';
    END IF;
    EXECUTE format('INSERT INTO %I.report_layouts (node_id, account_id, layout, allow_project_adjust, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $5)', p_schema)
      USING v_node, v_account, p_layout, COALESCE(p_allow_project_adjust, TRUE), v_user;
  ELSE
    IF NOT public.ai_can_edit_report_layout(p_schema, v_node) THEN
      RAISE EXCEPTION 'You cannot change this layout' USING ERRCODE = '42501';
    END IF;
    EXECUTE format('UPDATE %I.pm_template_nodes SET name = $2, description = $3, status = $4, updated_at = NOW() WHERE id = $1 AND domain = ''report_layout''', p_schema)
      USING v_node, btrim(p_name), p_description, p_status;
    EXECUTE format('UPDATE %I.report_layouts SET layout = $2, allow_project_adjust = $3, updated_at = NOW(), updated_by = $4 WHERE node_id = $1', p_schema)
      USING v_node, p_layout, COALESCE(p_allow_project_adjust, TRUE), v_user;
  END IF;
  RETURN jsonb_build_object('node_id', v_node, 'name', btrim(p_name));
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_delete_report_layout_in(p_schema TEXT, p_node_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF p_schema NOT IN ('public', 'sim') OR NOT public.ai_can_edit_report_layout(p_schema, p_node_id) THEN
    RAISE EXCEPTION 'You cannot delete this layout' USING ERRCODE = '42501';
  END IF;
  EXECUTE format('DELETE FROM %I.pm_template_nodes WHERE id = $1 AND domain = ''report_layout''', p_schema) USING p_node_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_list_report_layouts() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT public.ai_list_report_layouts_in('public'); $$;
CREATE OR REPLACE FUNCTION sim.ai_list_report_layouts() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public AS $$ SELECT public.ai_list_report_layouts_in('sim'); $$;
CREATE OR REPLACE FUNCTION public.ai_save_report_layout(p_node_id UUID, p_name TEXT, p_tier TEXT, p_project_id UUID, p_layout JSONB,
  p_allow_project_adjust BOOLEAN, p_status TEXT, p_description TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT public.ai_save_report_layout_in('public', p_node_id, p_name, p_tier, p_project_id, p_layout, p_allow_project_adjust, p_status, p_description); $$;
CREATE OR REPLACE FUNCTION sim.ai_save_report_layout(p_node_id UUID, p_name TEXT, p_tier TEXT, p_project_id UUID, p_layout JSONB,
  p_allow_project_adjust BOOLEAN, p_status TEXT, p_description TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE sql SECURITY INVOKER SET search_path = sim, public
AS $$ SELECT public.ai_save_report_layout_in('sim', p_node_id, p_name, p_tier, p_project_id, p_layout, p_allow_project_adjust, p_status, p_description); $$;
CREATE OR REPLACE FUNCTION public.ai_delete_report_layout(p_node_id UUID) RETURNS VOID
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT public.ai_delete_report_layout_in('public', p_node_id); $$;
CREATE OR REPLACE FUNCTION sim.ai_delete_report_layout(p_node_id UUID) RETURNS VOID
LANGUAGE sql SECURITY INVOKER SET search_path = sim, public AS $$ SELECT public.ai_delete_report_layout_in('sim', p_node_id); $$;

GRANT EXECUTE ON FUNCTION public.ai_list_report_layouts_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_save_report_layout_in(TEXT, UUID, TEXT, TEXT, UUID, JSONB, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_delete_report_layout_in(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_list_report_layouts() TO authenticated;
GRANT EXECUTE ON FUNCTION sim.ai_list_report_layouts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_save_report_layout(UUID, TEXT, TEXT, UUID, JSONB, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.ai_save_report_layout(UUID, TEXT, TEXT, UUID, JSONB, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_delete_report_layout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.ai_delete_report_layout(UUID) TO authenticated;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('report_layouts',        'Customisable report layouts (sections, order, AI instructions) for the template library (v1279)', false, true),
  ('sim.report_layouts',     'Simulator customisable report layouts (v1279)', false, true),
  ('report_layout_defaults', 'Built-in default report layouts used when an organisation has none (v1279)', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1279_highlight_report_layouts.sql completed — re-run SQL/v1251_planner_table_wall.sql'; END $$;
