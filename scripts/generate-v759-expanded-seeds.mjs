/**
 * Generates SQL/v759_form_template_field_seeds_expanded.sql from v755 base schemas
 * plus per-template field expansions (PMBOK-aligned additions).
 *
 * Usage: node scripts/generate-v759-expanded-seeds.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const v755Path = path.join(root, 'SQL', 'v755_form_template_field_seeds.sql')
const outPath = path.join(root, 'SQL', 'v759_form_template_field_seeds_expanded.sql')

/** @type {Record<string, object[]>} */
const EXPANSIONS = {
  F001: [
    { key: 'assumptions', label: 'Assumptions', type: 'textarea' },
    { key: 'constraints', label: 'Constraints', type: 'textarea' },
    { key: 'business_case_summary', label: 'Business Case Summary', type: 'textarea' },
    { key: 'key_stakeholders', label: 'Key Stakeholder List', type: 'textarea' },
    { key: 'approval_signatures', label: 'Approval Signatures', type: 'textarea' },
    { key: 'project_summary', label: 'Project Summary', type: 'textarea' },
    { key: 'assigned_pm', label: 'Assigned Project Manager', type: 'text' },
    { key: 'charter_date', label: 'Charter Date', type: 'date' },
  ],
  F002: [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'open', label: 'Open' }, { value: 'validated', label: 'Validated' }, { value: 'invalid', label: 'Invalid' }] },
    { key: 'review_date', label: 'Review Date', type: 'date' },
    { key: 'mitigation', label: 'Mitigation / Response', type: 'textarea' },
    { key: 'linked_risk_id', label: 'Linked Risk ID', type: 'text' },
  ],
  F003: [
    { key: 'communication_preferences', label: 'Communication Preferences', type: 'textarea' },
    { key: 'engagement_level', label: 'Current Engagement Level', type: 'select', options: [{ value: 'unaware', label: 'Unaware' }, { value: 'neutral', label: 'Neutral' }, { value: 'supportive', label: 'Supportive' }, { value: 'leading', label: 'Leading' }] },
    { key: 'requirements_expectations', label: 'Requirements / Expectations', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  F004: [
    { key: 'communication_approach', label: 'Communication Approach', type: 'textarea' },
    { key: 'engagement_actions', label: 'Engagement Actions', type: 'textarea' },
    { key: 'responsible_person', label: 'Responsible Person', type: 'text' },
    { key: 'review_date', label: 'Review Date', type: 'date' },
  ],
  F005: [
    { key: 'resource_summary', label: 'Resource Management Approach', type: 'textarea' },
    { key: 'communication_summary', label: 'Communications Management Approach', type: 'textarea' },
    { key: 'risk_summary', label: 'Risk Management Approach', type: 'textarea' },
    { key: 'procurement_summary', label: 'Procurement Management Approach', type: 'textarea' },
    { key: 'stakeholder_summary', label: 'Stakeholder Management Approach', type: 'textarea' },
    { key: 'change_summary', label: 'Change Management Approach', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
  ],
  F006: [
    { key: 'change_log_reference', label: 'Change Log Reference', type: 'text' },
    { key: 'impact_assessment_process', label: 'Impact Assessment Process', type: 'textarea' },
    { key: 'communication_plan', label: 'Change Communication Plan', type: 'textarea' },
    { key: 'tools_systems', label: 'Tools / Systems', type: 'text' },
  ],
  F007: [
    { key: 'phase_owner', label: 'Phase Owner', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'planned', label: 'Planned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'complete', label: 'Complete' }] },
    { key: 'success_criteria', label: 'Success Criteria', type: 'textarea' },
    { key: 'risks', label: 'Key Risks', type: 'textarea' },
  ],
  F008: [
    { key: 'scope_change_process', label: 'Scope Change Process', type: 'textarea' },
    { key: 'acceptance_process', label: 'Acceptance Process', type: 'textarea' },
    { key: 'roles_responsibilities', label: 'Roles & Responsibilities', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
  ],
  F009: [
    { key: 'requirements_approval_process', label: 'Requirements Approval Process', type: 'textarea' },
    { key: 'baseline_process', label: 'Requirements Baseline Process', type: 'textarea' },
    { key: 'metrics', label: 'Requirements Metrics', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
  ],
  F010: [
    { key: 'source', label: 'Source', type: 'text' },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'proposed', label: 'Proposed' }, { value: 'approved', label: 'Approved' }, { value: 'implemented', label: 'Implemented' }, { value: 'verified', label: 'Verified' }] },
    { key: 'verification_method', label: 'Verification Method', type: 'textarea' },
  ],
  F011: [
    { key: 'design_element', label: 'Linked Design Element', type: 'text' },
    { key: 'test_status', label: 'Test Status', type: 'select', options: [{ value: 'not_started', label: 'Not Started' }, { value: 'passed', label: 'Passed' }, { value: 'failed', label: 'Failed' }] },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
  F012: [
    { key: 'impact_notes', label: 'Impact Notes', type: 'textarea' },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }] },
  ],
  F013: [
    { key: 'project_boundaries', label: 'Project Boundaries', type: 'textarea' },
    { key: 'scope_verification', label: 'Scope Verification Approach', type: 'textarea' },
    { key: 'change_control', label: 'Scope Change Control', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
  ],
  F014: [
    { key: 'deliverable', label: 'Deliverable', type: 'text' },
    { key: 'responsible_party', label: 'Responsible Party', type: 'text' },
    { key: 'estimated_cost', label: 'Estimated Cost', type: 'money' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  F015: [
    { key: 'milestones', label: 'Milestones', type: 'textarea' },
    { key: 'dependencies', label: 'Dependencies', type: 'textarea' },
    { key: 'resources_required', label: 'Resources Required', type: 'textarea' },
    { key: 'schedule_dates', label: 'Schedule Dates', type: 'textarea' },
  ],
  F016: [
    { key: 'level_of_detail', label: 'Level of Detail', type: 'text' },
    { key: 'units_of_measure', label: 'Units of Measure', type: 'text' },
    { key: 'reporting_requirements', label: 'Reporting Requirements', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
  ],
  F017: [
    { key: 'duration_estimate', label: 'Duration Estimate (days)', type: 'number' },
    { key: 'resource_assigned', label: 'Assigned Resource(s)', type: 'text' },
    {
      key: 'required_skills',
      label: 'Required Skill(s) (one per line)',
      type: 'textarea',
    },
    {
      key: 'minimum_proficiency',
      label: 'Minimum Proficiency',
      type: 'select',
      options: [
        { value: 'basic', label: 'Basic' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'expert', label: 'Expert' },
      ],
    },
    { key: 'activity_type', label: 'Activity Type', type: 'select', options: [{ value: 'task', label: 'Task' }, { value: 'milestone', label: 'Milestone' }, { value: 'summary', label: 'Summary' }] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'not_started', label: 'Not Started' }, { value: 'in_progress', label: 'In Progress' }, { value: 'complete', label: 'Complete' }] },
  ],
  F018: [
    { key: 'activity_type', label: 'Activity Type', type: 'text' },
    { key: 'duration', label: 'Duration (days)', type: 'number' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'assumptions', label: 'Assumptions', type: 'textarea' },
  ],
  F019: [
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'acceptance_criteria', label: 'Acceptance Criteria', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'planned', label: 'Planned' }, { value: 'achieved', label: 'Achieved' }, { value: 'missed', label: 'Missed' }] },
    { key: 'linked_deliverables', label: 'Linked Deliverables', type: 'textarea' },
  ],
  F020: [
    { key: 'successor', label: 'Successor(s)', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'critical_path', label: 'On Critical Path', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  ],
  F021: [
    { key: 'expected_duration', label: 'Expected Duration (days)', type: 'number' },
    { key: 'confidence_level', label: 'Confidence Level', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] },
    { key: 'estimator', label: 'Estimator', type: 'text' },
  ],
  F022: [
    { key: 'constraints', label: 'Constraints', type: 'textarea' },
    { key: 'reviewer', label: 'Reviewer', type: 'text' },
    { key: 'estimate_date', label: 'Estimate Date', type: 'date' },
  ],
  F023: [
    { key: 'percent_complete', label: 'Percent Complete', type: 'number' },
    { key: 'assigned_resources', label: 'Assigned Resources', type: 'text' },
    { key: 'baseline_start', label: 'Baseline Start', type: 'date' },
    { key: 'baseline_finish', label: 'Baseline Finish', type: 'date' },
  ],
  F024: [
    { key: 'funding_sources', label: 'Funding Sources', type: 'textarea' },
    { key: 'variance_thresholds', label: 'Variance Thresholds', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
    { key: 'review_cycle', label: 'Review Cycle', type: 'text' },
  ],
  F025: [
    { key: 'currency', label: 'Currency', type: 'text' },
    { key: 'confidence', label: 'Estimate Confidence', type: 'select', options: [{ value: 'rough', label: 'Rough Order of Magnitude' }, { value: 'budgetary', label: 'Budgetary' }, { value: 'definitive', label: 'Definitive' }] },
    { key: 'estimate_date', label: 'Estimate Date', type: 'date' },
    { key: 'estimator', label: 'Estimator', type: 'text' },
  ],
  F026: [
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'review_date', label: 'Review Date', type: 'date' },
    { key: 'approved_by', label: 'Approved By', type: 'text' },
  ],
  F027: [
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'contingency', label: 'Contingency', type: 'money' },
    { key: 'estimate_date', label: 'Estimate Date', type: 'date' },
  ],
  F028: [
    { key: 'funding_limit', label: 'Funding Limit', type: 'money' },
    { key: 'management_reserve', label: 'Management Reserve', type: 'money' },
    { key: 'approved_by', label: 'Approved By', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  F029: [
    { key: 'quality_roles', label: 'Quality Roles & Responsibilities', type: 'textarea' },
    { key: 'improvement_plan', label: 'Continuous Improvement Plan', type: 'textarea' },
    { key: 'document_owner', label: 'Document Owner', type: 'text' },
    { key: 'review_date', label: 'Review Date', type: 'date' },
  ],
  F030: [
    { key: 'actual_value', label: 'Actual Value', type: 'text' },
    { key: 'threshold', label: 'Control Threshold', type: 'text' },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'green', label: 'Green' }, { value: 'amber', label: 'Amber' }, { value: 'red', label: 'Red' }] },
  ],
}

