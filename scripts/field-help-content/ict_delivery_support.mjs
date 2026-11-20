// v1345 slice 2, wave 4c — ICT delivery, roadmap, recovery, runbook and support registers (source for SQL/v1509).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies:
// role titles, "Example … Ltd", globally familiar places, no product or brand names.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const ROWS_T = 'One row per line; each column has its own cell.'
const RAG = 'Green on track, Amber at risk, Red off track and needing help.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const DO = 'register:ict_delivery_overview:'
const DR = 'register:ict_disaster_recovery:'
const RB = 'register:ict_runbooks:'
const SM = 'register:ict_support_model:'
const MS = 'register:ict_technology_milestones:'
const RM = 'register:ict_technology_roadmap:'
const WS = 'register:ict_workstreams:'

export const MODULE = 'registers_ict_delivery'
export const ROWS = [
  // ── Delivery Overview ──
  [DO + 'delivery_lead', 'Delivery lead', 'The person accountable for delivering the technology change.', ['Head of Technology Delivery']],
  [DO + 'delivery_type', 'Delivery type', 'The kind of technology change.', ['System replacement']],
  [DO + 'delivery_approach', 'Delivery approach', 'How the work is organised: sequential stages, short iterations, or a mix.', ['Hybrid']],
  [DO + 'current_phase', 'Current phase', 'The phase the delivery is in now.', ['Build']],
  D(DO + 'target_go_live', 'Target go-live', 'When the change is planned to go live.'),
  [DO + 'executive_sponsor', 'Executive sponsor', 'The senior person who owns the business case and supports the delivery.', ['Chief Operating Officer']],
  [DO + 'governance_forum', 'Governance forum', 'The group that oversees the delivery and makes key decisions.', ['Technology Steering Committee']],
  [DO + 'reporting_cadence', 'Reporting cadence', 'How often status is reported to the governance forum.', ['Fortnightly']],
  [DO + 'capabilities', 'Capabilities being delivered', 'What the business will be able to do once this is live.', ['Open accounts online', 'Real-time payments'], LINES],
  [DO + 'environments_in_scope', 'Environments in scope', 'The environments the delivery needs.', ['Test', 'User acceptance test', 'Production']],
  [DO + 'business_change_impact', 'Business change impact', 'How the change affects people, processes and customers.', ['Branch staff in London and Dubai move to new screens; two manual processes are removed.']],
  [DO + 'schedule_rag', 'Schedule RAG', 'Whether the delivery is on time.', ['Amber'], RAG],
  [DO + 'scope_rag', 'Scope RAG', 'Whether the agreed scope will be delivered.', ['Green'], RAG],
  [DO + 'quality_rag', 'Quality RAG', 'Whether quality is good enough, for example defect levels.', ['Green'], RAG],
  [DO + 'cost_rag', 'Cost RAG', 'Whether the delivery is within budget.', ['Amber'], RAG],
  [DO + 'headline', 'Headline this period', 'Two or three sentences on progress since the last report.', ['Build is 80% complete. Testing starts two weeks late because of environment delays; go-live date still holds.']],
  [DO + 'delivery_team', 'Delivery team', 'The key roles and who fills them.', ['Test Lead – Lead Tester, Example Partner Ltd'], ROWS_T],
  [DO + 'suppliers', 'Suppliers and partners', 'External companies involved and what they provide.', ['Example Software Ltd – core system', 'Example Partner Ltd – testing'], LINES],
  [DO + 'expected_benefits', 'Expected benefits', 'The benefits the change should bring.', ['Cut account opening time from 3 days to 10 minutes', 'Save 400,000 a year in licence costs'], LINES],

  // ── Disaster Recovery ──
  [DR + 'dr_owner', 'DR owner', 'The person accountable for disaster recovery of these systems.', ['Head of Infrastructure']],
  D(DR + 'last_dr_test', 'Last DR test', 'When recovery was last tested.'),
  D(DR + 'next_dr_test', 'Next DR test', 'When recovery is next due to be tested.'),
  [DR + 'recovery_tier', 'Recovery tier', 'How critical the systems are, which sets how fast they must be restored.', ['Tier 1 – Critical']],
  [DR + 'dr_strategy', 'DR strategy', 'How the standby is set up.', ['Hot standby']],
  [DR + 'dr_site', 'DR site', 'Where the systems are recovered.', ['Secondary data centre, Dubai']],
  [DR + 'replication_approach', 'Replication approach', 'How data is copied to the recovery site.', ['Databases copied continuously; files copied every 15 minutes.']],
  [DR + 'backup_schedule', 'Backup schedule', 'When backups are taken.', ['Full backup – Sunday 01:00', 'Incremental backup – daily 01:00'], LINES],
  [DR + 'backup_retention', 'Backup retention', 'How long each type of backup is kept.', ['Daily – 30 days', 'Monthly – 7 years'], LINES],
  [DR + 'off_site_copy', 'Off-site copy', 'Tick if a copy of the backups is kept at another location.', ['Ticked']],
  [DR + 'invocation_criteria', 'Invocation criteria', 'When disaster recovery is started, and who decides.', ['Primary site down for more than 1 hour – Head of Infrastructure decides'], LINES],
  [DR + 'recovery_steps', 'Recovery steps', 'The main steps to bring the systems up at the recovery site.', ['Confirm the primary site is down', 'Switch the database to standby', 'Redirect network traffic', 'Run checks'], LINES],
  [DR + 'failback_steps', 'Failback steps', 'The steps to move back to the primary site afterwards.', ['Copy data back', 'Switch traffic back', 'Run checks'], LINES],
  [DR + 'dr_test_types', 'DR test types', 'The kinds of recovery test carried out.', ['Full failover', 'Backup restore']],
  [DR + 'test_results', 'Test results', 'What the last test showed, including times achieved.', ['Full failover completed in 2 hours 40 minutes; no data lost. Two runbook steps need updating.']],
  [DR + 'readiness_issues', 'Readiness issues', 'Problems that would slow or stop recovery.', ['Runbook out of date for the payments service'], LINES],
  [DR + 'dr_team', 'DR team', 'The roles involved in recovery.', ['Head of Infrastructure – decision', 'Database Administrator – database switch'], LINES],
  [DR + 'supplier_contacts', 'Supplier contacts', 'External companies to contact, with their support line.', ['Example Hosting Ltd – +44 20 7946 0123'], LINES],

  // ── Runbooks ──
  [RB + 'service_system', 'Service / system', 'The service or system the runbook is for.', ['Payments service']],
  [RB + 'runbook_owner', 'Runbook owner', 'The person who keeps the runbook up to date.', ['Payments Support Lead']],
  [RB + 'runbook_type', 'Runbook type', 'What kind of task the runbook covers.', ['Incident response']],
  [RB + 'runbook_purpose', 'Purpose', 'What the runbook is for.', ['Restore payment processing when the payments queue stops.']],
  [RB + 'trigger_conditions', 'Trigger conditions', 'When to use this runbook.', ['Alert: payments queue above 1,000 messages for 5 minutes'], LINES],
  [RB + 'prerequisites', 'Prerequisites', 'What must be in place before starting.', ['Incident ticket raised', 'Change approval for restarts'], LINES],
  [RB + 'access_required', 'Access required', 'The access the person running it needs.', ['Administrator access to the payments servers'], LINES],
  [RB + 'steps', 'Steps', 'Each step, in order, with the result you should see.', ['1 – Check the queue monitor – queue size shown'], 'One step per line: Seq – Step – Expected Result.'],
  [RB + 'estimated_duration', 'Estimated duration (minutes)', 'How long the runbook usually takes.', ['20']],
  [RB + 'verification_checks', 'Verification checks', 'How to confirm the task worked.', ['Queue below 50 messages', 'Test payment completes'], LINES],
  [RB + 'escalation_contacts', 'Escalation contacts', 'Who to call if the runbook does not fix the problem.', ['Payments Support Lead', 'Example Software Ltd support line'], LINES],
  [RB + 'known_issues', 'Known issues', 'Known problems and workarounds.', ['Restart may take 10 minutes at month end'], LINES],
  D(RB + 'last_tested', 'Last tested', 'When the runbook was last tried out.'),
  [RB + 'review_frequency', 'Review frequency', 'How often the runbook must be reviewed.', ['Quarterly']],

  // ── Support Model ──
  [SM + 'service_owner', 'Service owner', 'The person accountable for the service once live.', ['Head of Digital Services']],
  D(SM + 'support_start', 'Support start', 'When the support model takes effect.'),
  [SM + 'service_hours', 'Service hours', 'When the service is supported.', ['24x7']],
  [SM + 'services_supported', 'Services supported', 'The services this model covers.', ['Internet banking', 'Mobile app'], LINES],
  [SM + 'tier_structure', 'Tier structure', 'The support levels and what each handles.', ['Tier 1 – service desk – first contact', 'Tier 2 – application support – diagnosis', 'Tier 3 – development team – code fixes'], LINES],
  [SM + 'support_teams', 'Support teams', 'The teams involved and where they sit.', ['Service desk – Cairo', 'Application support – London'], LINES],
  [SM + 'supplier_support', 'Supplier support', 'What suppliers support and under which contract.', ['Example Software Ltd – core system – 24x7 contract'], LINES],
  [SM + 'priority_definitions', 'Priority definitions', 'What each priority level means.', ['P1 – service down for all customers', 'P2 – major feature down'], LINES],
  [SM + 'service_levels', 'Service levels', 'Response and fix times for each priority.', ['P1 – 15 minutes – 4 hours'], 'One level per line: Priority – Response – Resolution.'],
  [SM + 'incident_process', 'Incident process', 'How incidents are logged, handled and closed.', ['Logged by the service desk, assigned by priority, updates every hour for P1, closed when the user confirms.']],
  [SM + 'problem_process', 'Problem process', 'How root causes of repeat incidents are found and fixed.', ['Any repeat P1 or P2 opens a problem record reviewed weekly.']],
  [SM + 'change_process', 'Change process', 'How changes to the live service are approved and made.', ['Normal changes approved at the weekly change board; emergency changes by the duty manager.']],
  [SM + 'request_process', 'Request process', 'How users ask for access or standard services.', ['Requests raised in the service portal and approved by the line manager.']],
  [SM + 'service_desk_tool', 'Service desk tool', 'The tool used to log tickets.', ['Group service management tool']],
  [SM + 'knowledge_base', 'Knowledge base', 'Where support articles are kept.', ['Support knowledge base, Digital space']],
  [SM + 'monitoring_tools', 'Monitoring tools', 'The tools used to watch the service.', ['Central monitoring platform', 'Log analysis tool'], LINES],
  [SM + 'handover_criteria', 'Handover criteria', 'What must be true before support takes over.', ['Runbooks reviewed', 'Support staff trained', 'No open critical defects'], LINES],
  [SM + 'training_plan', 'Training plan', 'Training support staff need, and when.', ['Service desk – 2-hour briefing – week before go-live'], LINES],

  // ── Technology Milestones ──
  [MS + 'milestone_type', 'Milestone type', 'The kind of milestone.', ['Test exit']],
  D(MS + 'forecast_date', 'Forecast date', 'When the milestone is now expected to be reached.'),
  [MS + 'impact_if_missed', 'Impact if missed', 'How serious it would be to miss this milestone.', ['High']],

  // ── Technology Roadmap ──
  [RM + 'roadmap_owner', 'Roadmap owner', 'The person who owns the roadmap.', ['Chief Technology Officer']],
  [RM + 'horizon', 'Horizon', 'How far ahead the roadmap looks.', ['3 years']],
  D(RM + 'roadmap_start', 'Roadmap start', 'When the roadmap period starts.'),
  [RM + 'vision', 'Vision', 'Where technology should be at the end of the roadmap.', ['A cloud-based, API-first platform that lets us launch new products in weeks.']],
  [RM + 'principles', 'Principles', 'Rules that guide roadmap choices.', ['Cloud first', 'Reuse before buy, buy before build'], LINES],
  [RM + 'current_technologies', 'Current technologies', 'The main technologies in use today.', ['Ageing core system on owned servers', 'Separate channel systems'], LINES],
  [RM + 'constraints_and_issues', 'Constraints & issues', 'Limits and problems the roadmap must deal with.', ['Core system support ends in 2029', 'Skills shortage in cloud engineering'], LINES],
  [RM + 'initiatives', 'Initiatives', 'Each initiative, when it happens and its outcome.', ['API layer – 2027 – all channels use shared APIs'], ROWS_T],
  [RM + 'milestones', 'Milestones', 'Key dates on the roadmap.', ['{example_date} – New core system live for savings'], ROWS_T],
  [RM + 'estimated_investment', 'Estimated investment', 'The total expected cost of the roadmap.', ['18,000,000'], AM],
  [RM + 'funding_sources', 'Funding sources', 'Where the money comes from.', ['Group technology budget', 'Retail change budget'], LINES],
  [RM + 'review_cadence', 'Review cadence', 'How often the roadmap is reviewed.', ['Quarterly']],

  // ── Workstreams ──
  [WS + 'workstream_lead', 'Workstream lead', 'The person who leads the workstream.', ['Data Migration Lead']],
  [WS + 'workstream_type', 'Workstream type', 'The kind of work the workstream covers.', ['Data']],
  [WS + 'risks', 'Risks', 'Each risk to the workstream and how it is reduced.', ['Poor source data quality – early data cleansing'], ROWS_T],
  [WS + 'team', 'Team', 'The roles in the workstream and who fills them.', ['Data Analyst – Senior Data Analyst, Example Partner Ltd'], ROWS_T],
  [WS + 'required_skills', 'Required skills', 'Skills the workstream needs, the level and how many people.', ['Data migration – Expert – 2'], ROWS_T],
  [WS + 'status_headline', 'Status headline', 'One or two sentences on where the workstream stands.', ['Mock migration 2 passed at 99.5%; mock 3 planned next month.']],
  D(WS + 'last_status_update', 'Last status update', 'When the status was last updated.'),
]
