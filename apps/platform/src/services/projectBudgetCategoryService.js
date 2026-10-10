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
 * Snapshot the project's CURRENT budget lines into project_budget_revisions, before they're
 * overwritten. No-op (not an error) when there's nothing to snapshot yet — a brand-new project
 * with no prior lines has no revision to preserve.
 */
async function snapshotCurrentRevision(projectId, userId) {
  const { data: current, error: fetchErr } = await platformDb
    .from('project_budget_categories')
    .select('category_name, budget_amount, funding_source_id, display_order')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });
  if (fetchErr) throw fetchErr;
  if (!current || current.length === 0) return;

  const { data: projectRow, error: projErr } = await platformDb
    .from('projects')
    .select('budget_currency, budget_approval_status')
    .eq('id', projectId)
    .maybeSingle();
  if (projErr) throw projErr;

  const { data: lastRevision, error: lastErr } = await platformDb
    .from('project_budget_revisions')
    .select('revision_number')
    .eq('project_id', projectId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;

  const nextRevisionNumber = (lastRevision?.revision_number || 0) + 1;
  const totalAmount = current.reduce((sum, c) => sum + (Number(c.budget_amount) || 0), 0);

  const { error: insertErr } = await platformDb.from('project_budget_revisions').insert({
    project_id: projectId,
    revision_number: nextRevisionNumber,
    budget_categories: current,
    total_amount: totalAmount,
    currency: projectRow?.budget_currency || null,
    approval_status_at_revision: projectRow?.budget_approval_status || null,
    created_by: userId || null,
  });
  if (insertErr) throw insertErr;
}

/**
 * Get budget revision history for a project, most recent first.
 */
export async function getRevisions(projectId) {
  try {
    const { data, error } = await platformDb
      .from('project_budget_revisions')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('revision_number', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (e) {
    const msg = e?.message || e?.details || String(e);
    console.error('Error fetching project budget revisions:', msg);
    return { success: false, error: msg, data: [] };
  }
}

/**
 * Set the project's budget approval status, recording who approved it and when (only when moving
 * to 'approved' — rejecting or resetting to pending clears the audit fields).
 */
export async function setApprovalStatus(projectId, status, userId) {
  try {
    const patch = { budget_approval_status: status };
    if (status === 'approved') {
      patch.budget_approved_by = userId || null;
      patch.budget_approved_at = new Date().toISOString();
    } else {
      patch.budget_approved_by = null;
      patch.budget_approved_at = null;
    }
    const { data, error } = await platformDb
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .select('budget_approval_status, budget_approved_by, budget_approved_at')
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (e) {
    const msg = e?.message || e?.details || String(e);
    console.error('Error setting budget approval status:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Save budget categories for a project (replaces existing). Snapshots the outgoing set into
 * project_budget_revisions first, so the previous budget structure is never lost.
 * @param {string} projectId
 * @param {Array<{ category_name: string, budget_amount: number, funding_source_id?: string }>} categories
 * @param {string} [userId] - current app user id, recorded on the revision snapshot
 */
export async function saveForProject(projectId, categories, userId) {
  try {
    await snapshotCurrentRevision(projectId, userId);

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
        notes: c.notes || null,
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

export default { getByProjectId, saveForProject, getRevisions, setApprovalStatus };
