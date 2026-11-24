-- ============================================================================
-- v1569 — Quantitative risk analysis, slice 4: roll-up, reminder, menus, help
-- PRD/plan: v1355 (D10). Prerequisites: v1568. Idempotent.
-- The refresh reminder needs SQL/v1562 (reminder_messages). If that file has not
-- been applied yet, this file still creates the views, menus and field help, and
-- skips the reminder. Re-run this file after v1562 to add the reminder.
-- ============================================================================

-- ── 1. Latest run per project (the programme / portfolio roll-up reads this) ─
CREATE OR REPLACE VIEW public.qra_project_latest_run
WITH (security_invoker = true) AS
SELECT DISTINCT ON (r.project_id)
  r.project_id,
  p.project_name,
  p.project_code,
  p.budget_amount,
  r.id AS run_id,
  r.display_id,
  r.kind,
  r.response_basis,
  r.created_at,
  r.summary,
  (r.created_at < NOW() - INTERVAL '30 days') AS is_stale
FROM public.qra_runs r
JOIN public.projects p ON p.id = r.project_id
ORDER BY r.project_id, r.created_at DESC;

CREATE OR REPLACE VIEW sim.qra_project_latest_run
WITH (security_invoker = true) AS
SELECT DISTINCT ON (r.project_id)
  r.project_id,
  p.project_name,
  p.project_code,
  NULL::NUMERIC AS budget_amount,
  r.id AS run_id,
  r.display_id,
  r.kind,
  r.response_basis,
  r.created_at,
  r.summary,
  (r.created_at < NOW() - INTERVAL '30 days') AS is_stale
FROM sim.qra_runs r
JOIN sim.practice_projects p ON p.id = r.project_id
ORDER BY r.project_id, r.created_at DESC;

GRANT SELECT ON public.qra_project_latest_run, sim.qra_project_latest_run TO authenticated;

