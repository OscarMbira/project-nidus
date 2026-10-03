-- =============================================================================
-- v968: Seed Data — Reports group (Core PM sidebar): Custom Metrics, Report
--       Builder templates, Analytics Dashboards (+ widgets), KPI Definitions
--       (+ values). All five underlying tables were 0 rows system-wide.
-- Tables: public.custom_metrics (v689), public.report_templates (v33),
--         public.analytics_dashboards / public.analytics_widgets (v28),
--         public.kpi_definitions (v34), public.kpi_values (v28).
-- Scope: these tables are user/account-owned config, not project-scoped rows in
--        the RAID-register sense — report_templates/analytics_dashboards/
--        custom_metrics/kpi_definitions are seeded as shared (is_public/
--        is_shared = true) content owned by a seed user; kpi_values carries
--        context_project_id pointing at 3 anchor projects (SEED-PP-01/02/03).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: none of these tables have an admin display-id trigger wired —
--   report_templates.template_name / custom_metrics.metric_name / kpi_definitions
--   .kpi_code are plain hand-assigned fields (no ID Generation rule registered
--   for these tables), consistent with their existing (non-seed) schema.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1
  v_user_id  UUID;
  v_auth_uid UUID;

  v_dash1 UUID := '96800001-da01-4a01-9c01-534433340001';
  v_dash2 UUID := '96800001-da01-4a01-9c01-534433340002';

  v_kpi1 UUID := '96800001-3a01-4a01-9c01-534433340001';
  v_kpi2 UUID := '96800001-3a01-4a01-9c01-534433340002';
  v_kpi3 UUID := '96800001-3a01-4a01-9c01-534433340003';
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_erp IS NULL THEN
    RAISE NOTICE 'v968: One or more anchor seed projects (SEED-PP-01/02/03) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v968: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- CUSTOM METRICS (public.custom_metrics) — 3 shared metric formulas
  -- ---------------------------------------------------------------------------
  INSERT INTO public.custom_metrics (
    id, metric_name, formula, unit, description, is_shared, created_by_user_id,
    is_deleted, created_at, created_by
  ) VALUES
    ('96800002-c301-4a01-9c01-534433340001', 'Schedule Performance Index (SPI)',
     'EARNED_VALUE / PLANNED_VALUE', 'ratio',
     'Earned value divided by planned value; >1 means ahead of schedule, <1 means behind.',
     true, v_user_id, false, NOW() - INTERVAL '40 days', v_user_id),

    ('96800002-c301-4a01-9c01-534433340002', 'Cost Performance Index (CPI)',
     'EARNED_VALUE / ACTUAL_COST', 'ratio',
     'Earned value divided by actual cost; >1 means under budget, <1 means over budget.',
     true, v_user_id, false, NOW() - INTERVAL '40 days', v_user_id),

    ('96800002-c301-4a01-9c01-534433340003', 'Risk Exposure Score',
     'SUM(RISK_PROBABILITY * RISK_IMPACT)', 'score',
     'Sum of probability x impact across all open risks on the risk register, used as a rolled-up exposure indicator.',
     true, v_user_id, false, NOW() - INTERVAL '25 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- REPORT BUILDER TEMPLATES (public.report_templates) — 2 shared templates
  -- ---------------------------------------------------------------------------
  INSERT INTO public.report_templates (
    id, template_name, template_description,
    template_type, report_purpose, primary_data_source,
    chart_type, methodology, complexity_level,
    is_system_template, is_public, version, is_active, published_date,
    owner_user_id, notes, tags,
    is_deleted, created_at, created_by
  ) VALUES
    ('96800003-2701-4a01-9c01-534433340001', 'Project Status Summary',
     'One-page tabular summary of project status: RAG rating, milestone progress, budget variance, and open risk/issue counts.',
     'tabular', 'operational', 'projects',
     NULL, 'all', 'simple',
     false, true, '1.0', true, CURRENT_DATE - 30,
     v_user_id, 'Shared template for weekly project status packs.', ARRAY['status', 'weekly', 'summary'],
     false, NOW() - INTERVAL '30 days', v_user_id),

    ('96800003-2701-4a01-9c01-534433340002', 'Risk & Issue Trend Chart',
     'Line chart tracking open risk and issue counts over time, grouped by severity, for a single project.',
     'chart', 'tactical', 'risks',
     'line', 'all', 'intermediate',
     false, true, '1.0', true, CURRENT_DATE - 18,
     v_user_id, 'Useful for PMO monthly reporting packs.', ARRAY['risk', 'issue', 'trend'],
     false, NOW() - INTERVAL '18 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- ANALYTICS DASHBOARDS + WIDGETS (public.analytics_dashboards / _widgets)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.analytics_dashboards (
    id, dashboard_name, dashboard_description, dashboard_category, dashboard_type,
    layout_config, widgets_config, auto_refresh_enabled, is_public, is_active,
    is_deleted, created_at, created_by
  ) VALUES
    (v_dash1, 'Portfolio Delivery Overview', 'Cross-project delivery health: status, budget, and open risk counts.',
     'project', 'custom',
     '{"columns": 12, "rows": 6}'::jsonb, '[]'::jsonb, false, true, true,
     false, NOW() - INTERVAL '35 days', v_user_id),

    (v_dash2, 'Cost & Schedule Performance', 'SPI/CPI trend and expense burn-down across active projects.',
     'financial', 'custom',
     '{"columns": 12, "rows": 4}'::jsonb, '[]'::jsonb, false, true, true,
     false, NOW() - INTERVAL '20 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.analytics_widgets (
    id, dashboard_id, widget_name, widget_type, widget_title, widget_description,
    data_source_type, data_source_name, widget_config,
    position_x, position_y, width, height, display_order,
    is_deleted, created_at, created_by
  ) VALUES
    ('96800004-a201-4a01-9c01-534433340001', v_dash1, 'project_status_counts', 'chart', 'Projects by Status', 'Count of seed projects grouped by status.',
     'table', 'projects', '{"chartType": "pie"}'::jsonb, 0, 0, 6, 4, 1,
     false, NOW() - INTERVAL '35 days', v_user_id),

    ('96800004-a201-4a01-9c01-534433340002', v_dash1, 'open_risk_count', 'metric', 'Open Risks', 'Count of open risks across seed projects.',
     'table', 'risk_register', '{"format": "number"}'::jsonb, 6, 0, 3, 4, 2,
     false, NOW() - INTERVAL '35 days', v_user_id),

    ('96800004-a201-4a01-9c01-534433340003', v_dash2, 'spi_trend', 'chart', 'Schedule Performance Index Trend', 'SPI over the last 6 months.',
     'query', 'kpi_values', '{"chartType": "line"}'::jsonb, 0, 0, 6, 4, 1,
     false, NOW() - INTERVAL '20 days', v_user_id),

    ('96800004-a201-4a01-9c01-534433340004', v_dash2, 'cpi_trend', 'chart', 'Cost Performance Index Trend', 'CPI over the last 6 months.',
     'query', 'kpi_values', '{"chartType": "line"}'::jsonb, 6, 0, 6, 4, 2,
     false, NOW() - INTERVAL '20 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- KPI DEFINITIONS + VALUES (public.kpi_definitions / public.kpi_values)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.kpi_definitions (
    id, kpi_code, kpi_name, kpi_description, kpi_category,
    measurement_unit, measurement_frequency, data_source,
    calculation_method, aggregation_period, target_direction,
    green_threshold_min, yellow_threshold_min, red_threshold_max,
    display_format, decimal_places, preferred_chart_type,
    methodology, is_system_kpi, is_active, is_leading_indicator, owner_user_id,
    is_deleted, created_at, created_by
  ) VALUES
    (v_kpi1, 'SEED-KPI-SPI', 'Schedule Performance Index', 'Earned value / planned value.', 'schedule',
     'ratio', 'monthly', 'calculated',
     'ratio', 'month', 'higher-is-better',
     0.95, 0.85, 0.85,
     'number', 2, 'line',
     'all', false, true, true, v_user_id,
     false, NOW() - INTERVAL '40 days', v_user_id),

    (v_kpi2, 'SEED-KPI-CPI', 'Cost Performance Index', 'Earned value / actual cost.', 'cost',
     'ratio', 'monthly', 'calculated',
     'ratio', 'month', 'higher-is-better',
     0.95, 0.85, 0.85,
     'number', 2, 'line',
     'all', false, true, true, v_user_id,
     false, NOW() - INTERVAL '40 days', v_user_id),

    (v_kpi3, 'SEED-KPI-OPQ', 'On-Time Milestone %', 'Percentage of milestones delivered on or before their baseline date.', 'schedule',
     'percentage', 'monthly', 'calculated',
     'percentage', 'month', 'higher-is-better',
     90, 75, 75,
     'percentage', 0, 'gauge',
     'all', false, true, false, v_user_id,
     false, NOW() - INTERVAL '25 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.kpi_values (
    id, kpi_id, kpi_value, measurement_date, context_project_id,
    is_deleted, created_at, created_by
  ) VALUES
    ('96800005-2701-4a01-9c01-534433340001', v_kpi1, 1.04, CURRENT_DATE - 60, v_proj_dw, false, NOW() - INTERVAL '60 days', v_user_id),
    ('96800005-2701-4a01-9c01-534433340002', v_kpi1, 0.97, CURRENT_DATE - 30, v_proj_dw, false, NOW() - INTERVAL '30 days', v_user_id),
    ('96800005-2701-4a01-9c01-534433340003', v_kpi1, 0.91, CURRENT_DATE, v_proj_dw, false, NOW(), v_user_id),
    ('96800005-2701-4a01-9c01-534433340004', v_kpi2, 1.02, CURRENT_DATE - 60, v_proj_bi, false, NOW() - INTERVAL '60 days', v_user_id),
    ('96800005-2701-4a01-9c01-534433340005', v_kpi2, 0.93, CURRENT_DATE - 30, v_proj_bi, false, NOW() - INTERVAL '30 days', v_user_id),
    ('96800005-2701-4a01-9c01-534433340006', v_kpi2, 0.88, CURRENT_DATE, v_proj_bi, false, NOW(), v_user_id),
    ('96800005-2701-4a01-9c01-534433340007', v_kpi3, 82, CURRENT_DATE - 30, v_proj_erp, false, NOW() - INTERVAL '30 days', v_user_id),
    ('96800005-2701-4a01-9c01-534433340008', v_kpi3, 76, CURRENT_DATE, v_proj_erp, false, NOW(), v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v968: Reports & Analytics seed complete (custom_metrics, report_templates, analytics_dashboards/widgets, kpi_definitions/values).';

END $$;
