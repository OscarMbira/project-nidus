/**
 * Mandate Constraint Service
 * Handles CRUD operations for mandate constraints
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all constraints for a mandate
 * @param {string} mandateId - The mandate UUID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getConstraintsByMandate = async (mandateId) => {
  try {
    if (!mandateId) {
      return { success: false, error: 'Mandate ID is required' };
    }

    const { data, error } = await platformDb
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

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching mandate constraints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a single constraint by ID
 * @param {string} constraintId - The constraint UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getConstraintById = async (constraintId) => {
  try {
    const { data, error } = await platformDb
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
    console.error('Error fetching constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a new mandate constraint
 * @param {Object} constraintData - The constraint data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const createConstraint = async (constraintData) => {
  try {
    // Validate required fields
    if (!constraintData.mandate_id) {
      throw new Error('Mandate ID is required');
    }
    if (!constraintData.constraint_category_id) {
      throw new Error('Constraint category is required');
    }

    // Get next display order
    const { data: existingConstraints } = await platformDb
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
      value_numeric: constraintData.value_numeric !== undefined && constraintData.value_numeric !== null ? constraintData.value_numeric : null,
      value_min: constraintData.value_min !== undefined && constraintData.value_min !== null ? constraintData.value_min : null,
      value_max: constraintData.value_max !== undefined && constraintData.value_max !== null ? constraintData.value_max : null,
      value_text: constraintData.value_text || null,
      value_date: constraintData.value_date || null,
      unit: constraintData.unit || null,
      notes: constraintData.notes || null,
      display_order: nextOrder,
      is_active: true
      // Note: created_by omitted - will use database default or trigger
    };

    const { data, error } = await platformDb
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
    console.error('Error creating constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a mandate constraint
 * @param {string} constraintId - The constraint UUID
 * @param {Object} updateData - The data to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateConstraint = async (constraintId, updateData) => {
  try {
    const { data, error } = await platformDb
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
    console.error('Error updating constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a mandate constraint (soft delete)
 * @param {string} constraintId - The constraint UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteConstraint = async (constraintId) => {
  try {
    const { error } = await platformDb
      .from('mandate_constraints')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', constraintId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Hard delete a mandate constraint
 * @param {string} constraintId - The constraint UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const hardDeleteConstraint = async (constraintId) => {
  try {
    const { error } = await platformDb
      .from('mandate_constraints')
      .delete()
      .eq('id', constraintId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error hard deleting constraint:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create constraints for a mandate
 * @param {string} mandateId - The mandate UUID
 * @param {Array} constraints - Array of constraint objects
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const bulkCreateConstraints = async (mandateId, constraints) => {
  try {
    if (!mandateId) {
      return { success: false, error: 'Mandate ID is required' };
    }

    if (!constraints || constraints.length === 0) {
      return { success: true, data: [] };
    }

    // Validate constraint_category_id exists for each constraint
    for (let i = 0; i < constraints.length; i++) {
      if (!constraints[i].constraint_category_id) {
        return { success: false, error: `Constraint at index ${i} is missing constraint_category_id` };
      }
    }

    // Build insert data
    const insertData = constraints.map((constraint, index) => ({
      mandate_id: mandateId,
      constraint_category_id: constraint.constraint_category_id,
      operand: constraint.operand || null,
      value_numeric: constraint.value_numeric != null ? parseFloat(constraint.value_numeric) : null,
      value_min: constraint.value_min != null ? parseFloat(constraint.value_min) : null,
      value_max: constraint.value_max != null ? parseFloat(constraint.value_max) : null,
      value_text: constraint.value_text || null,
      value_date: constraint.value_date || null,
      unit: constraint.unit || null,
      notes: constraint.notes || null,
      display_order: index + 1,
      is_active: true
    }));

    // Insert with full select in one query
    const { data, error } = await platformDb
      .from('mandate_constraints')
      .insert(insertData)
      .select(`
        *,
        constraint_category:constraint_categories(
          id, code, name, description, value_type
        )
      `);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error bulk creating constraints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reorder constraints for a mandate
 * @param {string} mandateId - The mandate UUID
 * @param {Array} orderedIds - Array of constraint IDs in desired order
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const reorderConstraints = async (mandateId, orderedIds) => {
  try {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index + 1
    }));

    for (const update of updates) {
      const { error } = await platformDb
        .from('mandate_constraints')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
        .eq('mandate_id', mandateId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error reordering constraints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a category is already used for a mandate
 * @param {string} mandateId - The mandate UUID
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, exists?: boolean, error?: string}>}
 */
export const checkCategoryExists = async (mandateId, categoryId) => {
  try {
    const { data, error } = await platformDb
      .from('mandate_constraints')
      .select('id')
      .eq('mandate_id', mandateId)
      .eq('constraint_category_id', categoryId)
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;

    return { success: true, exists: data && data.length > 0 };
  } catch (error) {
    console.error('Error checking category exists:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format constraint value for display
 * @param {Object} constraint - The constraint object with category
 * @returns {string} Formatted display value
 */
export const formatConstraintValue = (constraint) => {
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

/**
 * Get constraint summary for a mandate
 * @param {string} mandateId - The mandate UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getConstraintSummary = async (mandateId) => {
  try {
    const { data, error } = await platformDb
      .from('mandate_constraints')
      .select(`
        id,
        constraint_category:constraint_categories(
          code,
          name,
          value_type
        )
      `)
      .eq('mandate_id', mandateId)
      .eq('is_active', true);

    if (error) throw error;

    const summary = {
      total: data?.length || 0,
      byType: {
        numeric: 0,
        text: 0,
        dropdown: 0,
        date: 0
      },
      categories: []
    };

    if (data) {
      data.forEach((constraint) => {
        const valueType = constraint.constraint_category?.value_type;
        if (valueType && summary.byType[valueType] !== undefined) {
          summary.byType[valueType]++;
        }
        if (constraint.constraint_category?.code) {
          summary.categories.push(constraint.constraint_category.code);
        }
      });
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting constraint summary:', error);
    return { success: false, error: error.message };
  }
};
