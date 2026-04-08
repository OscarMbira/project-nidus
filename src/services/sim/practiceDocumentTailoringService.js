/**
 * Practice Document Tailoring Service
 * 
 * Handles creating tailored (practice project-specific) copies of PMO practice baseline documents
 * and managing the tailoring workflow (create → submit for review → approve)
 * 
 * All operations use simDb client and sim schema (practice data only)
 */

import { simDb } from '../supabase/supabaseClient'

/**
 * Get current user's internal ID
 */
async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  
  const { data: userData, error } = await simDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

/**
 * Create a tailored copy of a practice baseline document for a specific practice project
 * 
 * @param {string} documentType - Type of document (e.g., 'communication-strategy', 'mandate')
 * @param {string} baselineDocumentId - ID of the practice baseline document to tailor
 * @param {string} practiceProjectId - Practice project ID to tailor for
 * @param {string} justification - Justification for tailoring
 * @returns {Promise<Object>} Created tailored practice document
 */
export async function createTailoredCopy(documentType, baselineDocumentId, practiceProjectId, justification) {
  const userId = await getCurrentUserId()
  
  // Map document types to practice table names in sim schema
  const tableMap = {
    'mandate': 'practice_project_briefs',
    'communication-strategy': 'practice_communication_management_strategies',
    'configuration-strategy': 'practice_configuration_management_strategies',
    'quality-strategy': 'practice_quality_management_strategies',
    'risk-strategy': 'practice_risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  // Get the practice baseline document
  const { data: baseline, error: fetchError } = await simDb
    .from(tableName)
    .select('*')
    .eq('id', baselineDocumentId)
    .eq('is_baseline', true)
    .single()
  
  if (fetchError || !baseline) {
    throw new Error('Practice baseline document not found')
  }
  
  // Create tailored copy
  const tailoredData = {
    ...baseline,
    id: undefined, // Let database generate new ID
    practice_project_id: practiceProjectId,
    is_baseline: false,
    is_tailored: true,
    baseline_document_id: baselineDocumentId,
    tailoring_justification: justification,
    lifecycle_stage: 'draft',
    initiated_by_role: 'PM',
    primary_author_role: 'PM',
    governance_owner: 'PM',
    user_id: userId,
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
  
  const { data: tailored, error: insertError } = await simDb
    .from(tableName)
    .insert(tailoredData)
    .select()
    .single()
  
  if (insertError) {
    throw new Error(`Failed to create tailored practice copy: ${insertError.message}`)
  }
  
  return tailored
}

/**
 * Get all tailored versions of a practice baseline document
 * 
 * @param {string} documentType - Type of document
 * @param {string} baselineDocumentId - ID of the practice baseline document
 * @returns {Promise<Array>} List of tailored practice documents
 */
export async function getTailoredVersions(documentType, baselineDocumentId) {
  const tableMap = {
    'mandate': 'practice_project_briefs',
    'communication-strategy': 'practice_communication_management_strategies',
    'configuration-strategy': 'practice_configuration_management_strategies',
    'quality-strategy': 'practice_quality_management_strategies',
    'risk-strategy': 'practice_risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await simDb
    .from(tableName)
    .select('*')
    .eq('baseline_document_id', baselineDocumentId)
    .eq('is_tailored', true)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch tailored practice versions: ${error.message}`)
  }
  
  return data || []
}

/**
 * Get the practice baseline document for a tailored document
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored practice document
 * @returns {Promise<Object>} Practice baseline document
 */
export async function getBaselineDocument(documentType, tailoredDocumentId) {
  const tableMap = {
    'mandate': 'practice_project_briefs',
    'communication-strategy': 'practice_communication_management_strategies',
    'configuration-strategy': 'practice_configuration_management_strategies',
    'quality-strategy': 'practice_quality_management_strategies',
    'risk-strategy': 'practice_risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  // First get the tailored document to find baseline ID
  const { data: tailored, error: fetchError } = await simDb
    .from(tableName)
    .select('baseline_document_id')
    .eq('id', tailoredDocumentId)
    .single()
  
  if (fetchError || !tailored || !tailored.baseline_document_id) {
    throw new Error('Tailored practice document not found or has no baseline')
  }
  
  // Get the practice baseline
  const { data: baseline, error: baselineError } = await simDb
    .from(tableName)
    .select('*')
    .eq('id', tailored.baseline_document_id)
    .single()
  
  if (baselineError || !baseline) {
    throw new Error('Practice baseline document not found')
  }
  
  return baseline
}

/**
 * Submit a tailored practice document for PMO review
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored practice document
 * @returns {Promise<Object>} Updated practice document
 */
export async function submitForPMOReview(documentType, tailoredDocumentId) {
  const userId = await getCurrentUserId()
  
  const tableMap = {
    'mandate': 'practice_project_briefs',
    'communication-strategy': 'practice_communication_management_strategies',
    'configuration-strategy': 'practice_configuration_management_strategies',
    'quality-strategy': 'practice_quality_management_strategies',
    'risk-strategy': 'practice_risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await simDb
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
    throw new Error(`Failed to submit practice document for review: ${error.message}`)
  }
  
  return data
}

/**
 * Approve a tailored practice document (PMO only)
 * 
 * @param {string} documentType - Type of document
 * @param {string} tailoredDocumentId - ID of the tailored practice document
 * @param {string} comments - Optional approval comments
 * @returns {Promise<Object>} Updated practice document
 */
export async function approveTailoredVersion(documentType, tailoredDocumentId, comments = '') {
  const userId = await getCurrentUserId()
  
  const tableMap = {
    'mandate': 'practice_project_briefs',
    'communication-strategy': 'practice_communication_management_strategies',
    'configuration-strategy': 'practice_configuration_management_strategies',
    'quality-strategy': 'practice_quality_management_strategies',
    'risk-strategy': 'practice_risk_management_strategies'
  }
  
  const tableName = tableMap[documentType]
  if (!tableName) {
    throw new Error(`Unsupported document type: ${documentType}`)
  }
  
  const { data, error } = await simDb
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
    throw new Error(`Failed to approve tailored practice version: ${error.message}`)
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
