/**
 * Document Governance Service
 *
 * Handles CRUD operations and business logic for document governance metadata.
 * Works in conjunction with documentStorageService.js for file operations.
 *
 * Features:
 * - CRUD for project_documents (metadata)
 * - CRUD for document_versions (version history)
 * - Read document_types and governance stages
 * - Status workflow management (not_started → draft → submitted → approved/rejected)
 * - Compliance checks (calls database functions)
 * - Programme document management
 *
 * @module documentGovernanceService
 */

import { platformDb } from './supabaseClient'
import { uploadProjectDocument, uploadProgrammeDocument, deleteProjectDocument } from './documentStorageService'

// Document status workflow
export const DOCUMENT_STATUS = {
  NOT_STARTED: 'not_started',
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// Storage types
export const STORAGE_TYPE = {
  SUPABASE: 'supabase',
  EXTERNAL_LINK: 'external_link'
}

/**
 * Get all document governance stages (lookup table)
 * @returns {Promise<Array>} - Array of stage objects
 */
export async function getDocumentStages() {
  try {
    const { data, error } = await platformDb
      .from('document_governance_stages')
      .select('*')
      .eq('is_deleted', false)
      .order('stage_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching document stages:', error)
    throw error
  }
}

/**
 * Get all document types (optionally filter by stage)
 * @param {string} stageCode - Optional stage code filter
 * @param {boolean} mandatoryOnly - Filter mandatory documents only
 * @returns {Promise<Array>} - Array of document type objects
 */
export async function getDocumentTypes(stageCode = null, mandatoryOnly = false) {
  try {
    let query = platformDb
      .from('document_types')
      .select(`
        *,
        document_governance_stages (
          stage_name,
          stage_order,
          stage_description
        )
      `)
      .eq('is_deleted', false)
      .eq('is_active', true)

    if (stageCode) {
      query = query.eq('stage_code', stageCode)
    }

    if (mandatoryOnly) {
      query = query.eq('is_mandatory', true)
    }

    query = query.order('stage_code').order('name')

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching document types:', error)
    throw error
  }
}

/**
 * Get a single document type by ID
 * @param {string} documentTypeId - Document type UUID
 * @returns {Promise<Object>} - Document type object
 */
export async function getDocumentType(documentTypeId) {
  try {
    const { data, error } = await platformDb
      .from('document_types')
      .select(`
        *,
        document_governance_stages (
          stage_name,
          stage_order,
          stage_description
        )
      `)
      .eq('id', documentTypeId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching document type:', error)
    throw error
  }
}

/**
 * Get all project documents for a project
 * @param {string} projectId - Project UUID
 * @param {string} stageCode - Optional stage code filter
 * @returns {Promise<Array>} - Array of project document objects
 */
export async function getProjectDocuments(projectId, stageCode = null) {
  try {
    let query = platformDb
      .from('project_documents')
      .select(`
        *,
        document_types (
          id,
          name,
          stage_code,
          is_mandatory,
          category,
          expected_format,
          description
        ),
        owner:users!owner_user_id (
          id,
          full_name,
          email
        ),
        approver:users!approver_user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    if (stageCode) {
      query = query.eq('document_types.stage_code', stageCode)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching project documents:', error)
    throw error
  }
}

/**
 * Get a single project document by ID
 * @param {string} documentId - Project document UUID
 * @returns {Promise<Object>} - Project document object
 */
export async function getProjectDocument(documentId) {
  try {
    const { data, error } = await platformDb
      .from('project_documents')
      .select(`
        *,
        document_types (
          id,
          name,
          stage_code,
          is_mandatory,
          category,
          expected_format,
          description
        ),
        owner:users!owner_user_id (
          id,
          full_name,
          email
        ),
        approver:users!approver_user_id (
          id,
          full_name,
          email
        ),
        projects (
          id,
          project_name,
          project_code
        )
      `)
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching project document:', error)
    throw error
  }
}

/**
 * Create a new project document (metadata only, no file upload)
 * @param {Object} documentData - Document metadata
 * @returns {Promise<Object>} - Created document object
 */
export async function createProjectDocument(documentData) {
  try {
    const {
      project_id,
      document_type_id,
      owner_user_id,
      title,
      description,
      storage_type = STORAGE_TYPE.SUPABASE,
      external_url = null,
      status = DOCUMENT_STATUS.NOT_STARTED
    } = documentData

    // Validate required fields
    if (!project_id || !document_type_id) {
      throw new Error('project_id and document_type_id are required')
    }

    const { data, error } = await platformDb
      .from('project_documents')
      .insert({
        project_id,
        document_type_id,
        owner_user_id,
        title,
        description,
        storage_type,
        external_url,
        status,
        current_version: 1
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A document of this type already exists for this project')
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error creating project document:', error)
    throw error
  }
}

/**
 * Upload file and create project document in one operation
 * @param {File} file - The file to upload
 * @param {Object} documentData - Document metadata
 * @returns {Promise<Object>} - Created document with file metadata
 */
export async function createProjectDocumentWithFile(file, documentData) {
  try {
    const { project_id, document_type_id, owner_user_id, title, description } = documentData

    // First, upload the file
    const uploadResult = await uploadProjectDocument(file, project_id, document_type_id, 1)

    // Then create the document metadata
    const { data, error } = await platformDb
      .from('project_documents')
      .insert({
        project_id,
        document_type_id,
        owner_user_id,
        title: title || file.name,
        description,
        storage_type: STORAGE_TYPE.SUPABASE,
        file_path: uploadResult.path,
        file_name: uploadResult.filename,
        file_size: uploadResult.size,
        file_type: uploadResult.mimeType,
        file_extension: uploadResult.extension,
        status: DOCUMENT_STATUS.DRAFT, // Auto-set to draft when file uploaded
        current_version: 1
      })
      .select()
      .single()

    if (error) {
      // If document creation fails, attempt to delete the uploaded file
      try {
        await deleteProjectDocument(uploadResult.path)
      } catch (deleteError) {
        console.error('Error cleaning up uploaded file:', deleteError)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error creating project document with file:', error)
    throw error
  }
}

/**
 * Update project document metadata
 * @param {string} documentId - Document UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated document object
 */
export async function updateProjectDocument(documentId, updates) {
  try {
    const allowedFields = [
      'title',
      'description',
      'owner_user_id',
      'approver_user_id',
      'status',
      'comments',
      'notes',
      'external_url',
      'tags'
    ]

    // Filter to only allowed fields
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {})

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update')
    }

    const { data, error } = await platformDb
      .from('project_documents')
      .update(filteredUpdates)
      .eq('id', documentId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating project document:', error)
    throw error
  }
}

/**
 * Submit document for approval
 * @param {string} documentId - Document UUID
 * @param {string} approverId - Approver user UUID
 * @param {string} comments - Optional submission comments
 * @returns {Promise<Object>} - Updated document
 */
export async function submitDocumentForApproval(documentId, approverId, comments = null) {
  try {
    const { data, error } = await platformDb
      .from('project_documents')
      .update({
        status: DOCUMENT_STATUS.SUBMITTED,
        approver_user_id: approverId,
        submission_date: new Date().toISOString(),
        comments: comments
      })
      .eq('id', documentId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error submitting document for approval:', error)
    throw error
  }
}

/**
 * Approve document
 * @param {string} documentId - Document UUID
 * @param {string} approverId - Approver user UUID
 * @param {string} comments - Optional approval comments
 * @returns {Promise<Object>} - Updated document
 */
export async function approveDocument(documentId, approverId, comments = null) {
  try {
    const { data, error } = await platformDb
      .from('project_documents')
      .update({
        status: DOCUMENT_STATUS.APPROVED,
        approver_user_id: approverId,
        approval_date: new Date().toISOString(),
        comments: comments
      })
      .eq('id', documentId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error approving document:', error)
    throw error
  }
}

/**
 * Reject document
 * @param {string} documentId - Document UUID
 * @param {string} approverId - Approver user UUID
 * @param {string} reason - Rejection reason (required)
 * @returns {Promise<Object>} - Updated document
 */
export async function rejectDocument(documentId, approverId, reason) {
  try {
    if (!reason) {
      throw new Error('Rejection reason is required')
    }

    const { data, error } = await platformDb
      .from('project_documents')
      .update({
        status: DOCUMENT_STATUS.REJECTED,
        approver_user_id: approverId,
        rejection_reason: reason,
        rejection_date: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error rejecting document:', error)
    throw error
  }
}

/**
 * Soft delete project document
 * @param {string} documentId - Document UUID
 * @param {string} userId - User performing deletion
 * @returns {Promise<Object>} - Deleted document
 */
export async function deleteProjectDocumentMetadata(documentId, userId) {
  try {
    const { data, error } = await platformDb
      .from('project_documents')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error deleting project document:', error)
    throw error
  }
}

/**
 * Get document version history
 * @param {string} projectDocumentId - Project document UUID
 * @returns {Promise<Array>} - Array of version objects
 */
export async function getDocumentVersions(projectDocumentId) {
  try {
    const { data, error } = await platformDb
      .from('document_versions')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by (
          id,
          full_name,
          email
        )
      `)
      .eq('project_document_id', projectDocumentId)
      .eq('is_deleted', false)
      .order('version_number', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching document versions:', error)
    throw error
  }
}

/**
 * Create a new document version
 * @param {string} projectDocumentId - Project document UUID
 * @param {Object} versionData - Version metadata
 * @returns {Promise<Object>} - Created version object
 */
export async function createDocumentVersion(projectDocumentId, versionData) {
  try {
    const {
      version_number,
      version_label,
      file_path,
      file_name,
      file_size,
      file_type,
      file_extension,
      file_hash,
      change_summary,
      uploaded_by
    } = versionData

    const { data, error } = await platformDb
      .from('document_versions')
      .insert({
        project_document_id: projectDocumentId,
        version_number,
        version_label,
        file_path,
        file_name,
        file_size,
        file_type,
        file_extension,
        file_hash,
        change_summary,
        uploaded_by,
        upload_date: new Date().toISOString(),
        is_current: true // Trigger will handle setting others to false
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating document version:', error)
    throw error
  }
}

/**
 * Check project document compliance (calls database function)
 * @param {string} projectId - Project UUID
 * @param {string} stageCode - Optional stage code filter
 * @returns {Promise<Array>} - Compliance check results
 */
export async function checkProjectCompliance(projectId, stageCode = null) {
  try {
    const { data, error } = await platformDb
      .rpc('check_project_document_compliance', {
        p_project_id: projectId,
        p_stage_code: stageCode
      })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error checking project compliance:', error)
    throw error
  }
}

/**
 * Check stage gate document requirements (calls database function)
 * @param {string} stageBoundaryId - Stage boundary UUID
 * @returns {Promise<Object>} - Gate validation result
 */
export async function checkStageGateRequirements(stageBoundaryId) {
  try {
    const { data, error } = await platformDb
      .rpc('check_stage_gate_document_requirements', {
        p_stage_boundary_id: stageBoundaryId
      })

    if (error) throw error

    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('Error checking stage gate requirements:', error)
    throw error
  }
}

/**
 * Get programme document compliance (calls database function)
 * @param {string} programmeId - Programme UUID
 * @returns {Promise<Array>} - Programme compliance rollup
 */
export async function getProgrammeCompliance(programmeId) {
  try {
    const { data, error } = await platformDb
      .rpc('get_programme_document_compliance', {
        p_programme_id: programmeId
      })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error getting programme compliance:', error)
    throw error
  }
}

/**
 * Get project compliance summary from view
 * @param {string} projectId - Optional project ID filter
 * @returns {Promise<Array>} - Compliance summary from pmo_document_compliance_view
 */
export async function getProjectComplianceSummary(projectId = null) {
  try {
    let query = platformDb
      .from('pmo_document_compliance_view')
      .select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching project compliance summary:', error)
    throw error
  }
}

/**
 * Get programme compliance summary from view
 * @param {string} programmeId - Optional programme ID filter
 * @returns {Promise<Array>} - Programme compliance from programme_document_rollup_view
 */
export async function getProgrammeComplianceSummary(programmeId = null) {
  try {
    let query = platformDb
      .from('programme_document_rollup_view')
      .select('*')

    if (programmeId) {
      query = query.eq('programme_id', programmeId)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching programme compliance summary:', error)
    throw error
  }
}

/**
 * Get overdue document approvals from view
 * @param {number} limit - Optional limit for results
 * @returns {Promise<Array>} - Overdue documents from overdue_document_approvals_view
 */
export async function getOverdueApprovals(limit = 50) {
  try {
    const { data, error } = await platformDb
      .from('overdue_document_approvals_view')
      .select('*')
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching overdue approvals:', error)
    throw error
  }
}

/**
 * Get project storage usage summary from view
 * @param {string} projectId - Optional project ID filter
 * @returns {Promise<Array>} - Storage usage from project_storage_usage_view
 */
export async function getProjectStorageSummary(projectId = null) {
  try {
    let query = platformDb
      .from('project_storage_usage_view')
      .select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching project storage summary:', error)
    throw error
  }
}

export default {
  // Constants
  DOCUMENT_STATUS,
  STORAGE_TYPE,

  // Lookup tables
  getDocumentStages,
  getDocumentTypes,
  getDocumentType,

  // Project documents
  getProjectDocuments,
  getProjectDocument,
  createProjectDocument,
  createProjectDocumentWithFile,
  updateProjectDocument,
  deleteProjectDocumentMetadata,

  // Document workflow
  submitDocumentForApproval,
  approveDocument,
  rejectDocument,

  // Document versions
  getDocumentVersions,
  createDocumentVersion,

  // Compliance checks
  checkProjectCompliance,
  checkStageGateRequirements,
  getProgrammeCompliance,

  // Views (reporting)
  getProjectComplianceSummary,
  getProgrammeComplianceSummary,
  getOverdueApprovals,
  getProjectStorageSummary
}
