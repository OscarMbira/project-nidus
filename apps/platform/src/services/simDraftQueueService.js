/**
 * Simulator Draft Queue Service
 *
 * Handles all draft/hold queue operations for Simulator practice forms.
 * Uses the sim schema for all database operations.
 *
 * @version v255
 * @created 2026-01-31
 */

import { simDb } from './supabaseClient';
import { supabase } from './supabaseClient';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_ACTIVE_DRAFTS = 15;
const DEFAULT_EXPIRY_DAYS = 14;
const AUTO_SAVE_DEBOUNCE_MS = 60000; // 60 seconds

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Save a new simulator draft or update existing one
 *
 * @param {string} entityType - Type of practice entity (sim_project, sim_benefit, etc.)
 * @param {object} formData - Current form state
 * @param {string|null} entityId - Entity ID for edit mode, null for create
 * @param {object} options - Additional options
 * @returns {Promise<object>} Saved draft record
 */
export async function saveDraft(entityType, formData, entityId = null, options = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const {
    scenarioId = null,
    holdReason = null,
    entityTitle = null,
    formRoute = null
  } = options;

  // Get expiry days from configuration
  const expiryDays = await getExpiryConfig(entityType);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // Calculate completion percentage
  const { percentage, total, completed } = calculateCompletion(entityType, formData);

  // Check if we're updating an existing draft
  const existingDraft = await checkExistingDraft(entityType, entityId, user.id);

  if (existingDraft) {
    // Update existing draft
    const { data, error } = await simDb
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

    if (error) throw error;
    return data;
  }

  // Check draft limit before creating new
  const canCreate = await checkDraftLimit(user.id);
  if (!canCreate) {
    throw new Error('Maximum active practice drafts limit (15) reached. Please resume or delete existing drafts.');
  }

  // Create new draft
  const { data, error } = await simDb
    .from('draft_queue')
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
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

  if (error) throw error;
  return data;
}

/**
 * Get a draft by ID
 *
 * @param {string} draftId - Draft UUID
 * @returns {Promise<object|null>} Draft record or null
 */
