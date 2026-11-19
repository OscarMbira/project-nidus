-- ============================================================================
-- v1474: Timesheet flag reasons — starting catalogue (v1343, companion seed to v1473)
-- ============================================================================
-- Reference data (rule 18.2), editable in Timesheet Review Reasons › Flag reasons (PMO Admin).
-- Idempotent: an existing code is left as it is.
-- ============================================================================

INSERT INTO public.timesheet_entry_flag_reasons (code, name, description, sort_order, is_active)
VALUES
  ('hours_unusually_high', 'Hours unusually high',        'More hours than normal for one day or task (for example over 12 hours)', 10, true),
  ('task_closed',          'Task already closed',         'Time logged against a task or work package that is complete or closed',   20, true),
  ('wrong_task_project',   'Wrong task or project',       'The work described looks like it belongs to another task or project',      30, true),
  ('duplicate_entry',      'Possible duplicate',          'Same date, task and hours as another entry',                                40, true),
  ('missing_detail',       'Description missing or vague','Not enough detail to show what was done',                                   50, true),
  ('outside_period',       'Outside the agreed period',   'Logged on a date outside the project or the assignment dates',              60, true),
  ('leave_or_holiday',     'On leave or public holiday',  'Logged on a day recorded as leave or a public holiday',                     70, true),
  ('other',                'Other',                       'Explain in the note',                                                       99, true)
ON CONFLICT (code) WHERE is_deleted = FALSE DO NOTHING;
