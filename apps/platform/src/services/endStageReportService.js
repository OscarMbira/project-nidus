/**
 * End Stage Report — RPC-backed helpers (see SQL v218_end_stage_report_enhancement.sql)
 */

import { supabase } from './supabaseClient'
import { submitForApproval } from './endStageReportApprovalService'
import { getBusinessCaseForReview } from './endProjectReportService'

export { getBusinessCaseForReview }

export async function generateReportReference(projectId, stageNumber = 1) {
  const { data, error } = await supabase.rpc('generate_end_stage_report_reference', {
    p_project_id: projectId,
    p_stage_number: stageNumber,
  })
  if (error) throw error
  return data
}

export async function getReportByStageBoundary(stageBoundaryId) {
  const { data, error } = await supabase.rpc('get_end_stage_report_by_stage_boundary', {
    p_stage_boundary_id: stageBoundaryId,
  })
  if (error) throw error
  if (!data || !data.length) return null
  return data[0]
}

export async function canEditReport(reportId, userId) {
  const { data, error } = await supabase.rpc('can_edit_end_stage_report', {
    p_report_id: reportId,
    p_user_id: userId,
  })
  if (error) throw error
  return !!data
}

export async function validateReportCompleteness(reportId) {
  const { data, error } = await supabase.rpc('validate_end_stage_report_completeness', {
    p_report_id: reportId,
  })
  if (error) throw error
  const rows = Array.isArray(data) ? data : []
  const overallRow = rows.find((r) => r.section_name === 'Overall')
  const sections = rows.filter((r) => r.section_name && r.section_name !== 'Overall')
  const overallCompleteness = overallRow?.completeness_percentage != null
    ? Number(overallRow.completeness_percentage)
    : 0
  return {
    sections,
    overallCompleteness,
    isComplete: overallRow?.is_complete === true,
    canSubmit: overallRow?.is_complete === true,
  }
}

export async function linkUpdatedDocuments(reportId, opts = {}) {
  const { businessCaseId, riskRegisterVersion, issueRegisterVersion } = opts
  const { error } = await supabase.rpc('link_updated_documents', {
    p_report_id: reportId,
    p_business_case_id: businessCaseId ?? null,
    p_risk_register_version: riskRegisterVersion ?? null,
    p_issue_register_version: issueRegisterVersion ?? null,
  })
  if (error) throw error
}

export async function syncBusinessCaseReview(reportId, businessCaseId) {
  return linkUpdatedDocuments(reportId, { businessCaseId })
}

export async function syncRiskRegister(reportId, riskRegisterVersion) {
  return linkUpdatedDocuments(reportId, { riskRegisterVersion })
}

export async function syncIssueRegister(reportId, issueRegisterVersion) {
  return linkUpdatedDocuments(reportId, { issueRegisterVersion })
}

export async function syncLessonsLearned(_reportId) {
  return Promise.resolve()
}

export async function submitReportForApproval(reportId, approverIds) {
  return submitForApproval(reportId, approverIds)
}
