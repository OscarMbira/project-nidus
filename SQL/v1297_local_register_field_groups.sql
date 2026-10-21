-- ============================================================================
-- v1297: Local Register field groups (form/detail tabs) + Banking Transformation grouping
-- ============================================================================
-- Long register forms (e.g. the six Banking Transformation registers seeded with full field
-- sets in v1296) were one long scrolling column. This adds an optional field_group label to
-- local_register_fields: the generic LocalRegisterForm / LocalRegisterDetailPage render one tab
-- per distinct group (in display_order of each group's first field), after a fixed "Details"
-- tab holding Title / Description / Status plus every field with no group. Registers whose
-- fields have no groups render exactly as before (single Details tab + Audit details).
--
-- Column added to both public and sim (engine parity, rule 34.1). Only Platform has the FIN
-- registers, so the grouping UPDATEs below are public-only.
-- Prerequisites: v931 / v938 (engine schemas), v1296 (Banking Transformation fields).
-- Idempotent: ADD COLUMN IF NOT EXISTS; UPDATEs simply re-assign the same values.
-- ============================================================================

ALTER TABLE public.local_register_fields ADD COLUMN IF NOT EXISTS field_group VARCHAR(80);
ALTER TABLE sim.local_register_fields ADD COLUMN IF NOT EXISTS field_group VARCHAR(80);

COMMENT ON COLUMN public.local_register_fields.field_group IS
  'v1297: optional tab label for this field on the register form/detail page. NULL = the Details tab.';
COMMENT ON COLUMN sim.local_register_fields.field_group IS
  'v1297: optional tab label for this field on the register form/detail page. NULL = the Details tab.';

-- ── Banking Transformation registers (fixed v947 UUIDs, 9001 block) ─────────────────
-- Fields not listed stay NULL and therefore sit on the Details tab.

UPDATE public.local_register_fields f
SET field_group = v.field_group, updated_at = NOW()
FROM (VALUES
  -- Transformation Overview — Details: transformation_type, strategic_objectives
  ('00000000-0000-4000-9001-000000000001', 'executive_sponsor', 'Governance'),
  ('00000000-0000-4000-9001-000000000001', 'programme_director', 'Governance'),
  ('00000000-0000-4000-9001-000000000001', 'governance_forum', 'Governance'),
  ('00000000-0000-4000-9001-000000000001', 'business_case_reference', 'Governance'),
  ('00000000-0000-4000-9001-000000000001', 'start_date', 'Timeline & Finance'),
  ('00000000-0000-4000-9001-000000000001', 'target_completion_date', 'Timeline & Finance'),
  ('00000000-0000-4000-9001-000000000001', 'approved_budget', 'Timeline & Finance'),
  ('00000000-0000-4000-9001-000000000001', 'expected_annual_benefit', 'Timeline & Finance'),
  ('00000000-0000-4000-9001-000000000001', 'in_scope', 'Scope & Dependencies'),
  ('00000000-0000-4000-9001-000000000001', 'out_of_scope', 'Scope & Dependencies'),
  ('00000000-0000-4000-9001-000000000001', 'regulatory_drivers', 'Scope & Dependencies'),
  ('00000000-0000-4000-9001-000000000001', 'key_dependencies', 'Scope & Dependencies'),
  ('00000000-0000-4000-9001-000000000001', 'risk_appetite', 'Health & Review'),
  ('00000000-0000-4000-9001-000000000001', 'overall_rag', 'Health & Review'),
  ('00000000-0000-4000-9001-000000000001', 'last_review_date', 'Health & Review'),
  ('00000000-0000-4000-9001-000000000001', 'next_review_date', 'Health & Review'),

  -- Transformation Roadmap — Details: roadmap_phase, release_wave, workstream, owner
  ('00000000-0000-4000-9001-000000000002', 'planned_start_date', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'planned_end_date', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'forecast_end_date', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'on_critical_path', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'percent_complete', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'rag_status', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'baseline_version', 'Schedule & Progress'),
  ('00000000-0000-4000-9001-000000000002', 'capability_delivered', 'Deliverables'),
  ('00000000-0000-4000-9001-000000000002', 'key_deliverables', 'Deliverables'),
  ('00000000-0000-4000-9001-000000000002', 'dependencies', 'Deliverables'),

  -- Business Units — Details: business_unit_code, business_line, unit_head, change_champion
  ('00000000-0000-4000-9001-000000000003', 'impact_level', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'primary_change_type', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'products_services_impacted', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'staff_impacted', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'locations_impacted', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'customers_impacted', 'Change Impact'),
  ('00000000-0000-4000-9001-000000000003', 'training_required', 'Readiness'),
  ('00000000-0000-4000-9001-000000000003', 'go_live_wave', 'Readiness'),
  ('00000000-0000-4000-9001-000000000003', 'readiness_rag', 'Readiness'),

  -- Workstreams — Details: workstream_code, workstream_type, workstream_lead, business_owner
  ('00000000-0000-4000-9001-000000000004', 'objectives', 'Scope & Risks'),
  ('00000000-0000-4000-9001-000000000004', 'key_deliverables', 'Scope & Risks'),
  ('00000000-0000-4000-9001-000000000004', 'dependencies', 'Scope & Risks'),
  ('00000000-0000-4000-9001-000000000004', 'key_risks_issues', 'Scope & Risks'),
  ('00000000-0000-4000-9001-000000000004', 'planned_start_date', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'planned_end_date', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'forecast_end_date', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'team_size', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'budget', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'actual_spend', 'Schedule & Budget'),
  ('00000000-0000-4000-9001-000000000004', 'percent_complete', 'Progress'),
  ('00000000-0000-4000-9001-000000000004', 'rag_status', 'Progress'),
  ('00000000-0000-4000-9001-000000000004', 'last_status_update', 'Progress'),

  -- Regulatory Milestones — Details: regulator, regulation_reference, milestone_type, requirement_summary
  ('00000000-0000-4000-9001-000000000005', 'due_date', 'Deadline & Accountability'),
  ('00000000-0000-4000-9001-000000000005', 'accountable_owner', 'Deadline & Accountability'),
  ('00000000-0000-4000-9001-000000000005', 'compliance_officer', 'Deadline & Accountability'),
  ('00000000-0000-4000-9001-000000000005', 'impact_if_missed', 'Deadline & Accountability'),
  ('00000000-0000-4000-9001-000000000005', 'penalty_exposure', 'Deadline & Accountability'),
  ('00000000-0000-4000-9001-000000000005', 'submission_date', 'Submission & Approval'),
  ('00000000-0000-4000-9001-000000000005', 'submission_reference', 'Submission & Approval'),
  ('00000000-0000-4000-9001-000000000005', 'approval_date', 'Submission & Approval'),
  ('00000000-0000-4000-9001-000000000005', 'evidence_location', 'Submission & Approval'),
  ('00000000-0000-4000-9001-000000000005', 'regulator_feedback', 'Submission & Approval'),
  ('00000000-0000-4000-9001-000000000005', 'rag_status', 'Submission & Approval'),

  -- Transformation Readiness — Details: readiness_dimension, business_unit, go_live_wave, assessment_date, assessor
  ('00000000-0000-4000-9001-000000000006', 'criteria_met', 'Assessment'),
  ('00000000-0000-4000-9001-000000000006', 'criteria_total', 'Assessment'),
  ('00000000-0000-4000-9001-000000000006', 'readiness_score', 'Assessment'),
  ('00000000-0000-4000-9001-000000000006', 'target_score', 'Assessment'),
  ('00000000-0000-4000-9001-000000000006', 'rag_status', 'Assessment'),
  ('00000000-0000-4000-9001-000000000006', 'key_gaps', 'Remediation'),
  ('00000000-0000-4000-9001-000000000006', 'remediation_actions', 'Remediation'),
  ('00000000-0000-4000-9001-000000000006', 'remediation_owner', 'Remediation'),
  ('00000000-0000-4000-9001-000000000006', 'remediation_due_date', 'Remediation'),
  ('00000000-0000-4000-9001-000000000006', 'go_no_go_recommendation', 'Go-Live Decision'),
  ('00000000-0000-4000-9001-000000000006', 'sign_off_obtained', 'Go-Live Decision'),
  ('00000000-0000-4000-9001-000000000006', 'signed_off_by', 'Go-Live Decision'),
  ('00000000-0000-4000-9001-000000000006', 'sign_off_date', 'Go-Live Decision')
) AS v(register_id, field_key, field_group)
WHERE f.register_id = v.register_id::uuid
  AND f.field_key = v.field_key;

DO $$
DECLARE
  v_grouped INT;
BEGIN
  SELECT COUNT(*) INTO v_grouped
  FROM public.local_register_fields
  WHERE register_id::text BETWEEN '00000000-0000-4000-9001-000000000001' AND '00000000-0000-4000-9001-000000000006'
    AND field_group IS NOT NULL;
  RAISE NOTICE 'v1297: % Banking Transformation fields assigned to tabs (expected 72)', v_grouped;
END $$;

-- Make the new column visible to the API (PostgREST) immediately.
NOTIFY pgrst, 'reload schema';
