// v1345 slice 2, wave 3c — FIN cutover, go-live and hypercare field help (source for SQL/v1502).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const DT = 'Date and time, in your organisation’s format.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const T = (key, title, purpose, example, notes = null) => [key, title, purpose, [example], DT, notes]
const C = 'register:*:'
const CA = 'register:fin_cutover_activities:'
const CC = 'register:fin_cutover_communications:'
const CD = 'register:fin_cutover_dependencies:'
const RS = 'register:fin_runbook_steps:'
const SN = 'register:fin_sanity_checks:'
const PD = 'register:fin_production_deployment:'
const D1 = 'register:fin_day1_validation:'
const GN = 'register:fin_go_no_go:'
const GL = 'register:fin_go_live_decision:'
const CM = 'register:fin_command_centre:'
const DC = 'register:fin_daily_command_centre:'
const HD = 'register:fin_hypercare_defects:'
const HI = 'register:fin_hypercare_incidents:'
const HP = 'register:fin_hypercare_performance_monitoring:'
const IM = 'register:fin_incident_management:'
const TV = 'register:fin_technical_verification:'
const BV = 'register:fin_business_verification:'

export const MODULE = 'registers_fin_cutover'
export const ROWS = [
  // ── Common fields (used by several registers) ──
  [C + 'sequence', 'Run order', 'The order in which this runs; lower numbers come first.', ['10', '20']],
  [C + 'can_run_in_parallel', 'Can run in parallel', 'Tick if this can run at the same time as other items.', ['Ticked for independent data loads']],
  [C + 'planned_minutes', 'Planned duration (minutes)', 'How long this is expected to take, in minutes.', ['90']],
  [C + 'actual_minutes', 'Actual duration (minutes)', 'How long it actually took, in minutes.', ['105']],
  [C + 'open_defects', 'Open defects', 'How many defects are still open.', ['4']],
  [C + 'open_critical_defects', 'Open critical defects', 'Critical defects still open at this point.', ['0']],
  [C + 'open_high_defects', 'Open high defects', 'High defects still open at this point.', ['2']],
  [C + 'attendees', 'Attendees and votes', 'Who took part and how each voted.', ['Head of Operations – Business owner – Go']],
  [C + 'decision_forum', 'Decision forum', 'The meeting or board that makes the decision.', ['Cutover Steering Committee']],
  T(C + 'scheduled_at', 'Scheduled at', 'When this is planned to happen.', 'Saturday 06:00'),
  T(C + 'resolved_at', 'Resolved at', 'When the problem was resolved.', 'Monday 09:40'),
  [C + 'resolution', 'Resolution', 'How the problem was solved.', ['Interface restarted and queued messages reprocessed']],
  [C + 'linked_incident', 'Linked incident', 'The incident this item is linked to.', ['INC-0412']],
  [C + 'affected_activities', 'Affected activities', 'The activities or steps affected.', ['Card load', 'ATM reconnection'], null, 'One per line.'],
  [C + 'workaround', 'Workaround', 'A temporary way to keep working until the fix is in place.', ['Process urgent payments manually through the back office']],
  T(C + 'verified_at', 'Verified at', 'When the verification was completed.', 'Sunday 14:00'),
  [C + 'recommendation', 'Recommendation', 'The recommendation made from this check.', ['Go', 'Go with conditions', 'No-Go']],
  [C + 'verification_reference', 'Verification reference', 'The reference of this verification.', ['VER-TECH-04']],
  [C + 'retest_result', 'Retest result', 'Whether the retest passed.', ['Pass', 'Fail']],
  D(C + 'fixed_date', 'Fixed date', 'When the fix was made.'),
  [C + 'check_reference', 'Check reference', 'The reference of this check.', ['CHK-017']],
  [C + 'actions_taken', 'Actions taken', 'What was done, in order.', ['Restarted the payment interface', 'Informed the contact centre']],
  [C + 'decided_by', 'Decided by', 'Who made the decision.', ['Cutover Manager']],
  T(C + 'decision_at', 'Decision time', 'When the decision was made.', 'Sunday 10:00'),
  [C + 'decision_rationale', 'Decision rationale', 'Why the decision was made.', ['All reconciliations passed; remaining defects have workarounds']],
  [C + 'assigned_to', 'Assigned to', 'The person working on this item.', ['Integration Lead']],
  [C + 'records_loaded', 'Records loaded', 'How many records were loaded.', ['479,820']],
  [C + 'blocked', 'Blocked', 'How many items cannot proceed because of another problem.', ['3']],
  [C + 'reconciliation_reference', 'Reconciliation reference', 'The reconciliation report that supports this item.', ['REC-FIN-07']],
  [C + 'fix_description', 'Fix', 'What was changed to fix the problem.', ['Corrected the fee rule for joint accounts']],
  [C + 'target', 'Target', 'The value or result that must be reached.', ['99.5%', 'Under 2 seconds']],
  [C + 'runbook_reference', 'Runbook reference', 'The runbook or runbook step this item relates to.', ['Cutover runbook v3.2, step 140']],

  // ── Cutover Activities ──
  [CA + 'activity_reference', 'Activity reference', 'The reference of this cutover activity.', ['CUT-140']],
  [CA + 'activity_type', 'Activity type', 'What kind of activity this is.', ['Technical', 'Validation / reconciliation']],
  [CA + 'team', 'Team', 'The team carrying out the activity.', ['Data migration team']],
  [CA + 'critical_path', 'On critical path', 'Tick if a delay here delays the whole cutover.', ['Ticked for the balance load']],
  [CA + 'variance_minutes', 'Over / under plan', 'Actual minus planned minutes; positive means late.', ['15']],
  [CA + 'predecessors', 'Predecessors', 'Activities that must finish before this one starts.', ['CUT-120 Customer load']],
  [CA + 'successors', 'Successors', 'Activities that wait for this one.', ['CUT-160 Balance reconciliation']],
  [CA + 'systems_involved', 'Systems involved', 'The systems this activity uses or changes.', ['Core banking', 'Card system']],
  [CA + 'instructions', 'Instructions', 'Step-by-step instructions for the person doing the activity.', ['Run job MIG_ACC_LOAD; confirm the record count matches the control total']],
  [CA + 'completion_evidence', 'Completion evidence', 'What proves the activity is done.', ['Load log screenshot', 'Reconciliation report REC-ACC-03']],

  // ── Cutover Communications ──
  [CC + 'comm_reference', 'Communication reference', 'The reference of this communication.', ['COMM-09']],
  [CC + 'communication_type', 'Communication type', 'What kind of message this is.', ['Service disruption notice', 'Go-live confirmation']],
  [CC + 'audiences', 'Audiences', 'Who the message is for.', ['Customers', 'Branches', 'Regulator']],
  [CC + 'channels', 'Channels', 'How the message is sent.', ['Email', 'SMS', 'Branch notice']],
  [CC + 'sender', 'Sender', 'The person the message comes from.', ['Head of Communications']],
  [CC + 'approver', 'Approver', 'The person who approves the message before it is sent.', ['Programme Director']],
  T(CC + 'scheduled_send', 'Scheduled send', 'When the message is due to go out.', 'Friday 17:00'),
  T(CC + 'actual_send', 'Actual send', 'When the message actually went out.', 'Friday 17:05'),
  [CC + 'trigger_condition', 'Trigger / condition', 'What must happen before this message is sent.', ['Sent only if the go decision is confirmed']],
  [CC + 'key_messages', 'Key messages', 'The main points the message must get across.', ['Online banking unavailable Saturday 06:00 to Sunday 18:00']],
  [CC + 'message_body', 'Message', 'The full text of the message.', ['Dear customer, our online banking service will be unavailable …']],
  [CC + 'call_to_action', 'Call to action', 'What the reader should do.', ['Withdraw cash before Friday evening if needed']],
  [CC + 'contact_point', 'Contact point for questions', 'Where people can ask questions.', ['Contact centre, +44 20 7946 0123']],
  [CC + 'recipients', 'Recipients', 'How many people the message was sent to.', ['250,000']],
  [CC + 'delivered', 'Delivered', 'How many messages were delivered.', ['248,900']],
  [CC + 'delivery_rate', 'Delivery rate', 'The share of messages delivered, as a percentage.', ['99.6']],
  [CC + 'feedback', 'Feedback and queries', 'Reactions and questions received.', ['Several customers asked whether cards will work abroad']],

  // ── Cutover Dependencies ──
  [CD + 'dependency_reference', 'Dependency reference', 'The reference of this dependency.', ['DEP-012']],
  [CD + 'dependency_type', 'Dependency type', 'Where the dependency comes from.', ['Third party / vendor', 'Regulatory']],
  [CD + 'direction', 'Direction', 'Whether the cutover depends on this, or this depends on the cutover.', ['Cutover depends on it']],
  [CD + 'provider', 'Provided by', 'Who delivers what is needed.', ['Example Card Services Ltd']],
  [CD + 'receiver', 'Needed by (team)', 'The team that needs it.', ['Cards team']],
  [CD + 'criticality', 'Criticality', 'How serious it is if the dependency is not met.', ['Critical', 'Medium']],
  D(CD + 'needed_by_date', 'Needed by date', 'When the dependency must be in place.'),
  D(CD + 'committed_date', 'Committed date', 'The date the provider has committed to.'),
  [CD + 'impact_if_missed', 'Impact if missed', 'What happens if the dependency is not met in time.', ['Card transactions fail after go-live']],
  [CD + 'confirmation_received', 'Confirmation received', 'Tick once the provider has confirmed in writing.', ['Ticked']],
  [CD + 'confirmation_reference', 'Confirmation reference', 'The reference of the written confirmation.', ['Email from the card provider, {example_date}']],
  [CD + 'progress_updates', 'Progress updates', 'Updates over time: date, update and who gave it.', ['{example_date} – Certificates issued – Cards Lead']],

  // ── Runbook Steps ──
  [RS + 'runbook', 'Runbook', 'The migration run this step belongs to.', ['Dress rehearsal 1']],
  [RS + 'window', 'Window', 'Which migration window the step runs in.', ['Static', 'Financial']],
  [RS + 'batch', 'Batch', 'The batch the step is grouped in.', ['Batch 3 – Accounts']],
  [RS + 'step_type', 'Step type', 'What kind of step this is.', ['Load', 'Checkpoint', 'Backup']],
  [RS + 'depends_on', 'Depends on (steps)', 'Steps that must finish before this one starts.', ['Step 120', 'Step 125']],
  [RS + 'data_set', 'Data set', 'The data this step processes.', ['Savings accounts – London']],
  [RS + 'load_object', 'Load object / target table', 'Where the data is loaded.', ['Account master']],
  [RS + 'mapping_sheet', 'Mapping sheet', 'The data mapping sheet used.', ['DMS-ACC-03']],
  [RS + 'agents', 'Agents / threads', 'How many parallel workers run the load.', ['8']],
  [RS + 'handoff_received', 'Hand-off file received', 'Tick once the input file for this step has arrived.', ['Ticked']],
  [RS + 'records_received', 'Records received', 'How many records were in the input file.', ['480,000']],
  [RS + 'records_failed', 'Records failed', 'How many records were rejected.', ['180']],
  [RS + 'success_percent', '% success', 'The share of records loaded successfully.', ['99.96']],
  [RS + 'throughput_per_second', 'Throughput (records / second)', 'How fast records were loaded.', ['1,200']],
  T(RS + 'start_at', 'Start', 'When the step started.', 'Saturday 02:10'),
  T(RS + 'end_at', 'End', 'When the step finished.', 'Saturday 03:05'),
  [RS + 'time_taken_minutes', 'Time taken', 'How long the step took, in minutes.', ['55']],
  [RS + 'budget_minutes', 'Budget (minutes)', 'The time allowed for this step.', ['60']],
  [RS + 'budget_variance_minutes', 'Over / under budget', 'Time taken minus budget; positive means over.', ['-5']],
  T(RS + 'extraction_start_at', 'Extraction start', 'When extraction for this step started.', 'Friday 22:00'),
  T(RS + 'extraction_end_at', 'Extraction end', 'When extraction finished.', 'Friday 23:10'),
  [RS + 'extraction_minutes', 'Extraction time', 'How long extraction took, in minutes.', ['70']],
  T(RS + 'validation_start_at', 'Validation start', 'When validation of the loaded data started.', 'Saturday 03:10'),
  T(RS + 'validation_end_at', 'Validation end', 'When validation finished.', 'Saturday 03:40'),
  [RS + 'validation_minutes', 'Validation time', 'How long validation took, in minutes.', ['30']],
  [RS + 'instruction', 'Instruction', 'What the person running the step must do.', ['Start job MIG_ACC_LOAD with 8 threads']],
  [RS + 'control_reference', 'Reference (backup / report / change)', 'The backup, report or change linked to this step.', ['Backup BK-SAT-0200']],
  [RS + 'done_by', 'Done by', 'The person who ran the step.', ['Migration Engineer']],
  [RS + 'checkpoint_decision', 'Checkpoint decision', 'The decision at this checkpoint.', ['Continue', 'Hold', 'Roll back']],
  [RS + 'decision_notes', 'Decision notes', 'Notes recorded with the checkpoint decision.', ['Continue; 180 rejected records to be fixed after go-live']],
  [RS + 'sequence_override_reason', 'Out-of-order reasons', 'Why steps ran out of the planned order.', ['Step 130 ran before 125 because the card file arrived early']],

  // ── Sanity Checks ──
  [SN + 'check_type', 'Check type', 'Why this sanity check is run.', ['New build acceptance', 'Post-deployment check']],
  D(SN + 'run_date', 'Run date', 'When the checks were run.'),
  [SN + 'run_by', 'Run by', 'The person who ran the checks.', ['Test Analyst']],
  [SN + 'total_checks', 'Total checks', 'How many checks were run.', ['25']],
  [SN + 'configuration_version', 'Configuration / parameter version', 'The configuration version tested.', ['Parameters v1.8']],
  [SN + 'data_snapshot', 'Test data snapshot', 'The test data set used.', ['Masked production copy of {example_date}']],
  [SN + 'interfaces_checked', 'Interfaces checked', 'Each interface checked and its status.', ['Payment gateway – Up – Messages flowing']],
  [SN + 'outcome', 'Outcome', 'Whether the build or environment is accepted for testing.', ['Accepted for testing', 'Rejected – build returned']],
  [SN + 'blocking_defects', 'Defects raised', 'Defects found by the sanity checks.', ['DEF-301 – Log-in fails for branch users – Critical']],
  [SN + 'decision_by', 'Decision by', 'Who decided whether to accept the build.', ['Test Manager']],
  [SN + 'next_action', 'Next action', 'What happens next.', ['Vendor to provide a corrected build by Tuesday']],

  // ── Production Deployment ──
  [PD + 'deployment_reference', 'Deployment reference', 'The reference of this deployment.', ['DEP-PROD-07']],
  [PD + 'deployment_type', 'Deployment type', 'What is being deployed.', ['Application release', 'Configuration and parameters']],
  [PD + 'release_version', 'Release / version', 'The version being deployed.', ['Release 2.4']],
  [PD + 'change_reference', 'Change request reference', 'The approved change request for this deployment.', ['CHG-2027-118']],
  [PD + 'deployment_window', 'Deployment window', 'When the deployment happens relative to go-live.', ['Before the cutover weekend', 'Cutover weekend']],
  [PD + 'prerequisites', 'Prerequisites', 'What must be in place before deploying.', ['Change approved', 'Backup taken']],
  [PD + 'steps', 'Deployment steps', 'Each step, the action, owner and status.', ['1 – Stop services – Infrastructure Lead – Done']],
  [PD + 'smoke_tests', 'Smoke tests', 'Quick checks after deployment and their result.', ['Log in to the teller screen – Passed – Branch Supervisor']],
  [PD + 'deployed_by', 'Deployed by', 'The person who carried out the deployment.', ['Release Engineer']],
  [PD + 'backout_plan', 'Backout plan', 'How the deployment is reversed if it fails.', ['Restore the previous release from the deployment server and restart services']],
  [PD + 'backout_tested', 'Backout tested', 'Tick once the backout plan has been tested.', ['Ticked']],
  [PD + 'backout_minutes', 'Backout time (minutes)', 'How long the backout takes.', ['45']],

  // ── Day-1 Validation ──
  [D1 + 'check_area', 'Check area', 'The business area being checked on the first day.', ['Branches', 'Payments']],
  [D1 + 'check_type', 'Check type', 'How the check is done.', ['Live transaction test', 'Balance check']],
  [D1 + 'frequency', 'Frequency', 'How often the check is repeated.', ['Hourly', 'Daily in the first week']],
  [D1 + 'expected_result', 'Expected result', 'What a successful check looks like.', ['Cash withdrawal posts to the account within 1 minute']],
  [D1 + 'actual_result', 'Actual result', 'What actually happened.', ['Posted in 20 seconds']],
  [D1 + 'sample_size', 'Sample size', 'How many items were checked.', ['50']],
  [D1 + 'exception_rate', 'Exception rate', 'The share of checked items with a problem, as a percentage.', ['2']],
  T(D1 + 'checked_at', 'Checked at', 'When the check was done.', 'Monday 08:30'),
  [D1 + 'checked_by', 'Checked by', 'The person who did the check.', ['Branch Supervisor, Dubai']],
  [D1 + 'evidence_reference', 'Evidence reference', 'Where the evidence of the check is kept.', ['EVD-D1-022']],

  // ── Go / No-Go ──
  [GN + 'checkpoint_reference', 'Checkpoint reference', 'The reference of this go / no-go checkpoint.', ['GNG-03']],
  [GN + 'criteria', 'Criteria', 'Each criterion, its owner, status and evidence.', ['Balances reconciled – Financial Controller – Met – REC-OB-DEP']],
  [GN + 'reconciliation_status', 'Reconciliation status', 'Where the reconciliations stand at this checkpoint.', ['Balanced', 'Differences explained']],
  [GN + 'schedule_variance_minutes', 'Schedule variance (minutes)', 'How far ahead or behind plan the cutover is; positive means late.', ['30']],
  [GN + 'readiness_summary', 'Readiness summary', 'A short summary of readiness at this checkpoint.', ['All loads complete; one interface still being tested']],
  [GN + 'rollback_invoked', 'Rollback invoked', 'Tick if the decision was to roll back.', ['Not ticked']],
  [GN + 'next_checkpoint', 'Next checkpoint', 'The next checkpoint after this one.', ['GNG-04 – Sunday 10:00']],

  // ── Go-Live Decision ──
  [GL + 'decision_reference', 'Decision reference', 'The reference of this decision.', ['GLD-02']],
  [GL + 'decision_type', 'Decision type', 'What is being decided.', ['Final go-live', 'Hypercare exit']],
  D(GL + 'decision_due', 'Decision due', 'When the decision must be made.'),
  [GL + 'readiness_inputs', 'Readiness inputs', 'The reports and assessments used to decide.', ['UAT sign-off – Test Manager – Accepted']],
  [GL + 'risks_accepted', 'Risks accepted', 'Risks the decision-makers accept, with owner.', ['Two medium defects open – Head of Operations – Accepted']],
  [GL + 'rationale', 'Rationale', 'Why the decision was made.', ['All go-live criteria met; risks accepted by the business']],
  [GL + 'communicated_to', 'Communicated to', 'Who has been told about the decision.', ['All staff', 'Regulator']],
  D(GL + 'communication_date', 'Communication date', 'When the decision was communicated.'),
  [GL + 'minutes_reference', 'Minutes reference', 'The minutes of the meeting where the decision was made.', ['MIN-STEERCO-2027-11']],

  // ── Command Centre ──
  [CM + 'log_reference', 'Log reference', 'The reference of this log entry.', ['CC-0042']],
  [CM + 'entry_type', 'Entry type', 'What kind of entry this is.', ['Issue', 'Decision', 'Escalation']],
  T(CM + 'logged_at', 'Logged at', 'When the entry was recorded.', 'Saturday 03:15'),
  [CM + 'logged_by', 'Logged by', 'The person who recorded the entry.', ['Command Centre Coordinator']],
  [CM + 'time_to_resolve_minutes', 'Time to resolve', 'How long it took to resolve, in minutes.', ['40']],
  [CM + 'escalated', 'Escalated', 'Tick if the item was escalated.', ['Ticked']],
  [CM + 'escalated_to', 'Escalated to', 'Who it was escalated to.', ['Programme Director']],
  [CM + 'decision_required', 'Decision required', 'Tick if a decision is needed to move forward.', ['Ticked']],
  [CM + 'timeline_impact_minutes', 'Impact on timeline (minutes)', 'How many minutes this delays the cutover.', ['30']],

  // ── Daily Command Centre ──
  [DC + 'log_reference', 'Log reference', 'The reference of this daily log.', ['DCC-DAY03']],
  D(DC + 'log_date', 'Date', 'The day this log covers.'),
  [DC + 'hypercare_day', 'Hypercare day', 'Which day of hypercare this is; go-live day is day 1.', ['3']],
  [DC + 'service_status', 'Service status', 'The status of each service today.', ['Payments – Normal – No issues since 09:00']],
  [DC + 'kpi_snapshot', 'KPI snapshot', 'Today’s key figures against target.', ['Payment success rate – 99.5% – 99.7% – Green']],
  [DC + 'new_incidents', 'New incidents', 'Incidents raised today.', ['5']],
  [DC + 'open_incidents', 'Open incidents', 'Incidents still open at the end of the day.', ['8']],
  [DC + 'new_defects', 'New defects', 'Defects raised today.', ['2']],
  [DC + 'support_requests', 'Support requests received', 'How many support requests came in today.', ['140']],
  [DC + 'top_issues', 'Top issues', 'The most important issues today, with owner and action.', ['Slow statement printing – IT Operations – Tuning batch']],
  [DC + 'decisions', 'Decisions', 'Decisions made today.', ['Extend contact centre hours to 22:00 for this week']],
  [DC + 'summary', 'Daily summary', 'A short summary of the day.', ['Stable day; payment volumes normal; two medium incidents open']],
  [DC + 'summary_sent_to', 'Summary sent to', 'Who received the daily summary.', ['Executive committee', 'Programme board']],

  // ── Hypercare Defects ──
  [HD + 'defect_reference', 'Defect reference', 'The reference of this hypercare defect.', ['HDEF-018']],
  [HD + 'defect_type', 'Defect type', 'What kind of defect this is.', ['Configuration', 'Data migration']],
  D(HD + 'found_date', 'Found date', 'When the defect was found.'),
  [HD + 'steps_to_reproduce', 'Steps to reproduce', 'How to make the problem happen again.', ['Open a joint account', 'Apply the monthly fee', 'Check the fee charged']],
  [HD + 'data_fix_required', 'Data fix required', 'Tick if data already in the system must be corrected as well.', ['Ticked']],
  [HD + 'fix_release', 'Fix release', 'The release that contains the fix.', ['Hotfix 2.4.1']],
  D(HD + 'target_date', 'Target date', 'When the fix is due.'),
  [HD + 'deployed_to_production', 'Deployed to production', 'Tick once the fix is live.', ['Ticked']],

  // ── Hypercare Incidents ──
  [HI + 'incident_reference', 'Incident reference', 'The reference of this incident.', ['INC-0412']],
  [HI + 'affected_service', 'Affected service', 'The service that is not working properly.', ['Payments', 'Cards and ATMs']],
  T(HI + 'reported_at', 'Reported at', 'When the incident was reported.', 'Monday 09:05'),
  [HI + 'reported_by', 'Reported by', 'Who reported the incident.', ['Branch Supervisor, Cairo']],
  [HI + 'assigned_team', 'Assigned team', 'The team handling the incident.', ['Payments support']],
  [HI + 'assignee', 'Assignee', 'The person handling the incident.', ['Payments Support Analyst']],
  [HI + 'customers_affected', 'Customers affected', 'Roughly how many customers are affected.', ['1,200']],
  [HI + 'branches_affected', 'Branches affected', 'How many branches are affected.', ['3']],
  [HI + 'impact_description', 'Impact', 'What customers or staff cannot do because of the incident.', ['Branches cannot print statements']],
  T(HI + 'responded_at', 'Responded at', 'When the support team first responded.', 'Monday 09:12'),
  [HI + 'time_to_respond', 'Time to respond', 'How long the first response took, in minutes.', ['7']],
  [HI + 'time_to_resolve', 'Time to resolve', 'How long the fix took, in minutes.', ['95']],
  [HI + 'linked_defect', 'Linked defect', 'The defect raised from this incident.', ['HDEF-018']],
  [HI + 'timeline', 'Timeline', 'Updates over time: time, update and who.', ['09:12 – Investigating print server – Payments Support Analyst']],

  // ── Hypercare Performance Monitoring ──
  [HP + 'metric_reference', 'Metric reference', 'The reference of this metric.', ['PERF-M-03']],
  [HP + 'metric', 'Metric', 'What is being measured.', ['Payment processing time', 'End-of-day batch duration']],
  [HP + 'warning_threshold', 'Warning threshold', 'The value at which the team starts watching closely.', ['3 seconds']],
  [HP + 'critical_threshold', 'Critical threshold', 'The value at which action must be taken at once.', ['5 seconds']],
  [HP + 'baseline_value', 'Legacy baseline', 'The value the legacy system achieved, for comparison.', ['2.1']],
  [HP + 'latest_value', 'Latest value', 'The most recent reading.', ['1.8']],
  [HP + 'variance', 'Variance against baseline', 'Latest value minus the legacy baseline.', ['-0.3']],
  T(HP + 'latest_reading_at', 'Latest reading at', 'When the latest reading was taken.', 'Tuesday 12:00'),
  [HP + 'readings', 'Readings', 'Readings over time and their status.', ['{example_date} – Peak hour – 1.8 s – Green']],

  // ── Incident Management ──
  [IM + 'item_reference', 'Item reference', 'The reference of this incident-management item.', ['IMP-04']],
  [IM + 'element', 'Element', 'Which part of incident management this item sets up.', ['Priority and impact matrix', 'On-call rota']],
  D(IM + 'completion_date', 'Completion date', 'When this element was put in place.'),
  [IM + 'priority_matrix', 'Priority matrix', 'Each priority, what it means and the response and fix targets.', ['P1 – Service down for all customers – 15 min – 4 h']],
  [IM + 'roles', 'Roles', 'Incident roles, who holds them and how to reach them.', ['Incident Manager – Head of IT Operations – +44 20 7946 0456']],
  [IM + 'rota_published', 'On-call rota published', 'Tick once the on-call rota has been shared.', ['Ticked']],
  [IM + 'rota_period', 'Rota period', 'The period the on-call rota covers.', ['First 6 weeks after go-live']],
  [IM + 'process_steps', 'Process steps', 'The steps for handling an incident.', ['Log', 'Prioritise', 'Assign', 'Resolve', 'Close']],
  [IM + 'tooling_configured', 'Tooling configured', 'Tick once the incident tool is set up.', ['Ticked']],
  [IM + 'templates', 'Templates', 'Templates used for incident communication.', ['Major incident notice', 'Resolution notice']],
  [IM + 'tested_in_rehearsal', 'Tested in dress rehearsal', 'Tick if this was tried out during a rehearsal.', ['Ticked']],
  D(IM + 'test_date', 'Test date', 'When it was tested.'),
  [IM + 'test_findings', 'Test findings', 'What the test showed.', ['On-call numbers for two engineers were out of date']],

  // ── Technical Verification ──
  [TV + 'verification_type', 'Verification type', 'What is being checked technically.', ['Connectivity', 'Batch and end of day']],
  [TV + 'technical_lead', 'Technical lead', 'The person leading the technical checks.', ['Infrastructure Lead']],
  [TV + 'checks_total', 'Checks', 'How many technical checks were planned.', ['40']],
  [TV + 'checks_passed', 'Checks passed', 'How many of the checks passed.', ['39']],

  // ── Business Verification ──
  [BV + 'verification_lead', 'Verification lead', 'The business person leading the checks.', ['Head of Retail Operations']],
  [BV + 'verification_window', 'Verification window', 'When in the cutover the checks happen.', ['After the financial window']],
  [BV + 'sample_records', 'Sample records selected', 'How many records were picked for checking.', ['200']],
  [BV + 'records_checked', 'Records checked', 'How many of those were actually checked.', ['200']],
  [BV + 'records_matched', 'Records matched', 'How many matched the legacy system exactly.', ['198']],
  [BV + 'match_rate', 'Match rate', 'The share of checked records that matched, as a percentage.', ['99']],
  [BV + 'differences', 'Differences found', 'Each difference: record, field, old value, new value and why.', ['Account 1234 – Interest rate – 2.50 – 2.45 – Rate change agreed after freeze']],
  [BV + 'differences_accepted', 'Differences accepted', 'Tick if the business accepts the differences found.', ['Ticked']],
]
