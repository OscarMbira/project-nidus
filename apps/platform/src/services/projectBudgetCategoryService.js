/**
 * Project Budget Categories – per-project budget lines (category + amount + funding source)
 */

import { platformDb } from './supabase/supabaseClient';

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

const BUDGET_STEP_MS = 45000;

/**
 * Get budget categories for a project
 */
export async function getByProjectId(projectId) {
  try {
    // Select rows only — avoid embedding `funding_sources` (extra RLS on FK target can 403 the whole request).
    const { data, error } = await platformDb
      .from('project_budget_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    const rows = data || [];

    const fundIds = [...new Set(rows.map((r) => r.funding_source_id).filter(Boolean))];
    let fundById = new Map();
    if (fundIds.length > 0) {
      const { data: funds, error: fe } = await platformDb
        .from('funding_sources')
        .select('id, name, code')
        .in('id', fundIds);
      if (!fe && funds?.length) {
        fundById = new Map(funds.map((f) => [f.id, f]));
      }
    }

    const enriched = rows.map((r) => ({
      ...r,
      funding_sources: r.funding_source_id ? fundById.get(r.funding_source_id) ?? null : null,
    }));

    return { success: true, data: enriched };
  } catch (e) {
    const msg = e?.message || e?.details || String(e);
    console.error('Error fetching project budget categories:', msg, e?.code != null ? { code: e.code } : '');
    return { success: false, error: msg, data: [] };
  }
}

/**
 * Save budget categories for a project (replaces existing)
 * @param {string} projectId
 * @param {Array<{ category_name: string, budget_amount: number, funding_source_id?: string }>} categories
 */
export async function saveForProject(projectId, categories) {
  try {
    const { error: delErr } = await withTimeout(
      platformDb.from('project_budget_categories').delete().eq('project_id', projectId),
      BUDGET_STEP_MS,
      'Removing previous budget lines timed out.',
    );
    if (delErr) throw delErr;

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

    const { data, error } = await withTimeout(
      platformDb
        .from('project_budget_categories')
        .insert(rows)
        .select(),
      BUDGET_STEP_MS,
      'Inserting budget lines timed out.',
    );

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e) {
    const msg = e?.message || e?.details || String(e);
    console.error('Error saving project budget categories:', msg);
    return { success: false, error: msg, data: [] };
  }
}

export default { getByProjectId, saveForProject };
