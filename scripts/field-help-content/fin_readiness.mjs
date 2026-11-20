// v1345 slice 2, wave 3d part 2 — FIN operational readiness field help (source for SQL/v1504).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const DT = 'Date and time, in your organisation’s format.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const C = 'register:*:'
const BR = 'register:fin_branch_readiness:'
const BU = 'register:fin_business_readiness:'
const CC = 'register:fin_contact_centre_readiness:'
const PR = 'register:fin_process_readiness:'
const TE = 'register:fin_technology_readiness:'
const MO = 'register:fin_readiness_monitoring:'
const SM = 'register:fin_support_model:'
const US = 'register:fin_user_support:'
const SO = 'register:fin_sops:'
const TR = 'register:fin_transformation_readiness:'

export const MODULE = 'registers_fin_readiness'
export const ROWS = [
  // ── Common fields ──
  [C + 'training_completion', 'Training completion', 'The share of people who have completed their training, as a percentage.', ['85']],
  [C + 'team_lead', 'Team lead', 'The person leading the team.', ['Contact Centre Team Lead']],
  [C + 'criticality', 'Criticality', 'How important this is to the business.', ['High', 'Medium', 'Low']],
  [C + 'version', 'Version', 'The version number.', ['1.0', '2.1'], null, 'Increase it each time it is reissued.'],
  D(C + 'effective_date', 'Effective date', 'The date it starts to apply.'),
  [C + 'published_location', 'Published location', 'Where people can find it.', ['Intranet › Procedures › Branch operations']],
  [C + 'training_required', 'Training required', 'Tick if people need training for this.', ['Ticked']],
  [C + 'metric', 'Metric', 'What is being measured.', ['Payment success rate', 'Response time']],
  [C + 'warning_threshold', 'Warning threshold', 'The value at which the team starts watching closely.', ['80% capacity']],
  [C + 'critical_threshold', 'Critical threshold', 'The value at which action must be taken at once.', ['95% capacity']],
  D(C + 'test_date', 'Test date', 'When it was tested.'),
  [C + 'monitoring_in_place', 'Monitoring in place', 'Tick once monitoring and alerts are working.', ['Ticked']],
  [C + 'deployed_to_production', 'Deployed to production', 'Tick once it is live in production.', ['Ticked']],
  [C + 'accepted_by', 'Accepted by', 'The person who formally accepted it.', ['Head of IT Operations']],
  [C + 'technical_owner', 'Technical owner', 'The person responsible for it technically.', ['Infrastructure Lead']],
  [C + 'process_owner', 'Process owner', 'The person who owns the business process.', ['Head of Payments Operations']],

  // ── Branch Readiness ──
  [BR + 'branch_code', 'Branch code', 'The code of the branch.', ['LON-001']],
  [BR + 'region', 'Region', 'The region the branch belongs to.', ['London', 'Gulf region']],
  [BR + 'branch_type', 'Branch type', 'What kind of branch this is.', ['Full service', 'Express']],
  [BR + 'branch_manager', 'Branch manager', 'The person managing the branch.', ['Branch Manager']],
  [BR + 'staff_count', 'Staff', 'How many people work in the branch.', ['18']],
  [BR + 'super_user', 'Branch super user', 'The trained person who helps colleagues in the branch.', ['Senior Teller']],
  [BR + 'weekend_roster_confirmed', 'Cutover weekend roster confirmed', 'Tick once the staff rota for the cutover weekend is agreed.', ['Ticked']],
  [BR + 'workstations_total', 'Workstations', 'How many workstations the branch has.', ['12']],
  [BR + 'workstations_ready', 'Workstations ready', 'How many workstations are set up for the new system.', ['11']],
  [BR + 'workstation_readiness', 'Workstation readiness', 'Workstations ready as a share of the total, as a percentage.', ['92']],
  [BR + 'printers_configured', 'Printers and passbook printers configured', 'Tick once all printers work with the new system.', ['Ticked']],
  [BR + 'network_tested', 'Network tested', 'Tick once the branch network connection has been tested.', ['Ticked']],
  [BR + 'atms', 'ATMs', 'How many cash machines the branch has.', ['3']],
  [BR + 'teller_ids_created', 'Teller IDs created', 'Tick once every teller has a log-in for the new system.', ['Ticked']],
  [BR + 'cash_limits_loaded', 'Cash and teller limits loaded', 'Tick once cash and teller limits are set in the new system.', ['Ticked']],
  [BR + 'vault_balances_confirmed', 'Vault balances confirmed', 'Tick once the vault cash in the new system matches the physical count.', ['Ticked']],
  [BR + 'access_rights_tested', 'Access rights tested', 'Tick once staff have checked they can do their jobs, and only their jobs.', ['Ticked']],

  // ── Business Readiness ──
  [BU + 'readiness_owner', 'Readiness owner', 'The person accountable for this area being ready.', ['Head of Retail Operations']],
  [BU + 'staff_impacted', 'Staff impacted', 'How many staff in this area are affected.', ['420']],
  [BU + 'super_users_assigned', 'Super users assigned', 'Tick once super users have been named for this area.', ['Ticked']],
  [BU + 'cutover_roster_confirmed', 'Cutover roster confirmed', 'Tick once the rota for the cutover is agreed.', ['Ticked']],
  [BU + 'procedures_updated', 'Procedures updated', 'Tick once working procedures reflect the new system.', ['Ticked']],
  [BU + 'manual_workarounds_ready', 'Manual workarounds ready', 'Tick once manual fallback procedures are documented.', ['Ticked']],
  [BU + 'freeze_procedures', 'Freeze-period procedures', 'How the area works while systems are frozen for the cutover.', ['Manual cash log for the weekend', 'No new account openings Friday afternoon']],
  [BU + 'continuity_confirmed', 'Business continuity confirmed', 'Tick once continuity plans for go-live are confirmed.', ['Ticked']],

  // ── Contact Centre Readiness ──
  [CC + 'area', 'Area / channel', 'The contact centre area or channel.', ['Inbound voice', 'Chat and messaging']],
  [CC + 'agents_required', 'Agents required', 'How many agents are needed.', ['60']],
  [CC + 'agents_trained', 'Agents trained', 'How many agents have been trained.', ['52']],
  [CC + 'extra_capacity', 'Extra agents for go-live week', 'Additional agents planned for go-live week.', ['15']],
  [CC + 'roster_confirmed', 'Go-live roster confirmed', 'Tick once the go-live rota is agreed.', ['Ticked']],
  [CC + 'scripts', 'Scripts', 'Call scripts, their topic and status.', ['Card not working – Go-live questions – Approved']],
  [CC + 'knowledge_base_updated', 'Knowledge base updated', 'Tick once the agent knowledge base covers the new system.', ['Ticked']],
  [CC + 'faq_published', 'Customer FAQ published', 'Tick once the customer FAQ is live.', ['Ticked']],
  [CC + 'ivr_updated', 'IVR menus and messages updated', 'Tick once the phone menu and recorded messages are updated.', ['Ticked']],
  [CC + 'crm_tested', 'Agent desktop tested with the new platform', 'Tick once the agent desktop works with the new system.', ['Ticked']],
  [CC + 'screen_access_tested', 'Agent screen access tested', 'Tick once agents have checked their screen access.', ['Ticked']],
  [CC + 'forecast_daily_contacts', 'Forecast daily contacts (go-live week)', 'How many contacts a day are expected in go-live week.', ['6,500']],
  [CC + 'expected_uplift', 'Expected uplift (%)', 'How much higher than normal contact volumes are expected.', ['40']],
  [CC + 'service_level_target', 'Service level target', 'The answer-time target.', ['80% of calls answered in 30 seconds']],

  // ── Process Readiness ──
  [PR + 'process_name', 'Business process', 'The business process being prepared.', ['Account opening']],
  [PR + 'process_type', 'Process type', 'What kind of process this is.', ['Customer facing', 'Finance and reporting']],
  [PR + 'process_changes', 'What changes', 'How the process changes with the new system.', ['Documents scanned at the counter', 'Account number issued at once']],
  [PR + 'sops_updated', 'SOPs updated', 'Tick once the standard operating procedures are updated.', ['Ticked']],
  [PR + 'sop_references', 'SOP references', 'The procedures that describe the process.', ['SOP-RET-004'], null, 'One per line.'],
  [PR + 'tested_in_uat', 'Tested in UAT', 'Tick once the process passed user acceptance testing.', ['Ticked']],
  [PR + 'tested_in_rehearsal', 'Tested in dress rehearsal', 'Tick once the process was tried in a rehearsal.', ['Ticked']],
  [PR + 'test_evidence', 'Test evidence', 'Where the test evidence is kept.', ['UAT-R1 scenario 14 results']],
  [PR + 'controls_updated', 'Controls updated', 'Tick once checks and controls on the process are updated.', ['Ticked']],
  [PR + 'manual_workaround', 'Manual workaround', 'How the process runs by hand if the system is unavailable.', ['Paper account-opening form, keyed in when the system returns']],
  [PR + 'kpis', 'KPIs', 'The process measures, targets and how they are measured.', ['Account opened in under 15 minutes – 90% – System report']],

  // ── Technology Readiness ──
  [TE + 'component_type', 'Component type', 'What kind of technology component this is.', ['Core banking platform', 'Network']],
  [TE + 'system_name', 'System / component', 'The name of the system or component.', ['Payment gateway']],
  [TE + 'build_version', 'Build / version', 'The version going live.', ['Release 2.4']],
  [TE + 'config_baselined', 'Configuration baselined', 'Tick once the configuration is frozen and recorded.', ['Ticked']],
  D(TE + 'deployment_date', 'Deployment date', 'When it was deployed to production.'),
  [TE + 'backups_verified', 'Backups verified', 'Tick once backups have been restored successfully in a test.', ['Ticked']],
  [TE + 'dr_failover_tested', 'DR failover tested', 'Tick once switching to the disaster-recovery site has been tested.', ['Ticked']],
  [TE + 'batch_schedule_ready', 'Batch schedule ready', 'Tick once scheduled jobs are set up in production.', ['Ticked']],
  [TE + 'access_provisioned', 'Production access provisioned', 'Tick once the right people have production access.', ['Ticked']],
  [TE + 'performance_verified', 'Performance verified', 'Tick once performance targets are met.', ['Ticked']],
  [TE + 'security_cleared', 'Security cleared', 'Tick once security testing findings are closed or accepted.', ['Ticked']],

  // ── Monitoring ──
  [MO + 'monitor_reference', 'Monitor reference', 'The reference of this monitor.', ['MON-014']],
  [MO + 'monitor_type', 'Monitor type', 'What kind of monitoring this is.', ['Availability', 'Interface / message flow']],
  [MO + 'check_frequency', 'Check frequency', 'How often the metric is checked.', ['Every minute', 'Hourly']],
  [MO + 'alert_channels', 'Alert channels', 'How alerts are sent.', ['SMS', 'On-call page']],
  [MO + 'alert_recipients', 'Alert recipients', 'Who receives the alerts.', ['On-call engineer', 'Payments Support Lead']],
  [MO + 'escalate_after_minutes', 'Escalate after (minutes)', 'How long an alert can go unanswered before it is escalated.', ['15']],
  [MO + 'alert_tested', 'Alert tested', 'Tick once an alert has been triggered and received in a test.', ['Ticked']],
  [MO + 'dashboard_ready', 'Dashboard ready', 'Tick once the monitoring dashboard is available.', ['Ticked']],

  // ── Support Model ──
  [SM + 'service_reference', 'Service reference', 'The reference of this support service.', ['SUP-L2-01']],
  [SM + 'support_tier', 'Support tier', 'The level of support this team gives.', ['Service desk (level 1)', 'Application support (level 2)']],
  [SM + 'support_team', 'Support team', 'The team providing the support.', ['Core banking application support']],
  [SM + 'coverage_hours', 'Coverage hours', 'When the team is available.', ['Business hours', '24 × 7']],
  [SM + 'hypercare_coverage', 'Hypercare coverage', 'Extra cover during hypercare.', ['24 × 7 for the first two weeks after go-live']],
  [SM + 'systems_supported', 'Systems supported', 'The systems this team supports.', ['Core banking', 'Payment gateway']],
  [SM + 'services_in_scope', 'Services in scope', 'The services this team covers.', ['Incident resolution', 'Password resets']],
  [SM + 'sla_targets', 'Service level targets', 'For each priority: response, fix and update targets.', ['P1 – 15 min – 4 h – Every 30 min']],
  [SM + 'escalation_path', 'Escalation path', 'Who to escalate to at each level, and when.', ['Level 2 – Application Support Lead – After 1 hour']],
  [SM + 'contact_channels', 'Contact channels', 'How to reach the team.', ['Service desk portal', 'Phone +44 20 7946 0789']],
  [SM + 'knowledge_transfer_complete', 'Knowledge transfer complete', 'Tick once the team has received the knowledge it needs.', ['Ticked']],
  [SM + 'runbooks_handed_over', 'Runbooks handed over', 'Tick once support runbooks have been handed over.', ['Ticked']],
  D(SM + 'effective_from', 'Effective from', 'The date this support arrangement starts.'),
  D(SM + 'handover_date', 'Handover date', 'When support was handed over to this team.'),

  // ── User Support ──
  [US + 'ticket_reference', 'Ticket reference', 'The reference of this support ticket.', ['TCK-10482']],
  [US + 'request_type', 'Request type', 'What the user needed.', ['How-to question', 'Access / password']],
  [US + 'raised_at', 'Raised at', 'When the request was raised.', ['Monday 10:15'], DT],
  [US + 'channel', 'Channel', 'How the request came in.', ['Service desk phone', 'Walk-in / floor walker']],
  [US + 'time_to_resolve', 'Time to resolve', 'How long it took to resolve, in minutes.', ['25']],
  [US + 'resolved_by_tier', 'Resolved by', 'Who resolved the request.', ['Super user', 'Service desk']],
  [US + 'knowledge_article', 'Knowledge article', 'The knowledge article used or created.', ['KB-0231 Reprinting a passbook']],
  [US + 'satisfaction', 'Satisfaction (1–5)', 'How satisfied the user was.', ['4']],
  [US + 'training_gap', 'Training gap found', 'Tick if the request shows a gap in training.', ['Ticked']],
  [US + 'follow_up', 'Follow-up', 'Any follow-up needed.', ['Add passbook reprint to the teller refresher course']],

  // ── SOPs ──
  [SO + 'sop_reference', 'SOP reference', 'The reference of this standard operating procedure.', ['SOP-RET-004']],
  [SO + 'process_area', 'Process area', 'The area the procedure belongs to.', ['Retail branches']],
  [SO + 'sop_owner', 'SOP owner', 'The person responsible for the procedure.', ['Head of Retail Operations']],
  [SO + 'sop_type', 'SOP type', 'Whether the procedure is new, updated or retired.', ['New procedure', 'Updated procedure']],
  [SO + 'procedure_steps', 'Procedure steps', 'Each step: action, role and screen.', ['1 – Verify customer ID – Teller – Customer search']],
  [SO + 'systems_used', 'Systems used', 'The systems the procedure uses.', ['Core banking', 'Document scanner']],
  [SO + 'controls', 'Controls', 'Checks that are part of the procedure, their type and who does them.', ['Second-person check over 10,000 – Preventive – Supervisor']],
  [SO + 'legacy_procedure', 'Legacy procedure replaced', 'The old procedure this one replaces.', ['SOP-RET-004 v3 (legacy system)']],
  [SO + 'key_changes', 'Key changes for staff', 'What staff will do differently.', ['Scan ID documents at the counter']],
  [SO + 'training_reference', 'Training course', 'The course that teaches this procedure.', ['TRN-101 Teller essentials']],
  [SO + 'reviewed_by', 'Reviewed by', 'The person who reviewed the procedure.', ['Operational Risk Manager']],

  // ── Transformation Readiness ──
  [TR + 'readiness_dimension', 'Readiness dimension', 'The area of readiness being assessed.', ['People', 'Technology', 'Process']],
  [TR + 'go_live_wave', 'Go-live wave', 'The go-live wave this readiness applies to.', ['Wave 1 – London']],
  [TR + 'criteria_met', 'Readiness criteria met', 'How many readiness criteria are met.', ['18']],
  [TR + 'criteria_total', 'Readiness criteria total', 'How many readiness criteria there are.', ['20']],
  [TR + 'readiness_score', 'Readiness score (%)', 'Criteria met as a share of the total.', ['90']],
  [TR + 'target_score', 'Target score (%)', 'The score needed to go live.', ['95']],
  [TR + 'key_gaps', 'Key gaps', 'The main gaps still open.', ['Two branches still waiting for printers']],
  [TR + 'remediation_actions', 'Remediation actions', 'What is being done to close the gaps.', ['Printers delivered by Friday']],
  [TR + 'remediation_owner', 'Remediation owner', 'The person closing the gaps.', ['Branch Infrastructure Lead']],
  D(TR + 'remediation_due_date', 'Remediation due date', 'When the gaps must be closed.'),
  [TR + 'go_no_go_recommendation', 'Go / no-go recommendation', 'The recommendation for this dimension.', ['Go', 'Go with conditions']],
  [TR + 'sign_off_obtained', 'Sign-off obtained', 'Tick once this readiness has been signed off.', ['Ticked']],
]
