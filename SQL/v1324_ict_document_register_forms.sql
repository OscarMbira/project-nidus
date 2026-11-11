-- ============================================================================
-- v1324: Information Technology — complete document forms (v1318 PRD d.3)
-- ============================================================================
-- Owner decision 2026-10-24: full best-practice forms for the empty document registers.
-- Every form has the standard frame (Details: reference, version, owner*, next review; an
-- Introduction tab for strategy/plan/architecture/design documents; Risks & Roles; Glossary &
-- Appendices; Document Control) plus register-specific tabs. Vendor-neutral names (rule 26).
-- Field keys glossary / appendices / version_history / related_documents are placed by the
-- complete document export (Glossary as section 2, Appendices, Document Control page).
-- 16 registers, 488 fields. Prerequisites: v1316 (long_text type), v1321. Idempotent.
-- ============================================================================

-- ── ict_enterprise_architecture: 31 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('architecture_owner', 'Architecture Owner', 'user_picker', false, 4, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 5, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 6, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 7, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 9, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 10, 'Introduction', NULL),
  ('business_drivers', 'Business Drivers', 'multi_line', false, 11, 'Business Context', NULL),
  ('strategic_goals', 'Strategic Goals', 'multi_line', false, 12, 'Business Context', NULL),
  ('stakeholder_concerns', 'Stakeholder Concerns', 'multi_line', false, 13, 'Business Context', NULL),
  ('architecture_principles', 'Architecture Principles', 'multi_line', false, 14, 'Business Context', NULL),
  ('baseline_architecture', 'Baseline Architecture', 'long_text', false, 15, 'Current State', NULL),
  ('pain_points', 'Pain Points', 'multi_line', false, 16, 'Current State', NULL),
  ('target_architecture', 'Target Architecture', 'long_text', false, 17, 'Target State', NULL),
  ('capability_map', 'Capability Map', 'multi_line', false, 18, 'Target State', NULL),
  ('gaps', 'Gaps', 'multi_line', false, 19, 'Gaps & Roadmap', NULL),
  ('transition_architectures', 'Transition Architectures', 'multi_line', false, 20, 'Gaps & Roadmap', NULL),
  ('roadmap_items', 'Roadmap Items', 'multi_line', false, 21, 'Gaps & Roadmap', NULL),
  ('technology_standards', 'Technology Standards', 'multi_line', false, 22, 'Standards & Governance', NULL),
  ('governance_process', 'Governance Process', 'long_text', false, 23, 'Standards & Governance', NULL),
  ('compliance_requirements', 'Compliance Requirements', 'multi_line', false, 24, 'Standards & Governance', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 25, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 27, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 29, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 30, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_enterprise_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_solution_architecture: 33 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('solution_architect', 'Solution Architect', 'user_picker', false, 4, NULL, NULL),
  ('solution_name', 'Solution Name', 'text', false, 5, NULL, NULL),
  ('deployment_model', 'Deployment Model', 'dropdown', false, 6, NULL, '[{"value":"on_premises","label":"On-premises"},{"value":"cloud","label":"Cloud"},{"value":"hybrid","label":"Hybrid"},{"value":"software_as_a_service","label":"Software-as-a-service"}]'),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('business_requirements', 'Business Requirements', 'multi_line', false, 13, 'Context', NULL),
  ('stakeholders', 'Stakeholders', 'multi_line', false, 14, 'Context', NULL),
  ('architecture_overview', 'Architecture Overview', 'long_text', false, 15, 'Overview', NULL),
  ('components', 'Components', 'multi_line', false, 16, 'Overview', NULL),
  ('technology_stack', 'Technology Stack', 'multi_line', false, 17, 'Overview', NULL),
  ('non_functional_requirements', 'Non-Functional Requirements (Category – Requirement – Target)', 'multi_line', false, 18, 'Non-Functional', NULL),
  ('availability_target', 'Availability Target (%)', 'number', false, 19, 'Non-Functional', NULL),
  ('recovery_point_objective', 'Recovery Point Objective (hours)', 'number', false, 20, 'Non-Functional', NULL),
  ('recovery_time_objective', 'Recovery Time Objective (hours)', 'number', false, 21, 'Non-Functional', NULL),
  ('interfaces', 'Interfaces', 'multi_line', false, 22, 'Integration & Security', NULL),
  ('data_flows', 'Data Flows', 'multi_line', false, 23, 'Integration & Security', NULL),
  ('security_controls', 'Security Controls', 'multi_line', false, 24, 'Integration & Security', NULL),
  ('architecture_decisions', 'Architecture Decisions', 'multi_line', false, 25, 'Decisions', NULL),
  ('technical_debt', 'Technical Debt', 'multi_line', false, 26, 'Decisions', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 27, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 28, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 29, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 30, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 31, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 32, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_solution_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_application_architecture: 28 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('application_architect', 'Application Architect', 'user_picker', false, 4, NULL, NULL),
  ('architecture_style', 'Architecture Style', 'dropdown', false, 5, NULL, '[{"value":"monolith","label":"Monolith"},{"value":"modular_monolith","label":"Modular monolith"},{"value":"microservices","label":"Microservices"},{"value":"event_driven","label":"Event-driven"},{"value":"serverless","label":"Serverless"},{"value":"layered","label":"Layered"}]'),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('applications_in_scope', 'Applications in Scope', 'multi_line', false, 12, 'Landscape', NULL),
  ('application_components', 'Application Components', 'multi_line', false, 13, 'Landscape', NULL),
  ('design_patterns', 'Design Patterns', 'multi_line', false, 14, 'Design', NULL),
  ('technology_stack', 'Technology Stack', 'multi_line', false, 15, 'Design', NULL),
  ('apis', 'APIs', 'multi_line', false, 16, 'Design', NULL),
  ('dependencies', 'Dependencies', 'multi_line', false, 17, 'Design', NULL),
  ('deployment_model', 'Deployment Model', 'dropdown', false, 18, 'Deployment', '[{"value":"on_premises","label":"On-premises"},{"value":"cloud","label":"Cloud"},{"value":"hybrid","label":"Hybrid"},{"value":"software_as_a_service","label":"Software-as-a-service"}]'),
  ('hosting_environments', 'Hosting Environments', 'multi_select', false, 19, 'Deployment', '[{"value":"development","label":"Development"},{"value":"test","label":"Test"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"},{"value":"dr","label":"DR"}]'),
  ('scalability_approach', 'Scalability Approach', 'long_text', false, 20, 'Deployment', NULL),
  ('non_functional_requirements', 'Non-Functional Requirements', 'multi_line', false, 21, 'Quality Attributes', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 22, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 23, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 24, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 25, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 26, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 27, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_application_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_data_architecture: 32 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('data_architect', 'Data Architect', 'user_picker', false, 4, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 5, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 6, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 7, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 9, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 10, 'Introduction', NULL),
  ('data_domains', 'Data Domains', 'multi_line', false, 11, 'Landscape', NULL),
  ('data_sources', 'Data Sources', 'multi_line', false, 12, 'Landscape', NULL),
  ('data_stores', 'Data Stores', 'multi_line', false, 13, 'Landscape', NULL),
  ('conceptual_model', 'Conceptual Model', 'long_text', false, 14, 'Models', NULL),
  ('logical_model_reference', 'Logical Model Reference', 'text', false, 15, 'Models', NULL),
  ('master_data_entities', 'Master Data Entities', 'multi_line', false, 16, 'Models', NULL),
  ('data_flows', 'Data Flows', 'multi_line', false, 17, 'Flows & Integration', NULL),
  ('integration_patterns', 'Integration Patterns', 'multi_select', false, 18, 'Flows & Integration', '[{"value":"batch","label":"Batch"},{"value":"real_time_api","label":"Real-time API"},{"value":"event_streaming","label":"Event streaming"},{"value":"etl_elt","label":"ETL/ELT"},{"value":"replication","label":"Replication"},{"value":"file_transfer","label":"File transfer"}]'),
  ('data_owners', 'Data Owners', 'multi_line', false, 19, 'Governance & Quality', NULL),
  ('data_quality_rules', 'Data Quality Rules', 'multi_line', false, 20, 'Governance & Quality', NULL),
  ('retention_rules', 'Retention Rules', 'multi_line', false, 21, 'Governance & Quality', NULL),
  ('classification_levels', 'Classification Levels', 'multi_select', false, 22, 'Governance & Quality', '[{"value":"public","label":"Public"},{"value":"internal","label":"Internal"},{"value":"confidential","label":"Confidential"},{"value":"restricted","label":"Restricted"}]'),
  ('personal_data_processed', 'Personal Data Processed', 'boolean', false, 23, 'Privacy & Security', NULL),
  ('privacy_controls', 'Privacy Controls', 'multi_line', false, 24, 'Privacy & Security', NULL),
  ('encryption_requirements', 'Encryption Requirements', 'multi_line', false, 25, 'Privacy & Security', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 27, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 29, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 30, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 31, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_data_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_integration_architecture: 29 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('integration_architect', 'Integration Architect', 'user_picker', false, 4, NULL, NULL),
  ('middleware_integration_platform', 'Middleware / Integration Platform', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('systems_integrated', 'Systems Integrated', 'multi_line', false, 12, 'Landscape', NULL),
  ('integration_patterns', 'Integration Patterns', 'multi_select', false, 13, 'Landscape', '[{"value":"batch","label":"Batch"},{"value":"real_time_api","label":"Real-time API"},{"value":"event_streaming","label":"Event streaming"},{"value":"etl_elt","label":"ETL/ELT"},{"value":"replication","label":"Replication"},{"value":"file_transfer","label":"File transfer"}]'),
  ('interfaces', 'Interfaces (Name – Source – Target – Pattern – Frequency)', 'multi_line', false, 14, 'Interfaces', NULL),
  ('message_formats', 'Message Formats', 'multi_select', false, 15, 'Standards', '[{"value":"json","label":"JSON"},{"value":"xml","label":"XML"},{"value":"csv","label":"CSV"},{"value":"fixed_width","label":"Fixed-width"},{"value":"iso_20022","label":"ISO 20022"},{"value":"edi","label":"EDI"},{"value":"other","label":"Other"}]'),
  ('api_standards', 'API Standards', 'multi_line', false, 16, 'Standards', NULL),
  ('error_handling', 'Error Handling', 'long_text', false, 17, 'Standards', NULL),
  ('throughput_targets', 'Throughput Targets', 'multi_line', false, 18, 'Non-Functional & Security', NULL),
  ('availability_target', 'Availability Target (%)', 'number', false, 19, 'Non-Functional & Security', NULL),
  ('monitoring_approach', 'Monitoring Approach', 'long_text', false, 20, 'Non-Functional & Security', NULL),
  ('authentication_methods', 'Authentication Methods', 'multi_select', false, 21, 'Non-Functional & Security', '[{"value":"oauth_2_0","label":"OAuth 2.0"},{"value":"mutual_tls","label":"Mutual TLS"},{"value":"api_keys","label":"API keys"},{"value":"saml","label":"SAML"},{"value":"certificates","label":"Certificates"},{"value":"basic","label":"Basic"}]'),
  ('security_controls', 'Security Controls', 'multi_line', false, 22, 'Non-Functional & Security', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 23, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 24, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 25, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 26, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 27, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 28, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_integration_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_security_architecture: 31 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('security_architect', 'Security Architect', 'user_picker', false, 4, NULL, NULL),
  ('overall_security_risk', 'Overall Security Risk', 'dropdown', false, 5, NULL, '[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]'),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('security_requirements', 'Security Requirements', 'multi_line', false, 12, 'Requirements', NULL),
  ('regulatory_frameworks', 'Regulatory Frameworks', 'multi_line', false, 13, 'Requirements', NULL),
  ('data_classification', 'Data Classification', 'multi_line', false, 14, 'Requirements', NULL),
  ('threat_model_summary', 'Threat Model Summary', 'long_text', false, 15, 'Threats', NULL),
  ('key_threats', 'Key Threats', 'multi_line', false, 16, 'Threats', NULL),
  ('identity_and_access_controls', 'Identity & Access Controls', 'multi_line', false, 17, 'Controls', NULL),
  ('network_controls', 'Network Controls', 'multi_line', false, 18, 'Controls', NULL),
  ('data_protection_controls', 'Data Protection Controls', 'multi_line', false, 19, 'Controls', NULL),
  ('application_controls', 'Application Controls', 'multi_line', false, 20, 'Controls', NULL),
  ('logging_and_monitoring', 'Logging & Monitoring', 'multi_line', false, 21, 'Controls', NULL),
  ('security_testing', 'Security Testing', 'multi_select', false, 22, 'Assurance', '[{"value":"static_analysis","label":"Static analysis"},{"value":"dynamic_analysis","label":"Dynamic analysis"},{"value":"penetration_test","label":"Penetration test"},{"value":"vulnerability_scan","label":"Vulnerability scan"},{"value":"code_review","label":"Code review"},{"value":"configuration_review","label":"Configuration review"}]'),
  ('compliance_checks', 'Compliance Checks', 'multi_line', false, 23, 'Assurance', NULL),
  ('residual_risks', 'Residual Risks', 'multi_line', false, 24, 'Assurance', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 25, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 27, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 29, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 30, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_security_architecture'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_functional_design: 32 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('functional_lead', 'Functional Lead', 'user_picker', false, 4, NULL, NULL),
  ('module_area', 'Module / Area', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('business_requirements', 'Business Requirements', 'multi_line', false, 12, 'Business Context', NULL),
  ('process_flows', 'Process Flows', 'multi_line', false, 13, 'Business Context', NULL),
  ('user_roles', 'User Roles', 'multi_line', false, 14, 'Business Context', NULL),
  ('functional_requirements', 'Functional Requirements (ID – Requirement – Priority)', 'multi_line', false, 15, 'Requirements', NULL),
  ('business_rules', 'Business Rules', 'multi_line', false, 16, 'Requirements', NULL),
  ('validations', 'Validations', 'multi_line', false, 17, 'Requirements', NULL),
  ('screens', 'Screens', 'multi_line', false, 18, 'User Interface', NULL),
  ('reports', 'Reports', 'multi_line', false, 19, 'User Interface', NULL),
  ('notifications', 'Notifications', 'multi_line', false, 20, 'User Interface', NULL),
  ('data_entities', 'Data Entities', 'multi_line', false, 21, 'Data', NULL),
  ('inputs_and_outputs', 'Inputs & Outputs', 'multi_line', false, 22, 'Data', NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'multi_line', false, 23, 'Acceptance', NULL),
  ('traceability_reference', 'Traceability Reference', 'text', false, 24, 'Acceptance', NULL),
  ('open_questions', 'Open Questions', 'multi_line', false, 25, 'Acceptance', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 27, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 29, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 30, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 31, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_functional_design'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_technical_design: 34 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('technical_lead', 'Technical Lead', 'user_picker', false, 4, NULL, NULL),
  ('component_service', 'Component / Service', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('design_overview', 'Design Overview', 'long_text', false, 12, 'Overview', NULL),
  ('components', 'Components', 'multi_line', false, 13, 'Overview', NULL),
  ('technology_stack', 'Technology Stack', 'multi_line', false, 14, 'Overview', NULL),
  ('component_design', 'Component Design', 'multi_line', false, 15, 'Detailed Design', NULL),
  ('logic_and_algorithms', 'Logic & Algorithms', 'long_text', false, 16, 'Detailed Design', NULL),
  ('configuration', 'Configuration', 'multi_line', false, 17, 'Detailed Design', NULL),
  ('data_structures', 'Data Structures', 'multi_line', false, 18, 'Data & Interfaces', NULL),
  ('database_changes', 'Database Changes', 'multi_line', false, 19, 'Data & Interfaces', NULL),
  ('apis', 'APIs', 'multi_line', false, 20, 'Data & Interfaces', NULL),
  ('integration_points', 'Integration Points', 'multi_line', false, 21, 'Data & Interfaces', NULL),
  ('performance_considerations', 'Performance Considerations', 'multi_line', false, 22, 'Operations', NULL),
  ('security_considerations', 'Security Considerations', 'multi_line', false, 23, 'Operations', NULL),
  ('logging_and_monitoring', 'Logging & Monitoring', 'multi_line', false, 24, 'Operations', NULL),
  ('deployment_steps', 'Deployment Steps', 'multi_line', false, 25, 'Operations', NULL),
  ('unit_test_approach', 'Unit Test Approach', 'long_text', false, 26, 'Testing', NULL),
  ('test_scenarios', 'Test Scenarios', 'multi_line', false, 27, 'Testing', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 28, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 29, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 30, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 31, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 32, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 33, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_technical_design'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_integration_design: 26 fields, Details + 7 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('interface_name', 'Interface Name', 'text', true, 4, NULL, NULL),
  ('source_system', 'Source System', 'text', false, 5, NULL, NULL),
  ('target_system', 'Target System', 'text', false, 6, NULL, NULL),
  ('integration_pattern', 'Integration Pattern', 'dropdown', false, 7, NULL, '[{"value":"batch","label":"Batch"},{"value":"real_time_api","label":"Real-time API"},{"value":"event_streaming","label":"Event streaming"},{"value":"etl_elt","label":"ETL/ELT"},{"value":"replication","label":"Replication"},{"value":"file_transfer","label":"File transfer"}]'),
  ('frequency', 'Frequency', 'dropdown', false, 8, NULL, '[{"value":"real_time","label":"Real-time"},{"value":"near_real_time","label":"Near real-time"},{"value":"hourly","label":"Hourly"},{"value":"daily","label":"Daily"},{"value":"on_demand","label":"On demand"},{"value":"event_triggered","label":"Event-triggered"}]'),
  ('message_format', 'Message Format', 'dropdown', false, 9, 'Message & Mapping', '[{"value":"json","label":"JSON"},{"value":"xml","label":"XML"},{"value":"csv","label":"CSV"},{"value":"fixed_width","label":"Fixed-width"},{"value":"iso_20022","label":"ISO 20022"},{"value":"edi","label":"EDI"},{"value":"other","label":"Other"}]'),
  ('field_mappings', 'Field Mappings (Source – Target – Rule)', 'multi_line', false, 10, 'Message & Mapping', NULL),
  ('transformations', 'Transformations', 'multi_line', false, 11, 'Message & Mapping', NULL),
  ('error_scenarios', 'Error Scenarios', 'multi_line', false, 12, 'Error Handling', NULL),
  ('retry_policy', 'Retry Policy', 'long_text', false, 13, 'Error Handling', NULL),
  ('alerting', 'Alerting', 'multi_line', false, 14, 'Error Handling', NULL),
  ('authentication_method', 'Authentication Method', 'dropdown', false, 15, 'Security', '[{"value":"oauth_2_0","label":"OAuth 2.0"},{"value":"mutual_tls","label":"Mutual TLS"},{"value":"api_keys","label":"API keys"},{"value":"saml","label":"SAML"},{"value":"certificates","label":"Certificates"},{"value":"basic","label":"Basic"}]'),
  ('encryption_in_transit', 'Encryption in Transit', 'boolean', false, 16, 'Security', NULL),
  ('data_sensitivity', 'Data Sensitivity', 'dropdown', false, 17, 'Security', '[{"value":"public","label":"Public"},{"value":"internal","label":"Internal"},{"value":"confidential","label":"Confidential"},{"value":"restricted","label":"Restricted"}]'),
  ('test_cases', 'Test Cases', 'multi_line', false, 18, 'Testing', NULL),
  ('volumes_and_performance', 'Volumes & Performance', 'multi_line', false, 19, 'Testing', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 20, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 21, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 22, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 23, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 24, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 25, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_integration_design'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_data_design: 29 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('data_designer', 'Data Designer', 'user_picker', false, 4, NULL, NULL),
  ('database_platform', 'Database Platform', 'text', false, 5, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 6, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 7, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 8, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 10, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 11, 'Introduction', NULL),
  ('entities', 'Entities (Entity – Description – Owner)', 'multi_line', false, 12, 'Entities', NULL),
  ('relationships', 'Relationships', 'multi_line', false, 13, 'Entities', NULL),
  ('key_attributes', 'Key Attributes', 'multi_line', false, 14, 'Attributes & Rules', NULL),
  ('validation_rules', 'Validation Rules', 'multi_line', false, 15, 'Attributes & Rules', NULL),
  ('reference_data', 'Reference Data', 'multi_line', false, 16, 'Attributes & Rules', NULL),
  ('indexing_and_partitioning', 'Indexing & Partitioning', 'multi_line', false, 17, 'Storage', NULL),
  ('retention_and_archiving', 'Retention & Archiving', 'multi_line', false, 18, 'Storage', NULL),
  ('data_quality_rules', 'Data Quality Rules', 'multi_line', false, 19, 'Quality & Privacy', NULL),
  ('personal_data_fields', 'Personal Data Fields', 'multi_line', false, 20, 'Quality & Privacy', NULL),
  ('masking_requirements', 'Masking Requirements', 'multi_line', false, 21, 'Quality & Privacy', NULL),
  ('migration_considerations', 'Migration Considerations', 'long_text', false, 22, 'Migration Impact', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 23, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 24, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 25, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 26, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 27, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 28, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_data_design'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_ux_ui_design: 31 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('ux_lead', 'UX Lead', 'user_picker', false, 4, NULL, NULL),
  ('prototype_link', 'Prototype Link', 'text', false, 5, NULL, NULL),
  ('design_system_reference', 'Design System Reference', 'text', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('personas', 'Personas', 'multi_line', false, 13, 'Users', NULL),
  ('user_goals', 'User Goals', 'multi_line', false, 14, 'Users', NULL),
  ('user_journeys', 'User Journeys', 'multi_line', false, 15, 'Users', NULL),
  ('information_architecture', 'Information Architecture', 'long_text', false, 16, 'Design', NULL),
  ('key_screens', 'Key Screens', 'multi_line', false, 17, 'Design', NULL),
  ('accessibility_standard', 'Accessibility Standard', 'dropdown', false, 18, 'Accessibility & Devices', '[{"value":"wcag_2_1_aa","label":"WCAG 2.1 AA"},{"value":"wcag_2_2_aa","label":"WCAG 2.2 AA"},{"value":"wcag_2_1_aaa","label":"WCAG 2.1 AAA"},{"value":"other","label":"Other"}]'),
  ('accessibility_requirements', 'Accessibility Requirements', 'multi_line', false, 19, 'Accessibility & Devices', NULL),
  ('devices_supported', 'Devices Supported', 'multi_select', false, 20, 'Accessibility & Devices', '[{"value":"desktop","label":"Desktop"},{"value":"tablet","label":"Tablet"},{"value":"mobile","label":"Mobile"},{"value":"kiosk","label":"Kiosk"}]'),
  ('browsers_supported', 'Browsers Supported', 'multi_line', false, 21, 'Accessibility & Devices', NULL),
  ('usability_tests', 'Usability Tests', 'multi_line', false, 22, 'Usability Testing', NULL),
  ('findings', 'Findings', 'multi_line', false, 23, 'Usability Testing', NULL),
  ('design_changes', 'Design Changes', 'multi_line', false, 24, 'Usability Testing', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 25, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 26, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 27, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 28, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 29, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 30, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_ux_ui_design'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_disaster_recovery: 37 fields, Details + 9 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('dr_owner', 'DR Owner', 'user_picker', false, 4, NULL, NULL),
  ('last_dr_test', 'Last DR Test', 'date', false, 5, NULL, NULL),
  ('next_dr_test', 'Next DR Test', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('systems_in_scope', 'Systems in Scope', 'multi_line', false, 13, 'Objectives', NULL),
  ('recovery_time_objective', 'Recovery Time Objective (hours)', 'number', false, 14, 'Objectives', NULL),
  ('recovery_point_objective', 'Recovery Point Objective (hours)', 'number', false, 15, 'Objectives', NULL),
  ('recovery_tier', 'Recovery Tier', 'dropdown', false, 16, 'Objectives', '[{"value":"tier_1_critical","label":"Tier 1 – Critical"},{"value":"tier_2_essential","label":"Tier 2 – Essential"},{"value":"tier_3_important","label":"Tier 3 – Important"},{"value":"tier_4_non_critical","label":"Tier 4 – Non-critical"}]'),
  ('dr_strategy', 'DR Strategy', 'dropdown', false, 17, 'DR Strategy', '[{"value":"active_active","label":"Active-active"},{"value":"hot_standby","label":"Hot standby"},{"value":"warm_standby","label":"Warm standby"},{"value":"cold_standby","label":"Cold standby"},{"value":"backup_and_restore","label":"Backup and restore"}]'),
  ('dr_site', 'DR Site', 'text', false, 18, 'DR Strategy', NULL),
  ('replication_approach', 'Replication Approach', 'long_text', false, 19, 'DR Strategy', NULL),
  ('backup_schedule', 'Backup Schedule', 'multi_line', false, 20, 'Backup', NULL),
  ('backup_retention', 'Backup Retention', 'multi_line', false, 21, 'Backup', NULL),
  ('off_site_copy', 'Off-site Copy', 'boolean', false, 22, 'Backup', NULL),
  ('invocation_criteria', 'Invocation Criteria', 'multi_line', false, 23, 'Procedures', NULL),
  ('recovery_steps', 'Recovery Steps', 'multi_line', false, 24, 'Procedures', NULL),
  ('failback_steps', 'Failback Steps', 'multi_line', false, 25, 'Procedures', NULL),
  ('dr_test_types', 'DR Test Types', 'multi_select', false, 26, 'Testing & Contacts', '[{"value":"tabletop","label":"Tabletop"},{"value":"component_failover","label":"Component failover"},{"value":"full_failover","label":"Full failover"},{"value":"backup_restore","label":"Backup restore"}]'),
  ('test_results', 'Test Results', 'long_text', false, 27, 'Testing & Contacts', NULL),
  ('readiness_issues', 'Readiness Issues', 'multi_line', false, 28, 'Testing & Contacts', NULL),
  ('dr_team', 'DR Team', 'multi_line', false, 29, 'Testing & Contacts', NULL),
  ('supplier_contacts', 'Supplier Contacts', 'multi_line', false, 30, 'Testing & Contacts', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 31, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 32, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 33, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 34, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 35, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 36, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_disaster_recovery'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_support_model: 34 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('service_owner', 'Service Owner', 'user_picker', false, 4, NULL, NULL),
  ('support_start', 'Support Start', 'date', false, 5, NULL, NULL),
  ('service_hours', 'Service Hours', 'dropdown', false, 6, NULL, '[{"value":"business_hours","label":"Business hours"},{"value":"extended_hours","label":"Extended hours"},{"value":"24x7","label":"24x7"}]'),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('services_supported', 'Services Supported', 'multi_line', false, 13, 'Services & Tiers', NULL),
  ('tier_structure', 'Tier Structure', 'multi_line', false, 14, 'Services & Tiers', NULL),
  ('support_teams', 'Support Teams', 'multi_line', false, 15, 'Services & Tiers', NULL),
  ('supplier_support', 'Supplier Support', 'multi_line', false, 16, 'Services & Tiers', NULL),
  ('priority_definitions', 'Priority Definitions', 'multi_line', false, 17, 'Service Levels', NULL),
  ('service_levels', 'Service Levels (Priority – Response – Resolution)', 'multi_line', false, 18, 'Service Levels', NULL),
  ('incident_process', 'Incident Process', 'long_text', false, 19, 'Processes', NULL),
  ('problem_process', 'Problem Process', 'long_text', false, 20, 'Processes', NULL),
  ('change_process', 'Change Process', 'long_text', false, 21, 'Processes', NULL),
  ('request_process', 'Request Process', 'long_text', false, 22, 'Processes', NULL),
  ('service_desk_tool', 'Service Desk Tool', 'text', false, 23, 'Tools & Transition', NULL),
  ('knowledge_base', 'Knowledge Base', 'text', false, 24, 'Tools & Transition', NULL),
  ('monitoring_tools', 'Monitoring Tools', 'multi_line', false, 25, 'Tools & Transition', NULL),
  ('handover_criteria', 'Handover Criteria', 'multi_line', false, 26, 'Tools & Transition', NULL),
  ('training_plan', 'Training Plan', 'multi_line', false, 27, 'Tools & Transition', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 28, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 29, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 30, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 31, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 32, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 33, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_support_model'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_technology_roadmap: 31 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('roadmap_owner', 'Roadmap Owner', 'user_picker', false, 4, NULL, NULL),
  ('horizon', 'Horizon', 'dropdown', false, 5, NULL, '[{"value":"1_year","label":"1 year"},{"value":"2_years","label":"2 years"},{"value":"3_years","label":"3 years"},{"value":"5_years","label":"5 years"}]'),
  ('roadmap_start', 'Roadmap Start', 'date', false, 6, NULL, NULL),
  ('purpose', 'Purpose', 'long_text', false, 7, 'Introduction', NULL),
  ('objectives', 'Objectives', 'multi_line', false, 8, 'Introduction', NULL),
  ('scope', 'Scope', 'multi_line', false, 9, 'Introduction', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 10, 'Introduction', NULL),
  ('assumptions', 'Assumptions', 'multi_line', false, 11, 'Introduction', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 12, 'Introduction', NULL),
  ('vision', 'Vision', 'long_text', false, 13, 'Vision & Drivers', NULL),
  ('business_drivers', 'Business Drivers', 'multi_line', false, 14, 'Vision & Drivers', NULL),
  ('principles', 'Principles', 'multi_line', false, 15, 'Vision & Drivers', NULL),
  ('current_technologies', 'Current Technologies', 'multi_line', false, 16, 'Current State', NULL),
  ('constraints_and_issues', 'Constraints & Issues', 'multi_line', false, 17, 'Current State', NULL),
  ('initiatives', 'Initiatives', 'table', false, 18, 'Roadmap', '[{"value":"initiative","label":"Initiative"},{"value":"timeframe","label":"Timeframe"},{"value":"outcome","label":"Outcome"}]'),
  ('milestones', 'Milestones', 'table', false, 19, 'Roadmap', '[{"value":"date","label":"Date","type":"date"},{"value":"milestone","label":"Milestone"}]'),
  ('dependencies', 'Dependencies', 'multi_line', false, 20, 'Roadmap', NULL),
  ('estimated_investment', 'Estimated Investment', 'currency', false, 21, 'Investment & Governance', NULL),
  ('funding_sources', 'Funding Sources', 'multi_line', false, 22, 'Investment & Governance', NULL),
  ('review_cadence', 'Review Cadence', 'dropdown', false, 23, 'Investment & Governance', '[{"value":"monthly","label":"Monthly"},{"value":"quarterly","label":"Quarterly"},{"value":"half_yearly","label":"Half-yearly"},{"value":"annually","label":"Annually"}]'),
  ('kpis', 'KPIs', 'multi_line', false, 24, 'Investment & Governance', NULL),
  ('risks_mitigations', 'Risks and mitigations', 'table', false, 25, 'Risks & Roles', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and responsibilities', 'table', false, 26, 'Risks & Roles', '[{"value":"role","label":"Role"},{"value":"name","label":"Name"}]'),
  ('glossary', 'Glossary of Terms', 'table', false, 27, 'Glossary & Appendices', '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]'),
  ('appendices', 'Appendices', 'table', false, 28, 'Glossary & Appendices', '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]'),
  ('version_history', 'Version History', 'table', false, 29, 'Document Control', '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]'),
  ('related_documents', 'Related Documents', 'multi_line', false, 30, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_technology_roadmap'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_runbooks: 25 fields, Details + 7 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('service_system', 'Service / System', 'text', true, 4, NULL, NULL),
  ('runbook_owner', 'Runbook Owner', 'user_picker', false, 5, NULL, NULL),
  ('runbook_type', 'Runbook Type', 'dropdown', false, 6, NULL, '[{"value":"operational","label":"Operational"},{"value":"incident_response","label":"Incident response"},{"value":"deployment","label":"Deployment"},{"value":"maintenance","label":"Maintenance"},{"value":"recovery","label":"Recovery"},{"value":"scheduled_job","label":"Scheduled job"}]'),
  ('runbook_purpose', 'Purpose', 'long_text', false, 7, 'Overview', NULL),
  ('trigger_conditions', 'Trigger Conditions', 'multi_line', false, 8, 'Overview', NULL),
  ('prerequisites', 'Prerequisites', 'multi_line', false, 9, 'Overview', NULL),
  ('access_required', 'Access Required', 'multi_line', false, 10, 'Overview', NULL),
  ('steps', 'Steps (Seq – Step – Expected Result)', 'multi_line', false, 11, 'Procedure', NULL),
  ('estimated_duration', 'Estimated Duration (minutes)', 'number', false, 12, 'Procedure', NULL),
  ('verification_checks', 'Verification Checks', 'multi_line', false, 13, 'Verification & Escalation', NULL),
  ('rollback_steps', 'Rollback Steps', 'multi_line', false, 14, 'Verification & Escalation', NULL),
  ('escalation_contacts', 'Escalation Contacts', 'multi_line', false, 15, 'Verification & Escalation', NULL),
  ('known_issues', 'Known Issues', 'multi_line', false, 16, 'Verification & Escalation', NULL),
  ('last_tested', 'Last Tested', 'date', false, 17, 'Maintenance', NULL),
  ('review_frequency', 'Review Frequency', 'dropdown', false, 18, 'Maintenance', '[{"value":"monthly","label":"Monthly"},{"value":"quarterly","label":"Quarterly"},{"value":"half_yearly","label":"Half-yearly"},{"value":"annually","label":"Annually"}]'),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 19, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 20, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 21, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 22, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 23, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 24, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_runbooks'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── ict_architecture_decisions: 25 fields, Details + 8 tabs ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT lr.id, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM public.local_registers lr
CROSS JOIN (VALUES
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 3, NULL, NULL),
  ('decision_owner', 'Decision Owner', 'user_picker', false, 4, NULL, NULL),
  ('decision_date', 'Decision Date', 'date', false, 5, NULL, NULL),
  ('decision_area', 'Decision Area', 'dropdown', false, 6, NULL, '[{"value":"application","label":"Application"},{"value":"data","label":"Data"},{"value":"integration","label":"Integration"},{"value":"infrastructure","label":"Infrastructure"},{"value":"security","label":"Security"},{"value":"platform","label":"Platform"},{"value":"process","label":"Process"}]'),
  ('decision_context', 'Context', 'long_text', false, 7, 'Context', NULL),
  ('problem_statement', 'Problem Statement', 'long_text', false, 8, 'Context', NULL),
  ('decision_drivers', 'Decision Drivers', 'multi_line', false, 9, 'Context', NULL),
  ('decision_constraints', 'Constraints', 'multi_line', false, 10, 'Context', NULL),
  ('options_considered', 'Options Considered (Option – Pros – Cons)', 'multi_line', false, 11, 'Options', NULL),
  ('decision_outcome', 'Decision', 'long_text', false, 12, 'Decision', NULL),
  ('rationale', 'Rationale', 'long_text', false, 13, 'Decision', NULL),
  ('positive_consequences', 'Positive Consequences', 'multi_line', false, 14, 'Consequences', NULL),
  ('negative_consequences', 'Negative Consequences', 'multi_line', false, 15, 'Consequences', NULL),
  ('follow_up_actions', 'Follow-up Actions', 'multi_line', false, 16, 'Consequences', NULL),
  ('related_decisions', 'Related Decisions', 'multi_line', false, 17, 'Related', NULL),
  ('supersedes', 'Supersedes', 'text', false, 18, 'Related', NULL),
  ('risks_mitigations', 'Risks – Mitigations', 'multi_line', false, 19, 'Risks & Roles', NULL),
  ('roles_and_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 20, 'Risks & Roles', NULL),
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 21, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 22, 'Glossary & Appendices', NULL),
  ('version_history', 'Version History (Version – Date – Author – Change)', 'multi_line', false, 23, 'Document Control', NULL),
  ('related_documents', 'Related Documents', 'multi_line', false, 24, 'Document Control', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE lr.register_key = 'ict_architecture_decisions'
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

DO $$
DECLARE
  r RECORD;
  v_count INT;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('ict_enterprise_architecture', 31),
    ('ict_solution_architecture', 33),
    ('ict_application_architecture', 28),
    ('ict_data_architecture', 32),
    ('ict_integration_architecture', 29),
    ('ict_security_architecture', 31),
    ('ict_functional_design', 32),
    ('ict_technical_design', 34),
    ('ict_integration_design', 26),
    ('ict_data_design', 29),
    ('ict_ux_ui_design', 31),
    ('ict_disaster_recovery', 37),
    ('ict_support_model', 34),
    ('ict_technology_roadmap', 31),
    ('ict_runbooks', 25),
    ('ict_architecture_decisions', 25)
  ) AS t(register_key, expected) LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.local_register_fields f
    JOIN public.local_registers lr ON lr.id = f.register_id
    WHERE lr.register_key = r.register_key AND lr.is_system_defined = TRUE;
    RAISE NOTICE 'v1324: % has % fields (expected %)', r.register_key, v_count, r.expected;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
