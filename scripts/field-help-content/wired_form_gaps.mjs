// v1345 slice 4 — system-wide fix (2026-11-21): fields left as plain labels inside forms that already had help
// (e.g. Status on the Project Brief), local Label/Field helper components, the core Regional & Format settings,
// and keys built at runtime. Source for SQL/v1540.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const RF = 'public.organisation_regional_format_settings.'
const LR = 'public.lessons_reports.'
const PC = 'public.project_closures.'

export const MODULE = 'wired_form_gaps'
export const ROWS = [
  // Read-only and section labels
  t('public.project_briefs.document_status', 'Status', 'Where the brief stands in its approval: draft, submitted, approved or rejected.', 'Approved'),
  t('public.project_mandates.version_number', 'Version', 'The version of this mandate. It goes up each time a changed mandate is saved.', '1.2'),
  d('public.project_mandates.created_date', 'Created date', 'When the mandate was first written.'),
  d('public.project_mandates.project_created_at', 'Project created', 'When a project was created from this mandate.'),
  t('public.tasks.project_id', 'Project', 'The project this task belongs to.', 'Warehouse Upgrade'),
  t('public.test_cases.test_steps', 'Test steps', 'The steps a tester follows, in order, with the result expected at each step.', '1. Open the login page. 2. Enter a valid user. Expected: the dashboard opens.'),
  t('public.issue_reports.variable_impact', 'Impact', 'How the issue affects this area of the project (time, cost, quality, scope, risk or benefits).', 'Delays testing by two weeks; no change to cost.'),
  t('public.exception_plans.option_description', 'Option description', 'What this recovery option would involve.', 'Add a second test team for four weeks.'),
  t('public.exception_plans.option_pros_cons', 'Pros & cons', 'The main advantages and drawbacks of this option.', 'Pro: keeps the go-live date. Con: costs 40,000 more.'),
  t('public.highlight_reports.six_variable_summary', 'Summary', 'Where this area stands this period, in a sentence or two.', 'Two weeks behind because of late supplier delivery.'),
  t('public.highlight_reports.six_variable_forecast', 'Forecast', 'What you expect by the end of the stage.', 'Back on plan by the end of next month.'),
  t('public.highlight_reports.escalation_required', 'Escalation required', 'Tick if a tolerance is forecast to be exceeded and the board must decide.', 'Ticked'),
  t('public.portfolios.apply_field_template_inheritance', 'Apply inherited field template', 'Tick to give this portfolio the extra fields set for its parent level.', 'Ticked'),
  t('public.programmes.apply_field_template_inheritance', 'Apply inherited field template', 'Tick to give this programme the extra fields set for its portfolio.', 'Ticked'),

  // Issue links
  t('public.issues.task_ids', 'Link to task', 'Tasks affected by this issue.', 'Install racking'),
  t('public.issues.work_package_ids', 'Link to work package', 'Work packages affected by this issue.', 'Warehouse fit-out'),
  t('public.issues.user_story_ids', 'Link to user story', 'User stories affected by this issue.', 'As a picker I can scan a shelf label'),
  t('public.issues.kanban_card_ids', 'Link to Kanban card', 'Kanban cards affected by this issue.', 'Fix label printer'),

  // Register record + save-as-template
  t('public.local_register_records.title', 'Title', 'A short name for this record. For a template, the title new records start with.', 'Server room access request'),
  t('public.local_register_records.description', 'Description', 'More detail about the record.', 'Access needed for the weekend upgrade.'),
  t('public.local_register_records.status', 'Status', 'Where the record stands.', 'Open'),
  t('public.local_register_templates.template_name', 'Template name', 'A name for this template so people can find it when they add a record.', 'Weekend access request'),
  t('public.local_register_templates.template_description', 'Template description', 'When to use this template.', 'Use for any out-of-hours access to the server room.'),

  // Project closure
  t(PC + 'closure_reason', 'Closure reason', 'Why the project is closing. One reason per line.', 'All products delivered and accepted'),
  t(PC + 'performance_summary', 'Performance summary', 'How the project did against its plan, one point per line.', 'Finished two weeks late and 3% under budget'),
  t(PC + 'benefits_realization_summary', 'Benefits realisation summary', 'Benefits achieved so far and those still to come.', 'Faster picking already seen; cost saving expected next year'),
  t(PC + 'financial_closure_summary', 'Financial closure summary', 'The final financial position and what is left to close.', 'All invoices paid; two purchase orders to close'),
  t(PC + 'outstanding_deliverables', 'Outstanding deliverables', 'Anything not delivered, and who now owns it.', 'Training videos — handed to the operations team'),

  // Lessons report — performance review per area (keys built at runtime from the measure)
  t(LR + 'time_performance_review', 'Time / schedule performance', 'How the project did against its schedule, and why.', 'Finished two weeks late because of a supplier delay.'),
  t(LR + 'cost_performance_review', 'Cost / budget performance', 'How the project did against its budget, and why.', '3% under budget; contingency not used.'),
  t(LR + 'quality_performance_review', 'Quality performance', 'Whether the products met their quality criteria.', 'All products passed first time except the label printer.'),
  t(LR + 'scope_performance_review', 'Scope performance', 'What was delivered compared with the agreed scope.', 'All scope delivered; one change added a second dock.'),
  t(LR + 'risk_performance_review', 'Risk management performance', 'How well risks were found and handled.', 'Supplier risk was logged but the response came too late.'),
  t(LR + 'benefits_performance_review', 'Benefits realisation performance', 'Progress towards the expected benefits.', 'Picking time down 15% against a 20% target.'),

  // Regional & Format local field definitions (the add-a-field form)
  t('public.regional_format_local_field_definitions.label', 'Label', 'The name people see for your new setting.', 'Cost centre'),
  t('public.regional_format_local_field_definitions.field_key', 'Key', 'A short unique code for the setting, used behind the scenes.', 'cost_centre', 'Lower case letters, numbers and underscores.'),
  t('public.regional_format_local_field_definitions.field_type', 'Type', 'The kind of value: text, number, yes/no or date.', 'Text'),
  t('public.regional_format_local_field_definitions.default_value', 'Default', 'The value used until someone changes it.', 'CC-100'),

  // Core Regional & Format settings (keys built at runtime from the setting)
  t(RF + 'country_code', 'Country', 'The country your organisation (or this project) works in.', 'United Kingdom'),
  t(RF + 'currency_code', 'Currency', 'The currency amounts are shown in.', 'GBP'),
  t(RF + 'date_format', 'Date format', 'How dates are written on screen and in exports.', 'DD/MM/YYYY'),
  t(RF + 'time_zone', 'Time zone', 'The time zone times are shown in.', 'Europe/London'),
  t(RF + 'decimal_places', 'Amount decimals', 'How many decimal places amounts show.', '2'),
  t(RF + 'number_grouping', 'Number grouping', 'How large numbers are grouped.', '1,234,567.89'),
  t(RF + 'first_day_of_week', 'First day of week', 'The day calendars and weekly views start on.', 'Monday'),
  t(RF + 'locale', 'Display locale', 'The language and region style used for names of months and days.', 'English (United Kingdom)'),
  t(RF + 'time_format', 'Time format', 'Whether times use a 12-hour or 24-hour clock.', '24-hour'),
  t(RF + 'fiscal_year_start_month', 'Fiscal year start month', 'The month your financial year starts.', 'April'),
  t(RF + 'negative_number_style', 'Negative number style', 'How negative amounts are shown.', '(1,234.00)'),
  t(RF + 'percent_decimals', 'Percent decimals', 'How many decimal places percentages show.', '1'),

  // Simulator-only quality register fields that match Platform columns
  t('public.quality_register.quality_responsibilities', 'Quality responsibilities', 'Who carries out and approves each quality check.', 'Reviewer: Quality Lead; approver: Senior User'),
  t('public.quality_register.quality_criteria', 'Quality criteria', 'The standards the product must meet.', 'No critical defects; meets the style guide'),
  t('public.quality_register.acceptance_criteria', 'Acceptance criteria', 'What must be true for the product to be accepted.', 'Signed off by the Senior User'),
]

