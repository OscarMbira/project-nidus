import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useCommsApi } from './useCommsApi'

export default function DirectMessages() {
  const basePath = `${useAppRoutePrefix()}/comms`
  const { channel, isSim } = useCommsApi()
  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [peers, setPeers] = useState([])

  useEffect(() => {
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      setAccountId(aid)
      const { data: auth } = await platformDb.auth.getUser()
      if (!auth?.user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
      setUserId(u?.id || null)
      if (!aid || !u?.id) return
      const { data: projects } = await platformDb.from('projects').select('id').eq('account_id', aid).eq('is_deleted', false).limit(50)
      const pids = (projects || []).map((p) => p.id)
      if (!pids.length) return
      const { data: members } = await platformDb
        .from('project_memberships')
        .select('user_id, users:user_id(id, full_name, email)')
        .in('project_id', pids)
        .eq('is_active', true)
        .eq('invitation_status', 'accepted')
      const seen = new Set()
      const list = []
      for (const m of members || []) {
        const uid = m.user_id
        if (!uid || uid === u.id || seen.has(uid)) continue
        seen.add(uid)
        list.push({ id: uid, ...m.users })
      }
      setPeers(list.slice(0, 40))
    })()
  }, [])

  const startDm = async (peerId) => {
    if (!accountId || !userId) return
    const { data, error } = isSim
      ? await channel.ensureDirectChannel(accountId, userId, peerId, null)
      : await channel.ensureDirectChannel(accountId, userId, peerId)
    if (error || !data?.id) return
    window.location.href = `${basePath}/channel/${data.id}`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Direct messages</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Start a conversation with someone from your projects.</p>
      <ul className="space-y-2">
        {peers.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900"
          >
            <span className="text-gray-900 dark:text-gray-100">{p.full_name || p.email || p.id}</span>
            <button
              type="button"
              onClick={() => startDm(p.id)}
              className="text-sm px-3 py-1.5 rounded-lg bg-cyan-600 text-white min-h-[44px]"
            >
              Message
            </button>
          </li>
        ))}
      </ul>
      {peers.length === 0 && <p className="text-sm text-gray-500">No project peers found yet.</p>}
      <Link to={`${basePath}/messages`} className="inline-block mt-6 text-cyan-600 dark:text-cyan-400 text-sm">
        ← Back to hub
      </Link>
    </div>
  )
}
