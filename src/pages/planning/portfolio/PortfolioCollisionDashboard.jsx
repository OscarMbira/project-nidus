import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { platformDb } from '../../../services/supabase/supabaseClient'
import * as api from '../../../services/planCollisionService'

/** PMO / portfolio — requires organisation context via ?orgId= or first linked org from user */
export default function PortfolioCollisionDashboard() {
  const [orgId, setOrgId] = useState('')
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: userData } = await platformDb.auth.getUser()
      if (!userData?.user) return
      const { data: u } = await platformDb.from('users').select('organisation_id').eq('auth_user_id', userData.user.id).maybeSingle()
      if (u?.organisation_id) setOrgId(u.organisation_id)
    })()
  }, [])

  const load = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const rows = await api.getCollisionAlerts(orgId)
      setAlerts(rows || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const detect = async () => {
    if (!orgId) return
    try {
      const n = await api.detectCollisions(orgId)
      toast.success(`Detection finished (${n ?? 0} alerts).`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Detection failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Portfolio collision alerts</h1>
        <p className="text-gray-500 text-sm mb-4">PMO / portfolio view — resource overlaps across projects.</p>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm"
            placeholder="Organisation UUID"
          />
          <button type="button" onClick={load} className="rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm">
            Refresh
          </button>
          <button type="button" onClick={detect} className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm">
            Detect collisions
          </button>
        </div>
        {loading && <p className="text-gray-500">Loading…</p>}
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-lg border border-gray-700 p-3 text-sm bg-gray-900/50">
              <span className="text-amber-400 capitalize">{a.collision_type}</span>
              <p className="text-gray-300 mt-1">{a.description}</p>
              <p className="text-gray-500 text-xs mt-1">{a.severity} · {a.status}</p>
            </li>
          ))}
        </ul>
        {!loading && alerts.length === 0 && orgId && <p className="text-gray-500 text-sm">No alerts.</p>}
      </div>
    </div>
  )
}