const seeded = new Set(ROWS.map((r) => r[0]))
const fixAliases = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_gaps.json', import.meta.url), 'utf8'))
const runtime = [
  ...Object.keys({ country_code: 1, currency_code: 1, date_format: 1, time_zone: 1, decimal_places: 1, number_grouping: 1, first_day_of_week: 1, locale: 1, time_format: 1, fiscal_year_start_month: 1, negative_number_style: 1, percent_decimals: 1 })
    .map((c) => ['sim.organisation_regional_format_settings.' + c, RF + c]),
  ...['time', 'cost', 'quality', 'scope', 'risk', 'benefits'].map((a) => [`sim.lessons_reports.${a}_performance_review`, `${LR}${a}_performance_review`]),
  ...['quality_responsibilities', 'quality_criteria', 'acceptance_criteria'].map((c) => ['sim.quality_register.' + c, 'public.quality_register.' + c]),
  ...['approved_amount', 'actual_spent', 'remaining_amount'].map((c) => ['sim.portfolio_budgets.' + c, 'public.portfolio_budgets.' + c]),
  ['sim.regional_format_local_field_definitions.label', 'public.regional_format_local_field_definitions.label'],
]
const existing = new Set(['public.portfolio_budgets.approved_amount', 'public.portfolio_budgets.actual_spent', 'public.portfolio_budgets.remaining_amount',
  'public.stakeholder_engagement.engagement_level', 'public.stakeholder_engagement.satisfaction_level', 'public.stakeholder_engagement.support_level',
  'public.portfolios.portfolio_code', 'public.portfolios.portfolio_name', 'public.programmes.programme_code', 'public.programmes.programme_name',
  'public.programmes.programme_status', 'public.programmes.programme_type', 'public.programmes.programme_category', 'public.programmes.portfolio_id',
  'public.programmes.programme_description', 'public.programmes.programme_mission', 'public.programmes.programme_vision', 'public.programmes.governance_model',
  'public.programmes.review_frequency', 'public.programmes.programme_owner_user_id', 'public.programmes.programme_manager_user_id',
  'public.programmes.programme_start_date', 'public.programmes.programme_end_date'])
export const ALIASES = [...new Map([...fixAliases, ...runtime].filter(([, p]) => seeded.has(p) || existing.has(p))).entries()]
