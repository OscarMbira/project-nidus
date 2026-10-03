-- =============================================================================
-- v933: Local Register Engine — the 28 system-defined register definitions
-- =============================================================================
-- See projectprd/v931_industry_capability_modules_PRD.md section h and
-- projectplan/v931_local_register_engine_plan.md Phase 5. Fixed hex UUIDs (rule 18.2) so this
-- file is idempotent (ON CONFLICT (id) DO NOTHING) and so SQL/v934's menu-item seed can
-- reference the same ids without a lookup.
--
-- "Financial Services" below is the real industry_categories.name (v907) — the PRD/brief refer
-- to this industry colloquially as "Banking" (brief section 10's own title), the DB row itself
-- is named "Financial Services".
--
-- Prerequisites: v931_local_register_engine_schema.sql, v932_local_registers_system_scope_fix.sql,
-- v906 (industry_categories), v920/v921 (industry_packs)
-- =============================================================================

-- ── 1. Register definitions (id, key, label, description, scope, workflow) ─────

INSERT INTO public.local_registers (id, register_key, label, description, scope_level, is_system_defined, status_workflow)
VALUES
  -- Shared cross-industry registers
  ('00000000-0000-4000-8000-000000000001'::uuid, 'readiness_checklist', 'Readiness Checklist',
   'Go-live/readiness checklist items — used by Banking (was Operational Readiness), IT & Software (was Production Readiness), and Education (was Facility/Campus Readiness).',
   'project', true, '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"verified","label":"Verified"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'data_migration', 'Data Migration',
   'Data migration wave/object tracking — used by Financial Services (was Data Migration) and Education (was Student Information System Migration).',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"extracted","label":"Extracted"},{"key":"transformed","label":"Transformed"},{"key":"loaded","label":"Loaded"},{"key":"reconciled","label":"Reconciled"},{"key":"signed_off","label":"Signed Off"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'commissioning', 'Commissioning',
   'Commissioning/energisation tracking — used by Manufacturing & Operations (was Production Line Commissioning) and Energy & Utilities (was Commissioning & Energisation).',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"tested","label":"Tested"},{"key":"commissioned","label":"Commissioned"},{"key":"failed","label":"Failed"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'permits', 'Permits',
   'Regulatory permit tracking — used by Construction & Engineering and Energy & Utilities.',
   'project', true, '[{"key":"not_applied","label":"Not Applied"},{"key":"applied","label":"Applied"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"},{"key":"expired","label":"Expired"},{"key":"rejected","label":"Rejected"}]'::jsonb),

  -- Financial Services ("Banking")
  ('00000000-0000-4000-8000-000000000005'::uuid, 'core_banking', 'Core Banking',
   'Core banking system configuration items being implemented/migrated.',
   'project', true, '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"configured","label":"Configured"},{"key":"tested","label":"Tested"},{"key":"signed_off","label":"Signed Off"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'product_configuration', 'Product Configuration',
   'Banking product setups (account types, loan products) being configured.',
   'project', true, '[{"key":"draft","label":"Draft"},{"key":"in_configuration","label":"In Configuration"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"live","label":"Live"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'parameterisation', 'Parameterisation',
   'System parameter sets (fees, rates, limits, rules) being defined.',
   'project', true, '[{"key":"draft","label":"Draft"},{"key":"pending_approval","label":"Pending Approval"},{"key":"approved","label":"Approved"},{"key":"applied","label":"Applied"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'cutover', 'Cutover',
   'Cutover run-sheet tasks for the go-live weekend/window.',
   'project', true, '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"failed","label":"Failed / Rolled Back"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'go_live', 'Go-Live',
   'Go-live decision gate criteria and sign-offs.',
   'project', true, '[{"key":"pending","label":"Pending"},{"key":"met","label":"Met"},{"key":"waived","label":"Waived"},{"key":"not_met","label":"Not Met"}]'::jsonb),

  -- Construction & Engineering
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'sites', 'Sites',
   'Physical construction sites/locations under the project.',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"},{"key":"suspended","label":"Suspended"},{"key":"complete","label":"Complete"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'materials', 'Materials',
   'Material procurement/delivery/usage tracking.',
   'project', true, '[{"key":"ordered","label":"Ordered"},{"key":"partially_delivered","label":"Partially Delivered"},{"key":"delivered","label":"Delivered"},{"key":"in_use","label":"In Use"},{"key":"depleted","label":"Depleted"}]'::jsonb),

  -- IT & Software
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'releases', 'Releases',
   'Software release packages/versions.',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"in_development","label":"In Development"},{"key":"in_testing","label":"In Testing"},{"key":"ready","label":"Ready"},{"key":"released","label":"Released"},{"key":"rolled_back","label":"Rolled Back"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'deployments', 'Deployments',
   'Individual deployment events — a release can have multiple deployments across environments.',
   'project', true, '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"success","label":"Success"},{"key":"failed","label":"Failed"},{"key":"rolled_back","label":"Rolled Back"}]'::jsonb),

  -- Healthcare & Life Sciences
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'clinical_trials', 'Clinical Trials / Studies',
   'Individual clinical trial/study records.',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"recruiting","label":"Recruiting"},{"key":"active","label":"Active"},{"key":"closed","label":"Closed"},{"key":"completed","label":"Completed"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'regulatory_submissions', 'Regulatory Submissions',
   'Regulatory body submissions (FDA/EMA/etc.).',
   'project', true, '[{"key":"preparing","label":"Preparing"},{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"},{"key":"rejected","label":"Rejected"},{"key":"withdrawn","label":"Withdrawn"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'patient_safety_events', 'Patient Safety Events',
   'Adverse events/safety incidents.',
   'project', true, '[{"key":"reported","label":"Reported"},{"key":"under_investigation","label":"Under Investigation"},{"key":"assessed","label":"Assessed"},{"key":"closed","label":"Closed"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'clinical_site_activation', 'Clinical Site Activation',
   'Activation status of individual trial sites.',
   'project', true, '[{"key":"identified","label":"Identified"},{"key":"contracted","label":"Contracted"},{"key":"irb_pending","label":"IRB Pending"},{"key":"irb_approved","label":"IRB Approved"},{"key":"activated","label":"Activated"},{"key":"closed","label":"Closed"}]'::jsonb),

  -- Manufacturing & Operations
  ('00000000-0000-4000-8000-000000000012'::uuid, 'bill_of_materials', 'Bill of Materials',
   'BOM line items for a manufacturing project.',
   'project', true, '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"},{"key":"sourced","label":"Sourced"},{"key":"obsolete","label":"Obsolete"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'equipment_asset_qualification', 'Equipment/Asset Qualification',
   'IQ/OQ/PQ-style equipment qualification records.',
   'project', true, '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"},{"key":"requalification_due","label":"Requalification Due"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'process_validation', 'Process Validation',
   'Process validation runs/protocols.',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'safety_incidents', 'Safety Incidents',
   'Workplace safety incidents — kept as its own register given regulatory incident-report requirements distinct from the generic Risk Register.',
   'project', true, '[{"key":"reported","label":"Reported"},{"key":"under_investigation","label":"Under Investigation"},{"key":"corrective_action_assigned","label":"Corrective Action Assigned"},{"key":"closed","label":"Closed"}]'::jsonb),

  -- Government & Public Sector
  ('00000000-0000-4000-8000-000000000016'::uuid, 'foi_requests', 'Freedom of Information Requests',
   'Public records/FOI requests related to the project.',
   'project', true, '[{"key":"received","label":"Received"},{"key":"under_review","label":"Under Review"},{"key":"response_drafted","label":"Response Drafted"},{"key":"responded","label":"Responded"},{"key":"closed","label":"Closed"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'policy_legislative_milestones', 'Policy/Legislative Milestones',
   'Policy or legislative milestones the project depends on/delivers.',
   'project', true, '[{"key":"upcoming","label":"Upcoming"},{"key":"in_progress","label":"In Progress"},{"key":"achieved","label":"Achieved"},{"key":"delayed","label":"Delayed"},{"key":"missed","label":"Missed"}]'::jsonb),

  -- Marketing & Creative
  ('00000000-0000-4000-8000-000000000018'::uuid, 'media_placements', 'Media Placements / Channel Scheduling',
   'Media buy/placement bookings across channels.',
   'project', true, '[{"key":"proposed","label":"Proposed"},{"key":"booked","label":"Booked"},{"key":"live","label":"Live"},{"key":"completed","label":"Completed"},{"key":"cancelled","label":"Cancelled"}]'::jsonb),

  -- Energy & Utilities
  ('00000000-0000-4000-8000-000000000019'::uuid, 'asset_infrastructure_register', 'Asset/Infrastructure Register',
   'Physical energy/utility assets under the project (pipelines, substations, meters, etc.).',
   'project', true, '[{"key":"planned","label":"Planned"},{"key":"installed","label":"Installed"},{"key":"operational","label":"Operational"},{"key":"decommissioned","label":"Decommissioned"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'outage_management', 'Outage Management',
   'Planned/unplanned outages.',
   'project', true, '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"restored","label":"Restored"},{"key":"closed","label":"Closed"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'environmental_impact_assessments', 'Environmental Impact Assessments',
   'EIA studies/approvals for the project.',
   'project', true, '[{"key":"scoping","label":"Scoping"},{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"},{"key":"conditional_approval","label":"Conditional Approval"},{"key":"rejected","label":"Rejected"}]'::jsonb),

  -- Education
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'curriculum_development', 'Curriculum Development / Rollout',
   'Curriculum development/rollout items.',
   'project', true, '[{"key":"planning","label":"Planning"},{"key":"in_development","label":"In Development"},{"key":"piloting","label":"Piloting"},{"key":"approved","label":"Approved"},{"key":"rolled_out","label":"Rolled Out"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Industry pack links (many-to-many — some registers serve more than one industry) ────

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT v.register_id::uuid, ip.id
FROM (VALUES
  ('00000000-0000-4000-8000-000000000001', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000001', 'IT & Software'),
  ('00000000-0000-4000-8000-000000000001', 'Education'),
  ('00000000-0000-4000-8000-000000000002', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000002', 'Education'),
  ('00000000-0000-4000-8000-000000000003', 'Manufacturing & Operations'),
  ('00000000-0000-4000-8000-000000000003', 'Energy & Utilities'),
  ('00000000-0000-4000-8000-000000000004', 'Construction & Engineering'),
  ('00000000-0000-4000-8000-000000000004', 'Energy & Utilities'),
  ('00000000-0000-4000-8000-000000000005', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000006', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000007', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000008', 'Financial Services'),
  ('00000000-0000-4000-8000-000000000009', 'Financial Services'),
  ('00000000-0000-4000-8000-00000000000a', 'Construction & Engineering'),
  ('00000000-0000-4000-8000-00000000000b', 'Construction & Engineering'),
  ('00000000-0000-4000-8000-00000000000c', 'IT & Software'),
  ('00000000-0000-4000-8000-00000000000d', 'IT & Software'),
  ('00000000-0000-4000-8000-00000000000e', 'Healthcare & Life Sciences'),
  ('00000000-0000-4000-8000-00000000000f', 'Healthcare & Life Sciences'),
  ('00000000-0000-4000-8000-000000000010', 'Healthcare & Life Sciences'),
  ('00000000-0000-4000-8000-000000000011', 'Healthcare & Life Sciences'),
  ('00000000-0000-4000-8000-000000000012', 'Manufacturing & Operations'),
  ('00000000-0000-4000-8000-000000000013', 'Manufacturing & Operations'),
  ('00000000-0000-4000-8000-000000000014', 'Manufacturing & Operations'),
  ('00000000-0000-4000-8000-000000000015', 'Manufacturing & Operations'),
  ('00000000-0000-4000-8000-000000000016', 'Government & Public Sector'),
  ('00000000-0000-4000-8000-000000000017', 'Government & Public Sector'),
  ('00000000-0000-4000-8000-000000000018', 'Marketing & Creative'),
  ('00000000-0000-4000-8000-000000000019', 'Energy & Utilities'),
  ('00000000-0000-4000-8000-00000000001a', 'Energy & Utilities'),
  ('00000000-0000-4000-8000-00000000001b', 'Energy & Utilities'),
  ('00000000-0000-4000-8000-00000000001c', 'Education')
) AS v(register_id, industry_name)
JOIN public.industry_categories ic ON ic.name = v.industry_name
JOIN public.industry_packs ip ON ip.industry_category_id = ic.id AND ip.is_active = TRUE
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 3. Field definitions ────────────────────────────────────────────────────────

INSERT INTO public.local_register_fields (register_id, field_key, field_label, field_type, is_required, display_order, dropdown_options)
VALUES
  -- Readiness Checklist
  ('00000000-0000-4000-8000-000000000001'::uuid, 'readiness_area', 'Readiness Area', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'responsible_team', 'Responsible Team', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'target_date', 'Target Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'evidence_link', 'Evidence Link', 'text', false, 3, NULL),

  -- Data Migration
  ('00000000-0000-4000-8000-000000000002'::uuid, 'data_object', 'Data Object', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'source_system', 'Source System', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'target_system', 'Target System', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'migration_wave', 'Migration Wave', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'record_count_estimate', 'Record Count Estimate', 'number', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'reconciliation_status', 'Reconciliation Status', 'text', false, 5, NULL),

  -- Commissioning
  ('00000000-0000-4000-8000-000000000003'::uuid, 'asset_or_line_name', 'Asset/Line Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'responsible_engineer', 'Responsible Engineer', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'planned_date', 'Planned Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'actual_date', 'Actual Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'test_result', 'Test Result', 'text', false, 4, NULL),

  -- Permits
  ('00000000-0000-4000-8000-000000000004'::uuid, 'permit_type', 'Permit Type', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'permit_number', 'Permit Number', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'issuing_authority', 'Issuing Authority', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'application_date', 'Application Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'approval_date', 'Approval Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'expiry_date', 'Expiry Date', 'date', false, 5, NULL),

  -- Core Banking
  ('00000000-0000-4000-8000-000000000005'::uuid, 'module_name', 'Module Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'configuration_area', 'Configuration Area', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'target_go_live_date', 'Target Go-Live Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'complexity', 'Complexity', 'dropdown', false, 3, '[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'completion_pct', 'Completion %', 'number', false, 4, NULL),

  -- Product Configuration
  ('00000000-0000-4000-8000-000000000006'::uuid, 'product_name', 'Product Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'product_type', 'Product Type', 'dropdown', false, 1, '[{"value":"deposit","label":"Deposit"},{"value":"loan","label":"Loan"},{"value":"card","label":"Card"},{"value":"investment","label":"Investment"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'configuration_owner', 'Configuration Owner', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'target_date', 'Target Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'validation_status', 'Validation Status', 'text', false, 4, NULL),

  -- Parameterisation
  ('00000000-0000-4000-8000-000000000007'::uuid, 'parameter_group', 'Parameter Group', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'parameter_name', 'Parameter Name', 'text', true, 1, NULL),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'current_value', 'Current Value', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'proposed_value', 'Proposed Value', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'effective_date', 'Effective Date', 'date', false, 4, NULL),

  -- Cutover
  ('00000000-0000-4000-8000-000000000008'::uuid, 'task_sequence', 'Task Sequence', 'number', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'responsible_team', 'Responsible Team', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'planned_start', 'Planned Start', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'planned_end', 'Planned End', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'actual_start', 'Actual Start', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'actual_end', 'Actual End', 'date', false, 5, NULL),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'rollback_trigger', 'Rollback Trigger', 'text', false, 6, NULL),

  -- Go-Live
  ('00000000-0000-4000-8000-000000000009'::uuid, 'criterion_name', 'Criterion Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'criterion_owner', 'Criterion Owner', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'evidence', 'Evidence', 'text', false, 2, NULL),

  -- Sites
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'site_name', 'Site Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'site_address', 'Site Address', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'site_manager', 'Site Manager', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'start_date', 'Start Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'planned_completion_date', 'Planned Completion Date', 'date', false, 4, NULL),

  -- Materials
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'material_name', 'Material Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'quantity_ordered', 'Quantity Ordered', 'number', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'quantity_delivered', 'Quantity Delivered', 'number', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'quantity_used', 'Quantity Used', 'number', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'supplier', 'Supplier', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'delivery_date', 'Delivery Date', 'date', false, 5, NULL),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'unit_cost', 'Unit Cost', 'currency', false, 6, NULL),

  -- Releases
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'release_version', 'Release Version', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'release_type', 'Release Type', 'dropdown', false, 1, '[{"value":"major","label":"Major"},{"value":"minor","label":"Minor"},{"value":"patch","label":"Patch"},{"value":"hotfix","label":"Hotfix"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'target_date', 'Target Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'scope_summary', 'Scope Summary', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'release_manager', 'Release Manager', 'text', false, 4, NULL),

  -- Deployments
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'linked_release', 'Linked Release', 'text', false, 0, NULL),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'target_environment', 'Target Environment', 'text', true, 1, NULL),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'deployment_date', 'Deployment Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'deployed_by', 'Deployed By', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'deployment_method', 'Deployment Method', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'rollback_plan_link', 'Rollback Plan Link', 'text', false, 5, NULL),

  -- Clinical Trials/Studies
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'study_name', 'Study Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'study_phase', 'Study Phase', 'dropdown', false, 1, '[{"value":"i","label":"Phase I"},{"value":"ii","label":"Phase II"},{"value":"iii","label":"Phase III"},{"value":"iv","label":"Phase IV"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'sponsor', 'Sponsor', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'principal_investigator', 'Principal Investigator', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'target_enrollment', 'Target Enrollment', 'number', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'actual_enrollment', 'Actual Enrollment', 'number', false, 5, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'study_start_date', 'Study Start Date', 'date', false, 6, NULL),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'study_end_date', 'Study End Date', 'date', false, 7, NULL),

  -- Regulatory Submissions
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'submission_type', 'Submission Type', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'regulatory_body', 'Regulatory Body', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'submission_date', 'Submission Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'decision_date', 'Decision Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'decision_outcome', 'Decision Outcome', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'reference_number', 'Reference Number', 'text', false, 5, NULL),

  -- Patient Safety Events
  ('00000000-0000-4000-8000-000000000010'::uuid, 'event_type', 'Event Type', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'severity', 'Severity', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'date_occurred', 'Date Occurred', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'date_reported', 'Date Reported', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'reporter', 'Reporter', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'causality_assessment', 'Causality Assessment', 'text', false, 5, NULL),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'outcome', 'Outcome', 'text', false, 6, NULL),

  -- Clinical Site Activation
  ('00000000-0000-4000-8000-000000000011'::uuid, 'site_name', 'Site Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'site_country', 'Site Country', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'activation_milestone_date', 'Activation Milestone Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'irb_approval_status', 'IRB Approval Status', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'staff_trained', 'Staff Trained', 'boolean', false, 4, NULL),

  -- Bill of Materials
  ('00000000-0000-4000-8000-000000000012'::uuid, 'component_name', 'Component Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'component_code', 'Component Code', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'quantity_required', 'Quantity Required', 'number', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'unit_of_measure', 'Unit of Measure', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'supplier', 'Supplier', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'unit_cost', 'Unit Cost', 'currency', false, 5, NULL),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'lead_time_days', 'Lead Time (Days)', 'number', false, 6, NULL),

  -- Equipment/Asset Qualification
  ('00000000-0000-4000-8000-000000000013'::uuid, 'asset_name', 'Asset Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'asset_tag', 'Asset Tag', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'qualification_type', 'Qualification Type', 'dropdown', false, 2, '[{"value":"iq","label":"IQ"},{"value":"oq","label":"OQ"},{"value":"pq","label":"PQ"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'qualified_by', 'Qualified By', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'qualification_date', 'Qualification Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000013'::uuid, 'next_requalification_date', 'Next Requalification Date', 'date', false, 5, NULL),

  -- Process Validation
  ('00000000-0000-4000-8000-000000000014'::uuid, 'process_name', 'Process Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'validation_protocol_ref', 'Validation Protocol Ref', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'run_number', 'Run Number', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'validated_by', 'Validated By', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'validation_date', 'Validation Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000014'::uuid, 'result', 'Result', 'text', false, 5, NULL),

  -- Safety Incidents
  ('00000000-0000-4000-8000-000000000015'::uuid, 'incident_type', 'Incident Type', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'severity', 'Severity', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'date_occurred', 'Date Occurred', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'location', 'Location', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'injured_party', 'Injured Party', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'reported_by', 'Reported By', 'text', false, 5, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'corrective_action', 'Corrective Action', 'text', false, 6, NULL),
  ('00000000-0000-4000-8000-000000000015'::uuid, 'regulatory_notification_required', 'Regulatory Notification Required', 'boolean', false, 7, NULL),

  -- Freedom of Information Requests
  ('00000000-0000-4000-8000-000000000016'::uuid, 'requester_name', 'Requester Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'request_date', 'Request Date', 'date', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'request_summary', 'Request Summary', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'due_date', 'Due Date (Statutory)', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'response_date', 'Response Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000016'::uuid, 'outcome', 'Outcome', 'dropdown', false, 5, '[{"value":"granted","label":"Granted"},{"value":"partial","label":"Partial"},{"value":"denied","label":"Denied"},{"value":"redirected","label":"Redirected"}]'::jsonb),

  -- Policy/Legislative Milestones
  ('00000000-0000-4000-8000-000000000017'::uuid, 'milestone_name', 'Milestone Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'related_legislation', 'Related Legislation', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'target_date', 'Target Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'actual_date', 'Actual Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'dependency_notes', 'Dependency Notes', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000017'::uuid, 'responsible_body', 'Responsible Body', 'text', false, 5, NULL),

  -- Media Placements/Channel Scheduling
  ('00000000-0000-4000-8000-000000000018'::uuid, 'channel', 'Channel', 'dropdown', true, 0, '[{"value":"tv","label":"TV"},{"value":"digital","label":"Digital"},{"value":"print","label":"Print"},{"value":"ooh","label":"OOH"},{"value":"social","label":"Social"}]'::jsonb),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'placement_name', 'Placement Name', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'booking_date', 'Booking Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'flight_start_date', 'Flight Start Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'flight_end_date', 'Flight End Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'budget', 'Budget', 'currency', false, 5, NULL),
  ('00000000-0000-4000-8000-000000000018'::uuid, 'actual_spend', 'Actual Spend', 'currency', false, 6, NULL),

  -- Asset/Infrastructure Register
  ('00000000-0000-4000-8000-000000000019'::uuid, 'asset_name', 'Asset Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'asset_type', 'Asset Type', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'asset_location', 'Asset Location', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'install_date', 'Install Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'condition_rating', 'Condition Rating', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-000000000019'::uuid, 'next_inspection_date', 'Next Inspection Date', 'date', false, 5, NULL),

  -- Outage Management
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'outage_type', 'Outage Type', 'dropdown', true, 0, '[{"value":"planned","label":"Planned"},{"value":"unplanned","label":"Unplanned"}]'::jsonb),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'affected_area', 'Affected Area', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'start_time', 'Start Time', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'end_time', 'End Time', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'customers_affected_estimate', 'Customers Affected (Estimate)', 'number', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000001a'::uuid, 'cause', 'Cause', 'text', false, 5, NULL),

  -- Environmental Impact Assessments
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'assessment_scope', 'Assessment Scope', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'assessing_body', 'Assessing Body', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'submission_date', 'Submission Date', 'date', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'decision_date', 'Decision Date', 'date', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'outcome', 'Outcome', 'text', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000001b'::uuid, 'mitigation_measures', 'Mitigation Measures', 'text', false, 5, NULL),

  -- Curriculum Development/Rollout
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'curriculum_name', 'Curriculum Name', 'text', true, 0, NULL),
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'subject_area', 'Subject Area', 'text', false, 1, NULL),
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'target_grade_level', 'Target Grade Level', 'text', false, 2, NULL),
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'development_stage', 'Development Stage', 'text', false, 3, NULL),
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'rollout_date', 'Rollout Date', 'date', false, 4, NULL),
  ('00000000-0000-4000-8000-00000000001c'::uuid, 'responsible_lead', 'Responsible Lead', 'text', false, 5, NULL)
ON CONFLICT (register_id, field_key) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'v933_local_registers_system_seed.sql applied successfully — 28 system-defined registers seeded';
END $$;