-- Reminder source: one row per project that has a run. Due 30 days after that run.
-- Not granted to clients; the reminder job reads it (same pattern as reminder_src_*).
CREATE OR REPLACE VIEW public.qra_analysis_due AS
SELECT p.id, p.id AS project_id, p.project_name AS title, lr.created_at
FROM public.projects p
JOIN LATERAL (
  SELECT r.created_at FROM public.qra_runs r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1
) lr ON TRUE
WHERE COALESCE(p.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.qra_analysis_due AS
SELECT p.id, p.id AS practice_project_id, p.project_name AS title, lr.created_at
FROM sim.practice_projects p
JOIN LATERAL (
  SELECT r.created_at FROM sim.qra_runs r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1
) lr ON TRUE;

REVOKE ALL ON public.qra_analysis_due, sim.qra_analysis_due FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.reminder_messages') IS NULL
     OR to_regclass('public.reminder_record_types') IS NULL THEN
    RAISE NOTICE 'SKIP qra reminder — public.reminder_messages is missing. Run SQL/v1562_reminders_lead_times_daily_digest.sql, then re-run this file.';
    RETURN;
  END IF;

  INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
  VALUES (
    'qra_stale',
    'Risk analysis due {date}',
    'The quantitative analysis for “{title}” should be refreshed by {date}.',
    'Risk analysis out of date',
    'The quantitative analysis for “{title}” is older than the refresh date of {date}.'
  )
  ON CONFLICT (message_key) DO UPDATE SET
    before_title = EXCLUDED.before_title, before_body = EXCLUDED.before_body,
    overdue_title = EXCLUDED.overdue_title, overdue_body = EXCLUDED.overdue_body, updated_at = NOW();

  INSERT INTO public.reminder_record_types (schema_name, record_type, label, description, table_name, id_column, date_column,
    due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
    recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order)
  VALUES
    ('public', 'qra_stale', 'Risk analysis refresh', 'Tells the project manager when the latest quantitative analysis is 30 days old.',
     'qra_analysis_due', 'id', 'created_at', 30, 'title', 'project_id', NULL, ARRAY[]::TEXT[], 'user',
     'TRUE', 'role:project_manager', 7, 14, 'qra_stale', ARRAY['qra_runs', 'projects'], 70),
    ('sim', 'qra_stale', 'Risk analysis refresh', 'Tells the practice project manager when the latest quantitative analysis is 30 days old.',
     'qra_analysis_due', 'id', 'created_at', 30, 'title', 'practice_project_id', NULL, ARRAY[]::TEXT[], 'auth',
     'TRUE', 'role:project_manager', 7, 14, 'qra_stale', ARRAY['sim.qra_runs', 'sim.practice_projects'], 70)
  ON CONFLICT (schema_name, record_type) DO UPDATE SET
    label = EXCLUDED.label, description = EXCLUDED.description, table_name = EXCLUDED.table_name,
    id_column = EXCLUDED.id_column, date_column = EXCLUDED.date_column, due_offset_days = EXCLUDED.due_offset_days,
    title_column = EXCLUDED.title_column, project_column = EXCLUDED.project_column,
    owner_columns = EXCLUDED.owner_columns, owner_id_kind = EXCLUDED.owner_id_kind, status_filter = EXCLUDED.status_filter,
    recipient_rule = EXCLUDED.recipient_rule, default_lead_days = EXCLUDED.default_lead_days,
    overdue_window_days = EXCLUDED.overdue_window_days, message_key = EXCLUDED.message_key,
    planner_tables = EXCLUDED.planner_tables, sort_order = EXCLUDED.sort_order, updated_at = NOW();
END $$;

-- ── 2. Menus (catalogue + placement). Section 4 Plan & Schedule. ────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_qra', 'Quantitative analysis',
  'Chance of meeting the date and budget, and the contingency that confidence implies (v1355).',
  '/platform/schedule/risk-analysis',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  3, 85, 'universal', 'activity', TRUE, TRUE, 'plan_schedule', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_qra');

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_pm_qra', 'Quantitative analysis',
  'Practice the chance of meeting the date and budget, and the contingency that confidence implies (v1355).',
  '/simulator/risk-analysis',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  3, 85, 'universal', 'activity', TRUE, TRUE, 'plan_schedule', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_qra');

UPDATE public.menu_items
   SET default_section_code = 'plan_schedule', is_active = TRUE, is_visible = TRUE, updated_at = NOW()
 WHERE menu_code IN ('plat_pm_qra', 'sim_pm_qra');

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, neu.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items old ON old.id = src.menu_item_id AND old.menu_code = 'plat_pm_risk_reg'
JOIN public.menu_items neu ON neu.menu_code = 'plat_pm_qra'
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, neu.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items old ON old.id = src.menu_item_id AND old.menu_code = 'sim_pm_risk_reg'
JOIN public.menu_items neu ON neu.menu_code = 'sim_pm_qra'
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'plan_schedule', 85
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('team'), ('team_member'), ('programme'), ('portfolio'), ('pmo_oversight')) AS v(placement_key)
WHERE mi.menu_code IN ('plat_pm_qra', 'sim_pm_qra') AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

