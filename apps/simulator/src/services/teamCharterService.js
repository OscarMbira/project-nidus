import { platformDb } from './supabase/supabaseClient'
import {
  looksLikeProjectUuid,
  resolveProjectIdFromRouteSegment,
} from '@nidus/shared/utils/projectRouteParam'

const SELECT = '*'

/**
 * Resolve project UUID from URL/query key (UUID or project_code).
 * @param {string} projectIdOrCode
 * @returns {Promise<string|null>}
 */
export async function resolveTeamCharterProjectId(projectIdOrCode) {
  const key = String(projectIdOrCode || '').trim()
  if (!key) return null
  if (looksLikeProjectUuid(key)) return key
  return resolveProjectIdFromRouteSegment(key)
}

export async function getTeamCharter(projectIdOrCode) {
  const projectId = await resolveTeamCharterProjectId(projectIdOrCode)
  if (!projectId) {
    throw new Error('Project not found')
  }
  const { data, error } = await platformDb
    .from('team_charters')
    .select(SELECT)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createTeamCharter(payload) {
  const projectId = await resolveTeamCharterProjectId(payload?.project_id)
  if (!projectId) {
    throw new Error('Project not found')
  }
  const { data, error } = await platformDb
    .from('team_charters')
    .insert({ ...payload, project_id: projectId })
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateTeamCharter(id, payload) {
  const patch = { ...payload }
  if (patch.project_id != null) {
    const projectId = await resolveTeamCharterProjectId(patch.project_id)
    if (!projectId) throw new Error('Project not found')
    patch.project_id = projectId
  }
  const { data, error } = await platformDb
    .from('team_charters')
    .update(patch)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteTeamCharter(id) {
  const { error } = await platformDb
    .from('team_charters')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) throw error
}
