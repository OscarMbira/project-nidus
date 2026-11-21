// v1345 slice 4, wave 4d — resources, teams, appointments & timesheets field help (source for SQL/v1524).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const PCT = 'A percentage from 0 to 100.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const R = 'public.resources.'
const RA = 'public.resource_assignments.'
const XA = 'public.cross_project_resource_allocations.'
const RF = 'public.resource_forecasts.'
const RK = 'public.resource_skills.'
const PR = 'public.plan_resources.'
const MA = 'public.manager_appointment_records.'
const TA = 'public.team_member_appointment_records.'
const TM = 'public.team_members.'
const FR = 'public.project_functional_roles.'
const TE = 'public.teams.'
const TC = 'public.team_charters.'
const WP = 'public.wp_resources.'
const WI = 'public.project_work_plan_items.'
const TS = 'public.timesheet_entries.'
const OT = 'public.timesheet_overtime_types.'
const WC = 'public.timesheet_work_categories.'
const RR = 'public.timesheet_review_reasons.'
const OS = 'public.organisation_timesheet_settings.'
const AS = 'public.timesheet_approval_settings.'
const RC = 'public.resource_calendar.'
const WS = 'public.workstream_plans.'
const U = 'public.users.'
const PT = 'sim.practice_teams.'
const PTM = 'sim.practice_team_members.'
const lookup = (P, what) => [
  [P + 'code', 'Code', `A short code for this ${what}, used in reports and imports.`, ['OVT-WKND']],
  [P + 'name', 'Name', `The name people see when they pick this ${what}.`, ['Weekend work']],
  [P + 'description', 'Description', `When this ${what} should be used.`, ['Hours worked on Saturday or Sunday at the manager’s request.']],
  [P + 'sort_order', 'Sort order', 'Where the item shows in the list; lower numbers show first.', ['10']],
  [P + 'is_active', 'Active', 'Tick to offer this item; untick to hide it from new entries.', ['Ticked']],
]

