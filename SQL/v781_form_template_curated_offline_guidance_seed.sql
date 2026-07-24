-- =============================================================================
-- v781: Curated offline guidance for ALL form templates (Platform + Simulator)
-- Plan: projectplan/v781_systemwide_form_template_curated_offline_guidance_plan.md
-- Companion Admin: SQL/v179_global_form_template_curated_guidance_seed.sql
-- Idempotent: patches schema help/sample; upserts org defaults (overwrites boilerplate only)
-- Apply after Admin v179 (optional publish) so catalogs stay aligned.
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS tmp_v781_guidance (
    template_code TEXT NOT NULL,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    help_text TEXT NOT NULL,
    sample_value JSONB NOT NULL
);

TRUNCATE tmp_v781_guidance;

INSERT INTO tmp_v781_guidance (template_code, section_key, field_key, help_text, sample_value) VALUES
    ('F001', 'general', 'purpose', 'Summarise why this project exists and the business problem or opportunity it addresses. Include strategic alignment and expected organisational benefit.', to_jsonb('Implement a unified Digital Workplace Platform to replace fragmented collaboration tools and improve hybrid-team productivity.'::text)),
    ('F001', 'general', 'objectives', 'List measurable project objectives (SMART): outcome, measure, target date.', to_jsonb('1. Deploy to 2,500 users by 30 Jun 2027. 2. Retire three legacy tools within 90 days of go-live.'::text)),
    ('F001', 'general', 'success_criteria', 'Define how success will be judged at project close (acceptance, quality, benefit checkpoints).', to_jsonb('UAT accepted; migration defect reopen <2%; cost/schedule within ±10% of baseline.'::text)),
    ('F001', 'general', 'sponsor', 'Name the executive sponsor and their role.', to_jsonb('Amina Okonkwo — Chief Operating Officer (Executive Sponsor)'::text)),
    ('F001', 'general', 'high_level_requirements', 'Capture high-level must-have requirements that justify initiating the project. Defer detail to Requirements Documentation (F010).', to_jsonb('SSO via corporate IdP; secure external guest sharing; mobile iOS/Android with offline read.'::text)),
    ('F001', 'general', 'high_level_risks', 'Identify top initiation risks and owners; detail later in the Risk Register (F038).', to_jsonb('Low adoption if change management is under-resourced — Owner: Change Lead.'::text)),
    ('F001', 'general', 'summary_budget', 'Enter the approved high-level budget envelope (organisation currency).', to_jsonb('1850000'::text)),
    ('F001', 'general', 'milestone_schedule', 'List key initiation and early delivery milestones with target dates.', to_jsonb('Charter approved — 15 Aug 2026; Kick-off — 01 Sep 2026; Org-wide go-live — 30 Jun 2027'::text)),
    ('F001', 'general', 'pm_authority_level', 'Select the authority level granted to the project manager for decisions and spend.', to_jsonb('medium'::text)),
    ('F001', 'general', 'assumptions', 'Document assumptions that, if proven false, may impact scope, cost, or schedule.', to_jsonb('Corporate IdP and licensing available before build starts.'::text)),
    ('F001', 'general', 'constraints', 'List known constraints (budget, dates, regulatory, resource, technology).', to_jsonb('Go-live before legacy licence renewal (30 Sep 2027).'::text)),
    ('F001', 'general', 'business_case_summary', 'Provide a short business-case summary: options considered, preferred option, and expected value.', to_jsonb('Preferred option: unified platform. Approx. USD 2.4m benefit / USD 1.85m investment over 3 years.'::text)),
    ('F001', 'general', 'key_stakeholders', 'List key stakeholders who must endorse or be informed of the charter (name, role, organisation).', to_jsonb('COO (sponsor); CIO; Business Owner — Shared Services; IT Operations Lead'::text)),
    ('F001', 'general', 'approval_signatures', 'Record approver name, role, decision (approve/reject), and date for charter authorisation.', to_jsonb('Sponsor: ________  Date: ________  |  PMO: ________  Date: ________'::text)),
    ('F001', 'general', 'project_summary', 'One-paragraph overview of what will be delivered and for whom.', to_jsonb('Cross-functional programme to standardise collaboration tooling for all employees.'::text)),
    ('F001', 'general', 'assigned_pm', 'Name the assigned project manager (and organisation if relevant).', to_jsonb('Jordan Lee — PMO'::text)),
    ('F001', 'general', 'charter_date', 'Date this charter version is authorised or issued.', to_jsonb('2026-08-15'::text)),
    ('F002', 'general', 'assumption', 'Document each assumption that, if false, would affect scope, cost, schedule, or benefits. Include owner if known.', to_jsonb('Licensing and identity services are available before build start.'::text)),
    ('F002', 'general', 'constraint', 'List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.', to_jsonb('Must complete before legacy licence renewal date.'::text)),
    ('F002', 'general', 'category', 'Choose the option that best describes Category for Assumption Log. Prefer the current factual state.', to_jsonb('scope'::text)),
    ('F002', 'general', 'impact_if_invalid', 'Select the value that best reflects current impact if invalid. Prefer evidence over aspiration.', to_jsonb('Sample entry for Impact if Invalid on the Nidus Digital Workplace Platform — customise for your project.'::text)),
    ('F002', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F002', 'general', 'date_identified', 'Enter the calendar date for Date Identified (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F002', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('open'::text)),
    ('F002', 'general', 'review_date', 'Enter the calendar date for Review Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F002', 'general', 'mitigation', 'Describe Mitigation / Response for Assumption Log in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Mitigation / Response on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F002', 'general', 'linked_risk_id', 'Describe the risk for Assumption Log: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F003', 'general', 'stakeholder_name', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F003', 'general', 'role', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F003', 'general', 'organisation', 'Enter Organisation for Stakeholder Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Organisation — Nidus Digital Workplace Platform'::text)),
    ('F003', 'general', 'contact_info', 'Enter Contact Information for Stakeholder Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Contact Information — Nidus Digital Workplace Platform'::text)),
    ('F003', 'general', 'influence_level', 'Select the value that best reflects current influence level. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F003', 'general', 'interest_level', 'Select the value that best reflects current interest level. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F003', 'general', 'classification', 'Choose the option that best describes Classification for Stakeholder Register. Prefer the current factual state.', to_jsonb('internal'::text)),
    ('F003', 'general', 'communication_preferences', 'Describe communication preferences for Stakeholder Register: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F003', 'general', 'engagement_level', 'Describe current engagement level for Stakeholder Register: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F003', 'general', 'requirements_expectations', 'Capture requirements / expectations for Stakeholder Register in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F003', 'general', 'notes', 'Describe Notes for Stakeholder Register in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F004', 'general', 'stakeholder_name', 'Enter the stakeholder’s full name (or group name) as used in organisational records.', to_jsonb('Priya Nair — Head of Shared Services'::text)),
    ('F004', 'general', 'current_engagement', 'Select how engaged this stakeholder is today (unaware → leading). Base this on recent behaviour, not aspiration.', to_jsonb('neutral'::text)),
    ('F004', 'general', 'desired_engagement', 'Select the engagement level required for project success by the next major milestone.', to_jsonb('supportive'::text)),
    ('F004', 'general', 'key_requirements', 'Summarise what this stakeholder needs from the project (outcomes, constraints, non-negotiables). Be factual and specific.', to_jsonb('Retain department file structures; SSO before pilot; weekly status for Shared Services leadership.'::text)),
    ('F004', 'general', 'engagement_strategy', 'Describe how you will move them from current to desired engagement (forums, sponsors, incentives, escalation).', to_jsonb('Bi-weekly working sessions with Shared Services SMEs; COO sponsorship message at kick-off.'::text)),
    ('F004', 'general', 'communication_approach', 'State channel, frequency, content, and owner for communications with this stakeholder.', to_jsonb('Monthly steering pack (email + 30-min call); owner: Project Manager.'::text)),
    ('F004', 'general', 'engagement_actions', 'List near-term actions, owners, and due dates that will improve engagement.', to_jsonb('1) Schedule discovery workshop by 05 Sep 2026 (PM). 2) Share draft RACI for review (BA).'::text)),
    ('F004', 'general', 'responsible_person', 'Name the team member accountable for managing this stakeholder relationship.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F004', 'general', 'review_date', 'Enter the next date this engagement assessment will be reviewed and updated.', to_jsonb('2026-09-30'::text)),
    ('F005', 'general', 'plan_overview', 'Explain Plan Overview for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering plan overview.'::text)),
    ('F005', 'general', 'scope_summary', 'Explain Scope Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering scope management approach.'::text)),
    ('F005', 'general', 'schedule_summary', 'Explain Schedule Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering schedule management approach.'::text)),
    ('F005', 'general', 'cost_summary', 'Explain Cost Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering cost management approach.'::text)),
    ('F005', 'general', 'quality_summary', 'Explain Quality Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering quality management approach.'::text)),
    ('F005', 'general', 'baseline_date', 'Enter the calendar date for Baseline Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F005', 'general', 'resource_summary', 'Explain Resource Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering resource management approach.'::text)),
    ('F005', 'general', 'communication_summary', 'Explain Communications Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering communications management approach.'::text)),
    ('F005', 'general', 'risk_summary', 'Explain Risk Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering risk management approach.'::text)),
    ('F005', 'general', 'procurement_summary', 'Explain Procurement Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering procurement management approach.'::text)),
    ('F005', 'general', 'stakeholder_summary', 'Explain Stakeholder Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering stakeholder management approach.'::text)),
    ('F005', 'general', 'change_summary', 'Explain Change Management Approach for Project Management Plan so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering change management approach.'::text)),
    ('F005', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F006', 'general', 'change_process', 'Describe the change for Change Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F006', 'general', 'approval_authority', 'Describe the change for Change Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F006', 'general', 'cc_board_members', 'Describe the change for Change Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F006', 'general', 'escalation_process', 'Describe Escalation Process for Change Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Escalation Process on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F006', 'general', 'change_log_reference', 'Describe the change for Change Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F006', 'general', 'impact_assessment_process', 'Select the value that best reflects current impact assessment process. Prefer evidence over aspiration.', to_jsonb('Sample entry for Impact Assessment Process on the Nidus Digital Workplace Platform — customise for your project.'::text)),
    ('F006', 'general', 'communication_plan', 'Describe the change for Change Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F006', 'general', 'tools_systems', 'Enter Tools / Systems for Change Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Tools / Systems — Nidus Digital Workplace Platform'::text)),
    ('F007', 'general', 'phase', 'Provide phase/milestone with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F007', 'general', 'start_date', 'Enter the calendar date for Start Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F007', 'general', 'end_date', 'Enter the calendar date for End Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F007', 'general', 'key_deliverables', 'Define key deliverables for Project Roadmap clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F007', 'general', 'dependencies', 'Describe Dependencies for Project Roadmap in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Dependencies on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F007', 'general', 'phase_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F007', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('planned'::text)),
    ('F007', 'general', 'success_criteria', 'List measurable success criteria for Project Roadmap (metric, target, and date where possible).', to_jsonb('1. Achieve agreed success criteria by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F007', 'general', 'risks', 'Describe the risk for Project Roadmap: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F008', 'general', 'scope_definition_process', 'Define how scope will be defined for Scope Management Plan clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F008', 'general', 'wbs_process', 'Define how the wbs will be created for Scope Management Plan clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F008', 'general', 'scope_validation_process', 'Define scope validation process for Scope Management Plan clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F008', 'general', 'scope_control_process', 'Define scope control process for Scope Management Plan clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F008', 'general', 'scope_change_process', 'Describe the change for Scope Management Plan: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F008', 'general', 'acceptance_process', 'Capture acceptance process for Scope Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F008', 'general', 'roles_responsibilities', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F008', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F009', 'general', 'requirements_process', 'Capture requirements collection process for Requirements Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F009', 'general', 'prioritisation_approach', 'Describe prioritisation approach for Requirements Management Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F009', 'general', 'traceability_approach', 'Describe traceability approach for Requirements Management Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F009', 'general', 'config_management', 'Describe configuration management approach for Requirements Management Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F009', 'general', 'requirements_approval_process', 'Capture requirements approval process for Requirements Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F009', 'general', 'baseline_process', 'Capture requirements baseline process for Requirements Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F009', 'general', 'metrics', 'Capture requirements metrics for Requirements Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F009', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F010', 'general', 'requirement_id', 'Capture requirement id for Requirements Documentation in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F010', 'general', 'description', 'Explain Description for Requirements Documentation so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F010', 'general', 'category', 'Choose the option that best describes Category for Requirements Documentation. Prefer the current factual state.', to_jsonb('functional'::text)),
    ('F010', 'general', 'priority', 'Select the value that best reflects current priority. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F010', 'general', 'acceptance_criteria', 'Capture acceptance criteria for Requirements Documentation in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F010', 'general', 'source', 'Enter Source for Requirements Documentation. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Source — Nidus Digital Workplace Platform'::text)),
    ('F010', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F010', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('proposed'::text)),
    ('F010', 'general', 'verification_method', 'Describe Verification Method for Requirements Documentation in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Verification Method on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F011', 'general', 'requirement_id', 'Capture requirement id for Requirements Traceability Matrix in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F011', 'general', 'source', 'Enter Source for Requirements Traceability Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Source — Nidus Digital Workplace Platform'::text)),
    ('F011', 'general', 'linked_objective', 'List measurable linked business objective for Requirements Traceability Matrix (metric, target, and date where possible).', to_jsonb('1. Achieve agreed linked business objective by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F011', 'general', 'linked_deliverable', 'Define linked deliverable/wbs item for Requirements Traceability Matrix clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F011', 'general', 'test_case', 'Enter Test/Verification Method for Requirements Traceability Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Test/Verification Method — Nidus Digital Workplace Platform'::text)),
    ('F011', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('not_started'::text)),
    ('F011', 'general', 'design_element', 'Enter Linked Design Element for Requirements Traceability Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Linked Design Element — Nidus Digital Workplace Platform'::text)),
    ('F011', 'general', 'test_status', 'Select the value that best reflects current test status. Prefer evidence over aspiration.', to_jsonb('not_started'::text)),
    ('F011', 'general', 'comments', 'Describe Comments for Requirements Traceability Matrix in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Comments on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F012', 'general', 'requirement_id', 'Capture requirement id for Inter-Requirements Traceability Matrix in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F012', 'general', 'related_requirement_id', 'Capture related requirement id for Inter-Requirements Traceability Matrix in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F012', 'general', 'relationship_type', 'Choose the option that best describes Relationship Type for Inter-Requirements Traceability Matrix. Prefer the current factual state.', to_jsonb('depends_on'::text)),
    ('F012', 'general', 'notes', 'Describe Notes for Inter-Requirements Traceability Matrix in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F012', 'general', 'impact_notes', 'Select the value that best reflects current impact notes. Prefer evidence over aspiration.', to_jsonb('Sample entry for Impact Notes on the Nidus Digital Workplace Platform — customise for your project.'::text)),
    ('F012', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F012', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('open'::text)),
    ('F013', 'general', 'product_scope_description', 'Explain Product Scope Description for Project Scope Statement so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering product scope description.'::text)),
    ('F013', 'general', 'deliverables', 'Define deliverables for Project Scope Statement clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F013', 'general', 'acceptance_criteria', 'Capture acceptance criteria for Project Scope Statement in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F013', 'general', 'exclusions', 'Describe Exclusions for Project Scope Statement in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Exclusions on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F013', 'general', 'constraints', 'List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.', to_jsonb('Must complete before legacy licence renewal date.'::text)),
    ('F013', 'general', 'assumptions', 'Document each assumption that, if false, would affect scope, cost, schedule, or benefits. Include owner if known.', to_jsonb('Licensing and identity services are available before build start.'::text)),
    ('F013', 'general', 'project_boundaries', 'Describe Project Boundaries for Project Scope Statement in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Project Boundaries on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F013', 'general', 'scope_verification', 'Define scope verification approach for Project Scope Statement clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F013', 'general', 'change_control', 'Describe the change for Project Scope Statement: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F013', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F014', 'general', 'wbs_code', 'Define wbs code for Work Breakdown Structure clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F014', 'general', 'element_name', 'Enter a clear element name that uniquely identifies this Work Breakdown Structure entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F014', 'general', 'parent_element', 'Enter Parent Element for Work Breakdown Structure. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Parent Element — Nidus Digital Workplace Platform'::text)),
    ('F014', 'general', 'level', 'Select the value that best reflects current level. Prefer evidence over aspiration.', to_jsonb('12'::text)),
    ('F014', 'general', 'deliverable', 'Define deliverable for Work Breakdown Structure clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F014', 'general', 'responsible_party', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F014', 'general', 'estimated_cost', 'Enter estimated cost using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F014', 'general', 'notes', 'Describe Notes for Work Breakdown Structure in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F015', 'general', 'wbs_code', 'Define wbs code for WBS Dictionary clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F015', 'general', 'element_name', 'Enter a clear element name that uniquely identifies this WBS Dictionary entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F015', 'general', 'description', 'Explain Description of Work for WBS Dictionary so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description of work.'::text)),
    ('F015', 'general', 'responsible_party', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F015', 'general', 'acceptance_criteria', 'Capture acceptance criteria for WBS Dictionary in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F015', 'general', 'cost_estimate', 'Enter cost estimate using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F015', 'general', 'milestones', 'Provide milestones with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F015', 'general', 'dependencies', 'Describe Dependencies for WBS Dictionary in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Dependencies on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F015', 'general', 'resources_required', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F015', 'general', 'schedule_dates', 'Enter the calendar date for Schedule Dates (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F016', 'general', 'scheduling_methodology', 'Enter Scheduling Methodology for Schedule Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Scheduling Methodology — Nidus Digital Workplace Platform'::text)),
    ('F016', 'general', 'scheduling_tool', 'Enter Scheduling Tool for Schedule Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Scheduling Tool — Nidus Digital Workplace Platform'::text)),
    ('F016', 'general', 'update_frequency', 'Enter the calendar date for Update Frequency (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F016', 'general', 'control_thresholds', 'Describe Control Thresholds for Schedule Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Control Thresholds on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F016', 'general', 'level_of_detail', 'Select the value that best reflects current level of detail. Prefer evidence over aspiration.', to_jsonb('Sample Level of Detail — Digital Workplace'::text)),
    ('F016', 'general', 'units_of_measure', 'Enter Units of Measure for Schedule Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Units of Measure — Nidus Digital Workplace Platform'::text)),
    ('F016', 'general', 'reporting_requirements', 'Capture reporting requirements for Schedule Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F016', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F017', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F017', 'general', 'activity_name', 'Provide activity name with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F017', 'general', 'wbs_reference', 'Define wbs reference for Activity List clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F017', 'general', 'description', 'Explain Description for Activity List so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F017', 'general', 'duration_estimate', 'Provide duration estimate (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F017', 'general', 'resource_assigned', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F017', 'general', 'required_skills', 'Describe Required Skill(s) (one per line) for Activity List in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Required Skill(s) (one per line) on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F017', 'general', 'minimum_proficiency', 'Choose the option that best describes Minimum Proficiency for Activity List. Prefer the current factual state.', to_jsonb('basic'::text)),
    ('F017', 'general', 'activity_type', 'Provide activity type with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F017', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('not_started'::text)),
    ('F018', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F018', 'general', 'predecessor', 'Enter Predecessor Activities for Activity Attributes. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Predecessor Activities — Nidus Digital Workplace Platform'::text)),
    ('F018', 'general', 'successor', 'List measurable successor activities for Activity Attributes (metric, target, and date where possible).', to_jsonb('1. Achieve agreed successor activities by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F018', 'general', 'resource_requirements', 'Capture resource requirements for Activity Attributes in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F018', 'general', 'constraints', 'List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.', to_jsonb('Must complete before legacy licence renewal date.'::text)),
    ('F018', 'general', 'activity_type', 'Provide activity type with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F018', 'general', 'duration', 'Provide duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F018', 'general', 'location', 'Enter Location for Activity Attributes. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Location — Nidus Digital Workplace Platform'::text)),
    ('F018', 'general', 'assumptions', 'Document each assumption that, if false, would affect scope, cost, schedule, or benefits. Include owner if known.', to_jsonb('Licensing and identity services are available before build start.'::text)),
    ('F019', 'general', 'milestone_name', 'Provide milestone name with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F019', 'general', 'target_date', 'Enter the calendar date for Target Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F019', 'general', 'milestone_type', 'Provide type with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F019', 'general', 'description', 'Explain Description for Milestone List so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F019', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F019', 'general', 'acceptance_criteria', 'Capture acceptance criteria for Milestone List in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F019', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('planned'::text)),
    ('F019', 'general', 'linked_deliverables', 'Define linked deliverables for Milestone List clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F020', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F020', 'general', 'predecessor', 'Enter Predecessor(s) for Network Diagram. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Predecessor(s) — Nidus Digital Workplace Platform'::text)),
    ('F020', 'general', 'dependency_type', 'Choose the option that best describes Dependency Type for Network Diagram. Prefer the current factual state.', to_jsonb('fs'::text)),
    ('F020', 'general', 'lag_lead', 'Enter Lag/Lead for Network Diagram. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Lag/Lead — Nidus Digital Workplace Platform'::text)),
    ('F020', 'general', 'successor', 'List measurable successor(s) for Network Diagram (metric, target, and date where possible).', to_jsonb('1. Achieve agreed successor(s) by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F020', 'general', 'notes', 'Describe Notes for Network Diagram in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F020', 'general', 'critical_path', 'Choose the option that best describes On Critical Path for Network Diagram. Prefer the current factual state.', to_jsonb('yes'::text)),
    ('F021', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F021', 'general', 'optimistic', 'Provide optimistic duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F021', 'general', 'most_likely', 'Provide most likely duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F021', 'general', 'pessimistic', 'Provide pessimistic duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F021', 'general', 'estimation_basis', 'Enter basis of estimate using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F021', 'general', 'expected_duration', 'Provide expected duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F021', 'general', 'confidence_level', 'Select the value that best reflects current confidence level. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F021', 'general', 'estimator', 'Enter Estimator for Duration Estimates. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Estimator — Nidus Digital Workplace Platform'::text)),
    ('F022', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F022', 'general', 'estimation_technique', 'Choose the option that best describes Estimation Technique for Duration Estimating Worksheet. Prefer the current factual state.', to_jsonb('analogous'::text)),
    ('F022', 'general', 'assumptions', 'Document each assumption that, if false, would affect scope, cost, schedule, or benefits. Include owner if known.', to_jsonb('Licensing and identity services are available before build start.'::text)),
    ('F022', 'general', 'estimated_duration', 'Provide estimated duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F022', 'general', 'constraints', 'List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.', to_jsonb('Must complete before legacy licence renewal date.'::text)),
    ('F022', 'general', 'reviewer', 'Enter Reviewer for Duration Estimating Worksheet. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Reviewer — Nidus Digital Workplace Platform'::text)),
    ('F022', 'general', 'estimate_date', 'Enter the calendar date for Estimate Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F023', 'general', 'activity_id', 'Provide activity id with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F023', 'general', 'start_date', 'Enter the calendar date for Start Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F023', 'general', 'end_date', 'Enter the calendar date for End Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F023', 'general', 'duration', 'Provide duration (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F023', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('not_started'::text)),
    ('F023', 'general', 'percent_complete', 'Enter the numeric value for Percent Complete. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F023', 'general', 'assigned_resources', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F023', 'general', 'baseline_start', 'Enter baseline start using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F023', 'general', 'baseline_finish', 'Enter baseline finish using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F024', 'general', 'estimating_approach', 'Enter cost estimating approach using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F024', 'general', 'budget_approach', 'Enter budgeting approach using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F024', 'general', 'control_thresholds', 'Enter cost control thresholds using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F024', 'general', 'reporting_format', 'Enter cost reporting format using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F024', 'general', 'funding_sources', 'Describe Funding Sources for Cost Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Funding Sources on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F024', 'general', 'variance_thresholds', 'Describe Variance Thresholds for Cost Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Variance Thresholds on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F024', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F024', 'general', 'review_cycle', 'Enter Review Cycle for Cost Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Review Cycle — Nidus Digital Workplace Platform'::text)),
    ('F025', 'general', 'wbs_reference', 'Define wbs reference for Cost Estimates clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F025', 'general', 'cost_category', 'Enter cost category using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F025', 'general', 'estimated_cost', 'Enter estimated cost using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F025', 'general', 'basis_of_estimate', 'Enter basis of estimate using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F025', 'general', 'currency', 'Enter Currency for Cost Estimates. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Currency — Nidus Digital Workplace Platform'::text)),
    ('F025', 'general', 'confidence', 'Enter estimate confidence using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F025', 'general', 'estimate_date', 'Enter the calendar date for Estimate Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F025', 'general', 'estimator', 'Enter Estimator for Cost Estimates. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Estimator — Nidus Digital Workplace Platform'::text)),
    ('F026', 'general', 'wbs_reference', 'Define wbs reference for Cost Estimating Worksheet clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F026', 'general', 'estimation_technique', 'Choose the option that best describes Estimation Technique for Cost Estimating Worksheet. Prefer the current factual state.', to_jsonb('analogous'::text)),
    ('F026', 'general', 'unit_cost', 'Enter unit cost using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F026', 'general', 'quantity', 'Enter the numeric value for Quantity. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F026', 'general', 'total_cost', 'Enter total cost using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F026', 'general', 'notes', 'Describe Notes for Cost Estimating Worksheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F026', 'general', 'review_date', 'Enter the calendar date for Review Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F026', 'general', 'approved_by', 'Enter Approved By for Cost Estimating Worksheet. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Approved By — Nidus Digital Workplace Platform'::text)),
    ('F027', 'general', 'work_package', 'Enter Work Package for Bottom-Up Cost Estimating Worksheet. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Work Package — Nidus Digital Workplace Platform'::text)),
    ('F027', 'general', 'resource_type', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F027', 'general', 'unit_rate', 'Enter the numeric value for Unit Rate. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F027', 'general', 'quantity', 'Enter the numeric value for Quantity. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F027', 'general', 'subtotal', 'Enter the numeric value for Subtotal. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F027', 'general', 'notes', 'Describe Notes for Bottom-Up Cost Estimating Worksheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F027', 'general', 'contingency', 'Enter the numeric value for Contingency. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F027', 'general', 'estimate_date', 'Enter the calendar date for Estimate Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F028', 'general', 'wbs_reference', 'Define wbs reference for Cost Baseline clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F028', 'general', 'baseline_amount', 'Enter baseline amount using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F028', 'general', 'baseline_date', 'Enter the calendar date for Baseline Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F028', 'general', 'reserve_amount', 'Enter contingency reserve using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F028', 'general', 'funding_limit', 'Enter the numeric value for Funding Limit. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F028', 'general', 'management_reserve', 'Enter the numeric value for Management Reserve. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F028', 'general', 'approved_by', 'Enter Approved By for Cost Baseline. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Approved By — Nidus Digital Workplace Platform'::text)),
    ('F028', 'general', 'notes', 'Describe Notes for Cost Baseline in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F029', 'general', 'quality_standards', 'State quality standards for Quality Management Plan with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F029', 'general', 'quality_objectives', 'List measurable quality objectives for Quality Management Plan (metric, target, and date where possible).', to_jsonb('1. Achieve agreed quality objectives by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F029', 'general', 'qa_approach', 'State quality assurance approach for Quality Management Plan with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F029', 'general', 'qc_approach', 'State quality control approach for Quality Management Plan with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F029', 'general', 'quality_roles', 'State quality roles & responsibilities for Quality Management Plan with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F029', 'general', 'improvement_plan', 'Capture the lesson or improvement: what happened, insight, and recommended change to process or product.', to_jsonb('Earlier load testing would have caught IdP pool limits before pilot expansion.'::text)),
    ('F029', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F029', 'general', 'review_date', 'Enter the calendar date for Review Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F030', 'general', 'metric_name', 'State metric name for Quality Metrics with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F030', 'general', 'target_value', 'Enter Target Value for Quality Metrics. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Target Value — Nidus Digital Workplace Platform'::text)),
    ('F030', 'general', 'measurement_method', 'Describe Measurement Method for Quality Metrics in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Measurement Method on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F030', 'general', 'frequency', 'Choose the option that best describes Measurement Frequency for Quality Metrics. Prefer the current factual state.', to_jsonb('daily'::text)),
    ('F030', 'general', 'actual_value', 'Enter Actual Value for Quality Metrics. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Actual Value — Nidus Digital Workplace Platform'::text)),
    ('F030', 'general', 'threshold', 'Enter Control Threshold for Quality Metrics. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Control Threshold — Nidus Digital Workplace Platform'::text)),
    ('F030', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F030', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('green'::text)),
    ('F031', 'general', 'activity_deliverable', 'Define activity/deliverable for Responsibility Assignment Matrix clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F031', 'general', 'responsible', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F031', 'general', 'accountable', 'Enter Accountable (A) for Responsibility Assignment Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Accountable (A) — Nidus Digital Workplace Platform'::text)),
    ('F031', 'general', 'consulted', 'Enter Consulted (C) for Responsibility Assignment Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Consulted (C) — Nidus Digital Workplace Platform'::text)),
    ('F031', 'general', 'informed', 'Enter Informed (I) for Responsibility Assignment Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Informed (I) — Nidus Digital Workplace Platform'::text)),
    ('F031', 'general', 'notes', 'Describe Notes for Responsibility Assignment Matrix in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F032', 'general', 'resource_identification_approach', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F032', 'general', 'acquisition_approach', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F032', 'general', 'team_development_approach', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F032', 'general', 'release_criteria', 'Capture resource release criteria for Resource Management Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F032', 'general', 'skills_required', 'Describe Skills Required for Resource Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Skills Required on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F032', 'general', 'availability', 'Enter Availability for Resource Management Plan. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Availability — Nidus Digital Workplace Platform'::text)),
    ('F032', 'general', 'cost_rate', 'Enter cost rate using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F033', 'general', 'team_values', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F033', 'general', 'communication_guidelines', 'Describe communication guidelines for Team Charter: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F033', 'general', 'decision_making_process', 'Record the decision, options considered, rationale, and decision-maker.', to_jsonb('Approve pilot expansion to Finance — Decision maker: Sponsor.'::text)),
    ('F033', 'general', 'conflict_resolution', 'Describe Conflict Resolution Process for Team Charter in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Conflict Resolution Process on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F033', 'general', 'meeting_norms', 'Describe Meeting Norms for Team Charter in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Meeting Norms on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F033', 'general', 'acquisition_approach', 'Describe acquisition approach for Team Charter: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F033', 'general', 'contract_types', 'Describe Contract Types for Team Charter in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Contract Types on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F033', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F034', 'general', 'resource_type', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F034', 'general', 'description', 'Explain Description for Resource Requirements so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F034', 'general', 'quantity', 'Enter the numeric value for Quantity Required. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F034', 'general', 'required_by_date', 'Enter the calendar date for Required By Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F034', 'general', 'risk_id', 'Describe the risk for Resource Requirements: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F034', 'general', 'risk_owner', 'Describe the risk for Resource Requirements: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F034', 'general', 'response_strategy', 'Describe response strategy for Resource Requirements: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F034', 'general', 'residual_risk', 'Describe the risk for Resource Requirements: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F035', 'general', 'rbs_code', 'Enter the unique identifier used in project records for this item (keep format consistent with the log).', to_jsonb('CR-2026-014'::text)),
    ('F035', 'general', 'category', 'Enter Category for Resource Breakdown Structure. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Category — Nidus Digital Workplace Platform'::text)),
    ('F035', 'general', 'resource_name', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F035', 'general', 'parent_category', 'Enter Parent Category for Resource Breakdown Structure. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Parent Category — Nidus Digital Workplace Platform'::text)),
    ('F035', 'general', 'probability', 'Select the value that best reflects current probability. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F035', 'general', 'impact', 'Select the value that best reflects current impact. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F035', 'general', 'risk_score', 'Describe the risk for Resource Breakdown Structure: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F036', 'general', 'stakeholder_group', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F036', 'general', 'information_needs', 'Describe Information Needs for Communications Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Information Needs on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F036', 'general', 'communication_method', 'Describe communication method for Communications Management Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F036', 'general', 'frequency', 'Choose the option that best describes Frequency for Communications Management Plan. Prefer the current factual state.', to_jsonb('daily'::text)),
    ('F036', 'general', 'responsible_party', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F036', 'general', 'trigger_conditions', 'Describe Trigger Conditions for Communications Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Trigger Conditions on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F036', 'general', 'contingency_plan', 'Describe Contingency Plan for Communications Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Contingency Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F036', 'general', 'fallback_plan', 'Describe Fallback Plan for Communications Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Fallback Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F037', 'general', 'risk_methodology', 'Describe the risk for Risk Management Plan: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F037', 'general', 'roles_responsibilities', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F037', 'general', 'risk_categories', 'Describe the risk for Risk Management Plan: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F037', 'general', 'risk_appetite', 'Describe the risk for Risk Management Plan: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F037', 'general', 'stakeholder_groups', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F037', 'general', 'information_needs', 'Describe Information Needs for Risk Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Information Needs on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F037', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F038', 'general', 'risk_description', 'Explain Risk Description for Risk Register so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering risk description.'::text)),
    ('F038', 'general', 'category', 'Choose the option that best describes Category for Risk Register. Prefer the current factual state.', to_jsonb('technical'::text)),
    ('F038', 'general', 'probability', 'Select the value that best reflects current probability. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F038', 'general', 'impact', 'Select the value that best reflects current impact. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F038', 'general', 'risk_owner', 'Describe the risk for Risk Register: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F038', 'general', 'response_strategy', 'Describe response strategy for Risk Register: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F038', 'general', 'target_date', 'Enter the calendar date for Target Resolution Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F038', 'general', 'message_purpose', 'Explain Message Purpose for Risk Register so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering message purpose.'::text)),
    ('F038', 'general', 'audience', 'Enter Audience for Risk Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Audience — Nidus Digital Workplace Platform'::text)),
    ('F038', 'general', 'delivery_method', 'Enter Delivery Method for Risk Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Delivery Method — Nidus Digital Workplace Platform'::text)),
    ('F038', 'general', 'frequency', 'Enter Frequency for Risk Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Frequency — Nidus Digital Workplace Platform'::text)),
    ('F039', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F039', 'general', 'overall_risk_exposure', 'Describe the risk for Risk Report: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F039', 'general', 'top_risks', 'Explain Top Risks Summary for Risk Report so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering top risks summary.'::text)),
    ('F039', 'general', 'risk_trend', 'Describe the risk for Risk Report: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F039', 'general', 'sender', 'Enter Sender for Risk Report. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Sender — Nidus Digital Workplace Platform'::text)),
    ('F039', 'general', 'approval_required', 'Choose the option that best describes Approval Required for Risk Report. Prefer the current factual state.', to_jsonb('yes'::text)),
    ('F039', 'general', 'distribution_list', 'Describe Distribution List for Risk Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Distribution List on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F040', 'general', 'risk_description', 'Explain Risk Description for Probability and Impact Assessment so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering risk description.'::text)),
    ('F040', 'general', 'probability_score', 'Select the value that best reflects current probability score (1-5). Prefer evidence over aspiration.', to_jsonb('12'::text)),
    ('F040', 'general', 'impact_score', 'Select the value that best reflects current impact score (1-5). Prefer evidence over aspiration.', to_jsonb('12'::text)),
    ('F040', 'general', 'overall_rating', 'Choose the option that best describes Overall Rating for Probability and Impact Assessment. Prefer the current factual state.', to_jsonb('medium'::text)),
    ('F040', 'general', 'procurement_strategy', 'Describe procurement strategy for Probability and Impact Assessment: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F040', 'general', 'make_or_buy', 'Record the decision, options considered, rationale, and decision-maker.', to_jsonb('Approve pilot expansion to Finance — Decision maker: Sponsor.'::text)),
    ('F040', 'general', 'document_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F041', 'general', 'probability_level', 'Select the value that best reflects current probability level. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F041', 'general', 'impact_level', 'Select the value that best reflects current impact level. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F041', 'general', 'resulting_priority', 'Select the value that best reflects current resulting priority. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F041', 'general', 'evaluation_criteria', 'Capture evaluation criteria for Probability and Impact Matrix in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F041', 'general', 'weighting', 'Enter Weighting for Probability and Impact Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Weighting — Nidus Digital Workplace Platform'::text)),
    ('F041', 'general', 'selection_method', 'Enter Selection Method for Probability and Impact Matrix. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Selection Method — Nidus Digital Workplace Platform'::text)),
    ('F042', 'general', 'risk_id', 'Describe the risk for Risk Data Sheet: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F042', 'general', 'risk_description', 'Explain Risk Description for Risk Data Sheet so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering risk description.'::text)),
    ('F042', 'general', 'root_cause', 'Describe Root Cause for Risk Data Sheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Root Cause on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F042', 'general', 'triggers', 'Describe Triggers for Risk Data Sheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Triggers on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F042', 'general', 'response_plan', 'Describe Response Plan for Risk Data Sheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Response Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F042', 'general', 'contingency_plan', 'Describe Contingency Plan for Risk Data Sheet in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Contingency Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F042', 'general', 'vendor_name', 'Enter a clear vendor name that uniquely identifies this Risk Data Sheet entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F042', 'general', 'contact_person', 'Enter Contact Person for Risk Data Sheet. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Contact Person — Nidus Digital Workplace Platform'::text)),
    ('F042', 'general', 'qualification_status', 'Select the value that best reflects current qualification status. Prefer evidence over aspiration.', to_jsonb('qualified'::text)),
    ('F043', 'general', 'procurement_approach', 'Describe procurement approach for Procurement Management Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F043', 'general', 'contract_types', 'Describe Contract Types to be Used for Procurement Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Contract Types to be Used on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F043', 'general', 'procurement_documents', 'Describe Procurement Documents for Procurement Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Procurement Documents on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F043', 'general', 'risk_management_approach', 'Describe the risk for Procurement Management Plan: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F043', 'general', 'bid_amount', 'Enter bid amount using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F043', 'general', 'compliance_notes', 'Describe Compliance Notes for Procurement Management Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Compliance Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F043', 'general', 'evaluation_score', 'Enter the numeric value for Evaluation Score. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F044', 'general', 'delivery_method', 'Choose the option that best describes Delivery Method for Procurement Strategy. Prefer the current factual state.', to_jsonb('turnkey'::text)),
    ('F044', 'general', 'contract_payment_type', 'Choose the option that best describes Contract Payment Type for Procurement Strategy. Prefer the current factual state.', to_jsonb('fixed_price'::text)),
    ('F044', 'general', 'market_conditions', 'Describe Market Conditions for Procurement Strategy in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Market Conditions on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F044', 'general', 'contract_value', 'Enter the numeric value for Contract Value. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F044', 'general', 'start_date', 'Enter the calendar date for Start Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F044', 'general', 'end_date', 'Enter the calendar date for End Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F044', 'general', 'terms_summary', 'Explain Terms Summary for Procurement Strategy so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering terms summary.'::text)),
    ('F045', 'general', 'criterion', 'Enter Criterion for Source Selection Criteria. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Criterion — Nidus Digital Workplace Platform'::text)),
    ('F045', 'general', 'weighting', 'Enter the numeric value for Weighting (%). Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F045', 'general', 'description', 'Explain Description for Source Selection Criteria so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F045', 'general', 'performance_kpis', 'Describe Performance KPIs for Source Selection Criteria in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Performance KPIs on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F045', 'general', 'review_period', 'Enter Review Period for Source Selection Criteria. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Review Period — Nidus Digital Workplace Platform'::text)),
    ('F045', 'general', 'action_required', 'Describe action required for Source Selection Criteria: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F046', 'general', 'stakeholder_group', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F046', 'general', 'current_engagement', 'Describe current engagement level for Stakeholder Engagement Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F046', 'general', 'desired_engagement', 'Describe desired engagement level for Stakeholder Engagement Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F046', 'general', 'engagement_actions', 'Describe engagement actions for Stakeholder Engagement Plan: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F046', 'general', 'variance_explanation', 'Describe Variance Explanation for Stakeholder Engagement Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Variance Explanation on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F046', 'general', 'forecast_completion', 'Enter the numeric value for Forecast at Completion. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F046', 'general', 'reporting_period_end', 'Enter the date for Reporting Period End using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F047', 'general', 'issue_description', 'Explain Issue Description for Issue Log so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering issue description.'::text)),
    ('F047', 'general', 'category', 'Choose the option that best describes Category for Issue Log. Prefer the current factual state.', to_jsonb('technical'::text)),
    ('F047', 'general', 'priority', 'Select the value that best reflects current priority. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F047', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F047', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('open'::text)),
    ('F047', 'general', 'raised_date', 'Enter the calendar date for Date Raised (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F047', 'general', 'target_resolution_date', 'Enter the calendar date for Target Resolution Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F047', 'general', 'issue_owner', 'State the issue clearly: impact, urgency, owner, and next action.', to_jsonb('Pilot blocked by SSO timeout under load — Owner: IT Ops.'::text)),
    ('F047', 'general', 'resolution_target_date', 'Enter the calendar date for Resolution Target Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F047', 'general', 'escalation_level', 'Select the value that best reflects current escalation level. Prefer evidence over aspiration.', to_jsonb('project'::text)),
    ('F048', 'general', 'decision_description', 'Explain Decision Description for Decision Log so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering decision description.'::text)),
    ('F048', 'general', 'decision_date', 'Record the decision, options considered, rationale, and decision-maker.', to_jsonb('Approve pilot expansion to Finance — Decision maker: Sponsor.'::text)),
    ('F048', 'general', 'decision_maker', 'Record the decision, options considered, rationale, and decision-maker.', to_jsonb('Approve pilot expansion to Finance — Decision maker: Sponsor.'::text)),
    ('F048', 'general', 'rationale', 'Describe Rationale for Decision Log in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Rationale on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F048', 'general', 'impact', 'Select the value that best reflects current impact. Prefer evidence over aspiration.', to_jsonb('Sample entry for Impact on the Nidus Digital Workplace Platform — customise for your project.'::text)),
    ('F049', 'general', 'change_description', 'Explain Change Description for Change Request so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering change description.'::text)),
    ('F049', 'general', 'reason_for_change', 'Describe the change for Change Request: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F049', 'general', 'impact_assessment', 'Define impact assessment (scope/schedule/cost) for Change Request clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F049', 'general', 'priority', 'Select the value that best reflects current priority. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F049', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('submitted'::text)),
    ('F049', 'general', 'change_requestor', 'Describe the change for Change Request: what differs from baseline, why, and impact on scope/schedule/cost.', to_jsonb('Increase pilot cohort from 200 to 500 users in Finance.'::text)),
    ('F049', 'general', 'ccb_decision', 'Record the decision, options considered, rationale, and decision-maker.', to_jsonb('Approve pilot expansion to Finance — Decision maker: Sponsor.'::text)),
    ('F050', 'general', 'change_id', 'Enter the unique change identifier used in the change log / change request process (e.g. CR-2026-014).', to_jsonb('CR-2026-014'::text)),
    ('F050', 'general', 'change_summary', 'Summarise what is changing in one or two sentences: scope, deliverable, or baseline impacted.', to_jsonb('Extend pilot from 200 to 500 users in Finance to validate SSO under peak load.'::text)),
    ('F050', 'general', 'status', 'Select the current decision status of this change (submitted, approved, rejected, or deferred).', to_jsonb('approved'::text)),
    ('F050', 'general', 'decision_date', 'Enter the date the CCB / sponsor decision was recorded.', to_jsonb('2026-10-12'::text)),
    ('F050', 'general', 'corrective_actions', 'List actions to correct the issue that triggered the change, with owners and due dates.', to_jsonb('Increase IdP connection pool — Owner: IT Ops — Due: 20 Oct 2026.'::text)),
    ('F050', 'general', 'preventive_actions', 'List actions to prevent recurrence (process, monitoring, training), with owners and due dates.', to_jsonb('Add load test gate before each pilot expansion — Owner: QA Lead — Due: 25 Oct 2026.'::text)),
    ('F050', 'general', 'verification_date', 'Enter the date corrective/preventive actions were (or will be) verified as complete.', to_jsonb('2026-10-28'::text)),
    ('F051', 'general', 'lesson_description', 'Explain Lesson Description for Lessons Learned Register so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering lesson description.'::text)),
    ('F051', 'general', 'category', 'Choose the option that best describes Category for Lessons Learned Register. Prefer the current factual state.', to_jsonb('went_well'::text)),
    ('F051', 'general', 'phase', 'Select the value that best reflects current project phase. Prefer evidence over aspiration.', to_jsonb('initiating'::text)),
    ('F051', 'general', 'recommendation', 'Describe Recommendation for Future Projects for Lessons Learned Register in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Recommendation for Future Projects on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F051', 'general', 'inspection_date', 'Enter the calendar date for Inspection Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F051', 'general', 'inspector', 'Enter Inspector for Lessons Learned Register. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Inspector — Nidus Digital Workplace Platform'::text)),
    ('F051', 'general', 'nonconformance_details', 'Describe Non-Conformance Details for Lessons Learned Register in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Non-Conformance Details on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F052', 'general', 'audit_date', 'Enter the calendar date for Audit Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F052', 'general', 'auditor', 'State auditor for Quality Audit with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F052', 'general', 'scope_of_audit', 'Define scope of audit for Quality Audit clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F052', 'general', 'findings', 'Describe Findings for Quality Audit in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Findings on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F052', 'general', 'corrective_actions', 'Describe corrective actions for Quality Audit: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F052', 'general', 'audit_scope', 'Define audit scope for Quality Audit clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F052', 'general', 'audit_criteria', 'Capture audit criteria for Quality Audit in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F052', 'general', 'follow_up_date', 'Enter the calendar date for Follow-Up Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F053', 'general', 'team_member', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F053', 'general', 'assessment_period', 'Enter Assessment Period for Team Performance Assessment. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Assessment Period — Nidus Digital Workplace Platform'::text)),
    ('F053', 'general', 'performance_rating', 'Choose the option that best describes Performance Rating for Team Performance Assessment. Prefer the current factual state.', to_jsonb('below'::text)),
    ('F053', 'general', 'strengths', 'Describe Strengths for Team Performance Assessment in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Strengths on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F053', 'general', 'development_areas', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F053', 'general', 'hours_logged', 'Enter the numeric value for Hours Logged. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('12'::text)),
    ('F053', 'general', 'work_description', 'Explain Work Description for Team Performance Assessment so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering work description.'::text)),
    ('F054', 'general', 'team_member', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F054', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F054', 'general', 'tasks_completed', 'Describe Tasks Completed for Team Member Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Tasks Completed on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F054', 'general', 'tasks_planned', 'Describe Tasks Planned Next Period for Team Member Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Tasks Planned Next Period on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F054', 'general', 'blockers', 'State the issue clearly: impact, urgency, owner, and next action.', to_jsonb('Pilot blocked by SSO timeout under load — Owner: IT Ops.'::text)),
    ('F054', 'general', 'overall_rag', 'Choose the option that best describes Overall RAG for Team Member Status Report. Prefer the current factual state.', to_jsonb('green'::text)),
    ('F054', 'general', 'next_period_focus', 'Describe Next Period Focus for Team Member Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Next Period Focus on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F055', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F055', 'general', 'overall_rag', 'Select the value that best reflects current overall rag status. Prefer evidence over aspiration.', to_jsonb('green'::text)),
    ('F055', 'general', 'schedule_rag', 'Provide schedule rag with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F055', 'general', 'budget_rag', 'Enter budget rag using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F055', 'general', 'key_accomplishments', 'Describe Key Accomplishments for Project Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Key Accomplishments on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F055', 'general', 'issues_risks', 'Describe the risk for Project Status Report: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F055', 'general', 'next_period_plan', 'Describe Next Period Plan for Project Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Next Period Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F055', 'general', 'forecast_completion_cost', 'Enter forecast at completion using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F055', 'general', 'variance_at_completion', 'Enter the numeric value for Variance at Completion. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F055', 'general', 'analysis_notes', 'Describe Analysis Notes for Project Status Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Analysis Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F056', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F056', 'general', 'planned_value', 'Enter the numeric value for Planned Value. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F056', 'general', 'actual_cost', 'Enter actual cost using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F056', 'general', 'earned_value', 'Enter the numeric value for Earned Value. Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F056', 'general', 'variance_explanation', 'Describe Variance Explanation for Variance Analysis in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Variance Explanation on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F056', 'general', 'schedule_variance', 'Provide schedule variance (days) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F056', 'general', 'critical_path_status', 'Select the value that best reflects current critical path status. Prefer evidence over aspiration.', to_jsonb('Sample entry for Critical Path Status on the Nidus Digital Workplace Platform — customise for your project.'::text)),
    ('F056', 'general', 'recovery_plan', 'Describe Recovery Plan for Variance Analysis in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Recovery Plan on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F057', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F057', 'general', 'planned_value', 'Enter the numeric value for Planned Value (PV). Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'earned_value', 'Enter the numeric value for Earned Value (EV). Use organisation currency units for money fields; do not include currency symbols unless required.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'actual_cost', 'Enter actual cost (ac) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'budget_at_completion', 'Enter budget at completion (bac) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'cpi', 'Enter cost performance index (cpi) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'spi', 'Provide schedule performance index (spi) with dates and dependencies that matter to delivery.', to_jsonb('Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.'::text)),
    ('F057', 'general', 'eac', 'Enter estimate at completion (eac) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F057', 'general', 'etc', 'Enter estimate to complete (etc) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F058', 'general', 'audit_date', 'Enter the calendar date for Audit Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F058', 'general', 'auditor', 'State auditor for Risk Audit with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F058', 'general', 'risk_process_effectiveness', 'Describe the risk for Risk Audit: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F058', 'general', 'findings', 'Describe Findings for Risk Audit in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Findings on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F058', 'general', 'recommendations', 'Describe Recommendations for Risk Audit in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Recommendations on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F058', 'general', 'risk_register_reference', 'Describe the risk for Risk Audit: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F058', 'general', 'corrective_actions', 'Describe corrective actions for Risk Audit: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F058', 'general', 'follow_up_date', 'Enter the calendar date for Follow-Up Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F059', 'general', 'contractor_name', 'Enter a clear contractor name that uniquely identifies this Contractor Status Report entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F059', 'general', 'reporting_period', 'Enter the date for Reporting Period using the organisation calendar.', to_jsonb('2026-09-15'::text)),
    ('F059', 'general', 'progress_summary', 'Explain Progress Summary for Contractor Status Report so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering progress summary.'::text)),
    ('F059', 'general', 'performance_rag', 'Choose the option that best describes Performance RAG for Contractor Status Report. Prefer the current factual state.', to_jsonb('green'::text)),
    ('F059', 'general', 'issues', 'State the issue clearly: impact, urgency, owner, and next action.', to_jsonb('Pilot blocked by SSO timeout under load — Owner: IT Ops.'::text)),
    ('F059', 'general', 'contract_reference', 'Enter the unique identifier used in project records for this item (keep format consistent with the log).', to_jsonb('CR-2026-014'::text)),
    ('F059', 'general', 'deliverables_status', 'Define deliverables status for Contractor Status Report clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F059', 'general', 'payment_status', 'Select the value that best reflects current payment status. Prefer evidence over aspiration.', to_jsonb('current'::text)),
    ('F060', 'general', 'audit_date', 'Enter the calendar date for Audit Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F060', 'general', 'contract_reference', 'Enter the unique identifier used in project records for this item (keep format consistent with the log).', to_jsonb('CR-2026-014'::text)),
    ('F060', 'general', 'compliance_status', 'Select the value that best reflects current compliance status. Prefer evidence over aspiration.', to_jsonb('compliant'::text)),
    ('F060', 'general', 'findings', 'Describe Findings for Procurement Audit in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Findings on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F060', 'general', 'auditor', 'State auditor for Procurement Audit with measure, target, and how it will be verified.', to_jsonb('Critical defect reopen rate <2% after migration.'::text)),
    ('F060', 'general', 'corrective_actions', 'Describe corrective actions for Procurement Audit: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F060', 'general', 'follow_up_date', 'Enter the calendar date for Follow-Up Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F061', 'general', 'contract_reference', 'Enter the unique identifier used in project records for this item (keep format consistent with the log).', to_jsonb('CR-2026-014'::text)),
    ('F061', 'general', 'closeout_date', 'Enter the calendar date for Closeout Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F061', 'general', 'deliverables_accepted', 'Define deliverables accepted for Contract Closeout Report clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F061', 'general', 'outstanding_items', 'Describe Outstanding Items for Contract Closeout Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Outstanding Items on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F061', 'general', 'final_payment_amount', 'Enter final payment amount using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F061', 'general', 'lessons_learned', 'Capture the lesson or improvement: what happened, insight, and recommended change to process or product.', to_jsonb('Earlier load testing would have caught IdP pool limits before pilot expansion.'::text)),
    ('F061', 'general', 'final_acceptance_by', 'Capture final acceptance by for Contract Closeout Report in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F061', 'general', 'warranty_notes', 'Describe Warranty Notes for Contract Closeout Report in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Warranty Notes on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F062', 'general', 'deliverable_name', 'Define deliverable name for Product Acceptance Form clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F062', 'general', 'acceptance_criteria_met', 'Capture acceptance criteria met for Product Acceptance Form in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F062', 'general', 'accepted_by', 'Enter Accepted By for Product Acceptance Form. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Accepted By — Nidus Digital Workplace Platform'::text)),
    ('F062', 'general', 'acceptance_date', 'Capture acceptance date for Product Acceptance Form in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F062', 'general', 'comments', 'Describe Comments for Product Acceptance Form in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Comments on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F062', 'general', 'waiver_details', 'Describe Waiver Details for Product Acceptance Form in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Waiver Details on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F062', 'general', 'rejection_reason', 'Describe Rejection Reason for Product Acceptance Form in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Rejection Reason on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F062', 'general', 'follow_up_actions', 'Describe follow-up actions for Product Acceptance Form: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F063', 'general', 'summary', 'Explain Overall Lessons Learned Summary for Lessons Learned Summary so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering overall lessons learned summary.'::text)),
    ('F063', 'general', 'key_successes', 'List measurable key successes for Lessons Learned Summary (metric, target, and date where possible).', to_jsonb('1. Achieve agreed key successes by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F063', 'general', 'key_challenges', 'Describe Key Challenges for Lessons Learned Summary in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Key Challenges on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F063', 'general', 'recommendations', 'Describe Recommendations for Future Projects for Lessons Learned Summary in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Recommendations for Future Projects on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F063', 'general', 'category', 'Choose the option that best describes Category for Lessons Learned Summary. Prefer the current factual state.', to_jsonb('technical'::text)),
    ('F063', 'general', 'applicability', 'Describe Applicability to Future Projects for Lessons Learned Summary in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Applicability to Future Projects on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F063', 'general', 'owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F064', 'general', 'closeout_date', 'Enter the calendar date for Closeout Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F064', 'general', 'final_deliverables', 'Define final deliverables for Project or Phase Closeout clearly enough to prevent later ambiguity.', to_jsonb('In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.'::text)),
    ('F064', 'general', 'outstanding_actions', 'Describe outstanding actions for Project or Phase Closeout: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F064', 'general', 'resource_release_confirmation', 'Identify who does what: role, named person if known, and capacity or responsibility level.', to_jsonb('BA — 0.5 FTE; Dev Lead — named; PMO support — shared.'::text)),
    ('F064', 'general', 'sign_off_by', 'Enter Sign-Off By for Project or Phase Closeout. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Sign-Off By — Nidus Digital Workplace Platform'::text)),
    ('F064', 'general', 'archive_location', 'Enter Archive Location for Project or Phase Closeout. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Archive Location — Nidus Digital Workplace Platform'::text)),
    ('F064', 'general', 'final_report_reference', 'Enter the unique identifier used in project records for this item (keep format consistent with the log).', to_jsonb('CR-2026-014'::text)),
    ('F064', 'general', 'stakeholder_notification', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F065', 'general', 'vision_statement', 'Explain Vision Statement for Product Vision so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering vision statement.'::text)),
    ('F065', 'general', 'target_customers', 'Describe Target Customers for Product Vision in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Target Customers on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F065', 'general', 'key_benefits', 'List measurable key benefits for Product Vision (metric, target, and date where possible).', to_jsonb('1. Achieve agreed key benefits by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F065', 'general', 'success_metrics', 'List measurable success metrics for Product Vision (metric, target, and date where possible).', to_jsonb('1. Achieve agreed success metrics by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F065', 'general', 'product_goals', 'List measurable product goals for Product Vision (metric, target, and date where possible).', to_jsonb('1. Achieve agreed product goals by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F065', 'general', 'constraints', 'List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.', to_jsonb('Must complete before legacy licence renewal date.'::text)),
    ('F065', 'general', 'roadmap_link', 'Enter Roadmap Link for Product Vision. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Roadmap Link — Nidus Digital Workplace Platform'::text)),
    ('F066', 'general', 'item_title', 'Enter a clear backlog item title that uniquely identifies this Product Backlog entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F066', 'general', 'description', 'Explain Description for Product Backlog so a reader without system access understands context, intent, and expected outcome.', to_jsonb('For the Nidus Digital Workplace Platform: concise factual statement covering description.'::text)),
    ('F066', 'general', 'priority', 'Select the value that best reflects current priority. Prefer evidence over aspiration.', to_jsonb('medium'::text)),
    ('F066', 'general', 'estimate', 'Enter estimate (story points) using the organisation’s currency and note whether figures are estimate or approved.', to_jsonb('1850000'::text)),
    ('F066', 'general', 'status', 'Select the value that best reflects current status. Prefer evidence over aspiration.', to_jsonb('not_started'::text)),
    ('F066', 'general', 'acceptance_criteria', 'Capture acceptance criteria for Product Backlog in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F066', 'general', 'sprint_target', 'Enter Sprint Target for Product Backlog. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Sprint Target — Nidus Digital Workplace Platform'::text)),
    ('F066', 'general', 'dependencies', 'Describe Dependencies for Product Backlog in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Dependencies on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F067', 'general', 'release_name', 'Enter a clear release name that uniquely identifies this Release Plan entry.', to_jsonb('Digital Workplace — Finance pilot expansion'::text)),
    ('F067', 'general', 'release_date', 'Enter the calendar date for Target Release Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F067', 'general', 'included_features', 'Describe Included Features for Release Plan in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Included Features on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F067', 'general', 'release_goals', 'List measurable release goals for Release Plan (metric, target, and date where possible).', to_jsonb('1. Achieve agreed release goals by the next checkpoint.
2. Confirm acceptance criteria with the sponsor.'::text)),
    ('F067', 'general', 'release_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text)),
    ('F067', 'general', 'risks', 'Describe the risk for Release Plan: cause, event, impact, and owner. Keep language factual.', to_jsonb('Adoption risk if change support is under-resourced — Owner: Change Lead.'::text)),
    ('F067', 'general', 'readiness_criteria', 'Capture readiness criteria for Release Plan in testable language. Avoid vague adjectives.', to_jsonb('SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.'::text)),
    ('F068', 'general', 'sprint_iteration', 'Enter Sprint/Iteration for Retrospective. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Sprint/Iteration — Nidus Digital Workplace Platform'::text)),
    ('F068', 'general', 'what_went_well', 'Describe What Went Well for Retrospective in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for What Went Well on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F068', 'general', 'what_could_improve', 'Describe What Could Improve for Retrospective in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for What Could Improve on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F068', 'general', 'action_items', 'Describe action items for Retrospective: audience, channel, frequency, message, and owner.', to_jsonb('Monthly steering pack by email + 30-min call; owner: Project Manager.'::text)),
    ('F068', 'general', 'facilitator', 'Enter Facilitator for Retrospective. Be specific and consistent with related project registers and baselines.', to_jsonb('Sample Facilitator — Nidus Digital Workplace Platform'::text)),
    ('F068', 'general', 'participants', 'Describe Participants for Retrospective in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.', to_jsonb('Sample entry for Participants on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.'::text)),
    ('F068', 'general', 'retrospective_date', 'Enter the calendar date for Retrospective Date (organisation local date).', to_jsonb('2026-09-15'::text)),
    ('F068', 'general', 'follow_up_owner', 'Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.', to_jsonb('Jordan Lee — Project Manager'::text));


-- Patch current public.form_template_versions.schema help/sample
DO $$
DECLARE
    r RECORD;
    v_schema JSONB;
    v_sections JSONB;
    v_sec JSONB;
    v_new_fields JSONB;
    v_field JSONB;
    v_key TEXT;
    v_sec_key TEXT;
    v_help TEXT;
    v_sample JSONB;
    v_n INT := 0;
BEGIN
    FOR r IN
        SELECT t.template_code, v.id AS version_id, v.schema
        FROM public.form_templates t
        JOIN public.form_template_versions v ON v.template_id = t.id AND v.is_current = TRUE
    LOOP
        v_schema := COALESCE(r.schema, '{}'::jsonb);
        v_sections := '[]'::jsonb;
        FOR v_sec IN SELECT * FROM jsonb_array_elements(COALESCE(v_schema->'sections', '[]'::jsonb))
        LOOP
            v_sec_key := COALESCE(v_sec->>'key', 'general');
            v_new_fields := '[]'::jsonb;
            FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_sec->'fields', '[]'::jsonb))
            LOOP
                v_key := v_field->>'key';
                SELECT g.help_text, g.sample_value
                  INTO v_help, v_sample
                  FROM tmp_v781_guidance g
                 WHERE g.template_code = r.template_code
                   AND g.field_key = v_key
                   AND (g.section_key = v_sec_key OR g.section_key = 'general')
                 ORDER BY CASE WHEN g.section_key = v_sec_key THEN 0 ELSE 1 END
                 LIMIT 1;
                IF v_help IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{help}', to_jsonb(v_help), true);
                    v_n := v_n + 1;
                END IF;
                IF v_sample IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{sample}', to_jsonb(v_sample #>> '{}'), true);
                END IF;
                v_new_fields := v_new_fields || jsonb_build_array(v_field);
            END LOOP;
            v_sec := jsonb_set(v_sec, '{fields}', v_new_fields, true);
            v_sections := v_sections || jsonb_build_array(v_sec);
        END LOOP;
        UPDATE public.form_template_versions
        SET schema = jsonb_set(COALESCE(schema, '{}'::jsonb), '{sections}', v_sections, true)
        WHERE id = r.version_id;
    END LOOP;
    RAISE NOTICE 'v781 public schema help patches=%', v_n;
END $$;


-- Patch current sim.form_template_versions.schema help/sample
DO $$
DECLARE
    r RECORD;
    v_schema JSONB;
    v_sections JSONB;
    v_sec JSONB;
    v_new_fields JSONB;
    v_field JSONB;
    v_key TEXT;
    v_sec_key TEXT;
    v_help TEXT;
    v_sample JSONB;
    v_n INT := 0;
BEGIN
    FOR r IN
        SELECT t.template_code, v.id AS version_id, v.schema
        FROM sim.form_templates t
        JOIN sim.form_template_versions v ON v.template_id = t.id AND v.is_current = TRUE
    LOOP
        v_schema := COALESCE(r.schema, '{}'::jsonb);
        v_sections := '[]'::jsonb;
        FOR v_sec IN SELECT * FROM jsonb_array_elements(COALESCE(v_schema->'sections', '[]'::jsonb))
        LOOP
            v_sec_key := COALESCE(v_sec->>'key', 'general');
            v_new_fields := '[]'::jsonb;
            FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_sec->'fields', '[]'::jsonb))
            LOOP
                v_key := v_field->>'key';
                SELECT g.help_text, g.sample_value
                  INTO v_help, v_sample
                  FROM tmp_v781_guidance g
                 WHERE g.template_code = r.template_code
                   AND g.field_key = v_key
                   AND (g.section_key = v_sec_key OR g.section_key = 'general')
                 ORDER BY CASE WHEN g.section_key = v_sec_key THEN 0 ELSE 1 END
                 LIMIT 1;
                IF v_help IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{help}', to_jsonb(v_help), true);
                    v_n := v_n + 1;
                END IF;
                IF v_sample IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{sample}', to_jsonb(v_sample #>> '{}'), true);
                END IF;
                v_new_fields := v_new_fields || jsonb_build_array(v_field);
            END LOOP;
            v_sec := jsonb_set(v_sec, '{fields}', v_new_fields, true);
            v_sections := v_sections || jsonb_build_array(v_sec);
        END LOOP;
        UPDATE sim.form_template_versions
        SET schema = jsonb_set(COALESCE(schema, '{}'::jsonb), '{sections}', v_sections, true)
        WHERE id = r.version_id;
    END LOOP;
    RAISE NOTICE 'v781 sim schema help patches=%', v_n;
