/**
 * Project Budget Categories – per-project budget lines (category + amount + funding source)
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get budget categories for a project
 */
export async function getByProjectId(projectId) {
  try {
    const { data, error } = await platformDb
      .from('project_budget_categories')
      .select('*, funding_sources(name, code)')
      .eq('project_id', projectId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e) {
    console.error('Error fetching project budget categories:', e);
    return { success: false, error: e.message, data: [] };
  }
}

/**
 * Save budget categories for a project (replaces existing)
 * @param {string} projectId
 * @param {Array<{ category_name: string, budget_amount: number, funding_source_id?: string }>} categories
 */
export async function saveForProject(projectId, categories) {
  try {
    await platformDb.from('project_budget_categories').delete().eq('project_id', projectId);

    if (!categories || categories.length === 0) {
      return { success: true, data: [] };
    }

    const rows = categories
      .filter(c => c && (c.category_name?.trim() || c.budget_amount > 0))
      .map((c, i) => ({
        project_id: projectId,
        category_name: (c.category_name || '').trim() || 'Unnamed',
        budget_amount: Number(c.budget_amount) || 0,
        funding_source_id: c.funding_source_id || null,
        display_order: i
      }));

    if (rows.length === 0) return { success: true, data: [] };

    const { data, error } = await platformDb
      .from('project_budget_categories')
      .insert(rows)
      .select();

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e) {
    console.error('Error saving project budget categories:', e);
    return { success: false, error: e.message, data: [] };
  }
}

export default { getByProjectId, saveForProject };
