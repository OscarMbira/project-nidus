// v1345 slice 2, wave 4a — ICT common entries + architecture and design registers (source for SQL/v1507).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies:
// role titles, "Example … Ltd", globally familiar places, no product or brand names.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const C = 'register:*:'
const AA = 'register:ict_application_architecture:'
const AD = 'register:ict_architecture_decisions:'
const DA = 'register:ict_data_architecture:'
const DD = 'register:ict_data_design:'
const EA = 'register:ict_enterprise_architecture:'
const FD = 'register:ict_functional_design:'
const IA = 'register:ict_integration_architecture:'
const ID = 'register:ict_integration_design:'
const SA = 'register:ict_security_architecture:'
const SO = 'register:ict_solution_architecture:'
const TD = 'register:ict_technical_design:'
const UX = 'register:ict_ux_ui_design:'

export const MODULE = 'registers_ict_architecture'
export const ROWS = [
  // ── New common entries (used by several registers; any register can override) ──
  [C + 'technology_stack', 'Technology stack', 'The main technologies used: languages, frameworks, databases and platforms.', ['Web front end framework', 'Java services on containers', 'Relational database'], LINES],
  [C + 'apis', 'APIs', 'The application programming interfaces provided or used.', ['Customer API – read and update customer details', 'Payments API – submit and track payments'], LINES],
  [C + 'components', 'Components', 'The main parts that make up the solution.', ['Customer portal', 'Payments service', 'Reporting database'], LINES],
  [C + 'non_functional_requirements', 'Non-functional requirements', 'How well the system must work, rather than what it does: speed, availability, capacity, security.', ['Pages load in under 2 seconds', '99.9% availability in business hours', 'Supports 5,000 users at once'], LINES],
  [C + 'data_flows', 'Data flows', 'How data moves between systems, and in which direction.', ['Customer portal → Customer API → core system', 'Core system → data warehouse, nightly'], LINES],
  [C + 'interfaces', 'Interfaces', 'The connections to other systems.', ['Core system – real-time API', 'Card system – nightly file'], LINES],
  [C + 'security_controls', 'Security controls', 'The measures that protect the system and its data.', ['Single sign-on with multi-factor authentication', 'Encryption of data at rest and in transit', 'Role-based access'], LINES],
  [C + 'availability_target', 'Availability target (%)', 'The share of time the service must be available.', ['99.9'], 'A percentage from 0 to 100.'],
  [C + 'recovery_time_objective', 'Recovery time objective (hours)', 'The longest the service may be down after a failure before it must be restored.', ['4'], 'In hours.'],
  [C + 'recovery_point_objective', 'Recovery point objective (hours)', 'The most data, measured in time, that may be lost after a failure.', ['1'], 'In hours. 0 means no data loss is accepted.'],
  [C + 'deployment_model', 'Deployment model', 'Where the solution runs.', ['Cloud']],
  [C + 'success_criteria', 'Success criteria', 'How you will know this has succeeded.', ['All branches live by the target date', 'No priority 1 incidents in the first month'], LINES],
  [C + 'decisions_needed', 'Decisions needed', 'Decisions someone must make for the work to continue, with who and by when.', ['Approve the hosting option – Steering Committee – by end of month'], LINES],
  [C + 'approved_budget', 'Approved budget', 'The budget formally approved for this work.', ['2,500,000'], AM],
  [C + 'forecast_to_complete', 'Forecast to complete', 'The expected further cost to finish the work.', ['640,000'], AM],
  [C + 'on_critical_path', 'On the critical path', 'Tick if a delay here delays the overall go-live date.', ['Ticked for the data migration workstream']],
  [C + 'rag', 'RAG', 'Red, Amber or Green status: Green on track, Amber at risk, Red off track and needing help.', ['Amber']],
  [C + 'needed_by', 'Needed by', 'The date this must be in place.', ['{example_date}'], DF],
  [C + 'target_date', 'Target date', 'The date this is planned to be finished.', ['{example_date}'], DF],
  [C + 'signoff_date', 'Sign-off date', 'The date this was formally signed off.', ['{example_date}'], DF],
  [C + 'business_rules', 'Business rules', 'The rules the business applies, written in plain words.', ['A customer may hold no more than 5 savings accounts', 'Payments over 10,000 need a second approver'], LINES],
  [C + 'business_requirements', 'Business requirements', 'What the business needs this to do.', ['Open a current account online in under 10 minutes', 'Show balances in real time'], LINES],
  [C + 'business_drivers', 'Business drivers', 'The business reasons behind this work.', ['Reduce running costs', 'Meet new regulatory reporting rules', 'Launch digital products faster'], LINES],
  [C + 'integration_patterns', 'Integration patterns', 'The ways systems are connected.', ['Real-time API', 'Batch']],
  [C + 'message_format', 'Message format', 'The format of the data exchanged.', ['JSON']],
  [C + 'data_classification', 'Data classification', 'How sensitive the data is, which decides how it must be protected.', ['Confidential']],
  [C + 'personal_data', 'Contains personal data', 'Tick if the data identifies living people (names, addresses, ID numbers).', ['Ticked for customer data']],
  [C + 'data_quality_rules', 'Data quality rules', 'Checks the data must pass to be trusted.', ['Every customer has a date of birth', 'Account balances reconcile to the general ledger daily'], LINES],
  [C + 'reference_data', 'Reference data', 'Standard lists of values used by the data.', ['Country codes', 'Currency codes', 'Branch list'], LINES],
  [C + 'logging_and_monitoring', 'Logging & monitoring', 'What is logged and watched, and who is alerted.', ['Security events sent to the security operations centre', 'Response-time alerts to the support team'], LINES],
  [C + 'systems_in_scope', 'Systems in scope', 'The systems this covers.', ['Core system', 'Internet banking', 'Payments hub'], LINES],
  [C + 'technical_lead', 'Technical lead', 'The person who leads the technical work.', ['Lead Engineer']],
  [C + 'key_risks', 'Key risks', 'The main things that might go wrong, with their effect.', ['Supplier resources may be late, delaying testing'], LINES],
  [C + 'key_issues', 'Key issues', 'Problems happening now that need action.', ['Test environment unstable since last upgrade'], LINES],
  [C + 'key_dependencies', 'Key dependencies', 'Things outside this work that it relies on.', ['Network upgrade at the Dubai data centre'], LINES],
  [C + 'blockers', 'Blockers', 'Anything stopping progress right now.', ['Waiting for firewall changes'], LINES],
  [C + 'workstreams', 'Workstreams', 'The workstreams linked to this record. Pick existing records.', ['Data Migration workstream']],
  [C + 'technology_milestones', 'Technology milestones', 'The milestones linked to this record. Pick existing records.', ['Production environment ready']],
  [C + 'technology_roadmap', 'Technology roadmap', 'The roadmap this record belongs to. Pick an existing record.', ['Technology Roadmap 2027–2029']],

  // ── Application Architecture ──
  [AA + 'application_architect', 'Application architect', 'The person who owns the application design.', ['Lead Application Architect']],
  [AA + 'architecture_style', 'Architecture style', 'The overall way the application is structured.', ['Modular monolith']],
  [AA + 'applications_in_scope', 'Applications in scope', 'The applications this architecture covers.', ['Internet banking', 'Mobile app', 'Branch teller system'], LINES],
  [AA + 'application_components', 'Application components', 'The main building blocks of the applications.', ['User interface', 'Business services', 'Data access layer'], LINES],
  [AA + 'design_patterns', 'Design patterns', 'Proven design approaches used, and why.', ['API gateway in front of all services', 'Event publishing for account changes'], LINES],
  [AA + 'hosting_environments', 'Hosting environments', 'The environments the applications run in.', ['Test', 'UAT', 'Production']],
  [AA + 'scalability_approach', 'Scalability approach', 'How the applications will handle growth in users or transactions.', ['Add more service instances automatically when load passes 70%, up to 10 instances.']],

  // ── Architecture Decisions ──
  [AD + 'decision_owner', 'Decision owner', 'The person accountable for this decision.', ['Chief Architect']],
  [AD + 'decision_area', 'Decision area', 'The part of the architecture the decision affects.', ['Integration']],
  [AD + 'decision_context', 'Context', 'The situation that led to this decision.', ['Three teams build their own connections to the core system, causing duplicated effort.']],
  [AD + 'problem_statement', 'Problem statement', 'The question this decision answers, in one or two sentences.', ['How should channel applications connect to the core system?']],
  [AD + 'decision_drivers', 'Decision drivers', 'The factors that matter most in choosing.', ['Time to market', 'Security', 'Running cost'], LINES],
  [AD + 'decision_constraints', 'Constraints', 'Limits the decision must respect.', ['Must use the existing integration platform licence', 'Data must stay in the UK'], LINES],
  [AD + 'options_considered', 'Options considered', 'Each option looked at, with its pros and cons.', ['Shared API layer – one standard – needs a new team', 'Direct connections – quick – hard to maintain'], 'One option per line: Option – Pros – Cons.'],
  [AD + 'decision_outcome', 'Decision', 'The option chosen, stated clearly.', ['Build a shared API layer that all channels use.']],
  [AD + 'rationale', 'Rationale', 'Why this option was chosen over the others.', ['It removes duplicate work and gives one place to apply security.']],
  [AD + 'positive_consequences', 'Positive consequences', 'The benefits expected from the decision.', ['Faster delivery of new channels', 'One security model'], LINES],
  [AD + 'negative_consequences', 'Negative consequences', 'The downsides or costs accepted with the decision.', ['New team needed to run the API layer', 'Short delay while it is built'], LINES],
  [AD + 'follow_up_actions', 'Follow-up actions', 'Actions needed to put the decision in place.', ['Publish API standards – Integration Lead', 'Update the solution designs – Solution Architects'], LINES],
  [AD + 'related_decisions', 'Related decisions', 'Other decisions this one depends on or affects.', ['ADR-0012 – Hosting in cloud'], LINES],
  [AD + 'supersedes', 'Supersedes', 'The earlier decision this one replaces, if any.', ['ADR-0004']],

  // ── Data Architecture ──
  [DA + 'data_architect', 'Data architect', 'The person who owns the data design.', ['Lead Data Architect']],
  [DA + 'data_domains', 'Data domains', 'The main subject areas of data.', ['Customer', 'Accounts', 'Payments'], LINES],
  [DA + 'data_sources', 'Data sources', 'Where the data comes from.', ['Core system', 'Customer relationship system', 'Card system'], LINES],
  [DA + 'data_stores', 'Data stores', 'Where the data is kept.', ['Operational database', 'Data warehouse', 'Document store'], LINES],
  [DA + 'conceptual_model', 'Conceptual model', 'A plain description of the main things the business holds data about and how they relate.', ['A customer holds one or more accounts; each account has many transactions.']],
  [DA + 'logical_model_reference', 'Logical model reference', 'Where the detailed data model is kept.', ['DM-LOG-003 v1.2']],
  [DA + 'master_data_entities', 'Master data entities', 'Key shared data that must have one trusted version.', ['Customer', 'Product', 'Branch'], LINES],
  [DA + 'data_owners', 'Data owners', 'Who is accountable for each data domain.', ['Customer – Head of Retail', 'Payments – Head of Payments'], LINES],
  [DA + 'retention_rules', 'Retention rules', 'How long each type of data is kept and why.', ['Transactions – 7 years – regulation', 'Call recordings – 1 year – policy'], LINES],
  [DA + 'classification_levels', 'Classification levels', 'The sensitivity levels used for this data.', ['Internal', 'Confidential']],
  [DA + 'personal_data_processed', 'Personal data processed', 'Tick if any personal data is collected, stored or used.', ['Ticked']],
  [DA + 'privacy_controls', 'Privacy controls', 'How personal data is protected and its use limited.', ['Consent recorded before marketing', 'Masked data in test environments'], LINES],
  [DA + 'encryption_requirements', 'Encryption requirements', 'Where data must be encrypted.', ['At rest in all databases', 'In transit between all systems'], LINES],

  // ── Data Design ──
  [DD + 'data_designer', 'Data designer', 'The person who designs the database structures.', ['Senior Data Engineer']],
  [DD + 'database_platform', 'Database platform', 'The type of database used.', ['Relational database, cloud managed']],
  [DD + 'entities', 'Entities', 'The tables or objects, what they hold and who owns them.', ['Customer – people and companies we serve – Head of Retail'], 'One entity per line: Entity – Description – Owner.'],
  [DD + 'relationships', 'Relationships', 'How the entities link to each other.', ['Customer 1 → many Accounts', 'Account 1 → many Transactions'], LINES],
  [DD + 'key_attributes', 'Key attributes', 'The most important fields, especially identifiers.', ['Customer number', 'Account number', 'Transaction date'], LINES],
  [DD + 'validation_rules', 'Validation rules', 'Checks applied when data is saved.', ['Email must contain @', 'Date of birth must be in the past'], LINES],
  [DD + 'indexing_and_partitioning', 'Indexing & partitioning', 'How the data is organised for speed.', ['Index on account number', 'Transactions split by month'], LINES],
  [DD + 'retention_and_archiving', 'Retention & archiving', 'When data is archived or deleted.', ['Archive transactions older than 2 years', 'Delete after 7 years'], LINES],
  [DD + 'personal_data_fields', 'Personal data fields', 'The fields that hold personal data.', ['Full name', 'Date of birth', 'Home address'], LINES],
  [DD + 'masking_requirements', 'Masking requirements', 'Fields to hide or scramble outside production.', ['Replace names with generated values in test', 'Show only the last 4 digits of card numbers'], LINES],
  [DD + 'migration_considerations', 'Migration considerations', 'What must be considered when moving existing data to this design.', ['Old customer numbers must be kept as an alternative key for 2 years.']],

  // ── Enterprise Architecture ──
  [EA + 'architecture_owner', 'Architecture owner', 'The person accountable for the enterprise architecture.', ['Chief Architect']],
  [EA + 'strategic_goals', 'Strategic goals', 'The organisation’s goals the architecture must support.', ['Double digital sales in 3 years', 'Cut technology running costs by 15%'], LINES],
  [EA + 'stakeholder_concerns', 'Stakeholder concerns', 'What matters to key stakeholders about the architecture.', ['Chief Risk Officer – resilience', 'Chief Financial Officer – cost'], LINES],
  [EA + 'architecture_principles', 'Architecture principles', 'Agreed rules that guide design choices.', ['Reuse before buy, buy before build', 'Cloud first'], LINES],
  [EA + 'baseline_architecture', 'Baseline architecture', 'A description of how things work today.', ['Twelve separate channel systems, each linked directly to an ageing core system.']],
  [EA + 'pain_points', 'Pain points', 'Problems with the current architecture.', ['Slow to change products', 'High support cost'], LINES],
  [EA + 'target_architecture', 'Target architecture', 'A description of how things should work in future.', ['One digital platform for all channels, linked to a modern core through a shared API layer.']],
  [EA + 'capability_map', 'Capability map', 'The business capabilities and how well they are supported today.', ['Customer onboarding – weak', 'Payments – strong'], LINES],
  [EA + 'gaps', 'Gaps', 'Differences between today and the target.', ['No shared API layer', 'No single customer view'], LINES],
  [EA + 'transition_architectures', 'Transition architectures', 'The in-between states on the way to the target.', ['Stage 1 – API layer live', 'Stage 2 – new core for savings'], LINES],
  [EA + 'roadmap_items', 'Roadmap items', 'The initiatives that move the organisation towards the target.', ['Build API layer – 2027', 'Replace core system – 2028'], LINES],
  [EA + 'technology_standards', 'Technology standards', 'Approved technologies and standards to follow.', ['Relational database, cloud managed', 'OAuth 2.0 for API security'], LINES],
  [EA + 'governance_process', 'Governance process', 'How designs are checked against the architecture.', ['All new solutions are reviewed by the Architecture Review Board before build starts.']],
  [EA + 'compliance_requirements', 'Compliance requirements', 'Laws, regulations and policies the architecture must meet.', ['Data protection law', 'Operational resilience rules'], LINES],

  // ── Functional Design ──
  [FD + 'functional_lead', 'Functional lead', 'The person who owns the functional design.', ['Lead Business Analyst']],
  [FD + 'module_area', 'Module / area', 'The part of the system this design covers.', ['Loan origination']],
  [FD + 'process_flows', 'Process flows', 'The business processes the design supports, step by step.', ['Apply → credit check → approve → disburse'], LINES],
  [FD + 'user_roles', 'User roles', 'Who uses this part of the system.', ['Loan officer', 'Credit approver', 'Branch manager'], LINES],
  [FD + 'functional_requirements', 'Functional requirements', 'What the system must do, with an ID and priority.', ['FR-001 – Capture loan application – Must'], 'One requirement per line: ID – Requirement – Priority.'],
  [FD + 'validations', 'Validations', 'Checks on what users enter.', ['Loan amount must be between 1,000 and 50,000'], LINES],
  [FD + 'screens', 'Screens', 'The screens users will see.', ['Application form', 'Approval queue'], LINES],
  [FD + 'reports', 'Reports', 'The reports this area produces.', ['Daily loans approved', 'Applications pending over 5 days'], LINES],
  [FD + 'notifications', 'Notifications', 'Messages sent to users or customers, and when.', ['Email to customer when the loan is approved'], LINES],
  [FD + 'data_entities', 'Data entities', 'The main data this area creates or uses.', ['Loan application', 'Customer', 'Credit score'], LINES],
  [FD + 'inputs_and_outputs', 'Inputs & outputs', 'What comes in and what goes out.', ['In – application form', 'Out – approval letter'], LINES],
  [FD + 'acceptance_criteria', 'Acceptance criteria', 'Conditions the finished system must meet to be accepted.', ['A loan officer can submit an application in under 5 minutes'], LINES],
  [FD + 'traceability_reference', 'Traceability reference', 'Where the link from requirements to tests is recorded.', ['RTM-LOANS v2']],
  [FD + 'open_questions', 'Open questions', 'Questions still to be answered, with who must answer.', ['Can approvers override the credit score? – Head of Credit'], LINES],

  // ── Integration Architecture ──
  [IA + 'integration_architect', 'Integration architect', 'The person who owns the integration design.', ['Lead Integration Architect']],
  [IA + 'middleware_integration_platform', 'Middleware / integration platform', 'The platform used to connect systems.', ['Cloud integration platform']],
  [IA + 'systems_integrated', 'Systems integrated', 'The systems being connected.', ['Core system', 'Card system', 'Customer relationship system'], LINES],
  [IA + 'interfaces', 'Interfaces', 'Each connection, with its source, target, pattern and frequency.', ['Customer update – Core system – Card system – Real-time API – On change'], 'One interface per line: Name – Source – Target – Pattern – Frequency.'],
  [IA + 'message_formats', 'Message formats', 'The data formats used across interfaces.', ['JSON', 'ISO 20022']],
  [IA + 'api_standards', 'API standards', 'Rules every API must follow.', ['Versioned URLs', 'Standard error codes'], LINES],
  [IA + 'error_handling', 'Error handling', 'What happens when a message fails.', ['Retry 3 times, then move the message to an error queue and alert the support team.']],
  [IA + 'throughput_targets', 'Throughput targets', 'How many messages the interfaces must handle.', ['500 payments per second at peak'], LINES],
  [IA + 'monitoring_approach', 'Monitoring approach', 'How the interfaces are watched.', ['Dashboard of message counts and failures; alerts to the support team out of hours.']],
  [IA + 'authentication_methods', 'Authentication methods', 'How systems prove who they are to each other.', ['OAuth 2.0', 'Mutual TLS']],

  // ── Integration Design ──
  [ID + 'interface_name', 'Interface name', 'A short name for this interface.', ['Customer update to card system']],
  [ID + 'target_system', 'Target system', 'The system that receives the data.', ['Card system']],
  [ID + 'integration_pattern', 'Integration pattern', 'How the systems are connected.', ['Real-time API']],
  [ID + 'frequency', 'Frequency', 'How often data is sent.', ['Near real-time']],
  [ID + 'field_mappings', 'Field mappings', 'Which source field fills which target field, and any rule.', ['cust_no – customerId – copy as is'], 'One mapping per line: Source – Target – Rule.'],
  [ID + 'transformations', 'Transformations', 'Changes made to the data on the way.', ['Convert dates to year-month-day', 'Join first and last name'], LINES],
  [ID + 'error_scenarios', 'Error scenarios', 'What can go wrong and what happens then.', ['Target system down – message held and retried'], LINES],
  [ID + 'retry_policy', 'Retry policy', 'How failed messages are tried again.', ['Retry after 1, 5 and 15 minutes; then alert the support team.']],
  [ID + 'alerting', 'Alerting', 'Who is alerted about failures, and how.', ['Email to Integration Support after 3 failures'], LINES],
  [ID + 'authentication_method', 'Authentication method', 'How the systems prove who they are.', ['Mutual TLS']],
  [ID + 'encryption_in_transit', 'Encryption in transit', 'Tick if the data is encrypted while being sent.', ['Ticked']],
  [ID + 'data_sensitivity', 'Data sensitivity', 'How sensitive the data sent is.', ['Confidential']],
  [ID + 'test_cases', 'Test cases', 'The tests that prove the interface works.', ['New customer created in the card system', 'Invalid record rejected and logged'], LINES],
  [ID + 'volumes_and_performance', 'Volumes & performance', 'Expected volumes and speed.', ['20,000 messages a day', 'Each message processed in under 2 seconds'], LINES],

  // ── Security Architecture ──
  [SA + 'security_architect', 'Security architect', 'The person who owns the security design.', ['Lead Security Architect']],
  [SA + 'overall_security_risk', 'Overall security risk', 'Your overall view of the remaining security risk.', ['Medium']],
  [SA + 'security_requirements', 'Security requirements', 'What the solution must do to be secure.', ['Multi-factor authentication for all staff', 'Encrypt all customer data'], LINES],
  [SA + 'regulatory_frameworks', 'Regulatory frameworks', 'Security laws and standards that apply.', ['Card data security standard', 'Data protection law'], LINES],
  [SA + 'data_classification', 'Data classification', 'The data handled and how sensitive each type is.', ['Customer details – Confidential', 'Card numbers – Restricted'], LINES],
  [SA + 'threat_model_summary', 'Threat model summary', 'A short summary of the main ways the solution could be attacked.', ['Main risks are stolen staff logins and attacks on the public API.']],
  [SA + 'key_threats', 'Key threats', 'The most serious threats.', ['Phishing of staff credentials', 'Denial of service on the public API'], LINES],
  [SA + 'identity_and_access_controls', 'Identity & access controls', 'How users are identified and what they may do.', ['Single sign-on', 'Quarterly access reviews'], LINES],
  [SA + 'network_controls', 'Network controls', 'How the network is protected.', ['Firewalls between zones', 'Web application firewall in front of the portal'], LINES],
  [SA + 'data_protection_controls', 'Data protection controls', 'How data is protected.', ['Encryption at rest', 'Data loss prevention on email'], LINES],
  [SA + 'application_controls', 'Application controls', 'Protections built in the application.', ['Input validation', 'Session timeout after 15 minutes'], LINES],
  [SA + 'security_testing', 'Security testing', 'The security tests planned.', ['Penetration test', 'Vulnerability scan']],
  [SA + 'compliance_checks', 'Compliance checks', 'Checks against security standards, with results.', ['Password policy – met', 'Encryption standard – met'], LINES],
  [SA + 'residual_risks', 'Residual risks', 'Security risks that remain after the controls.', ['Insider misuse – reduced by monitoring – accepted by the Chief Information Security Officer'], LINES],

  // ── Solution Architecture ──
  [SO + 'solution_architect', 'Solution architect', 'The person who owns this solution design.', ['Lead Solution Architect']],
  [SO + 'solution_name', 'Solution name', 'The name of the solution.', ['Digital Onboarding Platform']],
  [SO + 'stakeholders', 'Stakeholders', 'The people and groups with an interest in the solution.', ['Head of Retail', 'Chief Information Security Officer'], LINES],
  [SO + 'architecture_overview', 'Architecture overview', 'A short description of how the solution is built.', ['A mobile and web front end calls cloud services, which connect to the core system through the API layer.']],
  [SO + 'non_functional_requirements', 'Non-functional requirements', 'How well the solution must work, with targets.', ['Performance – page load – under 2 seconds'], 'One requirement per line: Category – Requirement – Target.'],
  [SO + 'architecture_decisions', 'Architecture decisions', 'Key design decisions for this solution.', ['ADR-0012 – Hosting in cloud'], LINES],
  [SO + 'technical_debt', 'Technical debt', 'Known shortcuts or weaknesses to fix later.', ['Manual deployment until the pipeline is ready'], LINES],

  // ── Technical Design ──
  [TD + 'component_service', 'Component / service', 'The component or service this design covers.', ['Payments service']],
  [TD + 'design_overview', 'Design overview', 'A short description of the technical design.', ['A stateless service that validates payments and passes them to the payments hub.']],
  [TD + 'component_design', 'Component design', 'The parts of the component and what each does.', ['Validator – checks the payment', 'Router – sends it to the right scheme'], LINES],
  [TD + 'logic_and_algorithms', 'Logic & algorithms', 'Any important processing logic or calculation.', ['Fees are 0.5% of the amount, minimum 1.00, maximum 25.00.']],
  [TD + 'configuration', 'Configuration', 'Settings that change how the component behaves.', ['Daily payment limit', 'Retry count'], LINES],
  [TD + 'data_structures', 'Data structures', 'The main data the component holds or passes.', ['Payment request – amount, currency, payer, payee'], LINES],
  [TD + 'database_changes', 'Database changes', 'Changes needed to the database.', ['New table for payment status', 'Index on payment date'], LINES],
  [TD + 'integration_points', 'Integration points', 'Other systems this component connects to.', ['Payments hub', 'Fraud screening service'], LINES],
  [TD + 'performance_considerations', 'Performance considerations', 'What affects speed and how it is handled.', ['Cache exchange rates for 5 minutes'], LINES],
  [TD + 'security_considerations', 'Security considerations', 'Security points for this component.', ['Check the user may pay from the account', 'Log every change of limit'], LINES],
  [TD + 'deployment_steps', 'Deployment steps', 'How the component is released.', ['Run database scripts', 'Deploy the new version', 'Run smoke tests'], LINES],
  [TD + 'unit_test_approach', 'Unit test approach', 'How developers test the code.', ['Automated tests for every rule, at least 80% code coverage, run on every change.']],
  [TD + 'test_scenarios', 'Test scenarios', 'Situations to test.', ['Payment over the limit is rejected', 'Duplicate payment is caught'], LINES],

  // ── UX / UI Design ──
  [UX + 'ux_lead', 'UX lead', 'The person who leads the user experience design.', ['Lead UX Designer']],
  [UX + 'prototype_link', 'Prototype link', 'Where the clickable prototype can be viewed.', ['https://design.example/onboarding-prototype']],
  [UX + 'design_system_reference', 'Design system reference', 'The design system or style guide used.', ['Group Design System v3']],
  [UX + 'personas', 'Personas', 'Typical users the design is for.', ['First-time customer on a phone', 'Branch staff member'], LINES],
  [UX + 'user_goals', 'User goals', 'What users want to achieve.', ['Open an account without visiting a branch'], LINES],
  [UX + 'user_journeys', 'User journeys', 'The steps users take to reach a goal.', ['Download app → verify identity → open account → fund account'], LINES],
  [UX + 'information_architecture', 'Information architecture', 'How content and screens are organised and found.', ['Four main sections: Home, Accounts, Payments, Help.']],
  [UX + 'key_screens', 'Key screens', 'The most important screens.', ['Sign-up', 'Account summary', 'Make a payment'], LINES],
  [UX + 'accessibility_standard', 'Accessibility standard', 'The accessibility standard the design must meet.', ['WCAG 2.2 AA']],
  [UX + 'accessibility_requirements', 'Accessibility requirements', 'Specific accessibility needs to meet.', ['Works with screen readers', 'Text can be enlarged to 200%'], LINES],
  [UX + 'devices_supported', 'Devices supported', 'The devices the design must work on.', ['Desktop', 'Mobile']],
  [UX + 'browsers_supported', 'Browsers supported', 'The web browsers the design must work in.', ['Latest two versions of each major browser'], LINES],
  [UX + 'usability_tests', 'Usability tests', 'Tests with real users and their results.', ['Sign-up test, 8 users in London – 7 completed'], LINES],
  [UX + 'design_changes', 'Design changes', 'Changes made after testing or feedback.', ['Moved the help button to the top of the screen'], LINES],
]
