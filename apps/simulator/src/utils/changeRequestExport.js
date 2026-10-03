/**
 * Change Request (Simulator) — export section definitions and record flattening.
 * Mirrors businessCaseExportSections.js's pattern so ExportRecordButtons' declarative
 * API (sections + record) can drive both the Export dropdown and the built-in
 * "View" preview modal.
 */
import { buildCustomFieldExportParts } from '../features/local-data-extensions/utils/exportMerge';

export const CHANGE_REQUEST_EXPORT_SECTIONS = [
  {
    title: 'Change Request',
    fields: [
      { key: 'change_reference', label: 'Reference' },
      { key: 'change_title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'change_category', label: 'Category' },
      { key: 'change_type', label: 'Type' },
      { key: 'submission_date', label: 'Submitted Date' },
      { key: 'requested_by_label', label: 'Requested By' },
      { key: 'owner_label', label: 'Owner' },
      { key: 'approver_label', label: 'Approver' },
      { key: 'requestor_name', label: 'Requestor Name' },
      { key: 'requestor_organization', label: 'Requestor Organization' },
      { key: 'change_description', label: 'Description' },
      { key: 'business_rationale', label: 'Business Rationale' },
    ],
  },
  {
    title: 'Change Details',
    fields: [
      { key: 'reason_for_change', label: 'Reason for Change' },
      { key: 'current_situation', label: 'Current Situation' },
    ],
  },
  {
    title: 'Solutions',
    fields: [
      { key: 'proposed_solution', label: 'Proposed Solution' },
      { key: 'alternative_solutions', label: 'Alternative Solutions' },
    ],
  },
  {
    title: 'Priority & Impact',
    fields: [
      { key: 'priority', label: 'Priority' },
      { key: 'urgency', label: 'Urgency' },
      { key: 'business_criticality', label: 'Business Criticality' },
      { key: 'impact_summary', label: 'Impact' },
      { key: 'notes', label: 'Additional Notes' },
      { key: 'status_reason', label: 'Decision Notes' },
    ],
  },
  {
    title: 'Assessment',
    fields: [
      { key: 'assessment_impact_level', label: 'Overall Impact Level' },
      { key: 'assessment_impact_summary', label: 'Impact Summary' },
      { key: 'assessment_schedule_impact', label: 'Schedule Impact' },
      { key: 'assessment_cost_impact', label: 'Cost Impact' },
      { key: 'assessment_scope_impact', label: 'Scope Impact' },
      { key: 'assessment_quality_impact', label: 'Quality Impact' },
      { key: 'assessment_resource_impact', label: 'Resource Impact' },
      { key: 'assessment_risk_impact', label: 'Risk Impact' },
    ],
  },
  {
    title: 'Decision',
    fields: [
      { key: 'assessment_feasibility_rating', label: 'Feasibility Rating' },
      { key: 'assessment_recommendation', label: 'Decision' },
      { key: 'assessment_recommendation_rationale', label: 'Decision Rationale' },
      { key: 'assessment_conditions', label: 'Conditions' },
    ],
  },
];

export function buildChangeRequestExportRecord(request = {}, assessment = null, userLabels = {}) {
  return {
    ...request,
    requested_by_label: request.submitted_by ? userLabels[request.submitted_by] || '' : '',
    owner_label: request.owner_user_id ? userLabels[request.owner_user_id] || '' : '',
    approver_label: request.current_approver_user_id ? userLabels[request.current_approver_user_id] || '' : '',
    assessment_impact_level: assessment?.impact_level || '',
    assessment_impact_summary: assessment?.impact_summary || '',
    assessment_schedule_impact: assessment?.schedule_impact_description || '',
    assessment_cost_impact: assessment?.cost_impact_description || '',
    assessment_scope_impact: assessment?.scope_impact_description || '',
    assessment_quality_impact: assessment?.quality_impact_description || '',
    assessment_resource_impact: assessment?.resource_impact_description || '',
    assessment_risk_impact: assessment?.risk_impact_description || '',
    assessment_feasibility_rating: assessment?.feasibility_rating || '',
    assessment_recommendation: assessment?.recommendation || '',
    assessment_recommendation_rationale: assessment?.recommendation_rationale || '',
    assessment_conditions: assessment?.conditions || '',
  };
}

export function changeRequestExportFilename(request = {}) {
  const ref = request.change_reference || request.id || 'ChangeRequest';
  return `ChangeRequest_${ref}`.replace(/[^\w.-]+/g, '_');
}

/**
 * @returns {Promise<{ sections: object[], record: object }>}
 */
export async function buildChangeRequestExport(platformDbClient, request, assessment, crAccountId, userLabels = {}) {
  const baseRecord = buildChangeRequestExportRecord(request, assessment, userLabels);
  const pid = request?.project_id;
  if (!platformDbClient || !crAccountId || !pid || !request?.id) {
    return { sections: CHANGE_REQUEST_EXPORT_SECTIONS, record: baseRecord };
  }
  try {
    const { section, mergedRecord } = await buildCustomFieldExportParts(
      platformDbClient,
      crAccountId,
      'change_request',
      request.id,
      pid
    );
    const sections = section ? [...CHANGE_REQUEST_EXPORT_SECTIONS, section] : CHANGE_REQUEST_EXPORT_SECTIONS;
    return { sections, record: { ...baseRecord, ...mergedRecord } };
  } catch {
    return { sections: CHANGE_REQUEST_EXPORT_SECTIONS, record: baseRecord };
  }
}
