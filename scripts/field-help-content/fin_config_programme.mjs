// v1345 slice 2, wave 3e — FIN core banking configuration and programme field help (source for SQL/v1505).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
// fin_core_banking_environments reuses the Core Environments help (v1498) through a copy statement
// appended to the generated SQL (see ENVIRONMENT_KEYS).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const C = 'register:*:'
const IF = 'register:fin_core_banking_interfaces:'
const CU = 'register:fin_customisation:'
const PA = 'register:fin_parameterisation:'
const PC = 'register:fin_product_configuration:'
const BU = 'register:fin_business_units:'
const WS = 'register:fin_workstreams:'
const TO = 'register:fin_transformation_overview:'
const RM = 'register:fin_transformation_roadmap:'
const RG = 'register:fin_regulatory_milestones:'

export const ENVIRONMENT_KEYS = [
  'used_by', 'site', 'environment_owner', 'host_name', 'ip_address', 'mount_point', 'http_port', 'https_port',
  'application_url', 'db_host', 'db_port', 'db_name', 'db_engine', 'provisioned_date', 'available_from', 'available_to',
  'refresh_frequency', 'last_refresh_date', 'deployed_build', 'user_access', 'hosting_model', 'cloud_provider',
  'cloud_service_model', 'cloud_deployment_type', 'cloud_region', 'cloud_account', 'cloud_network', 'instance_size',
  'auto_scaling', 'network_connectivity', 'monthly_cost', 'data_residency', 'regulatory_approval',
  'regulatory_approval_reference', 'encryption_at_rest', 'key_management', 'backup_dr_region', 'server_type',
  'operating_system', 'cpu_cores', 'memory_gb', 'storage_gb', 'rack_location', 'hardware_support_until',
  'managed_database_service',
]

