/**
 * Bulk invite draft / hold queue CRUD (bulk_invite_drafts table).
 */

import { platformDb } from './supabase/supabaseClient'

async function getCurrentUserId() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user?.id) return null
  const { data } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.id || null
}

/**
 * @param {string} projectId
 * @param {{
 *   defaultRoleId?: string|null,
 *   message?: string|null,
 *   members?: unknown[],
 *   pendingNewRoles?: unknown[],
 *   validationErrors?: unknown[],
 * }} payload
 * @param {string|null} [draftId]
 */
export async function saveDraft(projectId, payload, draftId = null) {
  try {
    const createdBy = await getCurrentUserId()
    if (!createdBy) {
      return { success: false, draftId: null, error: 'Not authenticated' }
    }

    const row = {
      project_id: projectId,
      created_by: createdBy,
      default_role_id: payload.defaultRoleId || null,
      custom_message: payload.message ?? null,
      members: payload.members ?? [],
      pending_new_roles: payload.pendingNewRoles ?? [],
      validation_errors: payload.validationErrors ?? [],
      draft_status: 'draft',
    }

    let targetId = draftId
    if (!targetId) {
      const existing = await loadDraft(projectId)
      targetId = existing.data?.id || null
    }

    if (targetId) {
      const { data, error } = await platformDb
        .from('bulk_invite_drafts')
        .update(row)
        .eq('id', targetId)
        .select('id')
        .single()
      if (error) throw error
      return { success: true, draftId: data.id, error: null }
    }

    const { data, error } = await platformDb
      .from('bulk_invite_drafts')
      .insert(row)
      .select('id')
      .single()
    if (error) throw error
    return { success: true, draftId: data.id, error: null }
  } catch (err) {
    console.error('[saveDraft]', err)
    return { success: false, draftId: null, error: err.message || 'Failed to save draft' }
  }
}

/**
 * Latest draft for project + current user.
 */
export async function loadDraft(projectId) {
  try {
    const createdBy = await getCurrentUserId()
    if (!createdBy) {
      return { success: false, data: null, error: 'Not authenticated' }
    }

    const { data, error } = await platformDb
      .from('bulk_invite_drafts')
      .select('*')
      .eq('project_id', projectId)
      .eq('created_by', createdBy)
      .eq('draft_status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: true, data: null, error: null }

    return {
      success: true,
      data: {
        id: data.id,
        projectId: data.project_id,
        defaultRoleId: data.default_role_id,
        message: data.custom_message,
        members: data.members || [],
        pendingNewRoles: data.pending_new_roles || [],
        validationErrors: data.validation_errors || [],
        draftStatus: data.draft_status,
        results: data.results,
        updatedAt: data.updated_at,
      },
      error: null,
    }
  } catch (err) {
    console.error('[loadDraft]', err)
    return { success: false, data: null, error: err.message || 'Failed to load draft' }
  }
}

export async function deleteDraft(draftId) {
  try {
    const { error } = await platformDb.from('bulk_invite_drafts').delete().eq('id', draftId)
    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error('[deleteDraft]', err)
    return { success: false, error: err.message || 'Failed to delete draft' }
  }
}

export async function updateDraftResults(draftId, results, status = 'completed') {
  try {
    const { error } = await platformDb
      .from('bulk_invite_drafts')
      .update({
        results,
        draft_status: status,
      })
      .eq('id', draftId)
    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    console.error('[updateDraftResults]', err)
    return { success: false, error: err.message || 'Failed to update draft results' }
  }
}

export default {
  saveDraft,
  loadDraft,
  deleteDraft,
  updateDraftResults,
}
