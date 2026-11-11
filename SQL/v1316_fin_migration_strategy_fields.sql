-- ============================================================================
-- v1316: Data Migration › Migration Strategy — full, system-agnostic document form
-- ============================================================================
-- Owner request 2026-10-23: enrich the Migration Strategy register
-- (fin_migration_strategy, 00000000-0000-4000-9001-00000000000c) from a data-migration strategy
-- document outline (executive summary, glossary, migration rules, data takeover, accounting
-- fundamentals, pre/post-migration tasks, reconciliation, risks, data standards, roles,
-- environments, appendices), with logical tabs, multi-value lists, (searchable) dropdowns,
-- multi-selects, Yes/No fields and Notes.
--
-- Flexibility first (owner, same day): the form must not depend on any particular banking or core
-- system — it works for any software migration (core banking, ERP, CRM, HR/payroll, billing,
-- healthcare records, telecoms, …). So:
--   * system-specific content is captured as free lists (data objects/entities, services/channels
--     and interfaces impacted, source systems) rather than fixed product options;
--   * multi-selects are used only for universal choices (data categories, migration stages,
--     reconciliation levels, parties, environments);
--   * financial/accounting and regulatory items are optional and generic;
--   * no vendor, product or module names (rule 26).
--
--   1. Engine: new 'long_text' (Notes / narrative) field type for local registers (public + sim).
--   2. Status workflow: Draft → In Review → Approved → Superseded (document lifecycle).
--   3. 58 fields on 14 tabs + Details (field_group).
-- No records exist yet for this register. Prerequisites: v1297, v1299, v1304. Idempotent.
-- ============================================================================

-- ── 1. 'long_text' field type ───────────────────────────────────────────────────────
ALTER TABLE public.local_register_fields DROP CONSTRAINT IF EXISTS chk_local_register_fields_field_type;
ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency'));

ALTER TABLE sim.local_register_fields DROP CONSTRAINT IF EXISTS chk_sim_local_register_fields_field_type;
ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency'));

-- ── 2. Document lifecycle statuses ──────────────────────────────────────────────────
UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000000c'::uuid;

