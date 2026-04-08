/**
 * Lessons Report Appendix Service
 * Manages appendices for Lessons Reports
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add appendix to report
 * @param {string} reportId - Report ID
 * @param {Object} appendixData - Appendix data
 * @returns {Promise<Object>} Created appendix
 */
export async function addAppendix(reportId, appendixData) {
  try {
    // Get current max display_order
    const { data: existing } = await platformDb
      .from('lessons_report_appendices')
      .select('display_order')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existing?.[0]?.display_order || -1;

    const appendix = {
      lessons_report_id: reportId,
      appendix_title: appendixData.appendix_title || '',
      appendix_type: appendixData.appendix_type || 'other',
      content: appendixData.content || null,
      document_url: appendixData.document_url || null,
      references: appendixData.references || [],
      display_order: appendixData.display_order || maxOrder + 1
    };

    const { data, error } = await platformDb
      .from('lessons_report_appendices')
      .insert(appendix)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding appendix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update appendix
 * @param {string} appendixId - Appendix ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated appendix
 */
export async function updateAppendix(appendixId, updates) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_appendices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', appendixId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating appendix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete appendix
 * @param {string} appendixId - Appendix ID
 * @returns {Promise<Object>} Result
 */
export async function deleteAppendix(appendixId) {
  try {
    const { error } = await platformDb
      .from('lessons_report_appendices')
      .delete()
      .eq('id', appendixId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting appendix:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get appendices for report
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Appendices list
 */
export async function getAppendices(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_appendices')
      .select('*')
      .eq('lessons_report_id', reportId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching appendices:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reorder appendices
 * @param {string} reportId - Report ID
 * @param {Array} appendixOrders - Array of {id, display_order}
 * @returns {Promise<Object>} Result
 */
export async function reorderAppendices(reportId, appendixOrders) {
  try {
    // Update each appendix's display_order
    for (const item of appendixOrders) {
      const { error } = await platformDb
        .from('lessons_report_appendices')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .eq('lessons_report_id', reportId);

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error reordering appendices:', error);
    return { success: false, error: error.message };
  }
}

export default {
  addAppendix,
  updateAppendix,
  deleteAppendix,
  getAppendices,
  reorderAppendices
};
