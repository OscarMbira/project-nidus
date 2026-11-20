// v1345 slice 2, wave 3f — FIN plan-document registers field help (source for SQL/v1506).
// Cutover Strategy, Cutover Plan, Dress Rehearsal Strategy, Hypercare Plan, Rollback Plan (v1322).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const C = 'register:*:'
const CS = 'register:fin_cutover_strategy:'
const CP = 'register:fin_cutover_plan:'
const DR = 'register:fin_dress_rehearsal_strategy:'
const HP = 'register:fin_hypercare_plan:'
const RB = 'register:fin_rollback_plan:'

export const MODULE = 'registers_fin_plans'
export const ROWS = [
  // ── Common fields ──
  [C + 'point_of_no_return', 'Point of no return', 'The moment after which going back to the old system is no longer possible or sensible.', ['Once branches reopen on Monday 07:00 with the new system']],
  [C + 'rollback_triggers', 'Rollback triggers', 'What would make the team go back to the old system.', ['Balances do not reconcile by Saturday 20:00', 'Payments fail end to end'], null, 'One trigger per line.'],
  [C + 'rollback_steps', 'Rollback steps', 'The steps to go back to the old system, in order: sequence – step – owner – duration.', ['1 – Stop the new system – Infrastructure Lead – 30 min']],
  [C + 'cutover_phases', 'Cutover phases', 'The phases the cutover passes through.', ['Freeze', 'Final migration', 'Business validation', 'Go / no-go']],
  [C + 'escalation_path', 'Escalation path', 'Who to escalate to, in order, and when.', ['Cutover Manager → Programme Director → Steering Committee Chair']],
  [C + 'contact_channels', 'Contact channels', 'How people reach the team.', ['Service desk portal', 'Command centre phone +44 20 7946 0789']],
  [C + 'severity_definitions', 'Severity definitions', 'What each severity level means.', ['Critical: business cannot operate, no workaround', 'Low: cosmetic']],
  [C + 'kpis', 'KPIs', 'The key measures and their targets.', ['Payment success rate – 99.5%', 'Calls answered in 30 seconds – 80%']],
  D(C + 'target_go_live_date', 'Target go-live date', 'The date the new system is planned to go live.'),

  // ── Cutover Strategy ──
  [CS + 'cutover_approach', 'Cutover approach', 'How the switch to the new system will happen.', ['Big bang: everyone moves at once', 'Phased: by region or product']],
  D(CS + 'cutover_window_start', 'Cutover window start', 'When the cutover window opens.'),
  D(CS + 'cutover_window_end', 'Cutover window end', 'When the cutover window must close.'),
  [CS + 'approach_description', 'Approach description', 'How the cutover will be carried out, in plain words.', ['Freeze on Friday evening, migrate over the weekend, reopen on Monday morning']],
  [CS + 'key_milestones', 'Key milestones', 'The main milestones on the way to go-live.', ['Final dress rehearsal', 'Go / no-go decision', 'Go-live']],
  D(CS + 'code_freeze_date', 'Code freeze date', 'After this date no software changes are made, except urgent fixes.'),
  D(CS + 'data_freeze_date', 'Data freeze date', 'After this date no changes are made to the data being migrated.'),
  [CS + 'business_freeze_rules', 'Business freeze rules', 'What the business must not do during the freeze.', ['No new products', 'No changes to customer limits']],
  [CS + 'planned_downtime', 'Planned downtime (hours)', 'How long services will be unavailable.', ['36']],
  [CS + 'services_and_channels_impacted', 'Services & channels impacted', 'What customers or staff cannot use during the cutover.', ['Online banking', 'ATMs']],
  [CS + 'fallback_manual_procedures', 'Fallback / manual procedures', 'How critical work continues by hand during the cutover.', ['Urgent payments approved and sent by the back office']],
  [CS + 'customer_communication_required', 'Customer communication required', 'Tick if customers must be told in advance.', ['Ticked']],
  [CS + 'go_no_go_criteria', 'Go / no-go criteria', 'What must be true to decide to go live.', ['All balances reconciled', 'No open critical defects']],
  [CS + 'decision_points', 'Decision points', 'The moments where the team decides whether to continue.', ['After the static load', 'After business validation']],
  [CS + 'command_centre_arrangements', 'Command centre arrangements', 'How the command centre runs during the cutover.', ['Staffed 24 hours from Friday 18:00; hourly status calls']],
  [CS + 'rollback_approach', 'Rollback approach', 'How the organisation returns to the old system if needed.', ['Restore the legacy system from the Friday backup and reopen on it']],

  // ── Cutover Plan ──
  [CP + 'cutover_manager', 'Cutover manager', 'The person running the cutover.', ['Cutover Manager']],
  D(CP + 'cutover_start', 'Cutover start', 'When the cutover starts.'),
  D(CP + 'cutover_end', 'Cutover end', 'When the cutover must finish.'),
  D(CP + 'planned_go_live_date', 'Planned go-live date', 'The date the new system is planned to go live.'),
  [CP + 'activity_runsheet', 'Activity runsheet', 'The cutover activities in order: sequence – activity – owner – start – duration.', ['10 – Freeze channels – Operations Lead – Friday 18:00 – 30 min']],
  [CP + 'critical_path', 'Critical path', 'The activities that set the total length of the cutover.', ['Customer load', 'Account load', 'Balance reconciliation']],
  [CP + 'checkpoints', 'Checkpoints', 'The planned checkpoints during the cutover.', ['Saturday 04:00 – after static load']],
  [CP + 'technical_prerequisites', 'Technical prerequisites', 'Technical things that must be ready before the cutover.', ['Production deployment complete', 'Backups verified']],
  [CP + 'business_prerequisites', 'Business prerequisites', 'Business things that must be ready before the cutover.', ['Staff rota confirmed', 'Customers notified']],
  [CP + 'communication_schedule', 'Communication schedule', 'When each message goes out during the cutover.', ['Friday 17:00 – Service closure notice to customers']],
  [CP + 'stakeholders_to_notify', 'Stakeholders to notify', 'Who must be kept informed.', ['Regulator', 'Correspondent banks']],
  [CP + 'contact_list', 'Contact list', 'Key contacts: name or role – role – phone.', ['Cutover Manager – Lead – +44 20 7946 0101']],
  [CP + 'validation_checks', 'Validation checks', 'Checks that prove the cutover worked.', ['Sample of 200 accounts compared with the legacy system']],
  [CP + 'go_no_go_checkpoints', 'Go / no-go checkpoints', 'Where the team decides whether to continue.', ['Sunday 10:00 – final go / no-go']],

  // ── Dress Rehearsal Strategy ──
  [DR + 'number_of_rehearsals', 'Number of rehearsals', 'How many rehearsals are planned.', ['2']],
  D(DR + 'first_rehearsal_date', 'First rehearsal date', 'When the first rehearsal takes place.'),
  D(DR + 'final_rehearsal_date', 'Final rehearsal date', 'When the last rehearsal takes place.'),
  [DR + 'rehearsal_types', 'Rehearsal types', 'The kinds of rehearsal planned.', ['Full dress rehearsal', 'Rollback rehearsal']],
  [DR + 'rehearsal_approach', 'Approach', 'How the rehearsals will be run.', ['Run the full cutover runbook on production-sized data, timed against the plan']],
  [DR + 'data_set_used', 'Data set used', 'The data used in the rehearsals.', ['Masked copy of production taken two weeks before']],
  [DR + 'production_data_volume', 'Production data volume (%)', 'How much of the production data volume the rehearsal uses.', ['100']],
  [DR + 'environment_prerequisites', 'Environment prerequisites', 'What the rehearsal environment needs first.', ['Pre-production refreshed', 'Interfaces connected to test partners']],
  [DR + 'runsheet_reference', 'Runsheet reference', 'The runsheet used for the rehearsal.', ['Cutover runsheet v3.2']],
  [DR + 'timing_targets', 'Timing targets', 'How long each part of the rehearsal should take.', ['Static load under 8 hours', 'Full cutover under 36 hours']],
  [DR + 'participants', 'Participants', 'Who takes part in the rehearsal.', ['Migration team', 'Branch supervisors', 'Vendor support']],
  [DR + 'command_centre_used', 'Command centre used', 'Tick if the command centre runs during the rehearsal.', ['Ticked']],
  [DR + 'success_criteria', 'Success criteria', 'What makes the rehearsal a success.', ['Cutover finished within the window', 'All reconciliations passed']],
  [DR + 'metrics_captured', 'Metrics captured', 'What is measured during the rehearsal.', ['Duration vs plan', 'Defects found']],
  [DR + 'lessons_learned_process', 'Lessons learned process', 'How lessons from each rehearsal are captured and acted on.', ['Review meeting within 2 days; runbook updated before the next rehearsal']],

  // ── Hypercare Plan ──
  [HP + 'hypercare_lead', 'Hypercare lead', 'The person leading the hypercare period.', ['Head of IT Operations']],
  D(HP + 'hypercare_start', 'Hypercare start', 'When hypercare starts; usually go-live day.'),
  D(HP + 'hypercare_end', 'Hypercare end', 'When hypercare is planned to end.'),
  [HP + 'support_scope', 'Support scope', 'What hypercare covers.', ['All core banking services', 'Interfaces to payments and cards']],
  [HP + 'support_hours', 'Support hours', 'When hypercare support is available.', ['24x7', 'Extended hours']],
  [HP + 'support_tiers', 'Support tiers', 'The levels of support during hypercare.', ['Floor walkers', 'Service desk', 'Application support', 'Vendor']],
  [HP + 'on_call_rota', 'On-call rota', 'Who is on call and when.', ['Week 1 – Application Support Lead']],
  [HP + 'monitoring_activities', 'Monitoring activities', 'What is watched closely during hypercare.', ['Payment success rate every 15 minutes', 'End-of-day batch duration']],
  [HP + 'daily_checks', 'Daily checks', 'Checks done every day during hypercare.', ['Balances reconciled', 'Overnight batch completed']],
  [HP + 'response_and_resolution_targets', 'Response & resolution targets', 'How fast issues must be answered and fixed during hypercare.', ['Critical – 15 minutes – 4 hours']],
  [HP + 'triage_meeting_cadence', 'Triage meeting cadence', 'How often issues are reviewed and prioritised.', ['Twice daily', 'Daily']],
  [HP + 'handover_to_business_as_usual', 'Handover to business-as-usual', 'How and when support moves to the normal support teams.', ['After 4 weeks if no open critical issues for 7 days']],
  [HP + 'knowledge_transfer', 'Knowledge transfer', 'What the normal support teams must learn before handover.', ['Known issues and workarounds', 'Batch recovery steps']],

  // ── Rollback Plan ──
  [RB + 'rollback_decision_owner', 'Rollback decision owner', 'The person who decides whether to roll back.', ['Steering Committee Chair']],
  [RB + 'decision_criteria', 'Decision criteria', 'What is weighed when deciding to roll back.', ['Size of reconciliation differences', 'Time left in the window']],
  [RB + 'decision_authority', 'Decision authority', 'Who may make the rollback decision.', ['Steering Committee', 'Programme Director if the chair is unavailable']],
  [RB + 'decision_deadline', 'Decision deadline', 'The latest time a rollback can be decided.', ['Sunday 14:00']],
  [RB + 'estimated_rollback_duration', 'Estimated rollback duration (hours)', 'How long the rollback takes.', ['8']],
  [RB + 'systems_to_restore', 'Systems to restore', 'The systems returned to their previous state.', ['Legacy core banking', 'Card system interface']],
  [RB + 'data_restore_approach', 'Data restore approach', 'How data is returned to its state before the cutover.', ['Restore the legacy database from the Friday 19:00 backup']],
  [RB + 'transactions_during_cutover', 'Transactions during cutover', 'How transactions made during the cutover are handled after a rollback.', ['Manual payments logged and keyed in the legacy system']],
  [RB + 'reprocessing_approach', 'Reprocessing approach', 'How missed or queued work is processed again.', ['Replay queued card authorisations in order']],
  [RB + 'backups_required', 'Backups required', 'The backups needed to make a rollback possible.', ['Legacy full backup before the freeze', 'Interface configuration backup']],
  [RB + 'post_rollback_checks', 'Post-rollback checks', 'Checks that the old system works again after the rollback.', ['Balances match the Friday close', 'ATMs online']],
  [RB + 'communication_plan', 'Communication plan', 'Who is told about a rollback and how.', ['Staff via intranet; customers via SMS and website']],
  [RB + 'customer_impact', 'Customer impact', 'How customers are affected by a rollback.', ['Services restored on the old system; some payments delayed by a day']],
  [RB + 'rollback_tested', 'Rollback tested', 'Tick once the rollback has been rehearsed.', ['Ticked']],
  D(RB + 'rollback_test_date', 'Rollback test date', 'When the rollback was rehearsed.'),
  [RB + 'test_results', 'Test results', 'What the rollback rehearsal showed.', ['Completed in 6.5 hours; two steps reordered']],
]
