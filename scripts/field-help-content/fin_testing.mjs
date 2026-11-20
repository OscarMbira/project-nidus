// v1345 slice 2, wave 3b — FIN testing field help (source for SQL/v1501).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const C = 'register:*:'
const TS = 'register:fin_testing_strategy:'
const SIT = 'register:fin_sit:'
const UAT = 'register:fin_uat:'
const RG = 'register:fin_regression_testing:'
const PF = 'register:fin_performance_testing:'
const SC = 'register:fin_security_testing:'
const DR = 'register:fin_dr_testing:'
const OR = 'register:fin_operational_readiness_testing:'
const EX = 'register:fin_exit_criteria:'

export const MODULE = 'registers_fin_testing'
export const ROWS = [
  // ── Common testing fields ──
  [C + 'executed', 'Executed', 'How many test cases or scenarios have been run.', ['412']],
  [C + 'failed', 'Failed', 'How many of the executed tests failed.', ['18']],
  [C + 'build_under_test', 'Build / release under test', 'The software version being tested.', ['Release 2.4, build 118']],
  [C + 'entry_criteria', 'Entry criteria', 'What must be true before testing can start.', ['Test environment ready', 'Test data loaded', 'No open critical defects from the last cycle']],

  // ── Testing Strategy ──
  [TS + 'test_manager', 'Test manager', 'The person accountable for all testing.', ['Head of Testing']],
  D(TS + 'testing_start', 'Testing start', 'When testing starts.'),
  D(TS + 'testing_end', 'Testing end', 'When testing is planned to finish.'),
  [TS + 'project_summary', 'Project summary', 'A short description of the project being tested.', ['Replacement of the core banking system for the London and Dubai entities']],
  [TS + 'testing_services', 'Testing services in scope', 'The testing services this strategy covers.', ['Functional testing', 'Performance testing', 'Test automation']],
  [TS + 'functional_scope', 'Functional areas in scope', 'The modules and processes to be tested, with priority.', ['Deposits – Account opening, interest – High']],
  [TS + 'test_approach', 'Approach', 'How testing will be carried out overall.', ['Risk-based testing in three SIT cycles, then business-led UAT']],
  [TS + 'test_levels', 'Test levels', 'The levels of testing planned.', ['System integration (SIT)', 'User acceptance (UAT)', 'Regression']],
  [TS + 'risk_based_testing', 'Risk-based testing', 'Tick if testing effort is focused on the highest-risk areas first.', ['Ticked']],
  [TS + 'test_techniques', 'Test techniques', 'The techniques used to design tests.', ['Boundary value analysis', 'End-to-end business scenarios']],
  [TS + 'functional_test_design', 'Functional test design', 'How functional test cases are designed and reviewed.', ['Cases written from business processes and reviewed by the business owner']],
  [TS + 'automated_test_design', 'Automated test design', 'How automated tests are designed and kept up to date.', ['Regression pack automated for payments and deposits']],
  [TS + 'test_phases', 'Test execution phases', 'Each phase with objective, environment, dates and owner.', ['SIT cycle 1 – Prove interfaces – SIT environment – Test Lead']],
  [TS + 'parameterisation_testing', 'Parameterisation testing', 'How product and system settings are tested.', ['Each product’s rates and charges checked against the product sheet']],
  [TS + 'sanity_testing', 'Sanity testing', 'The quick checks that a new build or environment works before full testing.', ['Log in, open an account, post a payment']],
  [TS + 'system_testing', 'System testing (core banking)', 'How the core banking system is tested on its own.', ['Every module tested against the approved requirements']],
  [TS + 'integration_testing', 'System integration testing', 'How the links between systems are tested.', ['Every interface tested end to end with real message formats']],
  [TS + 'performance_testing', 'Performance testing', 'How speed and capacity are tested.', ['Peak month-end volumes run against production-sized data']],
  [TS + 'performance_targets', 'Performance targets', 'The speed and volume targets, and how each is measured.', ['Payment posting – 200 per second – under 2 seconds – Load test tool']],
  [TS + 'failover_testing', 'Failover testing', 'How switching to backup systems is tested.', ['Switch to the Dubai DR site and back during a test weekend']],
  [TS + 'security_testing', 'Security testing', 'How security is tested.', ['Independent penetration test before go-live']],
  [TS + 'uat_support', 'User acceptance testing support', 'How the project team supports business testers.', ['Daily triage meeting and a floor-walker in each test room']],
  [TS + 'uat_participants', 'UAT business participants', 'The business teams taking part in UAT.', ['Retail operations', 'Finance', 'Branch staff from London and Cairo']],
  [TS + 'dress_rehearsal', 'Dress rehearsal approach', 'How the go-live is rehearsed end to end.', ['Two full rehearsals using the cutover runbook and production-sized data']],
  [TS + 'dress_rehearsals_planned', 'Planned dress rehearsals', 'Each planned rehearsal with date and scope.', ['Dress rehearsal 1 – {example_date} – Full scope']],
  [TS + 'test_environments', 'Test environments', 'The environments used for testing.', ['SIT', 'UAT', 'Performance']],
  [TS + 'test_data_approach', 'Test data approach', 'Where test data comes from and how it is kept safe.', ['Masked copy of production, refreshed before each cycle']],
  [TS + 'data_masking_required', 'Data masking required', 'Tick if personal data must be hidden in test environments.', ['Ticked']],
  [TS + 'suspension_criteria', 'Suspension criteria', 'When testing must stop.', ['Environment unavailable for more than 4 hours', 'More than 5 open critical defects']],
  [TS + 'resumption_criteria', 'Resumption criteria', 'What must be true before testing restarts.', ['Environment restored and verified', 'Blocking defects fixed']],
  [TS + 'acceptance_criteria', 'Acceptance criteria', 'What must be true for the testing to be accepted.', ['All high-priority scenarios passed', 'No open critical defects']],
  [TS + 'critical_success_factors', 'Critical success factors', 'What testing needs in order to succeed.', ['Business testers available full time', 'Stable test environments']],
  [TS + 'severity_definitions', 'Severity definitions', 'What each defect severity means.', ['Critical: business cannot operate, no workaround', 'Low: cosmetic']],
  [TS + 'defect_workflow', 'Defect workflow', 'How defects move from raised to closed.', ['New → Triaged → In fix → Ready for retest → Closed']],
  [TS + 'defect_resolution_targets', 'Defect resolution targets', 'How fast each severity must be answered and fixed.', ['Critical – 1 hour – 1 day']],
  [TS + 'acceptable_open_defects_at_exit', 'Acceptable open defects at exit', 'The open defects allowed when testing ends.', ['No critical or high', 'Up to 10 medium with workarounds']],
  [TS + 'document_management', 'Document management', 'Where test documents are kept and how versions are controlled.', ['All test documents in the project document library, version-controlled']],
  [TS + 'meetings', 'Meetings', 'Regular testing meetings, how often, who attends and why.', ['Daily defect triage – Daily – Test leads, developers – Prioritise fixes']],
  [TS + 'reporting_cadence', 'Reporting cadence', 'How often test progress is reported.', ['Daily', 'Weekly']],
  [TS + 'metrics_reported', 'Metrics reported', 'The figures included in test reports.', ['Tests executed and passed', 'Open defects by severity']],
  [TS + 'test_deliverables', 'Test deliverables', 'The documents testing will produce.', ['Test plan', 'Test summary report']],
  [TS + 'signoff_board', 'Review / sign-off board', 'Who reviews and who approves each deliverable.', ['Test summary report – Test Manager – Programme Director']],
  [TS + 'test_management_tool', 'Test management tool', 'The tool used to manage test cases and defects.', ['Example Test Manager']],
  [TS + 'testing_tools', 'Testing tools', 'Other tools used, what for, and how many users.', ['Load test tool – Performance testing – 2 licences']],
  [TS + 'automation_approach', 'Automation approach', 'Which tests are automated and how.', ['Regression pack automated and run nightly']],
  [TS + 'test_timeline', 'Testing timeline', 'Each phase or milestone with dates.', ['SIT cycle 1 – {example_date} – {example_date}']],
  [TS + 'raci', 'RACI', 'For each testing activity: who is Responsible, Accountable, Consulted and Informed.', ['Write UAT scripts – Business testers – Test Manager – Developers – Steering Committee']],
  [TS + 'acronyms', 'Acronyms', 'Abbreviations used in the strategy and what they mean.', ['SIT – System integration testing']],

  // ── SIT ──
  [SIT + 'sit_reference', 'SIT reference', 'The reference of this SIT record.', ['SIT-C2']],
  [SIT + 'sit_cycle', 'Cycle', 'Which SIT cycle this is.', ['Cycle 1', 'Regression']],
  [SIT + 'test_lead', 'Test lead', 'The person leading this cycle.', ['SIT Lead']],
  [SIT + 'integration_flows', 'Integration flows', 'The system-to-system flows tested, with type and priority.', ['Payments – Core banking – Payment gateway – API – High']],
  [SIT + 'requirements_covered', 'Requirements covered', 'The requirements this cycle tests.', ['REQ-PAY-001 to REQ-PAY-045']],
  [SIT + 'environment_ready', 'Environment ready', 'Tick once the SIT environment is ready.', ['Ticked']],
  [SIT + 'interfaces_connected', 'Interfaces connected', 'Tick once all interfaces in scope are connected.', ['Ticked']],
  [SIT + 'test_data_ready', 'Test data ready', 'Tick once the test data is loaded.', ['Ticked']],
  [SIT + 'total_cases', 'Total test cases', 'How many test cases are planned for this cycle.', ['450']],
  [SIT + 'automated_cases', 'Automated test cases', 'How many of those run automatically.', ['120']],
  [SIT + 'test_sets', 'Test sets', 'The groups of test cases, with count, priority and owner.', ['Payments end to end – 60 – High – Payments Tester']],
  [SIT + 'blocked', 'Blocked', 'How many tests cannot run because of another problem.', ['6']],
  [SIT + 'not_run', 'Not run', 'How many tests have not been run yet.', ['20']],
  [SIT + 'execution_log', 'Execution log', 'Daily progress: executed, passed, failed and blocked.', ['{example_date} – 40 – 36 – 3 – 1 – Interface down for 2 hours']],
  [SIT + 'open_critical', 'Open critical defects', 'Critical defects still open.', ['0']],
  [SIT + 'open_high', 'Open high defects', 'High defects still open.', ['2']],
  [SIT + 'open_medium', 'Open medium defects', 'Medium defects still open.', ['7']],
  [SIT + 'open_low', 'Open low defects', 'Low defects still open.', ['12']],
  [SIT + 'key_defects', 'Key defects', 'The most important defects, with severity, status and owner.', ['DEF-204 – Wrong fee calculated – High – In fix – Vendor']],
  [SIT + 'test_summary_report', 'Test summary report reference', 'The report that summarises this cycle.', ['TSR-SIT-C2']],
  [SIT + 'sign_off_comments', 'Sign-off comments', 'Comments recorded when the cycle is signed off.', ['Accepted with two high defects to be fixed before UAT']],

  // ── UAT ──
  [UAT + 'uat_reference', 'Reference', 'The reference of this UAT record.', ['UAT-R1']],
  [UAT + 'uat_round', 'UAT round', 'Which UAT round this is.', ['Round 1', 'Final acceptance']],
  [UAT + 'business_scenarios', 'Business scenarios', 'The business scenarios tested, with tester and result.', ['Open a savings account – Account opening – High – Branch Supervisor – Passed']],
  [UAT + 'testers', 'Business testers', 'The business people testing.', ['Branch Supervisor, London', 'Finance Analyst, Cairo']],
  [UAT + 'total_scenarios', 'Total scenarios', 'How many business scenarios are planned.', ['180']],
  [UAT + 'acceptance_decision', 'Acceptance decision', 'Whether the business accepts the system.', ['Accepted with conditions']],
  [UAT + 'acceptance_conditions', 'Conditions of acceptance', 'Conditions the business attached to acceptance.', ['Fee defect DEF-204 fixed before go-live']],

  // ── Regression Testing ──
  [RG + 'regression_reference', 'Reference', 'The reference of this regression run.', ['REG-2027-08']],
  [RG + 'regression_type', 'Regression type', 'How much of the system the run covers.', ['Full regression', 'Targeted (changed areas)']],
  [RG + 'pack_size', 'Pack size (scenarios)', 'How many scenarios are in the regression pack.', ['600']],
  [RG + 'automated_scenarios', 'Automated scenarios', 'How many scenarios run automatically.', ['420']],
  [RG + 'run_duration_hours', 'Run duration (hours)', 'How long the run took.', ['6']],
  [RG + 'area_results', 'Results by area', 'Results for each functional area.', ['Payments – 120 – 1 – Passed with one known issue']],

  // ── Performance Testing ──
  [PF + 'performance_reference', 'Reference', 'The reference of this performance test.', ['PERF-03']],
  [PF + 'workload_model', 'Workload model and results', 'Each transaction’s target volume and speed, and what was achieved.', ['Payment posting – 200/s – under 2 s – 1.4 s – Passed']],
  [PF + 'peak_users', 'Peak concurrent users', 'The most users active at the same time during the test.', ['1,500']],
  [PF + 'peak_tps', 'Peak transactions per second', 'The highest transaction rate reached.', ['240']],
  [PF + 'max_cpu_percent', 'Max CPU (%)', 'The highest processor use seen during the test.', ['78']],
  [PF + 'batch_duration_hours', 'Batch duration (hours)', 'How long end-of-day processing took.', ['3.5']],
  [PF + 'bottlenecks', 'Bottlenecks found', 'What slowed the system down.', ['Database index missing on the transactions table']],
  [PF + 'tuning_actions', 'Tuning actions', 'Actions to fix the bottlenecks, with owner and status.', ['Add index on transactions – Database Administrator – Done']],

  // ── Security Testing ──
  [SC + 'security_reference', 'Reference', 'The reference of this security test.', ['SEC-PT-01']],
  [SC + 'tested_by', 'Tested by', 'Who carried out the security test.', ['Independent third party']],
  [SC + 'systems_tested', 'Systems tested', 'The systems included in the test.', ['Internet banking', 'Payment gateway']],
  [SC + 'critical_findings', 'Critical findings', 'How many critical security weaknesses were found.', ['0']],
  [SC + 'high_findings', 'High findings', 'How many high security weaknesses were found.', ['2']],
  [SC + 'medium_findings', 'Medium findings', 'How many medium security weaknesses were found.', ['5']],
  [SC + 'low_findings', 'Low findings', 'How many low security weaknesses were found.', ['9']],
  D(SC + 'remediation_due', 'Remediation due', 'When the findings must be fixed.'),
  D(SC + 'retest_date', 'Retest date', 'When the fixes will be retested.'),

  // ── DR Testing ──
  [DR + 'dr_reference', 'Reference', 'The reference of this disaster-recovery test.', ['DR-2027-01']],
  [DR + 'runbook_reference', 'DR runbook reference', 'The disaster-recovery runbook used.', ['DR-RB-3.1']],
  [DR + 'systems_in_scope', 'Systems and recovery objectives', 'Each system’s recovery time (RTO) and data loss (RPO) targets, and what was achieved.', ['Core banking – 4 h – 3 h – 15 min – 5 min – Passed']],
  [DR + 'data_loss_observed', 'Data loss observed', 'Tick if any data was lost during the switch-over.', ['Not ticked: no data lost']],
  [DR + 'failback_completed', 'Failback completed', 'Tick once services have been switched back to the main site.', ['Ticked']],
  [DR + 'steps_log', 'Execution log', 'Each step of the test with time, owner and result.', ['02:00 – Switch to the Dubai site – Infrastructure Lead – Done']],

  // ── Operational Readiness Testing ──
  [OR + 'ort_reference', 'Reference', 'The reference of this operational readiness test.', ['ORT-05']],
  [OR + 'operational_area', 'Operational area', 'The operational function being tested.', ['Batch operations', 'Backup and restore']],
  [OR + 'support_team', 'Support team', 'The team that will run this area after go-live.', ['IT Operations, London']],
  [OR + 'scenarios', 'Operational scenarios', 'Each scenario, the procedure used, the team and the result.', ['Restore a database from backup – SOP-OPS-07 – IT Operations – Passed']],
  [OR + 'sops_verified', 'SOPs verified', 'How many standard operating procedures were checked.', ['14']],
  [OR + 'team_trained', 'Team trained', 'Tick once the support team has been trained.', ['Ticked']],
  [OR + 'monitoring_in_place', 'Monitoring in place', 'Tick once monitoring and alerts are working.', ['Ticked']],
  [OR + 'handover_accepted', 'Handover accepted by support', 'Tick once the support team formally accepts the handover.', ['Ticked']],

  // ── Exit Criteria ──
  [EX + 'criterion_reference', 'Criterion reference', 'The reference of this exit criterion.', ['EXIT-03']],
  [EX + 'measure', 'Measure', 'What is measured to judge this criterion.', ['Open critical defects']],
  [EX + 'target', 'Target', 'The value that must be reached.', ['0']],
  [EX + 'actual', 'Actual', 'The value reached so far.', ['1']],
  D(EX + 'measured_on', 'Measured on', 'When the actual value was measured.'),
  [EX + 'trend', 'Trend', 'Whether the value is getting better or worse.', ['Improving', 'Worsening']],
  [EX + 'accepted_by', 'Accepted by', 'The person who accepted the criterion as met.', ['Test Manager']],
  D(EX + 'accepted_date', 'Accepted date', 'When the criterion was accepted as met.'),
]
