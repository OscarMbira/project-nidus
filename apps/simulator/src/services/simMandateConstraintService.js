/**
 * Simulator Mandate Constraint Service
 * Handles CRUD operations for simulator mandate constraints
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Get all constraints for a simulator mandate
 * @param {string} mandateId - The mandate UUID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getSimConstraintsByMandate = async (mandateId) => {
  try {
    const { data, error } = await simDb
      .from('mandate_constraints')
      .select(`
        *,
        constraint_category:constraint_categories(
          id,
          code,
          name,
          description,
          value_type,
          supports_operands,
          unit_options,
          operand_options,
          dropdown_options
        )
      `)
      .eq('mandate_id', mandateId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching simulator mandate constraints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a single constraint by ID
 * @param {string} constraintId - The constraint UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getSimConstraintById = async (constraintId) => {
  try {
    const { data, error } = await simDb
      .from('mandate_constraints')
      .select(`
        *,
        constraint_category:constraint_categories(
          id,
          code,
          name,
          description,
          value_type,
          supports_operands,
          unit_options,
          operand_options,
          dropdown_options
        )
      `)
      .eq('id', constraintId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching simulator constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a new simulator mandate constraint
 * @param {Object} constraintData - The constraint data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const createSimConstraint = async (constraintData) => {
  try {
    // Validate required fields
    if (!constraintData.mandate_id) {
      throw new Error('Mandate ID is required');
    }
    if (!constraintData.constraint_category_id) {
      throw new Error('Constraint category is required');
    }

    // Get next display order
    const { data: existingConstraints } = await simDb
      .from('mandate_constraints')
      .select('display_order')
      .eq('mandate_id', constraintData.mandate_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingConstraints && existingConstraints.length > 0
      ? (existingConstraints[0].display_order || 0) + 1
      : 1;

    const insertData = {
      mandate_id: constraintData.mandate_id,
      constraint_category_id: constraintData.constraint_category_id,
      operand: constraintData.operand || null,
      value_numeric: constraintData.value_numeric || null,
      value_min: constraintData.value_min || null,
      value_max: constraintData.value_max || null,
      value_text: constraintData.value_text || null,
      value_date: constraintData.value_date || null,
      unit: constraintData.unit || null,
      notes: constraintData.notes || null,
      display_order: nextOrder
    };

    const { data, error } = await simDb
      .from('mandate_constraints')
      .insert(insertData)
      .select(`
        *,
        constraint_category:constraint_categories(
          id,
          code,
          name,
          description,
          value_type,
          supports_operands,
          unit_options,
          operand_options,
          dropdown_options
        )
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating simulator constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a simulator mandate constraint
 * @param {string} constraintId - The constraint UUID
 * @param {Object} updateData - The data to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateSimConstraint = async (constraintId, updateData) => {
  try {
    const { data, error } = await simDb
      .from('mandate_constraints')
      .update({
        operand: updateData.operand,
        value_numeric: updateData.value_numeric,
        value_min: updateData.value_min,
        value_max: updateData.value_max,
        value_text: updateData.value_text,
        value_date: updateData.value_date,
        unit: updateData.unit,
        notes: updateData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', constraintId)
      .select(`
        *,
        constraint_category:constraint_categories(
          id,
          code,
          name,
          description,
          value_type,
          supports_operands,
          unit_options,
          operand_options,
          dropdown_options
        )
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating simulator constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a simulator mandate constraint (soft delete)
 * @param {string} constraintId - The constraint UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteSimConstraint = async (constraintId) => {
  try {
    const { error } = await simDb
      .from('mandate_constraints')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', constraintId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting simulator constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create constraints for a simulator mandate
 * @param {string} mandateId - The mandate UUID
 * @param {Array} constraints - Array of constraint objects
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const bulkCreateSimConstraints = async (mandateId, constraints) => {
  try {
    const insertData = constraints.map((constraint, index) => ({
      mandate_id: mandateId,
      constraint_category_id: constraint.constraint_category_id,
      operand: constraint.operand || null,
      value_numeric: constraint.value_numeric || null,
      value_min: constraint.value_min || null,
      value_max: constraint.value_max || null,
      value_text: constraint.value_text || null,
      value_date: constraint.value_date || null,
      unit: constraint.unit || null,
      notes: constraint.notes || null,
      display_order: index + 1
    }));

    const { data, error } = await simDb
      .from('mandate_constraints')
      .insert(insertData)
      .select(`
        *,
        constraint_category:constraint_categories(
          id,
          code,
          name,
          description,
          value_type
        )
      `);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error bulk creating simulator constraints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a category is already used for a simulator mandate
 * @param {string} mandateId - The mandate UUID
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, exists?: boolean, error?: string}>}
 */
export const checkSimCategoryExists = async (mandateId, categoryId) => {
  try {
    const { data, error } = await simDb
      .from('mandate_constraints')
      .select('id')
      .eq('mandate_id', mandateId)
      .eq('constraint_category_id', categoryId)
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;

    return { success: true, exists: data && data.length > 0 };
  } catch (error) {
    console.error('Error checking simulator category exists:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format constraint value for display
 * @param {Object} constraint - The constraint object with category
 * @returns {string} Formatted display value
 */
export const formatSimConstraintValue = (constraint) => {
  if (!constraint || !constraint.constraint_category) {
    return '';
  }

  const category = constraint.constraint_category;
  const { value_type } = category;

  switch (value_type) {
    case 'numeric':
      if (constraint.operand === 'between') {
        return `${constraint.unit || ''} ${constraint.value_min} - ${constraint.value_max}`.trim();
      }
      return `${constraint.operand || ''} ${constraint.unit || ''}${constraint.value_numeric || ''}`.trim();

    case 'date':
      return constraint.value_date || '';

    case 'dropdown':
    case 'text':
    default:
      return constraint.value_text || '';
  }
};