-- ── 3. Field help for the analysis screens ──────────────────────────────────
INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.qra_groups.name', 'Group name', 'A short name for risks and ranges that tend to move together.', '- Ground conditions', NULL, NULL, 'raid'),
  ('public.qra_groups.strength', 'How closely they move', 'Low, medium or high. High means the items in the group rise and fall together in the analysis.', '- High', NULL, NULL, 'raid'),
  ('public.task_duration_ranges.min_days', 'Shortest duration', 'The fewest working days this task could take.', '- 8', NULL, NULL, 'planning'),
  ('public.task_duration_ranges.ml_days', 'Most likely duration', 'The working days you plan for. Leave the shortest and longest blank to keep the task fixed.', '- 10', NULL, NULL, 'planning'),
  ('public.task_duration_ranges.max_days', 'Longest duration', 'The most working days this task could take.', '- 18', NULL, NULL, 'planning'),
  ('public.task_duration_ranges.distribution', 'Duration shape', 'How values between shortest and longest are spread. Triangular is the usual choice.', '- Triangular', NULL, NULL, 'planning'),
  ('public.task_duration_ranges.qra_group_id', 'Moves together with', 'Put this task in a group when its duration tends to move with other items.', '- Ground conditions', NULL, NULL, 'planning'),
  ('public.risk_task_links.task_id', 'Affected tasks', 'The tasks this risk delays when it happens. A risk with no task adds its delay to the project finish.', '- Install hardware', NULL, NULL, 'raid'),
  ('public.cost_line_ranges.line_label', 'Cost line', 'The cost this range describes, such as a budget line or a site overhead.', '- Site team', NULL, NULL, 'cost'),
  ('public.cost_line_ranges.min_amount', 'Lowest cost', 'The smallest this line could cost. A negative amount is a saving.', '- 40,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.cost_line_ranges.ml_amount', 'Most likely cost', 'The cost you plan for. Leave lowest and highest blank to keep the line fixed.', '- 50,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.cost_line_ranges.max_amount', 'Highest cost', 'The most this line could cost.', '- 70,000', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.cost_line_ranges.is_time_dependent', 'Grows with delay', 'Turn on when this cost rises for each day the finish moves, such as a hired site team.', '- Yes', NULL, NULL, 'cost'),
  ('public.cost_line_ranges.daily_rate', 'Cost per day of delay', 'How much this line adds for each working day the simulated finish is later than the plan. An early finish reduces it.', '- 800', 'Amounts show in {currency}.', NULL, 'cost'),
  ('public.qra_runs.iterations', 'Iterations', 'How many times the analysis tries the plan. 5,000 is the usual number. More is steadier and slower.', '- 5,000', 'From 1,000 to 20,000.', NULL, 'raid'),
  ('public.qra_runs.seed', 'Repeat code', 'The number that makes a re-run produce the same result. Leave it blank and one is chosen and saved.', '- 184726', NULL, NULL, 'raid'),
  ('public.qra_runs.response_basis', 'Before or after response', 'Before response uses the risk as it stands. After response uses the reduced figures.', '- Before response', NULL, NULL, 'raid')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.qra_groups.name', 'public.qra_groups.name'),
  ('sim.qra_groups.strength', 'public.qra_groups.strength'),
  ('sim.task_duration_ranges.min_days', 'public.task_duration_ranges.min_days'),
  ('sim.task_duration_ranges.ml_days', 'public.task_duration_ranges.ml_days'),
  ('sim.task_duration_ranges.max_days', 'public.task_duration_ranges.max_days'),
  ('sim.task_duration_ranges.distribution', 'public.task_duration_ranges.distribution'),
  ('sim.task_duration_ranges.qra_group_id', 'public.task_duration_ranges.qra_group_id'),
  ('sim.risk_task_links.task_id', 'public.risk_task_links.task_id'),
  ('sim.cost_line_ranges.line_label', 'public.cost_line_ranges.line_label'),
  ('sim.cost_line_ranges.min_amount', 'public.cost_line_ranges.min_amount'),
  ('sim.cost_line_ranges.ml_amount', 'public.cost_line_ranges.ml_amount'),
  ('sim.cost_line_ranges.max_amount', 'public.cost_line_ranges.max_amount'),
  ('sim.cost_line_ranges.is_time_dependent', 'public.cost_line_ranges.is_time_dependent'),
  ('sim.cost_line_ranges.daily_rate', 'public.cost_line_ranges.daily_rate'),
  ('sim.qra_runs.iterations', 'public.qra_runs.iterations'),
  ('sim.qra_runs.seed', 'public.qra_runs.seed'),
  ('sim.qra_runs.response_basis', 'public.qra_runs.response_basis')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
