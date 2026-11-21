// v1345 slice 4, wave 4a — RAID field help: risks, risk responses, issues (+ actions, decisions, issue reports),
// assumptions, inter-project dependencies, decision log (source for SQL/v1521).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const R = 'public.risks.'
const RR = 'public.risk_responses.'
const I = 'public.issues.'
const IA = 'public.issue_actions.'
const ID = 'public.issue_decisions.'
const IR = 'public.issue_reports.'
const IO = 'public.issue_report_options.'
const A = 'public.assumptions.'
const D = 'public.inter_project_dependencies.'
const DL = 'public.project_decisions.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]

export const MODULE = 'raid'
export const ROWS = [
  // ── Risks ──
  [R + 'risk_title', 'Risk title', 'A short name that says what could happen.', ['Supplier delivers the branch hardware late']],
  [R + 'risk_code', 'Risk code', 'The reference of this risk. Leave it blank and the system creates one.', ['RSK-2027-014']],
  [R + 'risk_description', 'Risk description', 'The risk in full: cause, the uncertain event, and its effect.', ['Because the supplier’s factory is overloaded, hardware may arrive 3 weeks late, delaying the branch rollout.']],
  [R + 'risk_type', 'Risk type', 'Whether the risk is a threat (could harm the project) or an opportunity (could help it).', ['Threat']],
  [R + 'risk_category', 'Risk category', 'The area the risk comes from.', ['Schedule']],
  [R + 'sub_category', 'Sub-category', 'A more detailed grouping within the category.', ['Supplier delivery']],
  [R + 'tags', 'Tags', 'Short words that make the risk easy to find and group.', ['hardware', 'supplier']],
  [R + 'affected_areas', 'Affected areas', 'The parts of the project the risk would affect.', ['Branch rollout', 'Training']],
  [R + 'probability', 'Probability', 'How likely the risk is to happen.', ['Medium']],
  [R + 'impact', 'Impact', 'How serious the effect would be if it happened.', ['High']],
  [R + 'pre_probability', 'Probability (before response)', 'How likely the risk is before any response is taken.', ['Medium']],
  [R + 'pre_impact', 'Impact (before response)', 'How serious the effect is before any response is taken.', ['High']],
  [R + 'pre_cost_impact', 'Cost impact', 'The extra cost if the risk happens.', ['45,000'], AM],
  [R + 'pre_schedule_impact_days', 'Schedule impact (days)', 'How many days of delay if the risk happens.', ['15']],
  [R + 'impact_description', 'Impact description', 'What would happen to the project if the risk occurred.', ['Rollout to the last four branches slips by three weeks.']],
  [R + 'potential_consequences', 'Potential consequences', 'The wider effects if the risk happens.', ['Extra supplier costs; branch staff trained too early.']],
  [R + 'proximity', 'Proximity', 'How soon the risk could happen.', ['Within Stage']],
  date(R + 'proximity_date', 'Proximity date', 'The date from which the risk could happen.'),
  [R + 'proximity_notes', 'Proximity notes', 'Anything that explains the timing.', ['Hardware orders close at the end of next month.']],
  [R + 'response_category', 'Response type', 'The kind of response chosen. Threats: avoid, reduce, fallback, transfer, accept, share. Opportunities: exploit, enhance, share, reject.', ['Reduce']],
  [R + 'response_strategy', 'Response strategy', 'The overall way the risk will be handled.', ['Mitigate']],
  [R + 'response_strategy_description', 'Response description', 'What will be done about the risk.', ['Order hardware 6 weeks early and agree a penalty clause with the supplier.']],
  [R + 'contingency_plan', 'Contingency plan', 'What will be done if the risk happens anyway.', ['Lend spare hardware from the London branches.']],
  [R + 'trigger_conditions', 'Trigger conditions', 'The signs that the risk is happening and the contingency plan should start.', ['Supplier confirms a delivery date later than 1 May.']],
  date(R + 'target_mitigation_date', 'Target mitigation date', 'When the response should be complete.'),
  date(R + 'next_review_date', 'Next review date', 'When the risk will next be reviewed.'),
  date(R + 'date_registered', 'Date registered', 'When the risk was first recorded.'),
  [R + 'risk_author_id', 'Risk author', 'The person who raised the risk.', ['Project Manager']],
  [R + 'risk_owner_id', 'Risk owner', 'The person accountable for managing the risk.', ['Procurement Lead']],
  [R + 'risk_owner_user_id', 'Risk owner', 'The person accountable for managing the risk.', ['Procurement Lead']],
  [R + 'risk_actionee_id', 'Risk actionee', 'The person who carries out the response actions.', ['Procurement Officer']],
  [R + 'task_id', 'Linked task', 'The task this risk relates to, if any.', ['Order branch hardware']],
  [R + 'work_package_id', 'Linked work package', 'The work package this risk relates to, if any.', ['WP-03 Branch hardware']],

  // ── Risk responses ──
  [RR + 'action_description', 'Action', 'What will be done as part of the response.', ['Agree a penalty clause with the supplier']],
  [RR + 'action_type', 'Action type', 'The kind of response action.', ['Reduce']],
  [RR + 'status', 'Status', 'How far the action has got.', ['In progress']],
  [RR + 'assigned_to_id', 'Assigned to', 'The person who will carry out the action.', ['Procurement Officer']],
  date(RR + 'target_date', 'Target date', 'When the action should be finished.'),
  [RR + 'estimated_cost', 'Estimated cost', 'What the action is expected to cost.', ['2,000'], AM],

  // ── Issues ──
  [I + 'issue_title', 'Issue title', 'A short name that says what has gone wrong or what is needed.', ['Branch printers not compatible with the new system']],
  [I + 'issue_code', 'Issue code', 'The reference of this issue. Leave it blank and the system creates one.', ['ISS-2027-031']],
  [I + 'issue_description', 'Issue description', 'What has happened, where, and how it was found.', ['Receipt printers in four Dubai branches fail with the new system; found during pilot testing.']],
  [I + 'issue_type', 'Issue type', 'The kind of issue: a request for change, something not meeting its specification, a problem or concern, and so on.', ['Off-Specification']],
  [I + 'priority', 'Priority', 'How urgently the issue must be dealt with compared with others.', ['High']],
  [I + 'severity', 'Severity', 'How serious the issue’s effect is.', ['Major']],
  [I + 'urgency', 'Urgency', 'When the issue needs to be resolved.', ['This Week']],
  [I + 'priority_rationale', 'Priority rationale', 'Why this priority was chosen.', ['Blocks the pilot sign-off planned for Friday.']],
  [I + 'severity_rationale', 'Severity rationale', 'Why this severity was chosen.', ['Customers cannot get printed receipts in four branches.']],
  date(I + 'date_raised', 'Date raised', 'When the issue was raised.'),
  date(I + 'due_date', 'Due date', 'When the issue must be resolved.'),
  date(I + 'estimated_resolution_date', 'Estimated resolution date', 'When the issue is now expected to be resolved.'),
  [I + 'raised_by_id', 'Raised by', 'The person who raised the issue.', ['Branch Manager']],
  [I + 'author_id', 'Author', 'The person who recorded the issue.', ['Project Support Officer']],
  [I + 'owner_id', 'Owner', 'The person accountable for resolving the issue.', ['Technical Lead']],
  [I + 'related_product_id', 'Related product', 'The project product the issue affects, if any.', ['Branch account opening system']],
  [I + 'cause_description', 'Cause', 'What caused the issue, if known.', ['The printer driver was not tested with the new system.']],
  [I + 'impact_description', 'Impact description', 'How the issue affects the project.', ['Pilot sign-off is delayed until printers are fixed.']],
  [I + 'scope_impact', 'Scope impact', 'How the issue changes what the project delivers.', ['None if the printers are replaced; otherwise printing is removed from scope.']],
  [I + 'cost_impact', 'Cost impact', 'The extra cost the issue causes.', ['8,000'], AM],
  [I + 'schedule_impact_days', 'Schedule impact (days)', 'How many days of delay the issue causes.', ['5']],
  [I + 'affected_areas', 'Affected areas', 'The parts of the project the issue affects.', ['Pilot branches', 'Receipts']],
  [I + 'tags', 'Tags', 'Short words that make the issue easy to find and group.', ['printers', 'pilot']],

  // ── Issue actions ──
  [IA + 'action_description', 'Action', 'What will be done to deal with the issue.', ['Install the updated printer driver in the pilot branches']],
  [IA + 'action_type', 'Action type', 'The kind of action.', ['Corrective']],
  [IA + 'status', 'Status', 'How far the action has got.', ['Open']],
  [IA + 'assigned_to_id', 'Assigned to', 'The person who will carry out the action.', ['Desktop Support Engineer']],
  date(IA + 'target_date', 'Target date', 'When the action should be finished.'),
  [IA + 'estimated_effort_hours', 'Estimated effort (hours)', 'How many hours the action should take.', ['6']],
  [IA + 'estimated_cost', 'Estimated cost', 'What the action is expected to cost.', ['500'], AM],

  // ── Issue decisions ──
  [ID + 'decision_type', 'Decision type', 'What was decided about the issue: approve, reject, defer, escalate, accept a concession or ask for more information.', ['Approve']],
  [ID + 'decision_maker_name', 'Decision maker', 'Who made the decision.', ['Project Executive']],
  [ID + 'decision_maker_role', 'Decision maker’s role', 'The role of the person who decided.', ['Project board member']],
  [ID + 'decision_rationale', 'Rationale', 'Why the decision was made.', ['Replacing the printers costs less than delaying the pilot.']],
  [ID + 'conditions', 'Conditions', 'Any conditions attached to the decision.', ['Printers must be replaced before the second rollout wave.']],
  date(ID + 'review_date', 'Review date', 'When the decision should be reviewed.'),

  // ── Issue report ──
  [IR + 'report_reference', 'Report reference', 'The reference of this issue report.', ['IRP-2027-007']],
  [IR + 'version_no', 'Version', 'The version of this report.', ['1.0']],
  date(IR + 'report_date', 'Report date', 'When the report was written.'),
  [IR + 'report_status', 'Report status', 'Where the report is in its review.', ['Draft']],
  [IR + 'author_id', 'Author', 'The person who wrote the report.', ['Project Manager']],
  [IR + 'prepared_by_id', 'Prepared by', 'The person who prepared the report, if different from the author.', ['Project Support Officer']],
  [IR + 'issue_identifier', 'Issue identifier', 'The issue this report is about.', ['ISS-2027-031']],
  [IR + 'issue_type', 'Issue type', 'The kind of issue.', ['Off-Specification']],
  [IR + 'issue_title', 'Issue title', 'The issue’s short name.', ['Branch printers not compatible with the new system']],
  [IR + 'issue_description', 'Issue description', 'The issue in full, for the people deciding on it.', ['Receipt printers in four Dubai branches fail with the new system.']],
  [IR + 'affects_stage_tolerances', 'Affects stage tolerances', 'Tick if the issue may push the current stage beyond its agreed limits.', ['Ticked']],
  [IR + 'affects_project_tolerances', 'Affects project tolerances', 'Tick if the issue may push the whole project beyond its agreed limits.', ['Not ticked']],
  [IR + 'tolerance_impact_details', 'Tolerance impact details', 'How the tolerances are affected.', ['Stage cost may exceed tolerance by 2%.']],
  [IR + 'decision_required', 'Decision required', 'The decision you are asking for.', ['Approve replacing the printers in four branches.']],
  [IR + 'decision_by', 'Decision by', 'Who must make the decision.', ['Project board']],
  date(IR + 'decision_date', 'Decision date', 'When the decision was made.'),
  [IR + 'decision_made', 'Decision made', 'The decision that was taken.', ['Approved – replace printers before the second wave.']],
  [IR + 'decision_made_by_id', 'Decision made by', 'The person who made the decision.', ['Project Executive']],
  [IR + 'decision_conditions', 'Decision conditions', 'Conditions attached to the decision.', ['Cost to come from contingency.']],
  date(IR + 'closure_date', 'Closure date', 'When the issue was closed.'),
  [IR + 'closure_outcome', 'Closure outcome', 'How the issue was resolved.', ['Printers replaced; pilot signed off.']],
  [IR + 'closure_verified_by_id', 'Closure verified by', 'The person who confirmed the issue is resolved.', ['Branch Manager']],
  [IR + 'follow_up_required', 'Follow-up required', 'Tick if more work is needed after closure.', ['Ticked']],
  [IR + 'follow_up_details', 'Follow-up details', 'What follow-up is needed.', ['Check printers in the remaining branches before rollout.']],
  [IR + 'lessons_captured', 'Lessons captured', 'Tick once lessons from this issue have been recorded.', ['Ticked']],
  [IR + 'lessons_summary', 'Lessons summary', 'What the team learned.', ['Test all branch peripherals in the pilot plan.']],
  [IO + 'options_analysis', 'Options analysis', 'A summary of the options considered for resolving the issue.', ['Three options: replace printers, update drivers, remove printing.']],
  [IO + 'option_title', 'Option title', 'A short name for the option.', ['Replace printers']],
  [IO + 'option_description', 'Option description', 'What the option involves.', ['Buy 12 compatible printers for the four affected branches.']],
  [IO + 'pros', 'Pros', 'The advantages of the option.', ['Fixes the problem for good.']],
  [IO + 'cons', 'Cons', 'The disadvantages of the option.', ['Costs 8,000 and takes 5 days.']],
  [IO + 'feasibility', 'Feasibility', 'How practical the option is.', ['High']],
  [IO + 'cost_implications', 'Cost implications', 'What the option would cost.', ['8,000 from contingency.']],
  [IO + 'time_implications', 'Time implications', 'How the option affects the schedule.', ['5 days; no effect on go-live.']],
  [IO + 'risk_implications', 'Risk implications', 'New risks the option brings.', ['Low – standard printers.']],
  [IO + 'recommendation', 'Recommendation', 'The option you recommend.', ['Replace printers']],
  [IO + 'recommendation_rationale', 'Recommendation rationale', 'Why you recommend it.', ['Lowest long-term cost and no impact on go-live.']],

  // ── Assumptions ──
  [A + 'assumption_description', 'Assumption', 'Something the plan takes as true but has not yet been confirmed.', ['Stakeholder sign-off will be available within 5 working days.']],
  [A + 'status', 'Validation status', 'Whether the assumption is still open, confirmed true, proven wrong, or closed.', ['Active']],
  [A + 'owner_user_id', 'Owner', 'The person responsible for checking the assumption.', ['Project Manager']],
  [A + 'impact_severity', 'Impact', 'How serious it would be if the assumption proved wrong.', ['High']],
  date(A + 'next_review_date', 'Next review date', 'When the assumption will next be checked.'),
  [A + 'impact_if_invalid', 'Impact if wrong', 'What would happen to the project if the assumption is wrong.', ['Pilot sign-off slips by two weeks.']],
  [A + 'validation_notes', 'Notes', 'Anything else, such as how the assumption was checked.', ['Confirmed with the Head of Retail’s office on 3 March.']],

  // ── Inter-project dependencies ──
  [D + 'dependency_code', 'Dependency code', 'The reference of this dependency.', ['DEP-2027-012']],
  [D + 'dependency_name', 'Dependency name', 'A short name for the dependency.', ['Network upgrade before branch rollout']],
  [D + 'dependency_description', 'Description', 'What depends on what, and why.', ['Branch rollout needs the faster network links delivered by the infrastructure project.']],
  [D + 'source_project_id', 'Source project', 'The project that delivers something.', ['Branch Network Upgrade']],
  [D + 'target_project_id', 'Target project', 'The project that needs it.', ['Dubai Branch Network Refresh']],
  [D + 'external_dependency', 'External dependency', 'Something outside your organisation the project relies on, if it is not another project.', ['Telecoms provider line installation']],
  [D + 'portfolio_id', 'Portfolio', 'The portfolio the dependency belongs to, if any.', ['Retail Transformation Portfolio']],
  [D + 'programme_id', 'Programme', 'The programme the dependency belongs to, if any.', ['Branch Modernisation Programme']],
  [D + 'dependency_type', 'Dependency type', 'How the two pieces of work are linked in time, or what kind of link it is.', ['Finish-to-Start (FS)']],
  [D + 'dependency_strength', 'Dependency strength', 'Whether the link is fixed (hard) or could be worked around (soft).', ['Hard']],
  [D + 'dependency_criticality', 'Criticality', 'How important the dependency is.', ['High']],
  [D + 'is_critical_path', 'On critical path', 'Tick if a delay here delays the target project’s end date.', ['Ticked']],
  [D + 'lag_days', 'Lag (days)', 'Days that must pass after the source work before the target work can start.', ['5']],
  [D + 'lead_days', 'Lead (days)', 'Days the target work may start before the source work finishes.', ['0']],
  [D + 'dependency_status', 'Status', 'Where the dependency stands.', ['At Risk']],
  [D + 'risk_level', 'Risk level', 'How likely the dependency is to cause trouble.', ['Medium']],
  [D + 'probability_of_failure', 'Probability of failure (%)', 'How likely the dependency is not to be met.', ['30'], 'A percentage from 0 to 100.'],
  [D + 'expected_impact_days', 'Expected impact (days)', 'How many days of delay if the dependency fails.', ['20']],
  [D + 'risk_description', 'Risk description', 'What could go wrong with the dependency.', ['The telecoms provider may not install the new lines on time.']],
  [D + 'impact_description', 'Impact description', 'What happens to the target project if the dependency fails.', ['Rollout to the last four branches waits for the new lines.']],
  [D + 'mitigation_plan', 'Mitigation plan', 'What will be done to reduce the risk.', ['Book installation slots early; use 4G backup links if needed.']],

  // ── Decision log ──
  [DL + 'decision_title', 'Decision title', 'A short statement of what was decided.', ['Pilot in two branches before full rollout']],
  [DL + 'description', 'Description', 'The decision in full, with its context.', ['The board agreed to pilot in two London branches for four weeks before rolling out to Dubai.']],
  date(DL + 'decision_date', 'Decision date', 'When the decision was made.'),
  [DL + 'decided_by_name', 'Decided by', 'The person or group who made the decision.', ['Project board']],
  [DL + 'category', 'Category', 'The area the decision relates to.', ['Technical']],
  [DL + 'status', 'Status', 'Where the decision stands.', ['Approved']],
  [DL + 'priority', 'Priority', 'How important the decision is.', ['High']],
  date(DL + 'review_date', 'Review date', 'When the decision should be reviewed.'),

  // ── Simulator practice issue report ──
  ['sim.practice_issue_reports.report_title', 'Report title', 'A short title for the issue report.', ['Branch printers not compatible – issue report']],
]