-- ── 3. Fields ───────────────────────────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, v.is_required,
       v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('document_reference', 'Document Reference', 'text', false, 0, NULL, NULL),
  ('document_version', 'Document Version', 'text', false, 1, NULL, NULL),
  ('document_owner', 'Document Owner', 'user_picker', true, 2, NULL, NULL),
  ('system_category', 'System Category', 'dropdown', false, 3, NULL,
    '[{"value":"core_banking","label":"Core banking"},{"value":"erp","label":"ERP / finance"},{"value":"crm","label":"CRM / customer engagement"},{"value":"hr_payroll","label":"HR and payroll"},{"value":"billing","label":"Billing and revenue"},{"value":"insurance","label":"Insurance policy administration"},{"value":"health_records","label":"Health / patient records"},{"value":"telecom_bss","label":"Telecoms business support (BSS/OSS)"},{"value":"supply_chain","label":"Supply chain / inventory"},{"value":"ecommerce","label":"E-commerce / point of sale"},{"value":"document_management","label":"Document / content management"},{"value":"data_platform","label":"Data warehouse / analytics platform"},{"value":"custom_application","label":"Custom / in-house application"},{"value":"other","label":"Other"}]'),
  ('migration_type', 'Migration Type', 'dropdown', false, 4, NULL,
    '[{"value":"replacement","label":"System replacement"},{"value":"upgrade","label":"Version upgrade"},{"value":"consolidation","label":"Consolidation / merger"},{"value":"cloud_move","label":"Move to cloud"},{"value":"decommission","label":"Decommissioning / archiving"},{"value":"other","label":"Other"}]'),
  ('migration_approach', 'Migration Approach', 'dropdown', true, 5, NULL,
    '[{"value":"big_bang","label":"Big bang (single cutover)"},{"value":"phased","label":"Phased (by module, product or business unit)"},{"value":"parallel_run","label":"Parallel run"},{"value":"incremental","label":"Incremental (trickle)"}]'),
  ('target_system', 'Target System', 'text', false, 6, NULL, NULL),
  ('target_go_live_date', 'Target Go-Live Date', 'date', false, 7, NULL, NULL),
  ('next_review_date', 'Next Review Date', 'date', false, 8, NULL, NULL),

  -- Executive Summary
  ('introduction', 'Introduction', 'long_text', false, 9, 'Executive Summary', NULL),
  ('purpose', 'Purpose', 'long_text', false, 10, 'Executive Summary', NULL),
  ('migration_objectives', 'Migration Objectives', 'multi_line', false, 11, 'Executive Summary', NULL),

  -- Scope
  ('in_scope', 'In Scope', 'multi_line', false, 12, 'Scope', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', false, 13, 'Scope', NULL),

  -- Assumptions & Constraints
  ('assumptions', 'Assumptions', 'multi_line', false, 14, 'Assumptions & Constraints', NULL),
  ('constraints', 'Constraints', 'multi_line', false, 15, 'Assumptions & Constraints', NULL),

  -- Migration Approach (data migration rules)
  ('approach_description', 'Migration Approach Description', 'long_text', false, 16, 'Migration Approach', NULL),
  ('migration_stages', 'Stages in Data Transition', 'multi_select', false, 17, 'Migration Approach',
    '[{"value":"extract","label":"Extract"},{"value":"profile","label":"Profile and assess"},{"value":"cleanse","label":"Cleanse"},{"value":"transform_map","label":"Transform and map"},{"value":"load","label":"Load"},{"value":"validate","label":"Validate"},{"value":"reconcile","label":"Reconcile"},{"value":"sign_off","label":"Business sign-off"}]'),
  ('configuration_dependencies', 'Target System Configuration Dependencies', 'long_text', false, 18, 'Migration Approach', NULL),
  ('system_readiness_checks', 'System Readiness Checks', 'multi_line', false, 19, 'Migration Approach', NULL),

  -- Cutover & Services
  ('migration_window_start', 'Migration Window Start', 'date', false, 20, 'Cutover & Services', NULL),
  ('migration_window_end', 'Migration Window End', 'date', false, 21, 'Cutover & Services', NULL),
  ('planned_downtime_hours', 'Planned Downtime (hours)', 'number', false, 22, 'Cutover & Services', NULL),
  ('services_impacted', 'Services, Channels and Interfaces Impacted', 'multi_line', false, 23, 'Cutover & Services', NULL),
  ('user_communication_required', 'User / Customer Communication Required', 'boolean', false, 24, 'Cutover & Services', NULL),
  ('rollback_approach', 'Rollback / Fallback Approach', 'long_text', false, 25, 'Cutover & Services', NULL),

  -- Data Takeover
  ('data_categories', 'Data Categories in Scope', 'multi_select', false, 26, 'Data Takeover',
    '[{"value":"master","label":"Master data (e.g. customers, suppliers, employees, products)"},{"value":"transactional","label":"Transactional / open items"},{"value":"reference","label":"Reference and static data"},{"value":"balances","label":"Balances and financial positions"},{"value":"historical","label":"Historical / archive data"},{"value":"documents","label":"Documents, images and attachments"},{"value":"users_security","label":"Users, roles and security"},{"value":"configuration","label":"Configuration and parameters"},{"value":"audit_logs","label":"Audit trails and logs"}]'),
  ('data_objects', 'Data Objects / Entities to Migrate', 'multi_line', false, 27, 'Data Takeover', NULL),
  ('source_systems', 'Source Systems', 'multi_line', false, 28, 'Data Takeover', NULL),
  ('migration_tool', 'Migration / ETL Tool', 'text', false, 29, 'Data Takeover', NULL),
  ('estimated_record_volume', 'Estimated Record Volume', 'number', false, 30, 'Data Takeover', NULL),
  ('estimated_data_volume_gb', 'Estimated Data Volume (GB)', 'number', false, 31, 'Data Takeover', NULL),
  ('mock_runs_planned', 'Mock Migrations Planned', 'number', false, 32, 'Data Takeover', NULL),
  ('dress_rehearsals_planned', 'Dress Rehearsals Planned', 'number', false, 33, 'Data Takeover', NULL),

  -- Data Quality
  ('data_integrity_rules', 'Data Integrity Rules', 'multi_line', false, 34, 'Data Quality', NULL),
  ('data_cleansing_approach', 'Data Cleansing Approach', 'long_text', false, 35, 'Data Quality', NULL),
  ('data_standards', 'Data Standards for Migration', 'multi_line', false, 36, 'Data Quality', NULL),
  ('data_quality_target', 'Data Quality Target (%)', 'number', false, 37, 'Data Quality', NULL),
  ('data_owner_signoff_required', 'Data Owner Sign-Off Required', 'boolean', false, 38, 'Data Quality', NULL),

  -- Financial Impact & Reconciliation (optional; applies when financial data moves)
  ('financial_impact', 'Financial / Accounting Impact (if any)', 'long_text', false, 39, 'Financial Impact & Reconciliation', NULL),
  ('regulatory_reporting_impacted', 'Regulatory or Statutory Reporting Impacted', 'boolean', false, 40, 'Financial Impact & Reconciliation', NULL),
  ('holding_account_reference', 'Holding / Suspense Account (if applicable)', 'text', false, 41, 'Financial Impact & Reconciliation', NULL),
  ('reconciliation_approach', 'Reconciliation Approach', 'long_text', false, 42, 'Financial Impact & Reconciliation', NULL),
  ('reconciliation_levels', 'Reconciliation Levels', 'multi_select', false, 43, 'Financial Impact & Reconciliation',
    '[{"value":"record_counts","label":"Record counts"},{"value":"value_totals","label":"Value / balance totals"},{"value":"ledger_level","label":"Financial ledger level"},{"value":"entity_level","label":"Per data object / entity"},{"value":"sample_checks","label":"Sample-based field checks"},{"value":"business_validation","label":"Business user validation"}]'),
  ('reconciliation_tolerance', 'Reconciliation Tolerance', 'currency', false, 44, 'Financial Impact & Reconciliation', NULL),

  -- Pre & Post Migration
  ('pre_migration_tasks', 'Pre-Migration Tasks', 'multi_line', false, 45, 'Pre & Post Migration', NULL),
  ('post_migration_tasks', 'Post-Migration Tasks', 'multi_line', false, 46, 'Pre & Post Migration', NULL),

  -- Risks
  ('overall_risk_rating', 'Overall Migration Risk', 'dropdown', false, 47, 'Risks',
    '[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"},{"value":"critical","label":"Critical"}]'),
  ('risks_mitigations', 'Risks, Challenges and Mitigations (Risk – Mitigation)', 'multi_line', false, 48, 'Risks', NULL),

  -- Roles & Environments
  ('parties_involved', 'Parties to the Migration', 'multi_select', false, 49, 'Roles & Environments',
    '[{"value":"business_units","label":"Business units"},{"value":"it","label":"IT"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"internal_audit","label":"Internal audit"},{"value":"target_vendor","label":"Target system vendor"},{"value":"source_vendor","label":"Source system vendor"},{"value":"migration_partner","label":"Migration partner"},{"value":"external_audit","label":"External auditor"}]'),
  ('roles_responsibilities', 'Roles & Responsibilities (Role – Responsibility – Name)', 'multi_line', false, 50, 'Roles & Environments', NULL),
  ('environments', 'Environments Used', 'multi_select', false, 51, 'Roles & Environments',
    '[{"value":"development","label":"Development"},{"value":"sit","label":"System integration test"},{"value":"uat","label":"User acceptance test"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery"}]'),
  ('environment_management', 'Environment Management', 'long_text', false, 52, 'Roles & Environments', NULL),

  -- Sign-Off
  ('approvals', 'Approvals (Name – Role – Date)', 'multi_line', false, 53, 'Sign-Off', NULL),
  ('version_history', 'Version History (Version – Date – Change)', 'multi_line', false, 54, 'Sign-Off', NULL),

  -- Glossary & Appendices
  ('glossary', 'Glossary of Terms (Term – Definition)', 'multi_line', false, 55, 'Glossary & Appendices', NULL),
  ('appendices', 'Appendices (Title – Reference / Link)', 'multi_line', false, 56, 'Glossary & Appendices', NULL),

  -- Notes
  ('notes', 'Notes', 'multi_line', false, 57, 'Notes', NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000c'::uuid)
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
  v_fields INT;
  v_tabs   INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT field_group) INTO v_fields, v_tabs
  FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid;
  RAISE NOTICE 'v1316: Migration Strategy has % fields on % extra tabs (expected 58 / 14)', v_fields, v_tabs;
END $$;

NOTIFY pgrst, 'reload schema';
