-- ============================================================================
-- v1345 wave 4r — Simulator practice pages
-- ============================================================================
-- Generated from scripts/field-help-content/practice_pages_4r.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 9 help entries, module_code 'simulator_practice'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1491.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('sim.practice_configuration_items.item_name', 'Item name', 'The name of the product, document or component you are putting under configuration control.', '- Supplier contract v2', NULL, NULL, 'simulator_practice'),
  ('sim.practice_configuration_items.item_description', 'Description', 'What the item is and why it needs version control.', '- The signed services contract; any change needs a new version and approval.', NULL, NULL, 'simulator_practice'),
  ('sim.practice_daily_log_entries.entry_date', 'Entry date', 'The day the event, action or note happened.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'simulator_practice'),
  ('sim.practice_daily_log_entries.entry_type', 'Entry type', 'What kind of note this is, so the log can be filtered later.', '- Action', NULL, NULL, 'simulator_practice'),
  ('sim.practice_daily_log_entries.description', 'Description', 'What happened or what needs doing, in a sentence or two.', '- Supplier called: delivery moves from Tuesday to Thursday. Check impact on the test window.', NULL, NULL, 'simulator_practice'),
  ('sim.practice_end_stage_reports.stage_summary', 'Stage summary', 'How the stage went against its plan: what was delivered, time, cost and any big issues.', '- Design stage closed 5 days late and 3% over budget; all design products approved.', NULL, NULL, 'simulator_practice'),
  ('sim.practice_quality_management_strategies.strategy_name', 'Strategy name', 'A name for this quality management strategy.', '- Office move — quality management strategy', NULL, NULL, 'simulator_practice'),
  ('sim.practice_risk_management_strategies.strategy_name', 'Strategy name', 'A name for this risk management strategy.', '- Office move — risk management strategy', NULL, NULL, 'simulator_practice'),
  ('sim.practice_team_members.required_skills', 'Required skills', 'The skills this role needs on the practice project, one per line.', E'- Stakeholder communication\nBudget tracking', NULL, NULL, 'simulator_practice')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Simulator keys read the Platform help (PRD G-D3).
INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.practice_communication_management_strategies.purpose', 'public.communication_management_strategies.purpose'),
  ('sim.practice_configuration_management_strategies.purpose', 'public.configuration_management_strategies.purpose'),
  ('sim.practice_checkpoint_reports.report_title', 'public.checkpoint_reports.report_title'),
  ('sim.practice_checkpoint_reports.checkpoint_date', 'public.checkpoint_reports.checkpoint_date'),
  ('sim.practice_checkpoint_reports.progress_summary', 'public.checkpoint_reports.progress_summary'),
  ('sim.practice_end_project_reports.report_title', 'public.end_project_reports.report_title'),
  ('sim.practice_end_project_reports.executive_summary', 'public.end_project_reports.executive_summary'),
  ('sim.practice_end_stage_reports.report_title', 'public.end_stage_reports.report_title'),
  ('sim.practice_exception_reports.report_title', 'public.exception_reports.report_title'),
  ('sim.practice_exception_reports.exception_description', 'public.exception_reports.exception_summary'),
  ('sim.practice_highlight_reports.report_title', 'public.highlight_reports.report_title'),
  ('sim.practice_highlight_reports.report_date', 'public.highlight_reports.report_date'),
  ('sim.practice_highlight_reports.executive_summary', 'public.highlight_reports.executive_summary'),
  ('sim.practice_lesson_entries.lesson_title', 'public.lessons_learned.lesson_title'),
  ('sim.practice_lesson_entries.lesson_description', 'public.lessons_learned.lesson_description'),
  ('sim.practice_lessons_reports.report_reference', 'public.lessons_reports.report_reference'),
  ('sim.practice_lessons_reports.executive_summary', 'public.lessons_reports.executive_summary'),
  ('sim.practice_project_product_descriptions.product_title', 'public.project_product_descriptions.product_title'),
  ('sim.practice_project_product_descriptions.purpose', 'public.project_product_descriptions.purpose'),
  ('sim.practice_work_packages.work_package_name', 'public.work_packages.work_package_name'),
  ('sim.practice_work_packages.work_package_description', 'public.work_packages.work_package_description'),
  ('sim.practice_work_packages.objectives', 'public.work_packages.objectives')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'simulator_practice' AND is_active;
