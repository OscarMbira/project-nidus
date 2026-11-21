// v1345 slice 4, wave 4b — change control field help: change requests, change assessment, impact analysis,
// implementation (source for SQL/v1522). Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?].
// CLAUDE.md rule 77 applies. Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const C = 'public.change_requests.'
const CI = 'public.change_implementations.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]

export const MODULE = 'change_control'
export const ROWS = [
  // ── Request ──
  [C + 'change_title', 'Change title', 'A short name that says what change is requested.', ['Add a second identity check for business accounts']],
  [C + 'change_description', 'Change description', 'The change in full: what would be different afterwards.', ['Business account opening adds a company registry check before the account is approved.']],
  [C + 'change_category', 'Change category', 'The area the change mainly affects.', ['Scope']],
  [C + 'change_type', 'Change type', 'Why the change is needed: an enhancement, a defect fix, a corrective or preventive action, or a regulatory requirement.', ['Regulatory Requirement']],
  date(C + 'submission_date', 'Submission date', 'When the change request was submitted.'),
  date(C + 'approval_required_by_date', 'Approval needed by', 'The latest date a decision is needed without delaying the project.'),
  [C + 'change_board_id', 'Change board', 'The group that will decide on this change.', ['Project Change Board']],
  [C + 'requestor_name', 'Requestor', 'The person asking for the change.', ['Head of Compliance']],
  [C + 'requestor_organization', 'Requestor’s organisation', 'The team or organisation the requestor belongs to.', ['Compliance department']],
  [C + 'owner_user_id', 'Change owner', 'The person responsible for taking the change through assessment and decision.', ['Project Manager']],
  [C + 'current_approver_user_id', 'Current approver', 'The person whose approval is needed next.', ['Project Executive']],
  [C + 'reason_for_change', 'Reason for change', 'What has prompted the change.', ['New anti-money-laundering rules from 1 July.']],
  [C + 'business_rationale', 'Business rationale', 'Why the change is worth making for the business.', ['Avoids regulatory fines and keeps business account opening open.']],
  [C + 'current_situation', 'Current situation', 'How things work today.', ['Business accounts are approved after a manual document check only.']],
  [C + 'proposed_solution', 'Proposed solution', 'How the change would be made.', ['Connect the account opening system to the company registry service.']],
  [C + 'alternative_solutions', 'Alternative solutions', 'Other ways the need could be met, and why they were not proposed.', ['Manual registry search by branch staff – too slow at peak times.']],
  [C + 'priority', 'Priority', 'How important the change is compared with others.', ['High']],
  [C + 'urgency', 'Urgency', 'How soon a decision is needed.', ['Urgent']],
  [C + 'business_criticality', 'Business criticality', 'How critical the change is to the business.', ['High']],
  [C + 'related_requirement_ids', 'Related requirements', 'The requirements this change adds to or alters.', ['FR-014, FR-022']],
  [C + 'notes', 'Notes', 'Anything else the assessors should know.', ['Compliance has a draft of the new checks.']],
  [C + 'status_reason', 'Status reason', 'Why the change is at its current status.', ['Waiting for the cost estimate from the supplier.']],

  // ── Assessment ──
  date(C + 'assessment_date', 'Assessment date', 'When the change was assessed.'),
  [C + 'impact_level', 'Overall impact level', 'The overall size of the change’s impact on the project.', ['Medium']],
  [C + 'impact_summary', 'Impact summary', 'The main effects of the change, in a few lines.', ['Adds 10 days and 25,000 to the build stage; no effect on go-live.']],
  [C + 'schedule_impact_level', 'Schedule impact level', 'How much the change affects the schedule.', ['Low']],
  [C + 'schedule_impact_days', 'Schedule impact (days)', 'How many days the change adds (or saves, as a negative number).', ['10']],
  [C + 'schedule_impact_description', 'Schedule impact description', 'How the schedule changes.', ['Build stage ends 10 days later; testing starts on the same date using float.']],
  date(C + 'new_completion_date', 'New completion date', 'The project or stage end date if the change is approved.'),
  [C + 'cost_impact_level', 'Cost impact level', 'How much the change affects cost.', ['Medium']],
  [C + 'cost_impact_amount', 'Cost impact', 'The extra cost of the change (negative for a saving).', ['25,000'], AM],
  [C + 'cost_impact_description', 'Cost impact description', 'What the extra cost is for.', ['Supplier configuration and registry service fees for one year.']],
  [C + 'funding_source', 'Funding source', 'Where the money for the change would come from.', ['Project contingency']],
  [C + 'scope_impact_level', 'Scope impact level', 'How much the change affects scope.', ['Low']],
  [C + 'scope_baseline_affected', 'Scope baseline affected', 'Tick if the agreed scope baseline must be updated.', ['Ticked']],
  [C + 'scope_impact_description', 'Scope impact description', 'How the scope changes.', ['Adds a registry check step to business account opening.']],
  [C + 'quality_impact_level', 'Quality impact level', 'How much the change affects quality.', ['Positive']],
  [C + 'quality_impact_description', 'Quality impact description', 'How quality changes.', ['Fewer business accounts opened with wrong company details.']],
  [C + 'benefits_impact_level', 'Benefits impact level', 'How much the change affects the expected benefits.', ['Neutral']],
  [C + 'benefits_impact_description', 'Benefits impact description', 'How the benefits change.', ['No change to cost savings; lower compliance risk.']],
  [C + 'resource_impact_level', 'Resource impact level', 'How much the change affects people and other resources.', ['Low']],
  [C + 'resource_hours_required', 'Resource hours required', 'Extra hours of work the change needs.', ['120']],
  [C + 'resource_impact_description', 'Resource impact description', 'Who is needed and for how long.', ['One developer for three weeks; one tester for one week.']],
  [C + 'risk_mitigation_required', 'Risk mitigation required', 'Tick if the change brings risks that need their own response.', ['Ticked']],
  [C + 'risk_impact_description', 'Risk impact description', 'New risks the change brings, or risks it reduces.', ['Depends on the registry service being available; adds a supplier risk.']],
  [C + 'feasibility_rating', 'Feasibility', 'How practical the change is to make.', ['Feasible']],
  [C + 'feasibility_assessment', 'Feasibility assessment', 'Why the change is or is not practical.', ['The supplier has built the same link for another bank.']],
  [C + 'implementation_complexity', 'Implementation complexity', 'How complex the change is to put in place.', ['Medium']],
  [C + 'estimated_effort_hours', 'Estimated effort (hours)', 'The total work needed, in hours.', ['160']],
  [C + 'estimated_duration_days', 'Estimated duration (days)', 'How long the change takes from start to finish.', ['15']],
  [C + 'recommendation', 'Recommendation', 'What the assessor recommends the change board decides.', ['Approve with Conditions']],
  [C + 'recommendation_rationale', 'Recommendation rationale', 'Why that decision is recommended.', ['Needed for compliance; cost fits within contingency.']],
  [C + 'conditions', 'Conditions', 'Conditions to attach if the change is approved.', ['Supplier must confirm the registry service level before build starts.']],
  [C + 'overall_impact_severity', 'Impact severity', 'The overall severity of the change’s impact.', ['Medium']],
  [C + 'cost_impact_currency', 'Cost impact currency', 'The currency of the cost impact.', ['GBP']],

  // ── Implementation ──
  [CI + 'implementation_plan', 'Implementation plan', 'How the approved change will be put in place, step by step.', ['Configure registry link – test in UAT – brief branch staff – switch on for all branches.']],
  date(CI + 'planned_start_date', 'Planned start date', 'When work on the change starts.'),
  date(CI + 'planned_end_date', 'Planned end date', 'When the change should be in place.'),
  [CI + 'status', 'Status', 'How far the implementation has got.', ['In progress']],
  [CI + 'notes', 'Notes', 'Anything else to record about the implementation.', ['Branch briefing moved to the Monday team meeting.']],
]
