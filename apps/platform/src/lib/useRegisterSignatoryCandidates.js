/**
 * People who can be chosen as signatories on a Local Register document record (v1318):
 * the record's project team, or — for records with no project — everyone on the
 * organisation's projects. Returns [{ id: public.users.id, label }] sorted by name.
 * Simulator has its own copy (practice project memberships).
 */
import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'

async function loadCandidates({ projectId, accountId }) {
  let projectIds = projectId ? [projectId] : []
  if (!projectId && accountId) {
    const { data } = await platformDb.from('projects').select('id').eq('account_id', accountId).eq('is_deleted', false)
    projectIds = (data || []).map((p) => p.id)
  }
  if (projectIds.length === 0) return []
  const { data, error } = await platformDb
    .from('user_projects')
    .select('user_id, users:user_id(id, full_name, email)')
    .in('project_id', projectIds)
    .eq('is_deleted', false)
  if (error) throw error
  const byId = new Map()
  ;(data || []).forEach((r) => {
    if (r.users && !byId.has(r.user_id)) byId.set(r.user_id, r.users.full_name || r.users.email || 'Team member')
  })
  return [...byId.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function useRegisterSignatoryCandidates({ projectId = null, accountId = null, enabled = true }) {
  const [members, setMembers] = useState([])
  useEffect(() => {
    if (!enabled || (!projectId && !accountId)) return undefined
    let cancelled = false
    loadCandidates({ projectId, accountId })
      .then((list) => { if (!cancelled) setMembers(list) })
      .catch(() => { if (!cancelled) setMembers([]) })
    return () => { cancelled = true }
  }, [projectId, accountId, enabled])
  return members
}
