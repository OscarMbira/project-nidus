-- ============================================================================
-- v1440: Core PM wave 5 — repoint menus whose route does not exist (Platform + Simulator)
-- ============================================================================
-- Core PM audit (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md, finding 6). A strict check of
-- every live Core PM menu route against the app's route definitions found 15 Platform menus that open
-- no page (the app's catch-all sends the user back to the home page). Each is repointed to the page
-- that already exists for it. The matching Simulator menus (v682 originals) have the same problem and
-- are fixed the same way.
-- Each UPDATE only changes a row whose route is still the old, broken one, so menus already fixed or
-- customised are left alone. No new pages, no code change. Placeholders follow the sidebar resolver:
-- Platform uses :projectId, Simulator practice projects use __PRACTICE__.
-- ============================================================================

UPDATE public.menu_items m
SET route_path = v.new_route, updated_at = NOW()
FROM (VALUES
  -- Platform
  ('plat_pm_rep_builder',    '/platform/report-builder',                '/platform/reports/builder'),
  ('plat_pm_s_pid',          '/platform/pid',                           '/pm/initiation/pid'),
  ('plat_pm_s_checkpoint',   '/platform/structured/checkpoint-reports', '/pm/reporting/checkpoint-reports'),
  ('plat_pm_s_highlight',    '/pm/reporting/highlight',                 '/pm/reporting/highlight-reports'),
  ('plat_pm_s_issue_rep',    '/pm/reporting/issues',                    '/pm/reporting/issue-reports'),
  ('plat_pm_s_exception',    '/pm/reporting/exception',                 '/pm/reporting/exception-reports'),
  ('plat_pm_s_end_stage',    '/pm/reporting/end-stage',                 '/pm/reporting/end-stage-reports'),
  ('plat_pm_s_end_project',  '/platform/structured/end-project-report', '/platform/projects/:projectId/closure?tab=end-report'),
  ('plat_pm_s_prod_desc',    '/platform/product-descriptions',          '/platform/projects/:projectId/product-descriptions'),
  ('plat_pm_s_work_auth',    '/platform/work-authorisation',            '/platform/work-authorisations'),
  ('plat_pm_a_story_map',    '/platform/story-map',                     '/platform/projects/:projectId/scrum/story-map'),
  ('plat_pm_a_releases',     '/platform/releases',                      '/platform/projects/:projectId/scrum/releases'),
  ('plat_pm_a_vsm',          '/platform/value-stream-map',              '/platform/projects/:projectId/lean/value-stream-map'),
  ('plat_pm_a_kaizen',       '/platform/kaizen-board',                  '/platform/projects/:projectId/lean/kaizen'),
  ('plat_pm_a_process_forms','/platform/agile-process-forms',           '/pm/process-templates'),
  -- Simulator (same menus, v682 routes)
  ('sim_pm_s_checkpoint',    '/simulator/checkpoint-reports',           '/simulator/practice-checkpoint-reports'),
  ('sim_pm_s_highlight',     '/simulator/highlight-reports',            '/simulator/practice-highlight-reports'),
  ('sim_pm_s_exception',     '/simulator/exception-reports',            '/simulator/practice-exception-reports'),
  ('sim_pm_s_end_stage',     '/simulator/end-stage-reports',            '/simulator/practice-end-stage-reports'),
  ('sim_pm_s_end_project',   '/simulator/end-project-report',           '/simulator/practice-end-project-reports'),
  ('sim_pm_a_story_map',     '/simulator/story-map',                    '/simulator/practice-projects/__PRACTICE__/scrum/story-map'),
  ('sim_pm_a_releases',      '/simulator/releases',                     '/simulator/practice-projects/__PRACTICE__/scrum/releases'),
  ('sim_pm_a_vsm',           '/simulator/value-stream-map',             '/simulator/practice-projects/__PRACTICE__/lean/value-stream-map'),
  ('sim_pm_a_kaizen',        '/simulator/kaizen-board',                 '/simulator/practice-projects/__PRACTICE__/lean/kaizen'),
  ('sim_pm_a_process_forms', '/simulator/practice-scrum',               '/simulator/pm/process-templates')
) AS v(menu_code, old_route, new_route)
WHERE m.menu_code = v.menu_code
  AND m.route_path = v.old_route;

-- Check: current route of every menu this file covers (old route still shown = row did not match).
SELECT m.menu_code, m.menu_label, m.route_path
FROM public.menu_items m
WHERE m.menu_code IN (
  'plat_pm_rep_builder', 'plat_pm_s_pid', 'plat_pm_s_checkpoint', 'plat_pm_s_highlight', 'plat_pm_s_issue_rep',
  'plat_pm_s_exception', 'plat_pm_s_end_stage', 'plat_pm_s_end_project', 'plat_pm_s_prod_desc', 'plat_pm_s_work_auth',
  'plat_pm_a_story_map', 'plat_pm_a_releases', 'plat_pm_a_vsm', 'plat_pm_a_kaizen', 'plat_pm_a_process_forms',
  'sim_pm_s_checkpoint', 'sim_pm_s_highlight', 'sim_pm_s_exception', 'sim_pm_s_end_stage', 'sim_pm_s_end_project',
  'sim_pm_a_story_map', 'sim_pm_a_releases', 'sim_pm_a_vsm', 'sim_pm_a_kaizen', 'sim_pm_a_process_forms'
)
ORDER BY m.menu_code;