// Default expansion for templates F031-F068 not explicitly listed above
const DEFAULT_EXPANSION = [
  { key: 'document_owner', label: 'Document Owner', type: 'text' },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'last_updated', label: 'Last Updated', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'in_review', label: 'In Review' }, { value: 'approved', label: 'Approved' }] },
]

// Fill F031-F068 with category-specific expansions
const CATEGORY_EXPANSIONS = {
  F031: [{ key: 'accountable', label: 'Accountable (A)', type: 'text' }, { key: 'consulted', label: 'Consulted (C)', type: 'text' }, { key: 'informed', label: 'Informed (I)', type: 'text' }, { key: 'notes', label: 'Notes', type: 'textarea' }],
  F032: [{ key: 'skills_required', label: 'Skills Required', type: 'textarea' }, { key: 'availability', label: 'Availability', type: 'text' }, { key: 'cost_rate', label: 'Cost Rate', type: 'money' }],
  F033: [{ key: 'acquisition_approach', label: 'Acquisition Approach', type: 'textarea' }, { key: 'contract_types', label: 'Contract Types', type: 'textarea' }, { key: 'document_owner', label: 'Document Owner', type: 'text' }],
  F034: [{ key: 'risk_id', label: 'Risk ID', type: 'text' }, { key: 'risk_owner', label: 'Risk Owner', type: 'text' }, { key: 'response_strategy', label: 'Response Strategy', type: 'textarea' }, { key: 'residual_risk', label: 'Residual Risk', type: 'textarea' }],
  F035: [{ key: 'probability', label: 'Probability', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }, { key: 'impact', label: 'Impact', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }, { key: 'risk_score', label: 'Risk Score', type: 'number' }],
  F036: [{ key: 'trigger_conditions', label: 'Trigger Conditions', type: 'textarea' }, { key: 'contingency_plan', label: 'Contingency Plan', type: 'textarea' }, { key: 'fallback_plan', label: 'Fallback Plan', type: 'textarea' }],
  F037: [{ key: 'stakeholder_groups', label: 'Stakeholder Groups', type: 'textarea' }, { key: 'information_needs', label: 'Information Needs', type: 'textarea' }, { key: 'document_owner', label: 'Document Owner', type: 'text' }],
  F038: [{ key: 'message_purpose', label: 'Message Purpose', type: 'textarea' }, { key: 'audience', label: 'Audience', type: 'text' }, { key: 'delivery_method', label: 'Delivery Method', type: 'text' }, { key: 'frequency', label: 'Frequency', type: 'text' }],
  F039: [{ key: 'sender', label: 'Sender', type: 'text' }, { key: 'approval_required', label: 'Approval Required', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] }, { key: 'distribution_list', label: 'Distribution List', type: 'textarea' }],
  F040: [{ key: 'procurement_strategy', label: 'Procurement Strategy', type: 'textarea' }, { key: 'make_or_buy', label: 'Make or Buy Decision', type: 'textarea' }, { key: 'document_owner', label: 'Document Owner', type: 'text' }],
  F041: [{ key: 'evaluation_criteria', label: 'Evaluation Criteria', type: 'textarea' }, { key: 'weighting', label: 'Weighting', type: 'text' }, { key: 'selection_method', label: 'Selection Method', type: 'text' }],
  F042: [{ key: 'vendor_name', label: 'Vendor Name', type: 'text' }, { key: 'contact_person', label: 'Contact Person', type: 'text' }, { key: 'qualification_status', label: 'Qualification Status', type: 'select', options: [{ value: 'qualified', label: 'Qualified' }, { value: 'not_qualified', label: 'Not Qualified' }] }],
  F043: [{ key: 'bid_amount', label: 'Bid Amount', type: 'money' }, { key: 'compliance_notes', label: 'Compliance Notes', type: 'textarea' }, { key: 'evaluation_score', label: 'Evaluation Score', type: 'number' }],
  F044: [{ key: 'contract_value', label: 'Contract Value', type: 'money' }, { key: 'start_date', label: 'Start Date', type: 'date' }, { key: 'end_date', label: 'End Date', type: 'date' }, { key: 'terms_summary', label: 'Terms Summary', type: 'textarea' }],
  F045: [{ key: 'performance_kpis', label: 'Performance KPIs', type: 'textarea' }, { key: 'review_period', label: 'Review Period', type: 'text' }, { key: 'action_required', label: 'Action Required', type: 'textarea' }],
  F046: [{ key: 'variance_explanation', label: 'Variance Explanation', type: 'textarea' }, { key: 'forecast_completion', label: 'Forecast at Completion', type: 'money' }, { key: 'reporting_period_end', label: 'Reporting Period End', type: 'date' }],
  F047: [{ key: 'issue_owner', label: 'Issue Owner', type: 'text' }, { key: 'resolution_target_date', label: 'Resolution Target Date', type: 'date' }, { key: 'escalation_level', label: 'Escalation Level', type: 'select', options: [{ value: 'project', label: 'Project' }, { value: 'programme', label: 'Programme' }, { value: 'portfolio', label: 'Portfolio' }] }],
  F048: [{ key: 'decision_maker', label: 'Decision Maker', type: 'text' }, { key: 'decision_date', label: 'Decision Date', type: 'date' }, { key: 'rationale', label: 'Rationale', type: 'textarea' }],
  F049: [{ key: 'change_requestor', label: 'Change Requestor', type: 'text' }, { key: 'impact_assessment', label: 'Impact Assessment', type: 'textarea' }, { key: 'ccb_decision', label: 'CCB Decision', type: 'select', options: [{ value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'deferred', label: 'Deferred' }] }],
  F050: [{ key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' }, { key: 'preventive_actions', label: 'Preventive Actions', type: 'textarea' }, { key: 'verification_date', label: 'Verification Date', type: 'date' }],
  F051: [{ key: 'inspection_date', label: 'Inspection Date', type: 'date' }, { key: 'inspector', label: 'Inspector', type: 'text' }, { key: 'nonconformance_details', label: 'Non-Conformance Details', type: 'textarea' }],
  F052: [{ key: 'audit_scope', label: 'Audit Scope', type: 'textarea' }, { key: 'audit_criteria', label: 'Audit Criteria', type: 'textarea' }, { key: 'follow_up_date', label: 'Follow-Up Date', type: 'date' }],
  F053: [{ key: 'team_member', label: 'Team Member', type: 'text' }, { key: 'hours_logged', label: 'Hours Logged', type: 'number' }, { key: 'work_description', label: 'Work Description', type: 'textarea' }],
  F054: [{ key: 'reporting_period', label: 'Reporting Period', type: 'date' }, { key: 'overall_rag', label: 'Overall RAG', type: 'select', options: [{ value: 'green', label: 'Green' }, { value: 'amber', label: 'Amber' }, { value: 'red', label: 'Red' }] }, { key: 'next_period_focus', label: 'Next Period Focus', type: 'textarea' }],
  F055: [{ key: 'forecast_completion_cost', label: 'Forecast at Completion', type: 'money' }, { key: 'variance_at_completion', label: 'Variance at Completion', type: 'money' }, { key: 'analysis_notes', label: 'Analysis Notes', type: 'textarea' }],
  F056: [{ key: 'schedule_variance', label: 'Schedule Variance (days)', type: 'number' }, { key: 'critical_path_status', label: 'Critical Path Status', type: 'textarea' }, { key: 'recovery_plan', label: 'Recovery Plan', type: 'textarea' }],
  F057: [{ key: 'cpi', label: 'Cost Performance Index (CPI)', type: 'number' }, { key: 'spi', label: 'Schedule Performance Index (SPI)', type: 'number' }, { key: 'eac', label: 'Estimate at Completion (EAC)', type: 'money' }, { key: 'etc', label: 'Estimate to Complete (ETC)', type: 'money' }],
  F058: [{ key: 'risk_register_reference', label: 'Risk Register Reference', type: 'text' }, { key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' }, { key: 'follow_up_date', label: 'Follow-Up Date', type: 'date' }],
  F059: [{ key: 'contract_reference', label: 'Contract Reference', type: 'text' }, { key: 'deliverables_status', label: 'Deliverables Status', type: 'textarea' }, { key: 'payment_status', label: 'Payment Status', type: 'select', options: [{ value: 'current', label: 'Current' }, { value: 'overdue', label: 'Overdue' }] }],
  F060: [{ key: 'auditor', label: 'Auditor', type: 'text' }, { key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' }, { key: 'follow_up_date', label: 'Follow-Up Date', type: 'date' }],
  F061: [{ key: 'lessons_learned', label: 'Lessons Learned', type: 'textarea' }, { key: 'final_acceptance_by', label: 'Final Acceptance By', type: 'text' }, { key: 'warranty_notes', label: 'Warranty Notes', type: 'textarea' }],
  F062: [{ key: 'waiver_details', label: 'Waiver Details', type: 'textarea' }, { key: 'rejection_reason', label: 'Rejection Reason', type: 'textarea' }, { key: 'follow_up_actions', label: 'Follow-Up Actions', type: 'textarea' }],
  F063: [{ key: 'category', label: 'Category', type: 'select', options: [{ value: 'technical', label: 'Technical' }, { value: 'process', label: 'Process' }, { value: 'people', label: 'People' }, { value: 'other', label: 'Other' }] }, { key: 'applicability', label: 'Applicability to Future Projects', type: 'textarea' }, { key: 'owner', label: 'Owner', type: 'text' }],
  F064: [{ key: 'archive_location', label: 'Archive Location', type: 'text' }, { key: 'final_report_reference', label: 'Final Report Reference', type: 'text' }, { key: 'stakeholder_notification', label: 'Stakeholder Notification', type: 'textarea' }],
  F065: [{ key: 'product_goals', label: 'Product Goals', type: 'textarea' }, { key: 'constraints', label: 'Constraints', type: 'textarea' }, { key: 'roadmap_link', label: 'Roadmap Link', type: 'text' }],
  F066: [{ key: 'acceptance_criteria', label: 'Acceptance Criteria', type: 'textarea' }, { key: 'sprint_target', label: 'Sprint Target', type: 'text' }, { key: 'dependencies', label: 'Dependencies', type: 'textarea' }],
  F067: [{ key: 'release_owner', label: 'Release Owner', type: 'text' }, { key: 'risks', label: 'Release Risks', type: 'textarea' }, { key: 'readiness_criteria', label: 'Readiness Criteria', type: 'textarea' }],
  F068: [{ key: 'facilitator', label: 'Facilitator', type: 'text' }, { key: 'participants', label: 'Participants', type: 'textarea' }, { key: 'retrospective_date', label: 'Retrospective Date', type: 'date' }, { key: 'follow_up_owner', label: 'Follow-Up Owner', type: 'text' }],
}

Object.assign(EXPANSIONS, CATEGORY_EXPANSIONS)

function parseSchemasFromV755(sql) {
  const start = sql.indexOf('WITH schemas(template_code, schema) AS (\nVALUES')
  const end = sql.indexOf('\n)\nINSERT INTO public.form_template_versions')
  if (start === -1 || end === -1) throw new Error('Could not locate schemas block in v755')
  const block = sql.slice(start, end)
  const re = /\('(F\d+)',\s*'(\{.*?\})'::jsonb\)/gs
  const schemas = new Map()
  let match
  while ((match = re.exec(block)) !== null) {
    const code = match[1]
    const jsonText = match[2].replace(/\\'/g, "'")
    schemas.set(code, JSON.parse(jsonText))
  }
  if (schemas.size < 68) throw new Error(`Expected 68 schemas, found ${schemas.size}`)
  return schemas
}

function mergeExpansion(schema, code) {
  const extra = EXPANSIONS[code] || DEFAULT_EXPANSION
  const section = schema.sections?.[0]
  if (!section) return schema
  const existingKeys = new Set((section.fields || []).map((f) => f.key))
  const mergedFields = [...(section.fields || [])]
  for (const field of extra) {
    if (!existingKeys.has(field.key)) mergedFields.push(field)
  }
  return {
    ...schema,
    sections: [{ ...section, fields: mergedFields }],
  }
}

function sqlEscapeJson(obj) {
  return JSON.stringify(obj).replace(/'/g, "''")
}

function buildSchemaValues(schemas) {
  const lines = []
  for (const [code, schema] of [...schemas.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const expanded = mergeExpansion(schema, code)
    lines.push(`('${code}', '${sqlEscapeJson(expanded)}'::jsonb)`)
  }
  return lines.join(',\n\n')
}

function buildSqlBlock(schemaValues, schemaName) {
  return `WITH schemas(template_code, schema) AS (
VALUES

${schemaValues}
)
INSERT INTO ${schemaName}.form_template_versions (template_id, version_number, schema, is_current)
SELECT
  t.id,
  COALESCE((SELECT MAX(v.version_number) FROM ${schemaName}.form_template_versions v WHERE v.template_id = t.id), 0) + 1,
  s.schema,
  true
FROM schemas s
JOIN ${schemaName}.form_templates t ON t.template_code = s.template_code
WHERE NOT EXISTS (
  SELECT 1 FROM ${schemaName}.form_template_versions v
  WHERE v.template_id = t.id AND v.schema = s.schema
);

WITH schemas(template_code, schema) AS (
VALUES

${schemaValues}
)
UPDATE ${schemaName}.form_template_versions v
SET is_current = (v.schema = s.schema)
FROM ${schemaName}.form_templates t
JOIN schemas s ON s.template_code = t.template_code
WHERE v.template_id = t.id
  AND v.is_current <> (v.schema = s.schema);`
}

const v755 = fs.readFileSync(v755Path, 'utf8')
const schemas = parseSchemasFromV755(v755)
const schemaValues = buildSchemaValues(schemas)

const header = `-- ============================================================================
-- Form Template Field Seeds — Expanded (Platform + Simulator)
-- Version: v759
-- Description: Fuller PMBOK-aligned field sets for all 68 process guide templates.
--   Extends v755 seeds; idempotent insert-new-version + is_current convergence.
-- Generated by scripts/generate-v759-expanded-seeds.mjs — re-run to regenerate.
-- Companion to projectplan/v756_template_field_governance_plan.md (rule 18.2).
-- ============================================================================

`

const publicBlock = `-- ----------------------------------------------------------------------------
-- public schema (Platform)
-- ----------------------------------------------------------------------------

${buildSqlBlock(schemaValues, 'public')}

`

const simBlock = `-- ----------------------------------------------------------------------------
-- sim schema (Simulator)
-- ----------------------------------------------------------------------------

${buildSqlBlock(schemaValues, 'sim')}

`

const footer = `DO $$
DECLARE
  v_public_seeded INTEGER;
  v_sim_seeded INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_public_seeded
  FROM public.form_template_versions v
  JOIN public.form_templates t ON t.id = v.template_id
  WHERE v.is_current = true AND v.version_number > 1;

  SELECT COUNT(*) INTO v_sim_seeded
  FROM sim.form_template_versions v
  JOIN sim.form_templates t ON t.id = v.template_id
  WHERE v.is_current = true AND v.version_number > 1;

  RAISE NOTICE 'v759 expanded form template field seeds complete';
  RAISE NOTICE 'public templates with version > 1: %', v_public_seeded;
  RAISE NOTICE 'sim templates with version > 1: %', v_sim_seeded;
END $$;
`

fs.writeFileSync(outPath, header + publicBlock + simBlock + footer, 'utf8')
console.log(`Wrote ${outPath} (${schemas.size} templates)`)
