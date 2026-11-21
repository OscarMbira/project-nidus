// v1345 slice 4, wave 4f — stakeholder analysis, engagement & communications field help (source for SQL/v1526).
// The stakeholder record itself was done in slice 1 (v1491). Shape: [help_key, title, purpose, examples[], format_notes?,
// extra_notes?]. CLAUDE.md rule 77 applies. Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const SA = 'public.stakeholder_analysis.'
const SM = 'public.stakeholder_assessment_matrix.'
const EP = 'public.stakeholder_engagement_plans.'
const EA = 'public.stakeholder_engagement_actions.'
const ET = 'public.stakeholder_engagement.'
const SR = 'public.stakeholder_relationships.'
const SC = 'public.stakeholder_communications.'
const CL = 'public.stakeholder_communication_log.'
const CS = 'public.communication_management_strategies.'
const CO = 'public.communication_information_options.'
const TC = 'public.team_calls.'
const CM = 'public.comm_meetings.'

export const MODULE = 'stakeholders_comms'
export const ROWS = [
  // ── Stakeholder analysis ──
  [SA + 'stakeholder_id', 'Stakeholder', 'The stakeholder this analysis is about.', ['Head of Retail Banking']],
  [SA + 'power_description', 'Power', 'How much the stakeholder can affect the project, and how.', ['Controls the branch budget and can stop the rollout.']],
  [SA + 'interest_description', 'Interest', 'How much the project affects the stakeholder, and why they care.', ['Owns the branch cost savings in the business case.']],
  [SA + 'depends_on_project', 'Depends on the project', 'What the stakeholder needs from the project.', ['Faster account opening to meet branch targets.']],
  [SA + 'project_depends_on_them', 'Project depends on them', 'What the project needs from the stakeholder.', ['Branch staff time for training.']],
  [SA + 'current_attitude', 'Current attitude', 'How the stakeholder feels about the project now.', ['Supportive']],
  [SA + 'desired_attitude', 'Desired attitude', 'How you need them to feel for the project to succeed.', ['Champion']],
  [SA + 'engagement_priority', 'Engagement priority', 'How much attention this stakeholder needs.', ['High']],
  [SA + 'power_sources', 'Power sources', 'Where the stakeholder’s influence comes from. Tick all that apply.', ['Budget, Position']],
  [SA + 'attitude_notes', 'Attitude notes', 'Why the stakeholder feels as they do.', ['Worried about branch queues during training.']],
  [SA + 'support_rationale', 'Support rationale', 'Why the stakeholder supports or opposes the project.', ['Expects lower costs and better customer scores.']],
  [SA + 'potential_objections', 'Potential objections', 'Concerns they may raise.', ['Training takes staff away from counters at peak times.']],
  [SA + 'influence_strategy', 'Influence strategy', 'How you will build or keep their support.', ['Share pilot results early; agree training times with branch managers.']],
  [SA + 'engagement_approach', 'Engagement approach', 'How you will work with them.', ['Monthly one-to-one; invite to pilot review.']],
  date(SA + 'analysis_date', 'Analysis date', 'When this analysis was done.'),
  [SA + 'analysis_period', 'Analysis period', 'The period the analysis covers.', ['Q2 2027']],

  // ── Assessment matrix ──
  [SM + 'stakeholder_id', 'Stakeholder', 'The stakeholder being assessed.', ['Head of Compliance']],
  date(SM + 'assessment_date', 'Assessment date', 'When the assessment was made.'),
  [SM + 'current_level', 'Current level', 'How engaged the stakeholder is now: unaware, resistant, neutral, supportive or leading.', ['Neutral']],
  [SM + 'desired_level', 'Desired level', 'How engaged they need to be.', ['Supportive']],
  [SM + 'notes', 'Notes', 'Anything else about the gap and how to close it.', ['Needs to see the registry checks before supporting.']],

  // ── Engagement plan ──
  [EP + 'stakeholder_id', 'Stakeholder', 'The stakeholder this plan is for.', ['Head of Retail Banking']],
  [EP + 'engagement_level', 'Current engagement level', 'How engaged the stakeholder is now.', ['Supportive']],
  [EP + 'target_engagement_level', 'Target engagement level', 'How engaged they need to be.', ['Leading']],
  [EP + 'change_scope_impact', 'Change / scope impact', 'How the project changes things for this stakeholder.', ['Their branches change how accounts are opened.']],
  [EP + 'engagement_strategy', 'Engagement strategy', 'How you will move them to the target level.', ['Make them the sponsor of the pilot and share results first.']],
  [EP + 'preferred_communication_method', 'Preferred communication method', 'How they like to be contacted.', ['One-to-one meeting']],
  [EP + 'preferred_communication_frequency', 'Preferred frequency', 'How often they want updates.', ['Monthly']],
  [EP + 'preferred_meeting_type', 'Preferred meeting type', 'The kind of meeting that works best for them.', ['One-to-one']],
  [EP + 'information_sensitivity_level', 'Information sensitivity', 'How sensitive the information shared with them is.', ['Internal']],
  [EP + 'information_needs', 'Information needs', 'What they need to know, and when.', ['Monthly cost savings and pilot results.']],
  [EP + 'relationship_owner_user_id', 'Relationship owner', 'The person who manages the relationship.', ['Project Manager']],
  [EP + 'trust_level', 'Trust level', 'How much trust there is between them and the project.', ['High']],
  [EP + 'engagement_status', 'Engagement status', 'Where the engagement stands.', ['Active']],
  date(EP + 'engagement_period_start', 'Engagement start', 'When this engagement period starts.'),
  date(EP + 'engagement_period_end', 'Engagement end', 'When this engagement period ends.'),
  [EP + 'engagement_barriers', 'Engagement barriers', 'What gets in the way of good engagement.', ['Busy diary during year-end.']],
  [EP + 'mitigation_actions', 'Mitigation actions', 'How you will get around those barriers.', ['Book meetings a quarter ahead.']],
  [EP + 'notes', 'Notes', 'Anything else about the plan.', ['Prefers short written summaries.']],

  // ── Engagement actions and tracking ──
  [EA + 'action_description', 'Action description', 'What will be done to engage the stakeholder.', ['Walk the Head of Retail through pilot results']],
  [EA + 'stakeholder_id', 'Stakeholder', 'The stakeholder the action is for.', ['Head of Retail Banking']],
  [EA + 'owner_user_id', 'Owner', 'The person who carries out the action.', ['Project Manager']],
  date(EA + 'due_date', 'Due date', 'When the action must be done.'),
  [EA + 'status', 'Status', 'Where the action stands.', ['Planned']],
  [EA + 'action_type', 'Action type', 'The kind of engagement action.', ['Meeting']],
  [EA + 'priority', 'Priority', 'How important the action is.', ['High']],
  [EA + 'outcome_notes', 'Outcome notes', 'What happened as a result.', ['Agreed to sponsor the second wave.']],
  [ET + 'engagement_level', 'Engagement level', 'How engaged the stakeholder was at this point.', ['Supportive']],
  [ET + 'satisfaction_level', 'Satisfaction (1–5)', 'How satisfied the stakeholder is with the project.', ['4'], 'A whole number from 1 (low) to 5 (high).'],
  [ET + 'support_level', 'Support level', 'How strongly they support the project.', ['Strong']],
  date(ET + 'engagement_date', 'Engagement date', 'When this engagement took place.'),
  [ET + 'engagement_notes', 'Notes', 'What was discussed or observed.', ['Pleased with pilot speed; worried about training cover.']],

  // ── Relationships ──
  [SR + 'from_stakeholder_id', 'From stakeholder', 'The first stakeholder in the relationship.', ['Head of Retail Banking']],
  [SR + 'to_stakeholder_id', 'To stakeholder', 'The second stakeholder.', ['Branch Manager, Dubai main branch']],
  [SR + 'relationship_type', 'Relationship type', 'How they are connected.', ['Reports to']],
  [SR + 'relationship_strength', 'Relationship strength', 'How strong the connection is.', ['Strong']],
  [SR + 'notes', 'Notes', 'Anything useful about the relationship.', ['Branch managers follow the Head of Retail’s lead on change.']],

  // ── Communication plan ──
  [SC + 'plan_name', 'Plan name', 'A name for the communication plan.', ['Branch rollout communications']],
  [SC + 'plan_description', 'Plan description', 'What the plan covers.', ['How branch staff and customers hear about the new system.']],
  [SC + 'plan_status', 'Status', 'Where the plan stands.', ['Active']],
  date(SC + 'plan_start_date', 'Start date', 'When the plan starts.'),
  date(SC + 'plan_end_date', 'End date', 'When the plan ends.'),
  [SC + 'communication_objectives', 'Communication objectives', 'What the communications must achieve.', ['Every branch knows its go-live date four weeks ahead.']],
  [SC + 'communication_language', 'Language', 'The language the communications are written in.', ['English and Arabic']],
  [SC + 'communication_format', 'Format', 'The usual format of the communications.', ['Email with a one-page summary']],
  [SC + 'communication_detail_level', 'Detail level', 'How much detail the audience needs.', ['Summary']],
  [SC + 'notes', 'Notes', 'Anything else about the plan.', ['Avoid sending during the month-end close.']],
  [SC + 'communication_title', 'Communication title', 'A short name for this planned communication.', ['Fortnightly branch update']],
  [SC + 'communication_type', 'Communication type', 'The kind of communication.', ['Newsletter']],
  [SC + 'communication_channel', 'Communication channel', 'How it is delivered.', ['Email']],
  [SC + 'frequency', 'Frequency', 'How often it is sent.', ['Bi-Weekly']],
  [SC + 'schedule_day', 'Schedule day', 'The day it goes out.', ['Monday']],
  [SC + 'schedule_time', 'Schedule time', 'The time it goes out.', ['09:00']],
  [SC + 'target_audience', 'Target audience', 'Who receives it. Tick the stakeholders.', ['All Dubai branch managers']],
  [SC + 'communication_objective', 'Communication objective', 'What this communication must achieve.', ['Branch managers know what changes next fortnight.']],
  [SC + 'key_messages', 'Key messages', 'The main points to get across.', ['Training dates; what staff must do before go-live.']],
  [SC + 'success_metrics', 'Success metrics', 'How you will know it worked.', ['Every branch confirms its training dates within a week.']],

  // ── Communication log ──
  [CL + 'communication_summary', 'Summary', 'What was communicated.', ['Shared the pilot results and the rollout dates.']],
  [CL + 'meeting_duration_minutes', 'Meeting duration (minutes)', 'How long the meeting lasted, if it was a meeting.', ['45']],
  [CL + 'is_confidential', 'Confidential', 'Tick if the content must not be shared widely.', ['Not ticked']],
  [CL + 'response_required', 'Response required', 'Tick if you need a reply.', ['Ticked']],
  date(CL + 'response_due_date', 'Response due date', 'When a reply is needed.'),
  [CL + 'response_received', 'Response received', 'Tick once the reply has come in.', ['Ticked']],
  [CL + 'response_notes', 'Response notes', 'What the reply said.', ['Agreed the dates for the first wave.']],
  [CL + 'feedback_received', 'Feedback received', 'Any feedback the stakeholder gave.', ['Wants more notice for Saturday training.']],
  [CL + 'effectiveness_rating', 'Effectiveness rating', 'How well the communication worked.', ['4'], 'A whole number from 1 (low) to 5 (high).'],
  [CL + 'next_action', 'Next action', 'What happens next.', ['Send the revised training calendar']],
  date(CL + 'next_action_due_date', 'Next action due date', 'When the next action is due.'),
  date(CL + 'follow_up_date', 'Follow-up date', 'When to follow up.'),

  // ── Communication management strategy: procedure ──
  [CS + 'communication_planning_approach', 'Planning approach', 'How communications are planned.', ['Plan reviewed at each stage boundary; audiences from the stakeholder register.']],
  [CS + 'communication_control_approach', 'Control approach', 'How communications are checked and approved before they go out.', ['Project Manager approves all external messages.']],
  [CS + 'communication_assurance_approach', 'Assurance approach', 'How you check communications are working.', ['Quarterly survey of branch managers.']],
  [CS + 'corporate_communication_policy_reference', 'Corporate policy reference', 'The organisation’s communication policy this follows.', ['Group Communications Policy v4']],
  [CS + 'variance_from_corporate', 'Variance from corporate policy', 'Tick if the project departs from the corporate policy.', ['Not ticked']],
  [CS + 'variance_justification', 'Variance justification', 'Why the project departs from the policy.', ['Branch messages in Arabic need local approval.']],

  // ── Communication options (settings) ──
  [CO + 'option_kind', 'Option kind', 'Which list this option belongs to.', ['Language']],
  [CO + 'option_label', 'Label', 'The text people see in the list.', ['Arabic']],
  [CO + 'option_code', 'Code', 'A short code for the option.', ['ar']],
  [CO + 'sort_order', 'Sort order', 'Where the option shows; lower numbers show first.', ['20']],
  [CO + 'is_active', 'Active', 'Tick to offer the option.', ['Ticked']],

  // ── Calls and meetings ──
  [TC + 'title', 'Title', 'A short name for the call.', ['Weekly branch rollout call']],
  [TC + 'scheduled_at', 'Scheduled at', 'When the call starts.', ['{example_date} 10:00'], DF],
  [TC + 'duration_minutes', 'Duration (minutes)', 'How long the call is planned to last.', ['30']],
  [TC + 'join_link', 'Join link', 'The link people use to join.', ['https://meet.company.example/rollout-call']],
  [TC + 'platform_name', 'Platform', 'The video call service used.', ['Company video service']],
  [TC + 'status', 'Status', 'Where the call stands.', ['Scheduled']],
  [TC + 'description', 'Description', 'What the call is for.', ['Review last week’s branches and next week’s plan.']],
  [TC + 'notes', 'Notes', 'Notes from or about the call.', ['Two branches asked to move dates.']],
  [TC + 'recording_link', 'Recording link', 'Where the recording is kept, if recorded.', ['https://documents.company.example/recordings/rollout-0412']],
  [CM + 'title', 'Title', 'A short name for the meeting.', ['Pilot review meeting']],
  [CM + 'simulation_run_id', 'Simulation run', 'The practice simulation this meeting belongs to, if any.', ['Branch rollout scenario – run 3']],
  [CM + 'project_id', 'Project', 'The project this meeting belongs to, if any.', ['Dubai Branch Network Refresh']],
  [CM + 'scheduled_start', 'Start', 'When the meeting starts.', ['{example_date} 14:00'], DF],
]

export const ALIASES = [
  ['action_description', 'action_description'], ['practice_stakeholder_id', 'stakeholder_id'], ['owner_user_id', 'owner_user_id'],
  ['due_date', 'due_date'], ['status', 'status'], ['action_type', 'action_type'], ['priority', 'priority'], ['outcome_notes', 'outcome_notes'],
].map(([s, p]) => ['sim.practice_engagement_actions.' + s, EA + p])
