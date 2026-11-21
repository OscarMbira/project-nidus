// v1345 slice 4, wave 4c (part 1) — planning & schedule field help (source for SQL/v1523).
// Tasks, dependencies, milestones, plan schedules, WBS / control accounts, activity list, schedule management plan,
// calendars and baselines, recurring tasks, sprints, report schedules, planning-hub rules, PBS nodes.
// The routed task form, filtered list and Gantt screens wait for another session’s uncommitted work.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const T = 'public.tasks.'
const TD = 'public.task_dependencies.'
const PM = 'public.project_milestones.'
const PLM = 'public.plan_milestones.'
const MS = 'public.milestones.'
const RS = 'public.report_schedules.'
const W = 'public.wbs_nodes.'
const RT = 'public.recurring_task_templates.'
const AL = 'public.activity_list.'
const SMP = 'public.schedule_management_plans.'
const SHR = 'public.scheduled_health_reports.'
const SP = 'public.sprints.'
const GR = 'public.governance_rules.'
const IR = 'public.intelligence_rules.'
const PBS = 'public.plan_pbs_nodes.'
const CE = 'public.project_calendar_exceptions.'
const SB = 'public.schedule_baselines.'
const PC = 'public.project_calendars.'
const PT = 'sim.practice_tasks.'

export const MODULE = 'planning'
export const ROWS = [
  // ── Tasks ──
  [T + 'task_name', 'Task name', 'A short name that says what the work is.', ['Install new teller system in the Dubai main branch']],
  [T + 'task_description', 'Task description', 'What the task involves and what “done” looks like.', ['Install and test the system on all 6 counters; branch manager signs off.']],
  [T + 'status_id', 'Status', 'Where the task is now.', ['In progress']],
  [T + 'priority', 'Priority', 'How important the task is compared with others.', ['High']],
  [T + 'assigned_to_user_id', 'Task owner', 'The person responsible for getting the task done.', ['Desktop Support Engineer']],
  [T + 'functional_role_id', 'Role', 'The project role that does this work, if no person is named yet.', ['Technical Lead']],
  date(T + 'planned_start_date', 'Planned start', 'When work on the task is planned to start.'),
  date(T + 'due_date', 'Due / finish', 'When the task must be finished.'),
  [T + 'estimated_hours', 'Estimated hours', 'How many hours of work the task needs.', ['16']],
  [T + 'estimated_duration_days', 'Duration (days)', 'How many working days the task takes from start to finish.', ['3']],
  [T + 'percentage_complete', '% complete', 'How much of the task is done.', ['40'], 'A percentage from 0 to 100.'],
  [T + 'is_milestone', 'Milestone', 'Tick if this is a milestone: a key point in time with no duration.', ['Ticked for “Pilot branch live”']],

  // ── Task dependencies ──
  [TD + 'linked_task_id', 'Linked task', 'The other task in this dependency.', ['Order branch hardware']],
  [TD + 'other_task_id', 'Related task', 'The other task in this dependency.', ['Order branch hardware']],
  [TD + 'direction', 'Relationship', 'Which task comes first: the other task, or this one.', ['Other task must finish/start before this task']],
  [TD + 'dependency_type', 'Dependency type', 'How the two tasks are linked in time. Finish-to-start is the most common: one finishes, then the other starts.', ['Finish to Start (FS)']],
  [TD + 'lag_days', 'Lag / lead (days)', 'Days of wait after the first task (lag), or overlap as a negative number (lead).', ['2']],
  [TD + 'description', 'Description', 'Why the tasks are linked, if it is not obvious.', ['Hardware must arrive before installation can start.']],
  [TD + 'predecessor', 'First task', 'The task that must happen first.', ['Order branch hardware']],
  [TD + 'successor', 'Then task', 'The task that follows it.', ['Install new teller system']],
  [TD + 'type', 'Type', 'How the two tasks are linked in time.', ['Finish to Start (FS)']],
  [TD + 'lag', 'Lag (working days)', 'Working days to wait between the two tasks (negative to overlap).', ['2']],

  // ── Milestones ──
  [PM + 'milestone_name', 'Milestone name', 'A short name for the key point in the schedule.', ['Pilot branch live']],
  date(PM + 'milestone_date', 'Date', 'When the milestone is due.'),
  [PM + 'milestone_type', 'Type', 'The kind of milestone.', ['Key deliverable']],
  [PM + 'task_id', 'Link to task', 'The task this milestone marks, if any.', ['Pilot go-live']],
  [PM + 'description', 'Description', 'What must be true for the milestone to be reached.', ['Two pilot branches open accounts on the new system for a full week.']],
  [MS + 'milestone_name', 'Milestone name', 'A short name for the key point in the project.', ['Pilot branch live']],
  [MS + 'description', 'Description', 'What must be true for the milestone to be reached.', ['Two pilot branches open accounts on the new system for a full week.']],
  date(MS + 'target_date', 'Target date', 'When the milestone is planned to be reached.'),
  date(MS + 'forecast_date', 'Forecast date', 'When the milestone is now expected to be reached.'),
  date(MS + 'actual_date', 'Actual date', 'When the milestone was actually reached.'),
  [MS + 'status', 'Status', 'Where the milestone stands.', ['On track']],
  [MS + 'notes', 'Notes', 'Anything else about the milestone.', ['Forecast moved because hardware arrived late.']],
  [PLM + 'milestone_name', 'Milestone name', 'A short name for the key point in the plan.', ['Stage 2 end']],
  date(PLM + 'milestone_date', 'Milestone date', 'When the milestone is due.'),
  [PLM + 'milestone_type', 'Milestone type', 'The kind of milestone, such as a stage start or end, a quality gate or a decision point.', ['Quality Gate']],
  [PLM + 'milestone_description', 'Description', 'What must be true for the milestone to be reached.', ['All pilot defects closed and signed off by the branch manager.']],
  [PLM + 'is_critical', 'Critical milestone', 'Tick if missing this milestone would delay the whole plan.', ['Ticked']],
  [PLM + 'dependencies', 'Dependencies', 'What this milestone relies on.', ['Network upgrade complete']],
  date(PLM + 'planned_start_date', 'Planned start date', 'When the plan’s work starts.'),
  date(PLM + 'planned_end_date', 'Planned end date', 'When the plan’s work is planned to finish.'),

  // ── WBS and control accounts ──
  [W + 'wbs_code', 'WBS code', 'The work breakdown structure number, showing where the item sits.', ['1.2.3']],
  [W + 'title', 'Title', 'A short name for this piece of work or deliverable.', ['Branch hardware']],
  [W + 'description', 'Description', 'What this part of the work covers.', ['Supply and install counters, printers and scanners for all Dubai branches.']],
  [W + 'level_num', 'Level', 'How deep in the breakdown the item sits; 1 is the top.', ['3']],
  [W + 'sort_order', 'Sort order', 'The order the item shows among its siblings.', ['2']],
  [W + 'name', 'Name', 'The name of the control account.', ['Branch hardware – Dubai']],
  [W + 'code', 'Code', 'A short code for the control account.', ['CA-03']],
  [W + 'wbs_node_id', 'WBS node', 'The part of the work breakdown this belongs to.', ['1.2 Branch hardware']],
  [W + 'budget_amount', 'Budget', 'The budget for this control account.', ['180,000'], AM],
  [W + 'status', 'Status', 'Where the control account stands.', ['Open']],
  [W + 'notes', 'Notes', 'Anything else about this control account.', ['Includes spare printers.']],

  // ── Activity list ──
  [AL + 'activity_code', 'Code', 'A short code for the activity.', ['ACT-0112']],
  [AL + 'is_milestone', 'Milestone', 'Tick if the activity is a milestone (a point in time, no duration).', ['Not ticked']],
  [AL + 'name', 'Name', 'A short name for the activity.', ['Configure counters']],
  [AL + 'wbs_node_id', 'WBS node', 'The part of the work breakdown this activity belongs to.', ['1.2 Branch hardware']],
  [AL + 'description', 'Description', 'What the activity involves.', ['Set up the 6 counters with the new teller software.']],
  date(AL + 'planned_start_date', 'Planned start', 'When the activity is planned to start.'),
  date(AL + 'planned_end_date', 'Planned end', 'When the activity is planned to finish.'),
  date(AL + 'actual_start_date', 'Actual start', 'When the activity actually started.'),
  date(AL + 'actual_end_date', 'Actual end', 'When the activity actually finished.'),
  [AL + 'estimation_technique', 'Estimation technique', 'How the duration was estimated: from similar past work, a formula, expert judgement, or three-point estimates.', ['Three-point']],
  [AL + 'optimistic_duration', 'Optimistic (O)', 'The shortest likely duration if everything goes well.', ['2']],
  [AL + 'most_likely_duration', 'Most likely (M)', 'The duration you expect in normal conditions.', ['3']],
  [AL + 'pessimistic_duration', 'Pessimistic (P)', 'The longest likely duration if things go badly.', ['6']],
  [AL + 'duration_unit', 'Duration unit', 'Whether the durations are in hours or days.', ['days']],
  [AL + 'basis_of_estimate', 'Basis of estimate', 'What the estimate is based on.', ['Same work took 3 days per branch in London.']],
  [AL + 'resource_requirements', 'Resource requirements', 'The people and equipment the activity needs.', ['2 engineers, 1 test laptop']],
  [AL + 'constraints', 'Constraints', 'Limits on when or how the activity can happen.', ['Only after branch closing time.']],
  [AL + 'assumptions', 'Assumptions', 'What the estimate assumes.', ['Counters are delivered the day before.']],
  [AL + 'status', 'Status', 'Where the activity stands.', ['in_progress']],

  // ── Schedule management plan ──
  [SMP + 'scheduling_methodology', 'Scheduling methodology', 'How the schedule is built, such as critical path or rolling wave.', ['Critical path, with rolling-wave detail for later stages']],
  [SMP + 'scheduling_tool', 'Scheduling tool', 'Where the schedule is kept.', ['This system’s schedule module']],
  [SMP + 'level_of_accuracy', 'Level of accuracy', 'How precise duration estimates must be.', ['±10% for the current stage, ±25% for later stages']],
  [SMP + 'units_of_measure', 'Units of measure', 'The units used for durations and effort.', ['Working days; effort in hours']],
  [SMP + 'reporting_formats', 'Reporting formats', 'How schedule progress is reported.', ['Gantt chart and milestone table in the highlight report']],
  [SMP + 'schedule_model_maintenance', 'Schedule model maintenance', 'How and when the schedule is updated.', ['Progress updated every Friday by team leads.']],
  [SMP + 'control_thresholds_json', 'Control thresholds', 'Limits that trigger action, written as JSON.', ['{"schedule_variance_days": 5}']],
  [SMP + 'variance_thresholds_json', 'Variance thresholds', 'Variance levels that must be reported, written as JSON.', ['{"spi_below": 0.9}']],
  [SMP + 'status', 'Status', 'Whether the plan is a draft or approved.', ['draft']],
  [SMP + 'version', 'Version', 'The version of this plan.', ['1.1']],

  // ── Calendars and baselines ──
  date(CE + 'exception_date', 'Date', 'The day that is different from the normal working week.'),
  [CE + 'exception_type', 'Type', 'The kind of exception.', ['Holiday (day off)']],
  [CE + 'is_working_day', 'Working day', 'Tick if this day is worked even though it would normally be off.', ['Not ticked']],
  [CE + 'description', 'Description', 'What the day is.', ['National holiday']],
  [PC + 'hours_per_day', 'Hours per day', 'The normal working hours in a day.', ['8']],
  [PC + 'notes', 'Notes', 'Anything else about the working week.', ['Friday is a half day in Dubai branches.']],
  [SB + 'name', 'Baseline name', 'A name for this saved copy of the schedule.', ['Baseline 2 – after hardware delay']],
  [SB + 'change', 'Change request', 'The approved change request behind this new baseline, if any.', ['CR-0012']],
  [SB + 'reason', 'Reason for re-baselining', 'Why the schedule is being re-baselined.', ['Board approved a three-week delay after supplier hardware arrived late.']],
  [SB + 'comments', 'Comments', 'Anything else reviewers should know.', ['Go-live date unchanged.']],

  // ── Recurring tasks ──
  [RT + 'template_name', 'Template name', 'A name for the repeating task.', ['Weekly risk review']],
  [RT + 'entity_type', 'Entity type', 'What kind of record each repeat creates.', ['Task']],
  [RT + 'recurrence_pattern', 'Recurrence pattern', 'How often the task repeats.', ['Every Monday']],
  [RT + 'next_run_at', 'Next run', 'When the next task will be created.', ['{example_date} 09:00'], DF],
  [RT + 'timezone', 'Timezone', 'The time zone the schedule runs in.', ['Asia/Dubai']],
  [RT + 'end_condition', 'Ends', 'When the repeats stop: never, after a number of times, or on a date.', ['On a specific date']],
  [RT + 'max_occurrences', 'Number of occurrences', 'How many times the task repeats before stopping.', ['12']],
  date(RT + 'end_date', 'End date', 'The last date a repeat is created.'),
  [RT + 'is_active', 'Active', 'Tick to keep creating repeats; untick to pause.', ['Ticked']],

  // ── Sprints ──
  [SP + 'sprint_name', 'Sprint name', 'A short name for the sprint.', ['Sprint 7']],
  [SP + 'sprint_goal', 'Sprint goal', 'What the team commits to achieve in this sprint.', ['Business accounts can be opened end to end in the test system.']],
  date(SP + 'sprint_start_date', 'Start date', 'When the sprint starts.'),
  date(SP + 'sprint_end_date', 'End date', 'When the sprint ends.'),
  [SP + 'team_capacity_story_points', 'Team capacity (story points)', 'How many story points the team can complete in the sprint.', ['34']],
  [SP + 'team_capacity_hours', 'Team capacity (hours)', 'Working hours the team has in the sprint.', ['240']],
  [SP + 'scrum_master_user_id', 'Scrum master', 'The person who runs the sprint ceremonies and removes blockers.', ['Delivery Lead']],
  [SP + 'status', 'Status', 'Where the sprint stands.', ['Planned']],

  // ── Report schedules ──
  [RS + 'schedule_type', 'Schedule type', 'How often the report is sent.', ['Weekly']],
  [RS + 'schedule_time', 'Schedule time', 'The time of day the report is sent.', ['08:00']],
  [RS + 'schedule_day', 'Day of week', 'The day a weekly report is sent.', ['Monday']],
  [RS + 'schedule_day_of_month', 'Day of month', 'The day a monthly report is sent.', ['1']],
  [RS + 'format', 'Format', 'The file format of the report.', ['PDF']],
  [RS + 'send_as', 'Send as', 'How the report reaches people: an attachment, a link, or a notification.', ['Email Link']],
  [RS + 'recipient_user_ids', 'Recipients (users)', 'People in the system who receive the report.', ['Project Executive']],
  [RS + 'recipient_emails', 'Recipients (email addresses)', 'Other email addresses that receive the report.', ['board.secretary@company.example']],
  [RS + 'is_active', 'Active schedule', 'Tick to keep sending; untick to pause.', ['Ticked']],
  [SHR + 'schedule_name', 'Schedule name', 'A name for this scheduled health report.', ['Monday portfolio health check']],
  [SHR + 'frequency', 'Frequency', 'How often the report runs.', ['Weekly']],
  [SHR + 'recipient_emails', 'Recipient emails', 'Who receives the report, separated by commas.', ['pmo@company.example, cfo@company.example']],
  [SHR + 'is_active', 'Active', 'Tick to keep the report running.', ['Ticked']],

  // ── Planning hub rules and product breakdown ──
  [GR + 'rule_name', 'Rule name', 'A short name for the governance rule.', ['Stage gate needs a signed checklist']],
  [GR + 'rule_type', 'Rule type', 'What kind of check the rule makes.', ['Approval required']],
  [GR + 'threshold_value', 'Threshold value', 'The value that triggers the rule.', ['10%']],
  [GR + 'applies_to', 'Applies to', 'Which plans or items the rule checks.', ['All stage plans']],
  [GR + 'description', 'Description', 'What the rule checks and why.', ['Blocks moving to the next stage until the gate checklist is signed.']],
  [IR + 'name', 'Rule name', 'A short name for the planning rule.', ['Warn on tasks without an owner']],
  [IR + 'priority', 'Priority', 'Which rule wins if two apply.', ['High']],
  [IR + 'trigger_condition', 'Trigger condition', 'When the rule fires.', ['A task starts within 5 days and has no owner.']],
  [IR + 'action', 'Action', 'What happens when it fires.', ['Notify the project manager.']],
  [IR + 'description', 'Description', 'What the rule is for.', ['Makes sure near-term work has someone responsible.']],
  [PBS + 'name', 'Name', 'The name of the product in the product breakdown.', ['Branch account opening process']],
  [PBS + 'product_type', 'Type', 'Whether it is a product, a sub-product or a component.', ['sub-product']],
  [PBS + 'description', 'Description', 'What the product is.', ['The updated steps branch staff follow to open an account.']],
  [PBS + 'acceptance_criteria', 'Acceptance criteria', 'What the product must meet to be accepted.', ['Approved by the Head of Retail Operations; tested in two branches.']],
  [PBS + 'status', 'Status', 'Where the product stands.', ['in_progress']],

  // ── Simulator practice tasks: field with no Platform equivalent ──
  date(PT + 'planned_end_date', 'End date', 'When the task is planned to finish.'),
]

export const ALIASES = [
  [PT + 'task_name', T + 'task_name'],
  [PT + 'task_description', T + 'task_description'],
  [PT + 'status', T + 'status_id'],
  [PT + 'priority', T + 'priority'],
  [PT + 'planned_start_date', T + 'planned_start_date'],
  [PT + 'due_date', T + 'due_date'],
  ...['activity_code', 'is_milestone', 'name', 'wbs_node_id', 'description', 'planned_start_date', 'planned_end_date', 'actual_start_date',
    'actual_end_date', 'estimation_technique', 'optimistic_duration', 'most_likely_duration', 'pessimistic_duration', 'duration_unit',
    'basis_of_estimate', 'resource_requirements', 'constraints', 'assumptions', 'status'].map((c) => ['sim.activity_list.' + c, AL + c]),
  ...['scheduling_methodology', 'scheduling_tool', 'level_of_accuracy', 'units_of_measure', 'reporting_formats', 'schedule_model_maintenance',
    'control_thresholds_json', 'variance_thresholds_json', 'status', 'version'].map((c) => ['sim.schedule_management_plans.' + c, SMP + c]),
]
