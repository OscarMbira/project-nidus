// v1345 — the last labels: schedule task form (scheduling, constraints, actuals, dependencies), Gantt status
// date, project wizard source mandate, Simulator mandate edit, Simulator document governance step.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const DATE = ['{example_date}', 'Dates show as {date_format}.']

export const MODULE = 'planning'
export const ROWS = [
  t('public.tasks.scheduling_mode', 'Scheduling', 'Automatic tasks move when their predecessors or the calendar change; manual tasks keep the dates you type.', 'Automatic'),
  t('public.tasks.constraint_type', 'Date constraint', 'A date rule the task must respect, e.g. start no earlier than a delivery date. Use one only when a real date forces it.', 'Start no earlier than'),
  t('public.tasks.constraint_date', 'Constraint date', 'The date the constraint refers to.', ...DATE),
  t('public.tasks.planned_end_date', 'Planned finish', 'When the task is planned to finish.', ...DATE),
  t('public.tasks.actual_start_date', 'Actual start', 'The day work on the task really started.', ...DATE),
  t('public.tasks.actual_end_date', 'Actual finish', 'The day the task was really finished.', ...DATE),
  t('public.task_dependencies.predecessor_task_id', 'Comes after', 'A task that must happen before this one.', 'The task this one follows'),
  t('public.task_dependencies.dependency_type', 'Type', 'How the two tasks are linked: finish-to-start is the usual one.', 'Finish to start'),
  t('public.task_dependencies.lag_days', 'Lag (days)', 'Working days of wait between the two tasks. Use a minus number for an overlap.', '2'),
  t('public.project_schedules.status_date', 'Status date', 'The date progress is measured up to. Leave blank to use today.', ...DATE),
  t('public.projects.source_mandate_id', 'Source mandate', 'The approved mandate this project was created from. Its details were copied in.', 'The mandate the project came from'),
  t('sim.project_mandates.project_manager_name', 'Project Manager', 'The person who will run the practice project day to day.', 'Project Manager'),
]

export const ALIASES = [
  ['sim.projects.funding_approval_status', 'public.projects.funding_approval_status'],
  ['sim.projects.rfp_reference', 'public.projects.rfp_reference'],
  ['sim.projects.document_repository_url', 'public.projects.document_repository_url'],
  ['sim.projects.mandate_status', 'public.projects.mandate_status'],
  ['sim.projects.business_case_status', 'public.projects.business_case_status'],
  ['sim.projects.brief_status', 'public.projects.brief_status'],
  ['sim.projects.pid_status', 'public.projects.pid_status'],
  ['sim.projects.benefits_review_plan_status', 'public.projects.benefits_review_plan_status'],
]
