-- ============================================================================
-- v1296: Banking Transformation registers — full field definitions
-- ============================================================================
-- v947 created the six "Banking Transformation" local registers (FIN industry pack) with no
-- local_register_fields rows, so their create/edit form only showed the engine's built-in
-- Title / Description / Status. This seeds complete, best-practice field sets for each one.
-- The generic LocalRegisterForm renders them automatically (ordered by display_order) — no UI
-- change is needed to show them.
--
-- Registers covered (fixed v947 UUIDs, 9001 block):
--   ...001 fin_transformation_overview   Transformation Overview
--   ...002 fin_transformation_roadmap    Transformation Roadmap
--   ...003 fin_business_units            Business Units
--   ...004 fin_workstreams               Workstreams
--   ...005 fin_regulatory_milestones     Regulatory Milestones
--   ...006 fin_transformation_readiness  Transformation Readiness
--
-- Conventions:
--   * Title / Description / Status are built into every record — not repeated here.
--   * Only the few fields needed to make a record meaningful are required (rule 62: quick capture).
--   * People fields use 'user_picker' so they upgrade automatically when the engine's real user
--     picker lands (today it is plain text entry).
--   * Regulator names vary by jurisdiction, so Regulator is free text, not a fixed list.
--
-- Platform only: the Simulator's sim.local_registers has no FIN registers (v938 seeds none).
-- Prerequisites: v931 (engine schema), v947 (FIN registers).
-- Idempotent: ON CONFLICT (register_id, field_key) DO UPDATE — re-running converges definitions
-- and never touches existing records' field_values.
-- ============================================================================

