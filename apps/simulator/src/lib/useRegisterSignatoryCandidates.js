/**
 * People who can be chosen as signatories on a Local Register document record (v1318,
 * Simulator): the record's practice project members, or — for records with no project —
 * every practice project member the viewer can see. Returns [{ id: public.users.id, label }]
 * sorted by name (signatory rows reference public.users in both apps). Platform has its own
 * copy (user_projects).
 */
import { useEffect, useState } from 'react'
import { platformDb, simDb } from '@nidus/supabase'

async function loadCandidates({ projectId }) {
  let query = simDb.from('practice_project_memberships').select('user_id').eq('is_active', true)
  if (projectId) query = query.eq('practice_project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  const authIds = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))]
  if (authIds.length === 0) return []
  const { data: users, error: usersError } = await platformDb
    .from('users')
    .select('id, full_name, email')
    .in('auth_user_id', authIds)
  if (usersError) throw usersError
  return (users || [])
    .map((u) => ({ id: u.id, label: u.full_name || u.email || 'Team member' }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function useRegisterSignatoryCandidates({ projectId = null, enabled = true }) {
  const [members, setMembers] = useState([])
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    loadCandidates({ projectId })
      .then((list) => { if (!cancelled) setMembers(list) })
      .catch(() => { if (!cancelled) setMembers([]) })
    return () => { cancelled = true }
  }, [projectId, enabled])
  return members
}
