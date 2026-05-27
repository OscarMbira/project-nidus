/**
 * Business Case Service
 * Full CRUD + approval workflow for Business Case documents (Platform / public schema)
 */

import { platformDb } from './supabase/supabaseClient'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId() {
  const { data: { user: authUser } } = await platformDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (error || !data) throw new Error('User profile not found')
  return data.id
}

// ── Edit Guard ───────────────────────────────────────────────────────────────

/**
 * Returns true only when the business case is in draft or rejected status.
 */
export async function canEditBusinessCase(caseId) {
  const { data, error } = await platformDb
    .from('business_cases')
    .select('document_status')
    .eq('id', caseId)
    .eq('is_deleted', false)
    .single()

  if (error || !data) return false
  return ['draft', 'rejected'].includes(data.document_status)
}

// ── Main CRUD ────────────────────────────────────────────────────────────────

/**
 * Fetch all business cases (optionally filtered).
 * @param {Object} filters — { status, projectId, programmeId }
 */
export async function getAllBusinessCases(filters = {}) {
  let query = platformDb
    .from('business_cases')
    .select(`
      id, case_reference, case_title, document_status, version_number,
      created_date, project_id, programme_id,
      executive_summary, overall_risk_rating,
      estimated_development_cost, estimated_ongoing_cost, total_investment_cost,
      created_by, created_at, updated_at,
      projects:project_id (id, project_name, project_code),
      programmes:programme_id (id, programme_name, programme_code)
    `)
    .eq('is_deleted', false)
    .order('created_date', { ascending: false })

  if (filters.status) query = query.eq('document_status', filters.status)
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.programmeId) query = query.eq('programme_id', filters.programmeId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Fetch a single business case with all related data.
 */
export async function getBusinessCaseById(caseId) {
  const { data, error } = await platformDb
    .from('business_cases')
    .select(`
      *,
      projects:project_id (id, project_name, project_code),
      programmes:programme_id (id, programme_name, programme_code),
      creator:created_by (id, first_name, last_name, email)
    `)
    .eq('id', caseId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  if (!data) return null

  // Fetch child records separately (Supabase does not support WHERE/ORDER in nested selects)
  const [options, benefits, disBenefits] = await Promise.all([
    getOptions(caseId),
    getBenefits(caseId),
    getDisBenefits(caseId),
  ])

  return { ...data, options, benefits, dis_benefits: disBenefits }
}

/**
 * Fetch a business case by its reference code (e.g. BC-2026-001).
 */
export async function getBusinessCaseByReference(reference) {
  const { data, error } = await platformDb
    .from('business_cases')
    .select('*')
    .eq('case_reference', reference)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new business case.
 */
export async function createBusinessCase(caseData) {
  const userId = await getCurrentUserId()

  const payload = {
    ...caseData,
    created_by: userId,
    updated_by: userId,
    document_status: 'draft',
    version_number: '1.0',
  }

  const { data, error } = await platformDb
    .from('business_cases')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  // Record initial revision
  await addRevision(data.id, userId, '1.0', 'Initial version created')

  return data
}

/**
 * Update an existing business case (only when editable).
 */
export async function updateBusinessCase(caseId, updates) {
  const editable = await canEditBusinessCase(caseId)
  if (!editable) throw new Error('Business case cannot be edited in its current status')

  const userId = await getCurrentUserId()

  // Fetch current version for revision tracking
  const { data: current } = await platformDb
    .from('business_cases')
    .select('version_number')
    .eq('id', caseId)
    .single()

  const { data, error } = await platformDb
    .from('business_cases')
    .update({ ...updates, updated_by: userId })
    .eq('id', caseId)
    .select()
    .single()

  if (error) throw error

  // Record revision if saving explicitly
  if (updates._recordRevision) {
    const nextVersion = bumpVersion(current?.version_number || '1.0')
    await platformDb
      .from('business_cases')
      .update({ version_number: nextVersion })
      .eq('id', caseId)
    await addRevision(caseId, userId, nextVersion, updates._revisionSummary || 'Document updated')
  }

  return data
}

/**
 * Soft-delete a business case (draft only).
 */
export async function deleteBusinessCase(caseId) {
  const editable = await canEditBusinessCase(caseId)
  if (!editable) throw new Error('Only draft business cases can be deleted')

  const userId = await getCurrentUserId()

  const { error } = await platformDb
    .from('business_cases')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', caseId)

  if (error) throw error
  return true
}

// ── Approval Workflow ────────────────────────────────────────────────────────

/**
 * Submit a business case for approval.
 * Sets status to 'submitted' and creates a pending approval record.
 */
export async function submitBusinessCaseForApproval(caseId) {
  const userId = await getCurrentUserId()

  const { data: bc } = await platformDb
    .from('business_cases')
    .select('document_status, version_number')
    .eq('id', caseId)
    .single()

  if (!bc) throw new Error('Business case not found')
  if (bc.document_status !== 'draft' && bc.document_status !== 'rejected') {
    throw new Error('Only draft or rejected business cases can be submitted for approval')
  }

  // Update status
  const { error: updateError } = await platformDb
    .from('business_cases')
    .update({ document_status: 'submitted', updated_by: userId })
    .eq('id', caseId)

  if (updateError) throw updateError

  // Create approval record
  const { data: approval, error: approvalError } = await platformDb
    .from('business_case_approvals')
    .insert({
      business_case_id: caseId,
      approval_status: 'pending',
      version_reviewed: bc.version_number,
      created_by: userId,
    })
    .select()
    .single()

  if (approvalError) throw approvalError
  return approval
}

/**
 * Approve a business case.
 * @param {string} approvalId — ID from business_case_approvals
 * @param {string} comments — optional approval notes
 */
export async function approveBusinessCase(approvalId, comments = '') {
  const userId = await getCurrentUserId()

  // Get approval record
  const { data: approval, error: fetchError } = await platformDb
    .from('business_case_approvals')
    .select('business_case_id')
    .eq('id', approvalId)
    .single()

  if (fetchError || !approval) throw new Error('Approval record not found')

  // Update approval record
  const { error: approvalError } = await platformDb
    .from('business_case_approvals')
    .update({
      approval_status: 'approved',
      approval_date: new Date().toISOString().split('T')[0],
      comments,
      approver_id: userId,
      updated_by: userId,
    })
    .eq('id', approvalId)

  if (approvalError) throw approvalError

  // Update business case status
  const { error: caseError } = await platformDb
    .from('business_cases')
    .update({ document_status: 'approved', updated_by: userId })
    .eq('id', approval.business_case_id)

  if (caseError) throw caseError
  return true
}

/**
 * Reject a business case (returns it to draft with rejection notes).
 * @param {string} approvalId — ID from business_case_approvals
 * @param {string} comments — required rejection reason
 */
export async function rejectBusinessCase(approvalId, comments) {
  if (!comments?.trim()) throw new Error('A rejection reason is required')

  const userId = await getCurrentUserId()

  const { data: approval, error: fetchError } = await platformDb
    .from('business_case_approvals')
    .select('business_case_id')
    .eq('id', approvalId)
    .single()

  if (fetchError || !approval) throw new Error('Approval record not found')

  const { error: approvalError } = await platformDb
    .from('business_case_approvals')
    .update({
      approval_status: 'rejected',
      approval_date: new Date().toISOString().split('T')[0],
      comments,
      approver_id: userId,
      updated_by: userId,
    })
    .eq('id', approvalId)

  if (approvalError) throw approvalError

  const { error: caseError } = await platformDb
    .from('business_cases')
    .update({ document_status: 'rejected', updated_by: userId })
    .eq('id', approval.business_case_id)

  if (caseError) throw caseError
  return true
}

/**
 * Get approval status for a business case.
 * Returns { approvals, latest, isPending, isApproved, isRejected }
 */
export async function getApprovalStatus(caseId) {
  const { data, error } = await platformDb
    .from('business_case_approvals')
    .select(`
      id, approval_status, approval_date, comments, version_reviewed, created_at,
      approver:approver_id (id, first_name, last_name)
    `)
    .eq('business_case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const approvals = data || []
  const latest = approvals[0] || null

  return {
    approvals,
    latest,
    isPending: latest?.approval_status === 'pending',
    isApproved: latest?.approval_status === 'approved',
    isRejected: latest?.approval_status === 'rejected',
  }
}

// ── Revision History ─────────────────────────────────────────────────────────

export async function getRevisionHistory(caseId) {
  const { data, error } = await platformDb
    .from('business_case_revisions')
    .select(`
      id, version_number, revision_date, summary_of_changes, document_status,
      revised_by_name, created_at,
      revised_by:revised_by (id, first_name, last_name)
    `)
    .eq('business_case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function addRevision(caseId, userId, versionNumber, summary) {
  const { data: userRec } = await platformDb
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .single()

  await platformDb.from('business_case_revisions').insert({
    business_case_id: caseId,
    version_number: versionNumber,
    revision_date: new Date().toISOString().split('T')[0],
    summary_of_changes: summary,
    revised_by: userId,
    revised_by_name: userRec ? `${userRec.first_name} ${userRec.last_name}` : null,
  })
}

// ── Distribution List ────────────────────────────────────────────────────────

export async function getDistributionList(caseId) {
  const { data, error } = await platformDb
    .from('business_case_distribution')
    .select(`
      id, recipient_name, recipient_title, date_of_issue,
      version_distributed, distribution_status,
      recipient:recipient_id (id, first_name, last_name, email)
    `)
    .eq('business_case_id', caseId)
    .order('date_of_issue', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addDistributionEntry(caseId, entry) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_distribution')
    .insert({ ...entry, business_case_id: caseId, created_by: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeDistributionEntry(entryId) {
  const { error } = await platformDb
    .from('business_case_distribution')
    .delete()
    .eq('id', entryId)

  if (error) throw error
  return true
}

// ── Options CRUD ─────────────────────────────────────────────────────────────

export async function getOptions(caseId) {
  const { data, error } = await platformDb
    .from('business_case_options')
    .select('*')
    .eq('business_case_id', caseId)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addOption(caseId, option) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_options')
    .insert({ ...option, business_case_id: caseId, created_by: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateOption(optionId, updates) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_options')
    .update({ ...updates, updated_by: userId })
    .eq('id', optionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOption(optionId) {
  const userId = await getCurrentUserId()

  const { error } = await platformDb
    .from('business_case_options')
    .update({ is_deleted: true, updated_by: userId })
    .eq('id', optionId)

  if (error) throw error
  return true
}

// ── Benefits CRUD ─────────────────────────────────────────────────────────────

export async function getBenefits(caseId) {
  const { data, error } = await platformDb
    .from('business_case_benefits')
    .select('*')
    .eq('business_case_id', caseId)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addBenefit(caseId, benefit) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_benefits')
    .insert({ ...benefit, business_case_id: caseId, created_by: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBenefit(benefitId, updates) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_benefits')
    .update({ ...updates, updated_by: userId })
    .eq('id', benefitId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBenefit(benefitId) {
  const userId = await getCurrentUserId()

  const { error } = await platformDb
    .from('business_case_benefits')
    .update({ is_deleted: true, updated_by: userId })
    .eq('id', benefitId)

  if (error) throw error
  return true
}

// ── Dis-benefits CRUD ────────────────────────────────────────────────────────

export async function getDisBenefits(caseId) {
  const { data, error } = await platformDb
    .from('business_case_dis_benefits')
    .select('*')
    .eq('business_case_id', caseId)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addDisBenefit(caseId, disBenefit) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_dis_benefits')
    .insert({ ...disBenefit, business_case_id: caseId, created_by: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDisBenefit(disBenefitId, updates) {
  const userId = await getCurrentUserId()

  const { data, error } = await platformDb
    .from('business_case_dis_benefits')
    .update({ ...updates, updated_by: userId })
    .eq('id', disBenefitId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDisBenefit(disBenefitId) {
  const userId = await getCurrentUserId()

  const { error } = await platformDb
    .from('business_case_dis_benefits')
    .update({ is_deleted: true, updated_by: userId })
    .eq('id', disBenefitId)

  if (error) throw error
  return true
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function bumpVersion(current) {
  const parts = (current || '1.0').split('.')
  const minor = parseInt(parts[1] || '0', 10) + 1
  return `${parts[0]}.${minor}`
}
