/**
 * Constraint Category Service
 * Handles fetching and managing constraint categories for project mandates
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get all active constraint categories
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getConstraintCategories = async () => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching constraint categories:', error);
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return { success: false, error: 'Constraint categories table not found' };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Get a single constraint category by ID
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getConstraintCategoryById = async (categoryId) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching constraint category:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a constraint category by code
 * @param {string} code - The category code (e.g., 'C01')
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getConstraintCategoryByCode = async (code) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('code', code)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching constraint category by code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get categories that support numeric operands
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getNumericCategories = async () => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('is_active', true)
      .eq('supports_operands', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching numeric categories:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get categories by value type
 * @param {string} valueType - The value type ('numeric', 'text', 'dropdown', 'date')
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getCategoriesByValueType = async (valueType) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('is_active', true)
      .eq('value_type', valueType)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching categories by value type:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search constraint categories by name or description
 * @param {string} searchTerm - The search term
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const searchConstraintCategories = async (searchTerm) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error searching constraint categories:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get operand options for a category
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getOperandOptions = async (categoryId) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('operand_options, supports_operands')
      .eq('id', categoryId)
      .single();

    if (error) throw error;

    if (!data.supports_operands) {
      return { success: true, data: [] };
    }

    return { success: true, data: data.operand_options || [] };
  } catch (error) {
    console.error('Error fetching operand options:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unit options for a category
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getUnitOptions = async (categoryId) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('unit_options')
      .eq('id', categoryId)
      .single();

    if (error) throw error;

    return { success: true, data: data.unit_options || [] };
  } catch (error) {
    console.error('Error fetching unit options:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get dropdown options for a category
 * @param {string} categoryId - The category UUID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getDropdownOptions = async (categoryId) => {
  try {
    const { data, error } = await platformDb
      .from('constraint_categories')
      .select('dropdown_options')
      .eq('id', categoryId)
      .single();

    if (error) throw error;

    return { success: true, data: data.dropdown_options || [] };
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format constraint categories for select dropdown
 * @param {Array} categories - Array of category objects
 * @returns {Array} Formatted options for select component
 */
export const formatCategoriesForSelect = (categories) => {
  if (!categories) return [];

  return categories.map((category) => ({
    value: category.id,
    label: `${category.code} - ${category.name}`,
    code: category.code,
    name: category.name,
    description: category.description,
    valueType: category.value_type,
    supportsOperands: category.supports_operands,
    unitOptions: category.unit_options,
    operandOptions: category.operand_options,
    dropdownOptions: category.dropdown_options
  }));
};

/**
 * Get operand display symbol
 * @param {string} operand - The operand value
 * @returns {string} Display symbol
 */
export const getOperandSymbol = (operand) => {
  const symbols = {
    '=': '=',
    '<': '<',
    '<=': '≤',
    '>': '>',
    '>=': '≥',
    'between': '↔'
  };
  return symbols[operand] || operand;
};

/**
 * Get operand label
 * @param {string} operand - The operand value
 * @returns {string} Human-readable label
 */
export const getOperandLabel = (operand) => {
  const labels = {
    '=': 'Equal to',
    '<': 'Less than',
    '<=': 'Less than or equal',
    '>': 'Greater than',
    '>=': 'Greater than or equal',
    'between': 'Between'
  };
  return labels[operand] || operand;
};
