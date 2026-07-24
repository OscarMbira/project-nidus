/**
 * Draft Queue Service - Platform
 *
 * Handles all draft/hold queue operations for Platform forms.
 * Allows users to put records on hold and resume editing later.
 * Uses platformDb (public schema) for consistency with mandate/project data.
 *
 * @version v254
 * @created 2026-01-31
 */

import { platformDb } from './supabaseClient';

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_ACTIVE_DRAFTS = 15;
export const DEFAULT_EXPIRY_DAYS = 14;
export const AUTO_SAVE_DEBOUNCE_MS = 60000; // 60 seconds

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/** Timeout in ms for save so UI never hangs indefinitely */
const SAVE_DRAFT_TIMEOUT_MS = 30000;

/**
 * Save a new draft or update existing one
 * Rejects with a user-friendly message on 404 (table/RPC not deployed) or timeout.
 *
 * @param {string} entityType - Type of entity (project, benefit, issue, etc.)
 * @param {object} formData - Current form state
 * @param {string|null} entityId - Entity ID for edit mode, null for create
 * @param {object} options - Additional options
 * @returns {Promise<object>} Saved draft record
 */
export async function saveDraft(entityType, formData, entityId = null, options = {}) {
  const run = async () => {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const {
      organisationId = null,
      projectId = null,
      projectTypeId = null,
      holdReason = null,
      entityTitle = null,
      formRoute = null
    } = options;

    // Run independent calls in parallel to reduce latency
    const [expiryDays, existingDraft] = await Promise.all([
      getExpiryConfig(organisationId, projectTypeId, entityType),
      checkExistingDraft(entityType, entityId, user.id)
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Calculate completion percentage
    const { percentage, total, completed } = calculateCompletion(entityType, formData);

    if (existingDraft) {
      // Update existing draft
      const { data, error } = await platformDb
        .from('draft_queue')
        .update({
          form_data: formData,
          entity_title: entityTitle || extractTitle(entityType, formData),
          hold_reason: holdReason,
          completion_percentage: percentage,
          required_fields_total: total,
          required_fields_completed: completed,
          updated_by: user.id
        })
        .eq('id', existingDraft.draft_id)
        .select()
        .single();

      if (error) {
        const isPermissionDenied = error.code === '42501' || error.status === 403;
        if (isPermissionDenied) {
          throw new Error('You do not have permission to use the draft queue. Please contact your administrator.');
        }
        const isNotFound = error.code === 'PGRST116' || error.status === 404 ||
          (error.message && (String(error.message).includes('404') || String(error.message).includes('not found')));
        if (isNotFound) {
          throw new Error('Draft queue is not available. Please run the draft queue migration (SQL/v254_draft_queue_tables.sql) or try again later.');
        }
        throw error;
      }
      return data;
    }

    // Check draft limit before creating new
    const canCreate = await checkDraftLimit(user.id);
    if (!canCreate) {
      throw new Error('Maximum active drafts limit (15) reached. Please resume or delete existing drafts.');
    }

    // Create new draft
    const { data, error } = await platformDb
      .from('draft_queue')
      .insert({
        user_id: user.id,
        organisation_id: organisationId,
        project_id: projectId,
        entity_type: entityType,
        entity_id: entityId,
        entity_title: entityTitle || extractTitle(entityType, formData),
        form_data: formData,
        form_mode: entityId ? 'edit' : 'create',
        form_route: formRoute,
        hold_reason: holdReason,
        hold_status: 'active',
        expiry_days: expiryDays,
        expires_at: expiresAt.toISOString(),
        completion_percentage: percentage,
        required_fields_total: total,
        required_fields_completed: completed,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      const isPermissionDenied = error.code === '42501' || error.status === 403;
      if (isPermissionDenied) {
        throw new Error('You do not have permission to use the draft queue. Please contact your administrator.');
      }
      const isNotFound = error.code === '42P01' || error.code === 'PGRST116' || error.status === 404 ||
        (error.message && (String(error.message).includes('does not exist') || String(error.message).includes('404') || String(error.message).includes('not found')));
      if (isNotFound) {
        throw new Error('Draft queue is not available. Please run the draft queue migration (SQL/v254_draft_queue_tables.sql) or try again later.');
      }
      throw error;
    }
    return data;
  };

  return Promise.race([
    run(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Save timed out. Please check your connection and try again.')),
        SAVE_DRAFT_TIMEOUT_MS
      )
    )
  ]);
}

/**
 * Get a draft by ID
 *
 * @param {string} draftId - Draft UUID
 * @returns {Promise<object|null>} Draft record or null
 */
export async function getDraft(draftId) {
  const { data, error } = await platformDb
    .from('draft_queue')
    .select('*')
    .eq('id', draftId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get all drafts for current user with optional filters
 *
 * @param {object} filters - Filter options
 * @returns {Promise<array>} Array of draft records
 */
export async function getUserDrafts(filters = {}) {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const {
    entityType = null,
    holdStatus = 'active',
    projectId = null,
    limit = 50,
    offset = 0
  } = filters;

  let query = platformDb
    .from('draft_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('last_saved_at', { ascending: false });

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (holdStatus) {
    query = query.eq('hold_status', holdStatus);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get drafts for a specific entity type (for contextual hold queue)
 *
 * @param {string} entityType - Entity type to filter by
 * @returns {Promise<array>} Array of draft records
 */
export async function getUserDraftsByEntity(entityType) {
  return getUserDrafts({ entityType, holdStatus: 'active' });
}

/**
 * Get draft counts by entity type (for menu badges)
 *
 * @param {string} userId - Optional user ID, defaults to current user
 * @returns {Promise<object>} Object with entity types as keys and counts as values
 */
export async function getDraftCountByEntity(userId = null) {
  if (!userId) {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  const { data, error } = await platformDb
    .rpc('get_draft_badge_counts', { p_user_id: userId });

  if (error) throw error;
  return data || {};
}

/**
 * Resume a draft - marks it as resumed and returns form data
 *
 * @param {string} draftId - Draft UUID
 * @returns {Promise<object>} Draft record with form data
 */
export async function resumeDraft(draftId) {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await platformDb
    .from('draft_queue')
    .update({
      hold_status: 'resumed',
      resumed_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a draft (soft delete)
 *
 * @param {string} draftId - Draft UUID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteDraft(draftId) {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await platformDb
    .from('draft_queue')
    .update({
      hold_status: 'deleted',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', draftId)
    .eq('user_id', user.id);

  if (error) throw error;
  return true;
}

/**
 * Update draft form data (for auto-save)
 *
 * @param {string} draftId - Draft UUID
 * @param {object} formData - Updated form data
 * @returns {Promise<object>} Updated draft record
 */
export async function updateDraft(draftId, formData) {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get current draft to determine entity type
  const current = await getDraft(draftId);
  if (!current) throw new Error('Draft not found');

  const { percentage, total, completed } = calculateCompletion(current.entity_type, formData);

  const { data, error } = await platformDb
    .from('draft_queue')
    .update({
      form_data: formData,
      entity_title: extractTitle(current.entity_type, formData),
      completion_percentage: percentage,
      required_fields_total: total,
      required_fields_completed: completed,
      updated_by: user.id
    })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Auto-save draft (debounced wrapper for updateDraft)
 * Uses in-memory debouncing - actual debounce should be handled by useDraftQueue hook
 *
 * @param {string} draftId - Draft UUID
 * @param {object} formData - Updated form data
 * @returns {Promise<object>} Updated draft record
 */
export async function autoSaveDraft(draftId, formData) {
  return updateDraft(draftId, formData);
}

// ============================================================================
// EXPIRY CONFIGURATION
// ============================================================================

/**
 * Get expiry days based on configuration hierarchy
 *
 * @param {string} organisationId - Organisation UUID
 * @param {string} projectTypeId - Project type UUID
 * @param {string} entityType - Entity type
 * @returns {Promise<number>} Expiry days
 */
export async function getExpiryConfig(organisationId, projectTypeId, entityType) {
  const { data, error } = await platformDb
    .rpc('get_draft_expiry_days', {
      p_organisation_id: organisationId,
      p_project_type_id: projectTypeId,
      p_entity_type: entityType
    });

  if (error) {
    console.warn('Error getting expiry config, using default:', error);
    return DEFAULT_EXPIRY_DAYS;
  }

  return data || DEFAULT_EXPIRY_DAYS;
}

/**
 * Calculate expiry date based on entity type and project type
 *
 * @param {string} entityType - Entity type
 * @param {string} projectTypeId - Project type UUID
 * @param {string} organisationId - Organisation UUID
 * @returns {Promise<Date>} Expiry date
 */
export async function calculateExpiryDate(entityType, projectTypeId = null, organisationId = null) {
  const expiryDays = await getExpiryConfig(organisationId, projectTypeId, entityType);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  return expiresAt;
}

/**
 * Update expiry configuration (PMO Admin only)
 *
 * @param {string} configId - Config UUID
 * @param {object} settings - New settings
 * @returns {Promise<object>} Updated config
 */
export async function updateExpiryConfig(configId, settings) {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await platformDb
    .from('draft_expiry_config')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', configId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all expiry configurations for an organisation
 *
 * @param {string} organisationId - Organisation UUID
 * @returns {Promise<array>} Array of config records
 */
export async function getExpiryConfigs(organisationId = null) {
  let query = platformDb
    .from('draft_expiry_config')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (organisationId) {
    query = query.or(`organisation_id.is.null,organisation_id.eq.${organisationId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate form completion percentage based on required fields
 *
 * @param {string} entityType - Entity type
 * @param {object} formData - Form data
 * @returns {object} { percentage, total, completed }
 */
export function calculateCompletion(entityType, formData) {
  const requiredFields = getRequiredFields(entityType);
  if (!requiredFields.length) {
    return { percentage: 0, total: 0, completed: 0 };
  }

  let completed = 0;
  requiredFields.forEach(field => {
    const value = formData[field];
    if (value !== null && value !== undefined && value !== '' &&
        !(Array.isArray(value) && value.length === 0)) {
      completed++;
    }
  });

  const percentage = Math.round((completed / requiredFields.length) * 100);
  return {
    percentage,
    total: requiredFields.length,
    completed
  };
}

/**
 * Get required fields for an entity type
 *
 * @param {string} entityType - Entity type
 * @returns {array} Array of required field names
 */
export function getRequiredFields(entityType) {
  const fieldMappings = {
    project: ['project_name', 'project_description', 'project_manager_id'],
    project_brief: ['brief_title', 'project_definition', 'project_objectives'],
    project_mandate: ['mandate_title', 'purpose', 'background'],
    benefit: ['benefit_name', 'benefit_type', 'owner_id'],
    benefits_review_plan: ['plan_name', 'review_schedule'],
    qms: ['strategy_name', 'quality_standards'],
    rms: ['strategy_name', 'risk_tolerance'],
    cms: ['strategy_name', 'communication_methods'],
    configuration_ms: ['strategy_name', 'configuration_items'],
    configuration_item: ['item_name', 'item_type', 'owner_id'],
    issue: ['issue_title', 'severity', 'assigned_to'],
    issue_report: ['report_title', 'issue_id'],
    risk: ['risk_title', 'probability', 'impact'],
    daily_log: ['log_date', 'entry_type'],
    lessons_log: ['lesson_title', 'category'],
    lessons_report: ['report_title', 'period_start', 'period_end'],
    quality: ['activity_name', 'quality_method'],
    work_package: ['package_name', 'description', 'assigned_to'],
    product_description: ['product_name', 'purpose', 'composition'],
    product_status_account: ['product_id', 'status'],
    pid: ['document_title', 'project_definition'],
    plan: ['plan_name', 'plan_type'],
    checkpoint_report: ['report_title', 'period_start', 'period_end'],
    end_stage_report: ['report_title', 'stage_name'],
    end_project_report: ['report_title'],
    exception_report: ['report_title', 'exception_type'],
    highlight_report: ['report_title', 'period_start', 'period_end'],
    stakeholder: ['stakeholder_name'],
    practice_stakeholder: ['stakeholder_name'],
    stakeholder_assessment_matrix: ['stakeholder_id', 'current_level', 'desired_level'],
    practice_stakeholder_assessment_matrix: ['practice_stakeholder_id', 'current_level', 'desired_level']
  };

  return fieldMappings[entityType] || [];
}

/**
 * Extract title from form data based on entity type
 *
 * @param {string} entityType - Entity type
 * @param {object} formData - Form data
 * @returns {string} Extracted title
 */
export function extractTitle(entityType, formData) {
  const titleFields = {
    project: 'project_name',
    project_brief: 'brief_title',
    project_mandate: 'mandate_title',
    benefit: 'benefit_name',
    benefits_review_plan: 'plan_name',
    qms: 'strategy_name',
    rms: 'strategy_name',
    cms: 'strategy_name',
    configuration_ms: 'strategy_name',
    configuration_item: 'item_name',
    issue: 'issue_title',
    issue_report: 'report_title',
    risk: 'risk_title',
    daily_log: 'entry_title',
    lessons_log: 'lesson_title',
    lessons_report: 'report_title',
    quality: 'activity_name',
    work_package: 'package_name',
    product_description: 'product_name',
    product_status_account: 'product_name',
    pid: 'document_title',
    plan: 'plan_name',
    checkpoint_report: 'report_title',
    end_stage_report: 'report_title',
    end_project_report: 'report_title',
    exception_report: 'report_title',
    highlight_report: 'report_title',
    stakeholder: 'stakeholder_name',
    practice_stakeholder: 'stakeholder_name',
    stakeholder_assessment_matrix: 'stakeholder_id',
    practice_stakeholder_assessment_matrix: 'practice_stakeholder_id'
  };

  const field = titleFields[entityType] || 'name';
  return formData[field] || `Untitled ${entityType}`;
}

/**
 * Check if user has an existing draft for entity type/id
 *
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID (null for create mode)
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Existing draft or null
 */
export async function checkExistingDraft(entityType, entityId = null, userId = null) {
  if (!userId) {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data, error } = await platformDb
    .rpc('check_existing_draft', {
      p_user_id: userId,
      p_entity_type: entityType,
      p_entity_id: entityId
    });

  if (error) {
    console.warn('Error checking existing draft:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Expire old drafts (run via cron or admin action)
 *
 * @returns {Promise<number>} Number of expired drafts
 */
export async function expireOldDrafts() {
  const { data, error } = await platformDb.rpc('expire_old_drafts');
  if (error) throw error;
  return data || 0;
}

/**
 * Get draft statistics for current user
 * Returns default stats if RPC or table is missing (e.g. 404) so UI still loads.
 *
 * @returns {Promise<object>} Draft statistics
 */
export async function getDraftStats() {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await platformDb
    .rpc('get_user_draft_stats', { p_user_id: user.id });

  if (error) {
    console.warn('get_user_draft_stats failed (draft queue may not be deployed):', error.message);
    return {
      total_drafts: 0,
      active_drafts: 0,
      expiring_soon: 0,
      remaining_slots: MAX_ACTIVE_DRAFTS,
      by_entity_type: {}
    };
  }

  return data && data.length > 0 ? data[0] : {
    total_drafts: 0,
    active_drafts: 0,
    expiring_soon: 0,
    remaining_slots: MAX_ACTIVE_DRAFTS,
    by_entity_type: {}
  };
}

/**
 * Check if user can create more drafts
 *
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if under limit
 */
export async function checkDraftLimit(userId = null) {
  if (!userId) {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await platformDb
    .from('draft_queue')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('hold_status', 'active')
    .eq('is_deleted', false);

  if (error) {
    console.warn('Error checking draft limit:', error);
    // Permission denied (42501) or Forbidden (403): don't treat as "at limit"; allow attempt so insert fails with clear message
    if (error.code === '42501' || error.status === 403) {
      return true;
    }
    return false;
  }

  return (data?.length || 0) < MAX_ACTIVE_DRAFTS;
}

/**
 * Get drafts that are expiring soon (for notifications)
 *
 * @param {number} warningDays - Days before expiry to warn
 * @returns {Promise<array>} Array of expiring drafts
 */
export async function getExpiringDrafts(warningDays = 3) {
  const { data, error } = await platformDb
    .rpc('get_expiring_drafts', { p_warning_days: warningDays });

  if (error) throw error;
  return data || [];
}

/**
 * Clear all expired drafts for current user
 *
 * @returns {Promise<number>} Number of cleared drafts
 */
export async function clearExpiredDrafts() {
  const { data: { user } } = await platformDb.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await platformDb
    .from('draft_queue')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('user_id', user.id)
    .eq('hold_status', 'expired')
    .eq('is_deleted', false)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // CRUD
  saveDraft,
  getDraft,
  getUserDrafts,
  getUserDraftsByEntity,
  getDraftCountByEntity,
  resumeDraft,
  deleteDraft,
  updateDraft,
  autoSaveDraft,

  // Expiry
  getExpiryConfig,
  calculateExpiryDate,
  updateExpiryConfig,
  getExpiryConfigs,

  // Utilities
  calculateCompletion,
  getRequiredFields,
  extractTitle,
  checkExistingDraft,
  expireOldDrafts,
  getDraftStats,
  checkDraftLimit,
  getExpiringDrafts,
  clearExpiredDrafts,

  // Constants
  MAX_ACTIVE_DRAFTS,
  DEFAULT_EXPIRY_DAYS,
  AUTO_SAVE_DEBOUNCE_MS
};