INSERT INTO public.local_register_fields (register_id, field_key, field_label, field_type, is_required, display_order, dropdown_options)
SELECT v.register_id::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.dropdown_options::jsonb
FROM (VALUES
  -- ── Transformation Overview (programme charter summary) ──────────────────────
  ('00000000-0000-4000-9001-000000000001', 'transformation_type', 'Transformation Type', 'dropdown', true, 0,
    '[{"value":"core_banking_replacement","label":"Core Banking Replacement"},{"value":"digital_transformation","label":"Digital Transformation"},{"value":"regulatory_remediation","label":"Regulatory Remediation"},{"value":"operating_model_change","label":"Operating Model Change"},{"value":"merger_integration","label":"Merger / Integration"},{"value":"cost_optimisation","label":"Cost Optimisation"},{"value":"other","label":"Other"}]'),
  ('00000000-0000-4000-9001-000000000001', 'strategic_objectives', 'Strategic Objectives', 'text', true, 1, NULL),
  ('00000000-0000-4000-9001-000000000001', 'executive_sponsor', 'Executive Sponsor', 'user_picker', true, 2, NULL),
  ('00000000-0000-4000-9001-000000000001', 'programme_director', 'Programme Director', 'user_picker', false, 3, NULL),
  ('00000000-0000-4000-9001-000000000001', 'governance_forum', 'Governance Forum', 'text', false, 4, NULL),
  ('00000000-0000-4000-9001-000000000001', 'business_case_reference', 'Business Case Reference', 'text', false, 5, NULL),
  ('00000000-0000-4000-9001-000000000001', 'start_date', 'Start Date', 'date', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000001', 'target_completion_date', 'Target Completion Date', 'date', false, 7, NULL),
  ('00000000-0000-4000-9001-000000000001', 'approved_budget', 'Approved Budget', 'currency', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000001', 'expected_annual_benefit', 'Expected Annual Benefit', 'currency', false, 9, NULL),
  ('00000000-0000-4000-9001-000000000001', 'in_scope', 'In Scope', 'text', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000001', 'out_of_scope', 'Out of Scope', 'text', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000001', 'regulatory_drivers', 'Regulatory Drivers', 'text', false, 12, NULL),
  ('00000000-0000-4000-9001-000000000001', 'key_dependencies', 'Key Dependencies', 'text', false, 13, NULL),
  ('00000000-0000-4000-9001-000000000001', 'risk_appetite', 'Risk Appetite', 'dropdown', false, 14,
    '[{"value":"low","label":"Low"},{"value":"moderate","label":"Moderate"},{"value":"high","label":"High"}]'),
  ('00000000-0000-4000-9001-000000000001', 'overall_rag', 'Overall RAG Status', 'dropdown', false, 15,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('00000000-0000-4000-9001-000000000001', 'last_review_date', 'Last Review Date', 'date', false, 16, NULL),
  ('00000000-0000-4000-9001-000000000001', 'next_review_date', 'Next Review Date', 'date', false, 17, NULL),

  -- ── Transformation Roadmap (one row per roadmap item / phase) ────────────────
  ('00000000-0000-4000-9001-000000000002', 'roadmap_phase', 'Roadmap Phase', 'dropdown', true, 0,
    '[{"value":"mobilise","label":"Mobilise"},{"value":"design","label":"Design"},{"value":"build","label":"Build"},{"value":"test","label":"Test"},{"value":"deploy","label":"Deploy"},{"value":"hypercare","label":"Hypercare"},{"value":"close","label":"Close"}]'),
  ('00000000-0000-4000-9001-000000000002', 'release_wave', 'Release / Wave', 'text', false, 1, NULL),
  ('00000000-0000-4000-9001-000000000002', 'workstream', 'Workstream', 'text', false, 2, NULL),
  ('00000000-0000-4000-9001-000000000002', 'owner', 'Owner', 'user_picker', true, 3, NULL),
  ('00000000-0000-4000-9001-000000000002', 'planned_start_date', 'Planned Start Date', 'date', true, 4, NULL),
  ('00000000-0000-4000-9001-000000000002', 'planned_end_date', 'Planned End Date', 'date', true, 5, NULL),
  ('00000000-0000-4000-9001-000000000002', 'forecast_end_date', 'Forecast End Date', 'date', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000002', 'capability_delivered', 'Business Capability Delivered', 'text', false, 7, NULL),
  ('00000000-0000-4000-9001-000000000002', 'key_deliverables', 'Key Deliverables', 'text', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000002', 'dependencies', 'Dependencies', 'text', false, 9, NULL),
  ('00000000-0000-4000-9001-000000000002', 'on_critical_path', 'On Critical Path', 'boolean', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000002', 'percent_complete', 'Percent Complete (%)', 'number', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000002', 'rag_status', 'RAG Status', 'dropdown', false, 12,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('00000000-0000-4000-9001-000000000002', 'baseline_version', 'Baseline Version', 'text', false, 13, NULL),

  -- ── Business Units (units in scope and their change impact) ──────────────────
  ('00000000-0000-4000-9001-000000000003', 'business_unit_code', 'Business Unit Code', 'text', false, 0, NULL),
  ('00000000-0000-4000-9001-000000000003', 'business_line', 'Business Line', 'dropdown', true, 1,
    '[{"value":"retail_banking","label":"Retail Banking"},{"value":"corporate_commercial","label":"Corporate & Commercial Banking"},{"value":"private_wealth","label":"Private Banking & Wealth"},{"value":"treasury_markets","label":"Treasury & Markets"},{"value":"operations","label":"Operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk & Compliance"},{"value":"technology","label":"Technology"},{"value":"human_resources","label":"Human Resources"},{"value":"other","label":"Other"}]'),
  ('00000000-0000-4000-9001-000000000003', 'unit_head', 'Business Unit Head', 'user_picker', true, 2, NULL),
  ('00000000-0000-4000-9001-000000000003', 'change_champion', 'Change Champion', 'user_picker', false, 3, NULL),
  ('00000000-0000-4000-9001-000000000003', 'impact_level', 'Impact Level', 'dropdown', true, 4,
    '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('00000000-0000-4000-9001-000000000003', 'primary_change_type', 'Primary Change Type', 'dropdown', false, 5,
    '[{"value":"process","label":"Process"},{"value":"system","label":"System"},{"value":"organisation","label":"Organisation / Roles"},{"value":"product","label":"Product"},{"value":"location","label":"Location"}]'),
  ('00000000-0000-4000-9001-000000000003', 'products_services_impacted', 'Products / Services Impacted', 'text', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000003', 'staff_impacted', 'Staff Impacted (headcount)', 'number', false, 7, NULL),
  ('00000000-0000-4000-9001-000000000003', 'locations_impacted', 'Branches / Locations Impacted', 'number', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000003', 'customers_impacted', 'Customers Impacted', 'number', false, 9, NULL),
  ('00000000-0000-4000-9001-000000000003', 'training_required', 'Training Required', 'boolean', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000003', 'go_live_wave', 'Go-Live Wave', 'text', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000003', 'readiness_rag', 'Readiness RAG', 'dropdown', false, 12,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),

  -- ── Workstreams ──────────────────────────────────────────────────────────────
  ('00000000-0000-4000-9001-000000000004', 'workstream_code', 'Workstream Code', 'text', false, 0, NULL),
  ('00000000-0000-4000-9001-000000000004', 'workstream_type', 'Workstream Type', 'dropdown', true, 1,
    '[{"value":"business","label":"Business"},{"value":"technology","label":"Technology"},{"value":"data","label":"Data"},{"value":"testing","label":"Testing"},{"value":"change_training","label":"Change & Training"},{"value":"regulatory","label":"Regulatory"},{"value":"infrastructure","label":"Infrastructure"},{"value":"pmo","label":"PMO"}]'),
  ('00000000-0000-4000-9001-000000000004', 'workstream_lead', 'Workstream Lead', 'user_picker', true, 2, NULL),
  ('00000000-0000-4000-9001-000000000004', 'business_owner', 'Business Owner', 'user_picker', false, 3, NULL),
  ('00000000-0000-4000-9001-000000000004', 'objectives', 'Objectives', 'text', false, 4, NULL),
  ('00000000-0000-4000-9001-000000000004', 'key_deliverables', 'Key Deliverables', 'text', false, 5, NULL),
  ('00000000-0000-4000-9001-000000000004', 'planned_start_date', 'Planned Start Date', 'date', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000004', 'planned_end_date', 'Planned End Date', 'date', false, 7, NULL),
  ('00000000-0000-4000-9001-000000000004', 'forecast_end_date', 'Forecast End Date', 'date', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000004', 'team_size', 'Team Size', 'number', false, 9, NULL),
  ('00000000-0000-4000-9001-000000000004', 'budget', 'Budget', 'currency', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000004', 'actual_spend', 'Actual Spend to Date', 'currency', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000004', 'percent_complete', 'Percent Complete (%)', 'number', false, 12, NULL),
  ('00000000-0000-4000-9001-000000000004', 'rag_status', 'RAG Status', 'dropdown', false, 13,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('00000000-0000-4000-9001-000000000004', 'dependencies', 'Dependencies', 'text', false, 14, NULL),
  ('00000000-0000-4000-9001-000000000004', 'key_risks_issues', 'Key Risks / Issues', 'text', false, 15, NULL),
  ('00000000-0000-4000-9001-000000000004', 'last_status_update', 'Last Status Update', 'date', false, 16, NULL),

  -- ── Regulatory Milestones ────────────────────────────────────────────────────
  ('00000000-0000-4000-9001-000000000005', 'regulator', 'Regulator', 'text', true, 0, NULL),
  ('00000000-0000-4000-9001-000000000005', 'regulation_reference', 'Regulation / Requirement Reference', 'text', false, 1, NULL),
  ('00000000-0000-4000-9001-000000000005', 'milestone_type', 'Milestone Type', 'dropdown', true, 2,
    '[{"value":"notification","label":"Notification"},{"value":"submission","label":"Submission"},{"value":"approval_licence","label":"Approval / Licence"},{"value":"inspection_audit","label":"Inspection / Audit"},{"value":"attestation","label":"Attestation"},{"value":"reporting_deadline","label":"Reporting Deadline"},{"value":"compliance_effective_date","label":"Compliance Effective Date"}]'),
  ('00000000-0000-4000-9001-000000000005', 'requirement_summary', 'Requirement Summary', 'text', false, 3, NULL),
  ('00000000-0000-4000-9001-000000000005', 'due_date', 'Due Date', 'date', true, 4, NULL),
  ('00000000-0000-4000-9001-000000000005', 'accountable_owner', 'Accountable Owner', 'user_picker', true, 5, NULL),
  ('00000000-0000-4000-9001-000000000005', 'compliance_officer', 'Compliance Officer', 'user_picker', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000005', 'impact_if_missed', 'Impact if Missed', 'dropdown', false, 7,
    '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('00000000-0000-4000-9001-000000000005', 'penalty_exposure', 'Potential Penalty Exposure', 'currency', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000005', 'submission_date', 'Submission Date', 'date', false, 9, NULL),
  ('00000000-0000-4000-9001-000000000005', 'submission_reference', 'Submission Reference', 'text', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000005', 'approval_date', 'Regulator Approval Date', 'date', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000005', 'evidence_location', 'Evidence Location', 'text', false, 12, NULL),
  ('00000000-0000-4000-9001-000000000005', 'regulator_feedback', 'Regulator Feedback', 'text', false, 13, NULL),
  ('00000000-0000-4000-9001-000000000005', 'rag_status', 'RAG Status', 'dropdown', false, 14,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),

  -- ── Transformation Readiness (one row per readiness assessment) ──────────────
  ('00000000-0000-4000-9001-000000000006', 'readiness_dimension', 'Readiness Dimension', 'dropdown', true, 0,
    '[{"value":"people","label":"People"},{"value":"process","label":"Process"},{"value":"technology","label":"Technology"},{"value":"data","label":"Data"},{"value":"customer","label":"Customer"},{"value":"regulatory_compliance","label":"Regulatory & Compliance"},{"value":"operations","label":"Operations"},{"value":"third_parties","label":"Third Parties"}]'),
  ('00000000-0000-4000-9001-000000000006', 'business_unit', 'Business Unit', 'text', false, 1, NULL),
  ('00000000-0000-4000-9001-000000000006', 'go_live_wave', 'Go-Live Wave', 'text', false, 2, NULL),
  ('00000000-0000-4000-9001-000000000006', 'assessment_date', 'Assessment Date', 'date', true, 3, NULL),
  ('00000000-0000-4000-9001-000000000006', 'assessor', 'Assessor', 'user_picker', true, 4, NULL),
  ('00000000-0000-4000-9001-000000000006', 'criteria_met', 'Readiness Criteria Met', 'number', false, 5, NULL),
  ('00000000-0000-4000-9001-000000000006', 'criteria_total', 'Readiness Criteria Total', 'number', false, 6, NULL),
  ('00000000-0000-4000-9001-000000000006', 'readiness_score', 'Readiness Score (%)', 'number', false, 7, NULL),
  ('00000000-0000-4000-9001-000000000006', 'target_score', 'Target Score (%)', 'number', false, 8, NULL),
  ('00000000-0000-4000-9001-000000000006', 'rag_status', 'RAG Status', 'dropdown', false, 9,
    '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]'),
  ('00000000-0000-4000-9001-000000000006', 'key_gaps', 'Key Gaps', 'text', false, 10, NULL),
  ('00000000-0000-4000-9001-000000000006', 'remediation_actions', 'Remediation Actions', 'text', false, 11, NULL),
  ('00000000-0000-4000-9001-000000000006', 'remediation_owner', 'Remediation Owner', 'user_picker', false, 12, NULL),
  ('00000000-0000-4000-9001-000000000006', 'remediation_due_date', 'Remediation Due Date', 'date', false, 13, NULL),
  ('00000000-0000-4000-9001-000000000006', 'go_no_go_recommendation', 'Go / No-Go Recommendation', 'dropdown', false, 14,
    '[{"value":"go","label":"Go"},{"value":"go_with_conditions","label":"Go with Conditions"},{"value":"no_go","label":"No-Go"}]'),
  ('00000000-0000-4000-9001-000000000006', 'sign_off_obtained', 'Sign-Off Obtained', 'boolean', false, 15, NULL),
  ('00000000-0000-4000-9001-000000000006', 'signed_off_by', 'Signed Off By', 'user_picker', false, 16, NULL),
  ('00000000-0000-4000-9001-000000000006', 'sign_off_date', 'Sign-Off Date', 'date', false, 17, NULL)
) AS v(register_id, field_key, field_label, field_type, is_required, display_order, dropdown_options)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

DO $$
DECLARE
  v_fields INT;
BEGIN
  SELECT COUNT(*) INTO v_fields
  FROM public.local_register_fields
  WHERE register_id::text BETWEEN '00000000-0000-4000-9001-000000000001' AND '00000000-0000-4000-9001-000000000006';
  RAISE NOTICE 'v1296: Banking Transformation registers now have % field definitions (expected 95)', v_fields;
END $$;
