/**
 * Document Tailoring Service
 * 
 * Handles creating tailored (project-specific) copies of PMO baseline documents
 * and managing the tailoring workflow (create → submit for review → approve)
 */

import { platformDb } from './supabase/supabaseClient'

/**
 * Get current user's internal ID
 */
async function getCurrentUserId() {
  const { data: { user: authUser } } = await platformDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  
  const { data: userData, error } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

/**
 * Create a tailored copy of a baseline document for a specific project
 * 
 * @param {string} documentType - Type of document (e.g., 'communication-strategy', 'mandate')
 * @param {string} baselineDocumentId - ID of the baseline document to tailor
 * @param {string} projectId - Project ID to tailor for
 * @param {string} justification - Justification for tailoring
 * @returns {Promise<Object>} Created tailored document
 */
export async function createTailoredCopy(documentType, baselineDocumentId, projectId, justification) {
  const userId = await getCurrentUserId()
  
  // Map document types to table names
  const tableMap = {
    'mandate': 'project_mandates',
    'communication-strategy': 'communication_management_strategies',
    'configuration-strategy': 'configuration_management_strategies',
    'quality-strategy': 'quality_management_strategies',
    'risk-strategy': 'risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  // Get the baseline document
  const { data: baseline, error: fetchError } = await platformDb
    .from(tableName)
    .select('*')
    .eq('id', baselineDocumentId)
    .eq('is_baseline', true)
    .single()
  
  if (fetchError || !baseline) {
    throw new Error('Baseline document not found')
  }
  
  // Create tailored copy
  const tailoredData = {
    ...baseline,
    id: undefined, // Let database generate new ID
    project_id: projectId,
    is_baseline: false,
    is_tailored: true,
    baseline_document_id: baselineDocumentId,
    tailoring_justification: justification,
    lifecycle_stage: 'draft',
    initiated_by_role: 'PM',
    primary_author_role: 'PM',
    governance_owner: 'PM',
    created_by: userId,
    updated_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Remove fields that shouldn't be copied
  delete tailoredData.version_number
  delete tailoredData.approval_status
  delete tailoredData.approved_by
  delete tailoredData.approved_date
  
  const { data: tailored, error: insertError } = await platformDb
    .from(tableName)
    .insert(tailoredData)
    .select()
    .single()
  
  if (insertError) {
    throw new Error(`Failed to create tailored copy: ${insertError.message}`)
  }
  
  return tailored
}

/**
 * Get all tailored versions of a baseline document
 * 
 * @param {string} documentType - Type of document
 * @param {string} baselineDocumentId - ID of the baseline document
 * @returns {Promise<Array>} List of tailored documents
 */
export async function getTailoredVersions(documentType, baselineDocumentId) {
  const tableMap = {
    'mandate': 'project_mandates',
    'communication-strategy': 'communication_management_strategies',
    'configuration-strategy': 'configuration_management_strategies',
    'quality-strategy': 'quality_management_strategies',
    'risk-strategy': 'risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await platformDb
    .from(tableName)
    .select('*')
    .eq('baseline_document_id', baselineDocumentId)
    .eq('is_tailored', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch tailored versions: ${error.message}`)
  }
  
  return data || []
}

/**
 * Get the baseline document for a tailored document
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored document
 * @returns {Promise<Object>} Baseline document
 */
export async function getBaselineDocument(documentType, tailoredDocumentId) {
  const tableMap = {
    'mandate': 'project_mandates',
    'communication-strategy': 'communication_management_strategies',
    'configuration-strategy': 'configuration_management_strategies',
    'quality-strategy': 'quality_management_strategies',
    'risk-strategy': 'risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  // First get the tailored document to find baseline ID
  const { data: tailored, error: fetchError } = await platformDb
    .from(tableName)
    .select('baseline_document_id')
    .eq('id', tailoredDocumentId)
    .single()
  
  if (fetchError || !tailored || !tailored.baseline_document_id) {
    throw new Error('Tailored document not found or has no baseline')
  }
  
  // Get the baseline
  const { data: baseline, error: baselineError } = await platformDb
    .from(tableName)
    .select('*')
    .eq('id', tailored.baseline_document_id)
    .single()
  
  if (baselineError || !baseline) {
    throw new Error('Baseline document not found')
  }
  
  return baseline
}

/**
 * Submit a tailored document for PMO review
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored document
 * @returns {Promise<Object>} Updated document
 */
export async function submitForPMOReview(documentType, tailoredDocumentId) {
  const userId = await getCurrentUserId()
  
  const tableMap = {
    'mandate': 'project_mandates',
    'communication-strategy': 'communication_management_strategies',
    'configuration-strategy': 'configuration_management_strategies',
    'quality-strategy': 'quality_management_strategies',
    'risk-strategy': 'risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await platformDb
    .from(tableName)
    .update({
      lifecycle_stage: 'under_review',
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', tailoredDocumentId)
    .eq('is_tailored', true)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to submit for review: ${error.message}`)
  }
  
  return data
}

/**
 * Approve a tailored document (PMO only)
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored document
 * @param {string} comments - Optional approval comments
 * @returns {Promise<Object>} Updated document
 */
export async function approveTailoredVersion(documentType, tailoredDocumentId, comments = '') {
  const userId = await getCurrentUserId()
  
  const tableMap = {
    'mandate': 'project_mandates',
    'communication-strategy': 'communication_management_strategies',
    'configuration-strategy': 'configuration_management_strategies',
    'quality-strategy': 'quality_management_strategies',
    'risk-strategy': 'risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await platformDb
    .from(tableName)
    .update({
      lifecycle_stage: 'approved',
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', tailoredDocumentId)
    .eq('is_tailored', true)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to approve tailored version: ${error.message}`)
  }
  
  return data
}

export default {
  createTailoredCopy,
  getTailoredVersions,
  getBaselineDocument,
  submitForPMOReview,
  approveTailoredVersion
}