export const MODULE = 'resources_teams'
export const ROWS = [
  // ── Resources ──
  [R + 'resource_name', 'Resource name', 'The name of the person, equipment or facility.', ['Senior Business Analyst']],
  [R + 'resource_code', 'Resource code', 'A short code for the resource.', ['RES-0042']],
  [R + 'resource_type', 'Resource type', 'Whether the resource is a person, equipment, a facility or something else.', ['Human']],
  [R + 'resource_category', 'Resource category', 'A grouping that makes resources easier to find.', ['Business analysis']],
  [R + 'resource_description', 'Description', 'What the resource is or does.', ['Analyst experienced in retail banking processes.']],
  [R + 'is_active', 'Active', 'Tick if the resource can still be used.', ['Ticked']],
  [R + 'is_available', 'Available', 'Tick if the resource is free to take new work.', ['Ticked']],
  [R + 'default_capacity_hours_per_day', 'Hours per day', 'The normal working hours a day for this resource.', ['8']],
  [R + 'default_capacity_days_per_week', 'Days per week', 'The normal working days a week.', ['5']],
  [R + 'default_capacity_percentage', 'Capacity (%)', 'How much of the resource’s time is available for project work.', ['80'], PCT],
  [R + 'hourly_rate', 'Hourly rate', 'The cost of one hour of this resource.', ['65'], AM],
  [R + 'daily_rate', 'Daily rate', 'The cost of one day of this resource.', ['520'], AM],
  [R + 'currency_code', 'Currency', 'The currency of the rates.', ['GBP']],
  [R + 'user_id', 'Link to user', 'The system user this resource represents, if it is a person.', ['Senior Business Analyst']],
  [R + 'team_id', 'Link to team', 'The team the resource belongs to.', ['Branch Change Team']],

  // ── Resource assignments ──
  [RA + 'assignment_type', 'Assignment type', 'What the resource is assigned to: a project, task, work package, user story or Kanban card.', ['Task']],
  [RA + 'assignment_target_id', 'Assign to', 'The item the resource works on.', ['Configure counters']],
  date(RA + 'assignment_start_date', 'Start date', 'When the assignment starts.'),
  date(RA + 'assignment_end_date', 'End date', 'When the assignment ends.'),
  [RA + 'allocated_hours_per_day', 'Hours per day', 'Hours a day the resource spends on this assignment.', ['4']],
  [RA + 'total_allocated_hours', 'Total hours', 'Total hours allocated over the whole assignment.', ['40']],
  [RA + 'allocation_percentage', 'Allocation %', 'Share of the resource’s time given to this assignment.', ['50'], PCT],
  [RA + 'assignment_status', 'Status', 'Where the assignment stands.', ['Confirmed']],
  [RA + 'role_in_assignment', 'Role', 'The resource’s role in this work.', ['Lead analyst']],
  [RA + 'responsibility_description', 'Responsibility description', 'What the resource is responsible for.', ['Writes the process maps and gets sign-off.']],
  [RA + 'notes', 'Notes', 'Anything else about the assignment.', ['Out of office the last week of the month.']],

  // ── Cross-project allocations ──
  [XA + 'resource_id', 'Resource', 'The resource being allocated.', ['Senior Business Analyst']],
  [XA + 'project_id', 'Project', 'The project the resource is allocated to.', ['Dubai Branch Network Refresh']],
  [XA + 'portfolio_id', 'Portfolio', 'The portfolio, if the allocation is at portfolio level.', ['Retail Transformation Portfolio']],
  [XA + 'programme_id', 'Programme', 'The programme, if the allocation is at programme level.', ['Branch Modernisation Programme']],
  date(XA + 'allocation_start_date', 'Start date', 'When the allocation starts.'),
  date(XA + 'allocation_end_date', 'End date', 'When the allocation ends.'),
  [XA + 'allocation_notes', 'Notes', 'Anything else about the allocation.', ['Shared with the card services project on Fridays.']],
  [XA + 'allocation_percentage', 'Allocation percentage', 'Share of the resource’s time given to this allocation.', ['60'], PCT],
  [XA + 'allocated_hours_per_week', 'Hours per week', 'Hours a week the resource spends here.', ['24']],
  [XA + 'allocation_type', 'Allocation type', 'How the resource is shared: dedicated, shared, part-time or on demand.', ['Shared']],
  [XA + 'allocation_status', 'Status', 'Where the allocation stands.', ['Confirmed']],
  [XA + 'allocation_priority', 'Priority', 'How important this allocation is if there is a clash.', ['High']],
  [XA + 'is_critical_resource', 'Critical resource', 'Tick if the work cannot go ahead without this resource.', ['Ticked']],

  // ── Resource forecasts ──
  [RF + 'forecast_scope', 'Scope', 'What the forecast covers: the organisation, a portfolio or a programme.', ['Portfolio']],
  [RF + 'portfolio_id', 'Portfolio', 'The portfolio the forecast is for, if any.', ['Retail Transformation Portfolio']],
  [RF + 'programme_id', 'Programme', 'The programme the forecast is for, if any.', ['Branch Modernisation Programme']],
  date(RF + 'forecast_start_date', 'Start date', 'The start of the period forecast.'),
  date(RF + 'forecast_end_date', 'End date', 'The end of the period forecast.'),
  [RF + 'forecast_type', 'Forecast type', 'How often the forecast is broken down.', ['Monthly']],
  [RF + 'resource_category', 'Resource category', 'The kind of resource forecast.', ['Business analysis']],
  [RF + 'resource_type', 'Resource type', 'Whether the forecast is for people, equipment or facilities.', ['Human']],
  [RF + 'forecasted_demand_count', 'Demand count', 'How many of this resource will be needed.', ['6']],
  [RF + 'forecasted_demand_hours', 'Demand hours', 'How many hours of this resource will be needed.', ['960']],
  [RF + 'forecasted_availability_count', 'Availability count', 'How many of this resource will be available.', ['4']],
  [RF + 'forecasted_availability_hours', 'Availability hours', 'How many hours will be available.', ['640']],
  [RF + 'forecast_confidence_level', 'Confidence level', 'How sure you are of the forecast.', ['Medium']],
  [RF + 'forecast_confidence_percentage', 'Confidence (%)', 'How sure you are, as a percentage.', ['70'], PCT],
  [RF + 'forecast_methodology', 'Methodology', 'How the forecast was made.', ['Historical Data']],

  // ── Resource skills ──
  [RK + 'skill_name', 'Skill name', 'The skill the resource has.', ['Process mapping']],
  [RK + 'skill_category', 'Category', 'The group the skill belongs to.', ['Business analysis']],
  [RK + 'proficiency_level', 'Proficiency level', 'How good the resource is at the skill.', ['Advanced']],
  [RK + 'years_of_experience', 'Years of experience', 'How many years the resource has used the skill.', ['6']],
  [RK + 'certification', 'Certification', 'A certificate that proves the skill, if any.', ['Business analysis practitioner certificate']],
  [RK + 'notes', 'Notes', 'Anything else about the skill.', ['Mostly retail banking processes.']],

  // ── Plan resources ──
  [PR + 'resource_name', 'Resource name', 'The resource the plan needs.', ['Branch trainers']],
  [PR + 'resource_type', 'Resource type', 'The kind of resource.', ['Human']],
  [PR + 'quantity_required', 'Quantity required', 'How many are needed.', ['3']],
  [PR + 'unit_of_measure', 'Unit of measure', 'The unit the quantity is counted in.', ['Person-weeks']],
  [PR + 'cost_per_unit', 'Cost per unit', 'The cost of one unit.', ['2,600'], AM],
  [PR + 'resource_description', 'Description', 'What the resource will do in the plan.', ['Run two-day training sessions in each branch.']],
  [PR + 'availability_constraints', 'Availability constraints', 'Limits on when the resource is available.', ['Not available during the year-end freeze.']],
  [PR + 'resource_summary', 'Resource summary', 'An overview of the people and other resources the plan needs.', ['A team of 12: 2 developers, 3 trainers, 4 branch champions, 3 testers.']],
  [PR + 'resource_requirements', 'Resource requirements', 'The resources the stage needs.', ['3 trainers and 1 test lead for the pilot stage.']],
  [PR + 'resource_allocation', 'Resource allocation', 'How resources are spread across the stage, written as JSON.', ['[{"role": "Trainer", "count": 3}]']],

  // ── Appointments ──
  date(MA + 'assignment_start_date', 'Assignment start date', 'When the manager’s appointment starts.'),
  date(MA + 'assignment_end_date', 'Assignment end date', 'When the appointment ends, if known.'),
  [MA + 'time_commitment_pct', 'Time commitment %', 'How much of their working time the role needs.', ['60'], PCT],
  [MA + 'reporting_to_user_id', 'Reporting to', 'The person the appointee reports to.', ['Project Executive']],
  [MA + 'budget_authority_limit', 'Budget authority limit', 'The most the appointee may approve without escalating.', ['25,000'], AM],
  [MA + 'reporting_frequency', 'Reporting frequency', 'How often the appointee reports progress.', ['Fortnightly']],
  [MA + 'authority_notes', 'Authority notes', 'Anything else about what the appointee may decide.', ['May approve changes within stage tolerance.']],
  [MA + 'known_constraints', 'Known constraints', 'Limits the appointee should know about from the start.', ['Fixed go-live date; supplier contract already signed.']],
  [MA + 'reference_document', 'Reference document', 'A document the appointee should read, such as the mandate.', ['Project mandate MAN-2027-004']],
  [MA + 'appointment_message', 'Invitation message', 'A short note sent with the invitation.', ['Welcome aboard – the first board meeting is next Tuesday.']],
  [TA + 'role_title', 'Role / position title', 'The title of the role on the project.', ['Branch Change Lead']],
  date(TA + 'assignment_start_date', 'Start date', 'When the team member starts on the project.'),
  date(TA + 'assignment_end_date', 'End date', 'When the team member’s time on the project ends, if known.'),
  [TA + 'time_commitment_pct', 'Time commitment %', 'How much of their working time the project needs.', ['50'], PCT],
  [TA + 'reporting_to_user_id', 'Reporting to', 'The person the team member reports to on the project.', ['Project Manager']],
  [TA + 'working_arrangement', 'Working arrangement', 'How the team member works: in the office, remote or a mix.', ['Hybrid']],
  [TA + 'work_location', 'Work location', 'Where the team member mainly works.', ['Dubai office']],
  [TA + 'primary_responsibilities', 'Primary responsibilities', 'The main things the team member is responsible for.', ['Plan branch training; sign off branch readiness.']],
  [TA + 'required_skills', 'Required skills', 'Skills the role needs.', ['Training delivery, change management']],
  [TA + 'appointment_message', 'Invitation message', 'A short note sent with the invitation.', ['Looking forward to working with you on the branch rollout.']],

  // ── Teams and members ──
  [TE + 'project_id', 'Project', 'The project the team works on.', ['Dubai Branch Network Refresh']],
  [TE + 'team_name', 'Team name', 'A short name for the team.', ['Branch Change Team']],
  [TE + 'team_description', 'Description', 'What the team does.', ['Prepares branches and staff for the new system.']],
  [TE + 'team_type', 'Team type', 'The kind of team. Pick one or type a new type.', ['Business change']],
  [TE + 'team_lead_user_id', 'Team lead', 'The person who leads the team.', ['Branch Change Lead']],
  [TE + 'max_team_size', 'Max team size', 'The most people the team should have.', ['8']],
  [TE + 'is_active', 'Active', 'Tick while the team is working; untick when it is disbanded.', ['Ticked']],
  [TE + 'user_id', 'Member', 'A project member to add to the team.', ['Branch Trainer']],
  [TE + 'member_role', 'Member role', 'The role the member plays in the team.', ['Trainer']],
  [TE + 'allocation_percentage', 'Allocation %', 'Share of the member’s time given to this team.', ['50'], PCT],
  date(TE + 'allocation_start_date', 'Start date', 'When the member joins the team.'),
  date(TE + 'allocation_end_date', 'End date', 'When the member leaves the team, if known.'),
  [TE + 'member_comments', 'Comments', 'Anything else about this member’s place in the team.', ['Covers the Abu Dhabi branches too.']],
  [TE + 'change_reason', 'Change reason', 'Why the team is being changed. It is kept in the team’s history.', ['Second trainer added for the larger branches.']],
  [TM + 'user_id', 'Project member', 'The project member to add to the team.', ['Branch Trainer']],
  [TM + 'member_role', 'Functional role', 'The functional role the member plays.', ['Trainer']],
  [TM + 'allocation_percentage', 'Allocation %', 'Share of the member’s time given to this team.', ['50'], PCT],
  [FR + 'role_label', 'Role label', 'The name of the functional role as people on this project see it.', ['Branch Champion']],
  [TC + 'title', 'Charter title', 'A name for the team charter.', ['Branch Change Team charter']],
  [TC + 'status', 'Status', 'Where the charter stands.', ['Draft']],
  [TC + 'purpose', 'Purpose', 'Why the team exists and what it is for.', ['Get every Dubai branch ready for the new system on time.']],
  [U + 'job_title', 'Job title', 'The person’s job title in the directory.', ['Branch Manager']],
  [U + 'department', 'Department', 'The person’s department.', ['Retail Operations']],
  [U + 'phone_number', 'Phone', 'The person’s work phone number.', ['+44 20 7946 0123']],
  [U + 'default_hours_per_day', 'Hours/day', 'The person’s normal working hours a day.', ['8']],
  [U + 'default_hours_per_week', 'Hours/week', 'The person’s normal working hours a week.', ['40']],

  // ── Work package resources and work plans ──
  [WP + 'resource_type', 'Resource type', 'The kind of resource the work package needs.', ['Human']],
  [WP + 'resource_name', 'Resource name', 'The resource the work package needs.', ['Desktop Support Engineer']],
  [WP + 'resource_description', 'Resource description', 'What the resource will do.', ['Install printers in each branch.']],
  [WP + 'quantity_required', 'Quantity required', 'How many are needed.', ['2']],
  [WP + 'unit_of_measure', 'Unit of measure', 'The unit the quantity is counted in.', ['People']],
  [WP + 'cost_estimate', 'Estimated cost', 'The expected cost of the resource.', ['6,000'], AM],
  [WP + 'cost_actual', 'Actual cost', 'What the resource actually cost.', ['5,400'], AM],
  [WP + 'allocated', 'Resource allocated', 'Tick once the resource has been confirmed.', ['Ticked']],
  date(WP + 'allocation_date', 'Allocation date', 'When the resource was confirmed.'),
  date(WI + 'start_date', 'Start', 'When this planned work starts.'),
  date(WI + 'end_date', 'End', 'When this planned work ends.'),
  [WI + 'role_code', 'Role', 'The role doing the work.', ['Trainer']],
  [WI + 'task_label', 'Task', 'What the work is.', ['Train Dubai main branch staff']],
  [WI + 'member_user_id', 'Member', 'The person doing the work.', ['Branch Trainer']],
  [WI + 'priority', 'Priority', 'How important the work is.', ['High']],
  [WI + 'remark', 'Remark', 'Anything else about the work.', ['Morning sessions only.']],
  [WS + 'workstream_name', 'Workstream name', 'The name of the workstream.', ['Branch readiness']],
  [WS + 'lead_name', 'Lead', 'The person who leads the workstream.', ['Branch Change Lead']],
  [WS + 'status', 'Status', 'Where the workstream plan stands.', ['In progress']],
  date(WS + 'start_date', 'Start date', 'When the workstream starts.'),
  date(WS + 'end_date', 'End date', 'When the workstream ends.'),
  [WS + 'objectives', 'Objectives', 'What the workstream must achieve.', ['Every branch trained and signed off before go-live.']],
  [WS + 'tasks_summary', 'Tasks summary', 'The main tasks, in outline.', ['Schedule training; run sessions; collect sign-offs.']],
  [WS + 'notes', 'Notes', 'Anything else about the workstream.', ['Abu Dhabi branches follow in wave 2.']],

  // ── Timesheets ──
  date(TS + 'entry_date', 'Date', 'The day the work was done.'),
  [TS + 'hours_worked', 'Hours', 'How many hours were worked.', ['7.5']],
  [TS + 'start_time', 'Start time', 'When the work started, if you track times.', ['08:30']],
  [TS + 'end_time', 'End time', 'When the work ended.', ['17:00']],
  [TS + 'work_category', 'Work category', 'The kind of work done.', ['Training delivery']],
  [TS + 'work_location', 'Location', 'Whether the work was on site or off site.', ['Onsite']],
  [TS + 'overtime_type_code', 'Type', 'Whether these are normal hours or a type of overtime.', ['Weekend work']],
  [TS + 'activity', 'Activity / task', 'The task or activity the time was spent on.', ['Train Dubai main branch staff']],
  [TS + 'status', 'Status', 'Whether the entry is still a draft or has been submitted.', ['Draft']],
  ...lookup(OT, 'overtime type'),
  ...lookup(WC, 'work category').map((r, i) => (i === 0 ? [r[0], r[1], r[2], ['TRN']] : i === 1 ? [r[0], r[1], r[2], ['Training delivery']] : i === 2 ? [r[0], r[1], r[2], ['Time spent running training sessions.']] : r)),
  ...lookup(RR, 'review reason').map((r, i) => (i === 0 ? [r[0], r[1], r[2], ['HRS-HIGH']] : i === 1 ? [r[0], r[1], r[2], ['Hours look too high']] : i === 2 ? [r[0], r[1], r[2], ['More hours than planned for this task.']] : r)),
  [OS + 'standard_daily_hours', 'Standard daily hours', 'The normal working hours in a day for timesheets.', ['8']],
  [OS + 'max_overtime_per_day', 'Max overtime / day', 'The most overtime hours allowed in a day.', ['3']],
  [OS + 'max_overtime_per_week', 'Max overtime / week', 'The most overtime hours allowed in a week.', ['10']],
  [OS + 'working_days', 'Standard working days', 'The five normal working days of the week.', ['Monday to Friday']],
  [AS + 'approver_role', 'Approver role', 'The role that approves timesheets.', ['Project Manager']],
  [AS + 'escalation_days', 'Escalation days', 'Days a timesheet can wait before it is escalated.', ['3']],
  [AS + 'auto_approve', 'Auto-approve', 'Tick to approve timesheets automatically when nobody acts in time.', ['Not ticked']],

  // ── Resource calendar ──
  date(RC + 'calendar_date', 'Date', 'The day this entry is for.'),
  [RC + 'availability_type', 'Availability type', 'Whether the resource is available, partly available or unavailable.', ['Partial']],
  [RC + 'available_hours', 'Available hours', 'Hours the resource can work that day.', ['4']],
  [RC + 'capacity_percentage', 'Capacity (%)', 'Share of a normal day the resource can work.', ['50'], PCT],
  [RC + 'unavailability_reason', 'Reason', 'Why the resource is not fully available.', ['Annual leave in the afternoon']],
  [RC + 'is_recurring', 'Recurring', 'Tick if this pattern repeats.', ['Ticked']],
  [RC + 'recurrence_pattern', 'Recurrence pattern', 'How the entry repeats.', ['Every Friday']],
  date(RC + 'recurrence_end_date', 'End date', 'When the repeats stop.'),
  [RC + 'notes', 'Notes', 'Anything else about the entry.', ['Training course on Fridays until the end of term.']],

  // ── Simulator practice teams: fields with no Platform equivalent ──
  [PT + 'default_hours_per_day', 'Hours/day', 'The team’s normal working hours a day.', ['8']],
  [PT + 'default_hours_per_week', 'Hours/week', 'The team’s normal working hours a week.', ['40']],
]

export const ALIASES = [
  [PT + 'team_name', TE + 'team_name'],
  [PT + 'team_description', TE + 'team_description'],
  [PT + 'team_type', TE + 'team_type'],
  [PTM + 'user_id', TM + 'user_id'],
  [PTM + 'member_role', TM + 'member_role'],
  [PTM + 'allocation_percentage', TM + 'allocation_percentage'],
]