export const MODULE = 'registers_fin_config'
export const ROWS = [
  // ── Common fields ──
  [C + 'business_area', 'Business area', 'The part of the business this item belongs to.', ['Retail banking', 'Treasury']],
  [C + 'business_analyst', 'Business analyst', 'The analyst who defines and follows up the requirement.', ['Lead Business Analyst']],
  D(C + 'planned_start_date', 'Planned start date', 'When the work is planned to start.'),
  D(C + 'planned_end_date', 'Planned end date', 'When the work is planned to finish.'),
  D(C + 'forecast_end_date', 'Forecast end date', 'When the work is now expected to finish.', 'Compare with the planned end date to see slippage.'),
  [C + 'key_deliverables', 'Key deliverables', 'The main things this work produces.', ['Configured deposit products', 'Signed-off parameter tables']],
  [C + 'release_wave', 'Release / wave', 'The release or wave this belongs to.', ['Release 1', 'Wave 2 – Dubai']],
  D(C + 'deployment_date', 'Deployment date', 'When it was, or will be, deployed to production.'),
  [C + 'go_live_wave', 'Go-live wave', 'The go-live wave this belongs to.', ['Wave 1 – London']],
  [C + 'readiness_rag', 'Readiness RAG', 'Readiness at a glance.', ['Green: ready', 'Amber: some gaps', 'Red: not ready']],
  [C + 'staff_impacted', 'Staff impacted', 'How many staff are affected.', ['420']],
  D(C + 'last_review_date', 'Last review date', 'When this was last reviewed.'),
  [C + 'product_owner', 'Product owner', 'The business person who owns the product and its rules.', ['Head of Retail Deposits']],

  // ── Interfaces ──
  [IF + 'interface_type', 'Interface type', 'What kind of interface this is.', ['Real-time API', 'File transfer']],
  [IF + 'interface_reference', 'Interface / use case reference', 'The reference of this interface.', ['INT-PAY-004']],
  [IF + 'provider_consumer', 'Provider / consumer', 'Whether the core system provides or uses this interface.', ['Provider', 'Consumer']],
  [IF + 'connected_system', 'Connected system', 'The other system on the interface.', ['Payment gateway', 'Card system']],
  [IF + 'interface_owner', 'Owner', 'The person accountable for the interface.', ['Integration Lead']],
  [IF + 'technology', 'Technology / protocol', 'How the systems talk to each other.', ['REST API', 'Message queue', 'SFTP file']],
  [IF + 'frequency', 'Frequency', 'How often data is exchanged.', ['Real time', 'End of day']],
  [IF + 'specification_reference', 'Specification / collection reference', 'Where the interface specification is kept.', ['SPEC-INT-PAY-004 v1.2']],
  [IF + 'data_format', 'Data format', 'The format of the data exchanged.', ['JSON', 'ISO 20022 XML']],
  [IF + 'security_method', 'Security method', 'How the interface is secured.', ['Mutual TLS', 'API key and IP allow-list']],
  [IF + 'peak_daily_volume', 'Peak daily volume', 'The highest number of messages expected in a day.', ['250,000']],
  [IF + 'data_elements', 'Key data elements', 'The main data items exchanged.', ['Account number', 'Amount', 'Value date'], null, 'One per line.'],
  [IF + 'change_reference', 'Change / delta reference', 'The change request linked to this interface.', ['DLT-077']],
  [IF + 'sit_status', 'SIT status', 'Where system integration testing stands.', ['Passed', 'In progress']],
  [IF + 'uat_status', 'UAT status', 'Where user acceptance testing stands.', ['Not started', 'Passed']],
  [IF + 'business_pack_delivered', 'Business pack delivered', 'Tick once the business documentation for the interface is delivered.', ['Ticked']],
  [IF + 'menu_delivered', 'Menu delivered', 'Tick once the related system menu is available.', ['Ticked']],
  [IF + 'menu_name', 'Menu name', 'The name of the menu users open.', ['Outgoing payments enquiry']],

  // ── Customisation ──
  [CU + 'delta_reference', 'Delta / change reference', 'The reference of this customisation request.', ['DLT-077']],
  [CU + 'initial_delivery_phase', 'Initial planned delivery phase', 'The phase it was first planned for.', ['Release 1']],
  [CU + 'change_board_status', 'Change board status', 'Where the change board decision stands.', ['Approved', 'Deferred']],
  [CU + 'business_justification', 'Business justification', 'Why the customisation is needed.', ['Regulator requires a local tax report not available in the standard product']],
  [CU + 'dependent_deltas', 'Duplicate & dependent deltas', 'Other customisations this duplicates or depends on.', ['DLT-074 (depends on)']],
  [CU + 'integration_dependency_available', 'Integration dependency available', 'Tick if any interface it needs is already available.', ['Ticked']],
  [CU + 'integration_dependency_details', 'Integration dependency details', 'The interfaces it depends on.', ['Needs INT-PAY-004 for payment status']],
  [CU + 'deployment_status', 'Deployment status', 'Where the customisation stands in delivery.', ['In development', 'Deployed to UAT']],
  D(CU + 'eta', 'ETA', 'When the customisation is expected to be delivered.'),
  [CU + 'estimated_effort_days', 'Estimated effort (days)', 'How many working days it will take to build.', ['25']],
  [CU + 'estimated_cost', 'Estimated cost', 'What it is expected to cost.', ['40,000'], AM],
  [CU + 'ready_for_testing', 'Ready for testing', 'Tick once it is delivered to the test environment.', ['Ticked']],
  [CU + 'user_manual_required', 'User manual required', 'Tick if users need a manual for it.', ['Ticked']],
  [CU + 'user_manual_available', 'User manual available', 'Tick once the manual is available.', ['Ticked']],
  [CU + 'sanity_check_required', 'Sanity check required', 'Tick if a quick check is needed after delivery.', ['Ticked']],
  [CU + 'sanity_check_status', 'Sanity check status', 'The result of the quick check.', ['Passed', 'Failed']],
  [CU + 'walkthrough_required', 'Walkthrough required', 'Tick if the business needs a walkthrough before testing.', ['Ticked']],
  [CU + 'walkthrough_status', 'Walkthrough status', 'Where the walkthrough stands.', ['Completed', 'Scheduled']],

  // ── Parameterisation ──
  [PA + 'parameter_type', 'Parameter type', 'What kind of settings this is.', ['Global parameters', 'Product parameters']],
  [PA + 'parameter_category', 'Category', 'The group the parameter table belongs to.', ['Interest', 'Charges']],
  [PA + 'parameter_table_name', 'Parameter table name', 'The name of the settings table in the system.', ['INTEREST_RATE_TABLE']],
  [PA + 'configuration_stage', 'Configuration stage', 'Where configuration of this table stands.', ['Data requested', 'Configured', 'Tested']],
  [PA + 'data_received', 'Data received', 'Whether the business has supplied the values.', ['Received', 'Partially received']],
  [PA + 'person_responsible', 'Person responsible', 'The person configuring this table.', ['Configuration Analyst']],
  [PA + 'parameter_values', 'Parameter values / records', 'The values or records to set up.', ['Savings standard rate 2.50%', 'Minimum balance 100']],
  [PA + 'dependent_parameters', 'Dependent parameter tables', 'Tables that must be set up first.', ['CURRENCY_TABLE', 'BRANCH_TABLE']],
  [PA + 'values_authorised', 'Values authorised', 'Tick once the business has authorised the values.', ['Ticked']],
  [PA + 'authorised_by', 'Authorised by', 'The person who authorised the values.', ['Head of Retail Products']],
  D(PA + 'authorised_date', 'Authorised date', 'When the values were authorised.'),
  D(PA + 'configured_date', 'Configured date', 'When the table was set up in the system.'),
  D(PA + 'tested_date', 'Tested date', 'When the configuration was tested.'),

  // ── Product Configuration ──
  [PC + 'product_type', 'Product type', 'What kind of banking product this is.', ['Savings account', 'Personal loan']],
  [PC + 'product_code', 'Product code', 'The product’s code in the new system.', ['SAV-STD']],
  [PC + 'configuration_analyst', 'Configuration analyst', 'The person setting up the product.', ['Configuration Analyst']],
  [PC + 'currencies', 'Currencies', 'The currencies the product is offered in.', ['GBP, AED, USD']],
  [PC + 'interest_basis', 'Interest basis', 'How interest is calculated.', ['Actual/365', 'Fixed rate']],
  [PC + 'interest_rate_range', 'Interest rate / range', 'The rate or range of rates.', ['2.25% – 3.10%']],
  [PC + 'minimum_balance', 'Minimum balance / amount', 'The smallest balance or amount allowed.', ['100'], AM],
  [PC + 'maximum_limit', 'Maximum balance / limit', 'The largest balance or limit allowed.', ['250,000'], AM],
  [PC + 'term_range', 'Term range', 'The shortest and longest term.', ['3 to 60 months']],
  [PC + 'channels', 'Available channels', 'Where customers can get the product.', ['Branch', 'Mobile app']],
  [PC + 'fees_charges', 'Fees & charges', 'The fees and charges that apply.', ['Monthly fee 5.00', 'Early withdrawal charge 1%']],
  [PC + 'eligibility_rules', 'Eligibility rules', 'Who can have the product.', ['Aged 18 or over', 'Resident in the United Kingdom']],
  [PC + 'gl_mappings', 'General ledger mappings', 'The ledger accounts the product posts to.', ['Principal – 200110', 'Interest paid – 600210']],
  [PC + 'migration_approach', 'Migration approach', 'How existing accounts of this product are migrated.', ['Migrate with existing rates', 'Convert to a new product']],
  [PC + 'legacy_product_codes', 'Legacy product codes', 'The old product codes this product replaces.', ['101', '102']],
  D(PC + 'configuration_start_date', 'Configuration start date', 'When setup of the product started.'),
  D(PC + 'configuration_complete_date', 'Configuration complete date', 'When setup of the product finished.'),
  [PC + 'business_sign_off', 'Business sign-off obtained', 'Tick once the product owner has accepted the setup.', ['Ticked']],

  // ── Business Units ──
  [BU + 'business_unit_code', 'Business unit code', 'The code of the business unit.', ['RET-LON']],
  [BU + 'business_line', 'Business line', 'The line of business the unit belongs to.', ['Retail', 'Corporate']],
  [BU + 'unit_head', 'Business unit head', 'The person leading the unit.', ['Head of Retail, London']],
  [BU + 'change_champion', 'Change champion', 'The person supporting the change in this unit.', ['Senior Teller']],
  [BU + 'primary_change_type', 'Primary change type', 'The main kind of change the unit experiences.', ['Process', 'Technology']],
  [BU + 'products_services_impacted', 'Products / services impacted', 'The products or services that change for this unit.', ['Current accounts, cards']],
  [BU + 'locations_impacted', 'Branches / locations impacted', 'How many branches or sites are affected.', ['12']],
  [BU + 'customers_impacted', 'Customers impacted', 'How many customers are affected.', ['85,000']],

  // ── Workstreams ──
  [WS + 'workstream_code', 'Workstream code', 'The code of the workstream.', ['WS-DATA']],
  [WS + 'workstream_type', 'Workstream type', 'What kind of workstream this is.', ['Technology', 'Business change']],
  [WS + 'workstream_lead', 'Workstream lead', 'The person leading the workstream.', ['Data Migration Lead']],
  [WS + 'team_size', 'Team size', 'How many people work in the workstream.', ['14']],
  [WS + 'actual_spend', 'Actual spend to date', 'What the workstream has spent so far.', ['320,000'], AM],
  [WS + 'key_risks_issues', 'Key risks / issues', 'The main risks and issues for the workstream.', ['Vendor resources not confirmed for Release 2']],
  D(WS + 'last_status_update', 'Last status update', 'When the workstream last reported its status.'),

  // ── Transformation Overview ──
  [TO + 'transformation_type', 'Transformation type', 'What kind of transformation this is.', ['Core banking replacement', 'Digital channels']],
  [TO + 'strategic_objectives', 'Strategic objectives', 'The organisation’s goals the transformation supports.', ['Halve account-opening time', 'Retire the legacy core by 2028']],
  [TO + 'executive_sponsor', 'Executive sponsor', 'The senior leader accountable for the transformation.', ['Chief Operating Officer']],
  [TO + 'programme_director', 'Programme director', 'The person running the programme day to day.', ['Programme Director']],
  [TO + 'governance_forum', 'Governance forum', 'The board that oversees the transformation.', ['Transformation Steering Committee']],
  [TO + 'business_case_reference', 'Business case reference', 'The approved business case.', ['BC-2026-004']],
  D(TO + 'target_completion_date', 'Target completion date', 'When the transformation should be complete.'),
  [TO + 'approved_budget', 'Approved budget', 'The budget approved for the transformation.', ['12,000,000'], AM],
  [TO + 'expected_annual_benefit', 'Expected annual benefit', 'The yearly benefit expected once complete.', ['3,500,000'], AM],
  [TO + 'regulatory_drivers', 'Regulatory drivers', 'Regulations that make the change necessary.', ['New payment reporting rules from 2027']],
  [TO + 'key_dependencies', 'Key dependencies', 'Other work the transformation depends on.', ['Data centre move completed']],
  [TO + 'risk_appetite', 'Risk appetite', 'How much risk the organisation will accept for this change.', ['Low', 'Moderate']],

  // ── Transformation Roadmap ──
  [RM + 'roadmap_phase', 'Roadmap phase', 'The phase of the roadmap.', ['Foundation', 'Rollout']],
  [RM + 'capability_delivered', 'Business capability delivered', 'What the business can do once this phase is done.', ['Open accounts digitally in 10 minutes']],
  [RM + 'on_critical_path', 'On critical path', 'Tick if a delay here delays the whole roadmap.', ['Ticked']],
  [RM + 'baseline_version', 'Baseline version', 'The approved version of the roadmap this is measured against.', ['Baseline 2']],

  // ── Regulatory Milestones ──
  [RG + 'regulator', 'Regulator', 'The regulatory body involved.', ['National banking regulator']],
  [RG + 'regulation_reference', 'Regulation / requirement reference', 'The rule or requirement this milestone relates to.', ['Outsourcing guideline section 4']],
  [RG + 'milestone_type', 'Milestone type', 'What kind of regulatory milestone this is.', ['Notification', 'Approval required']],
  [RG + 'requirement_summary', 'Requirement summary', 'A short summary of what the regulator requires.', ['Notify the regulator 30 days before moving core systems to the cloud']],
  [RG + 'accountable_owner', 'Accountable owner', 'The person accountable for meeting the milestone.', ['Chief Risk Officer']],
  [RG + 'compliance_officer', 'Compliance officer', 'The compliance officer following it up.', ['Compliance Officer']],
  [RG + 'impact_if_missed', 'Impact if missed', 'How serious it is if the milestone is missed.', ['High', 'Medium']],
  [RG + 'penalty_exposure', 'Potential penalty exposure', 'The possible fine or penalty if missed.', ['500,000'], AM],
  D(RG + 'submission_date', 'Submission date', 'When the submission was made.'),
  [RG + 'submission_reference', 'Submission reference', 'The reference of the submission to the regulator.', ['REG-SUB-2027-03']],
  [RG + 'evidence_location', 'Evidence location', 'Where the supporting evidence is kept.', ['Compliance library › Regulatory submissions']],
  [RG + 'regulator_feedback', 'Regulator feedback', 'What the regulator said in response.', ['No objection; quarterly updates requested']],
  D(RG + 'milestone_date', 'Milestone date', 'The date the milestone falls due.'),
]