export async function getDraft(draftId) {
  const { data, error } = await simDb
    .from('draft_queue')
    .select('*')
    .eq('id', draftId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get all simulator drafts for current user with optional filters
 *
 * @param {object} filters - Filter options
 * @returns {Promise<array>} Array of draft records
 */
export async function getUserDrafts(filters = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const {
    entityType = null,
    holdStatus = 'active',
    scenarioId = null,
    limit = 50,
    offset = 0
  } = filters;

  let query = simDb
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

  if (scenarioId) {
    query = query.eq('scenario_id', scenarioId);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get simulator drafts for a specific entity type
 *
 * @param {string} entityType - Entity type to filter by
 * @returns {Promise<array>} Array of draft records
 */
export async function getUserDraftsByEntity(entityType) {
  return getUserDrafts({ entityType, holdStatus: 'active' });
}

/**
 * Get draft counts by entity type for menu badges
 *
 * @param {string} userId - Optional user ID
 * @returns {Promise<object>} Object with entity types as keys and counts as values
 */
export async function getDraftCountByEntity(userId = null) {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  const { data, error } = await simDb
    .rpc('get_draft_badge_counts', { p_user_id: userId });

  if (error) throw error;
  return data || {};
}

/**
 * Resume a draft
 *
 * @param {string} draftId - Draft UUID
 * @returns {Promise<object>} Draft record with form data
 */
export async function resumeDraft(draftId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await simDb
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await simDb
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
 * Update draft form data
 *
 * @param {string} draftId - Draft UUID
 * @param {object} formData - Updated form data
 * @returns {Promise<object>} Updated draft record
 */
export async function updateDraft(draftId, formData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const current = await getDraft(draftId);
  if (!current) throw new Error('Draft not found');

  const { percentage, total, completed } = calculateCompletion(current.entity_type, formData);

  const { data, error } = await simDb
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
 * Auto-save draft
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
 * Get expiry days for entity type
 *
 * @param {string} entityType - Entity type
 * @returns {Promise<number>} Expiry days
 */
export async function getExpiryConfig(entityType) {
  const { data, error } = await simDb
    .rpc('get_draft_expiry_days', { p_entity_type: entityType });

  if (error) {
    console.warn('Error getting sim expiry config:', error);
    return DEFAULT_EXPIRY_DAYS;
  }

  return data || DEFAULT_EXPIRY_DAYS;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate form completion percentage
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
  return { percentage, total: requiredFields.length, completed };
}

/**
 * Get required fields for simulator entity type
 *
 * @param {string} entityType - Entity type (sim_ prefixed)
 * @returns {array} Array of required field names
 */
export function getRequiredFields(entityType) {
  const fieldMappings = {
    sim_project: ['project_name', 'project_description', 'scenario_id'],
    sim_project_brief: ['brief_title', 'project_definition', 'project_objectives'],
    sim_project_mandate: ['mandate_title', 'purpose', 'background'],
    sim_benefit: ['benefit_name', 'benefit_type'],
    sim_qms: ['strategy_name', 'quality_standards'],
    sim_rms: ['strategy_name', 'risk_tolerance'],
    sim_cms: ['strategy_name', 'communication_methods'],
    sim_configuration_ms: ['strategy_name', 'configuration_items'],
    sim_issue: ['issue_title', 'severity'],
    sim_risk: ['risk_title', 'probability', 'impact'],
    sim_daily_log: ['log_date', 'entry_type'],
    sim_lessons_log: ['lesson_title', 'category'],
    sim_quality: ['activity_name', 'quality_method'],
    sim_work_package: ['package_name', 'description'],
    sim_product_description: ['product_name', 'purpose'],
    sim_pid: ['document_title', 'project_definition'],
    sim_plan: ['plan_name', 'plan_type'],
    sim_checkpoint_report: ['report_title', 'period_start', 'period_end'],
    sim_end_stage_report: ['report_title', 'stage_name'],
    sim_end_project_report: ['report_title'],
    sim_exception_report: ['report_title', 'exception_type'],
    sim_highlight_report: ['report_title', 'period_start', 'period_end']
  };

  return fieldMappings[entityType] || [];
}

/**
 * Extract title from form data
 *
 * @param {string} entityType - Entity type
 * @param {object} formData - Form data
 * @returns {string} Extracted title
 */
export function extractTitle(entityType, formData) {
  const titleFields = {
    sim_project: 'project_name',
    sim_project_brief: 'brief_title',
    sim_project_mandate: 'mandate_title',
    sim_benefit: 'benefit_name',
    sim_qms: 'strategy_name',
    sim_rms: 'strategy_name',
    sim_cms: 'strategy_name',
    sim_configuration_ms: 'strategy_name',
    sim_issue: 'issue_title',
    sim_risk: 'risk_title',
    sim_daily_log: 'entry_title',
    sim_lessons_log: 'lesson_title',
    sim_quality: 'activity_name',
    sim_work_package: 'package_name',
    sim_product_description: 'product_name',
    sim_pid: 'document_title',
    sim_plan: 'plan_name',
    sim_checkpoint_report: 'report_title',
    sim_end_stage_report: 'report_title',
    sim_end_project_report: 'report_title',
    sim_exception_report: 'report_title',
    sim_highlight_report: 'report_title'
  };

  const field = titleFields[entityType] || 'name';
  const cleanType = entityType.replace('sim_', '');
  return formData[field] || `Untitled Practice ${cleanType}`;
}

/**
 * Check if user has an existing draft
 *
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Existing draft or null
 */
export async function checkExistingDraft(entityType, entityId = null, userId = null) {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data, error } = await simDb
    .rpc('check_existing_draft', {
      p_user_id: userId,
      p_entity_type: entityType,
      p_entity_id: entityId
    });

  if (error) {
    console.warn('Error checking existing sim draft:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get draft statistics for current user
 *
 * @returns {Promise<object>} Draft statistics
 */
export async function getDraftStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await simDb
    .rpc('get_user_draft_stats', { p_user_id: user.id });

  if (error) throw error;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await simDb
    .from('draft_queue')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('hold_status', 'active')
    .eq('is_deleted', false);

  if (error) {
    console.warn('Error checking sim draft limit:', error);
    return false;
  }

  return (data?.length || 0) < MAX_ACTIVE_DRAFTS;
}

/**
 * Clear all expired drafts for current user
 *
 * @returns {Promise<number>} Number of cleared drafts
 */
export async function clearExpiredDrafts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await simDb
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
  saveDraft,
  getDraft,
  getUserDrafts,
  getUserDraftsByEntity,
  getDraftCountByEntity,
  resumeDraft,
  deleteDraft,
  updateDraft,
  autoSaveDraft,
  getExpiryConfig,
  calculateCompletion,
  getRequiredFields,
  extractTitle,
  checkExistingDraft,
  getDraftStats,
  checkDraftLimit,
  clearExpiredDrafts,
  MAX_ACTIVE_DRAFTS,
  DEFAULT_EXPIRY_DAYS,
  AUTO_SAVE_DEBOUNCE_MS
};