END $$;



INSERT INTO public.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT
    a.id,
    t.id,
    g.section_key,
    g.field_key,
    g.sample_value,
    g.help_text
FROM public.accounts a
CROSS JOIN public.form_templates t
JOIN tmp_v781_guidance g ON g.template_code = t.template_code
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN public.form_template_field_defaults.default_value IS NULL
          OR NULLIF(trim(both '"' from public.form_template_field_defaults.default_value::text), '') IS NULL
          OR public.form_template_field_defaults.default_value::text ILIKE '%Sample (% — %)%Nidus Digital Workplace%'
          OR public.form_template_field_defaults.default_value::text ILIKE '%Customise names, dates, owners%'
        THEN EXCLUDED.default_value
        ELSE public.form_template_field_defaults.default_value
    END,
    guidance_text = CASE
        WHEN public.form_template_field_defaults.guidance_text IS NULL
          OR NULLIF(trim(public.form_template_field_defaults.guidance_text), '') IS NULL
          OR public.form_template_field_defaults.guidance_text ILIKE 'Briefly complete %'
          OR public.form_template_field_defaults.guidance_text ILIKE '%understood offline without system context%'
          OR public.form_template_field_defaults.guidance_text ILIKE 'Complete % for %(%'
          OR public.form_template_field_defaults.guidance_text ILIKE 'Select the appropriate % for %(%'
        THEN EXCLUDED.guidance_text
        ELSE public.form_template_field_defaults.guidance_text
    END,
    updated_at = NOW();


