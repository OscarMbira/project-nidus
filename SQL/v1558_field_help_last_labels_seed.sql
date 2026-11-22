-- ============================================================================
-- v1345 — last labels (task form, Gantt status date, source mandate, Simulator mandate / governance)
-- ============================================================================
-- Generated from scripts/field-help-content/last_labels.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 12 help entries, module_code 'planning'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1491.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.tasks.scheduling_mode', 'Scheduling', 'Automatic tasks move when their predecessors or the calendar change; manual tasks keep the dates you type.', '- Automatic', NULL, NULL, 'planning'),
  ('public.tasks.constraint_type', 'Date constraint', 'A date rule the task must respect, e.g. start no earlier than a delivery date. Use one only when a real date forces it.', '- Start no earlier than', NULL, NULL, 'planning'),
  ('public.tasks.constraint_date', 'Constraint date', 'The date the constraint refers to.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'planning'),
  ('public.tasks.planned_end_date', 'Planned finish', 'When the task is planned to finish.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'planning'),
  ('public.tasks.actual_start_date', 'Actual start', 'The day work on the task really started.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'planning'),
  ('public.tasks.actual_end_date', 'Actual finish', 'The day the task was really finished.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'planning'),
  ('public.task_dependencies.predecessor_task_id', 'Comes after', 'A task that must happen before this one.', '- The task this one follows', NULL, NULL, 'planning'),
  ('public.task_dependencies.dependency_type', 'Type', 'How the two tasks are linked: finish-to-start is the usual one.', '- Finish to start', NULL, NULL, 'planning'),
  ('public.task_dependencies.lag_days', 'Lag (days)', 'Working days of wait between the two tasks. Use a minus number for an overlap.', '- 2', NULL, NULL, 'planning'),
  ('public.project_schedules.status_date', 'Status date', 'The date progress is measured up to. Leave blank to use today.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'planning'),
  ('public.projects.source_mandate_id', 'Source mandate', 'The approved mandate this project was created from. Its details were copied in.', '- The mandate the project came from', NULL, NULL, 'planning'),
  ('sim.project_mandates.project_manager_name', 'Project Manager', 'The person who will run the practice project day to day.', '- Project Manager', NULL, NULL, 'planning')
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
  ('sim.projects.funding_approval_status', 'public.projects.funding_approval_status'),
  ('sim.projects.rfp_reference', 'public.projects.rfp_reference'),
  ('sim.projects.document_repository_url', 'public.projects.document_repository_url'),
  ('sim.projects.mandate_status', 'public.projects.mandate_status'),
  ('sim.projects.business_case_status', 'public.projects.business_case_status'),
  ('sim.projects.brief_status', 'public.projects.brief_status'),
  ('sim.projects.pid_status', 'public.projects.pid_status'),
  ('sim.projects.benefits_review_plan_status', 'public.projects.benefits_review_plan_status')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'planning' AND is_active;