INSERT INTO sim.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT
    a.id,
    t.id,
    g.section_key,
    g.field_key,
    g.sample_value,
    g.help_text
FROM public.accounts a
CROSS JOIN sim.form_templates t
JOIN tmp_v781_guidance g ON g.template_code = t.template_code
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN sim.form_template_field_defaults.default_value IS NULL
          OR NULLIF(trim(both '"' from sim.form_template_field_defaults.default_value::text), '') IS NULL
          OR sim.form_template_field_defaults.default_value::text ILIKE '%Sample (% — %)%Nidus Digital Workplace%'
          OR sim.form_template_field_defaults.default_value::text ILIKE '%Customise names, dates, owners%'
        THEN EXCLUDED.default_value
        ELSE sim.form_template_field_defaults.default_value
    END,
    guidance_text = CASE
        WHEN sim.form_template_field_defaults.guidance_text IS NULL
          OR NULLIF(trim(sim.form_template_field_defaults.guidance_text), '') IS NULL
          OR sim.form_template_field_defaults.guidance_text ILIKE 'Briefly complete %'
          OR sim.form_template_field_defaults.guidance_text ILIKE '%understood offline without system context%'
          OR sim.form_template_field_defaults.guidance_text ILIKE 'Complete % for %(%'
          OR sim.form_template_field_defaults.guidance_text ILIKE 'Select the appropriate % for %(%'
        THEN EXCLUDED.guidance_text
        ELSE sim.form_template_field_defaults.guidance_text
    END,
    updated_at = NOW();


-- Smoke: remaining boilerplate should be 0 after apply (org defaults)
DO $$
DECLARE
    v_pub INT;
    v_sim INT;
BEGIN
    SELECT COUNT(*) INTO v_pub FROM public.form_template_field_defaults
    WHERE guidance_text ILIKE 'Briefly complete %'
       OR guidance_text ILIKE '%understood offline without system context%'
       OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%';
    SELECT COUNT(*) INTO v_sim FROM sim.form_template_field_defaults
    WHERE guidance_text ILIKE 'Briefly complete %'
       OR guidance_text ILIKE '%understood offline without system context%'
       OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%';
    RAISE NOTICE 'v781 leftover boilerplate guidance rows: public=%, sim=%', v_pub, v_sim;
END $$;
