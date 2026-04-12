import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listMaps, saveMap } from '../../services/leanValueStreamService'
import { supabase } from '../../services/supabaseClient'

const defaultMapData = () => ({
  nodes: [
    { id: 'n1', label: 'Request', process_time_min: 10, wait_time_min: 60, x: 40, y: 40 },
    { id: 'n2', label: 'Build', process_time_min: 120, wait_time_min: 30, x: 200, y: 40 },
  ],
  edges: [{ from: 'n1', to: 'n2' }],
})

export default function ValueStreamMap() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [maps, setMaps] = useState([])
  const [name, setName] = useState('Main map')
  const [uid, setUid] = useState(null)

  const load = async () => {
    if (!projectId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
      setMaps(await listMaps(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const save = async () => {
    if (!projectId || !uid) return
    try {
      const md = defaultMapData()
      const lead = md.nodes.reduce((s, n) => s + (n.process_time_min || 0) + (n.wait_time_min || 0), 0)
      const proc = md.nodes.reduce((s, n) => s + (n.process_time_min || 0), 0)
      const fe = lead > 0 ? Math.round((proc / lead) * 1000) / 10 : 0
      await saveMap({
        project_id: projectId,
        map_name: name,
        map_data: { ...md, metrics: { lead_time_min: lead, process_time_min: proc, flow_efficiency_pct: fe } },
        created_by_user_id: uid,
      })
      toast.success('Value stream map saved')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  if (pidLoading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-4">Value stream map</h1>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm" />
        <button type="button" onClick={save} className="px-3 py-1 rounded bg-blue-600 text-sm">
          Save map
        </button>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 h-64 relative">
        <p className="text-xs text-gray-500 mb-2">Simplified canvas — extend nodes in map_data (JSON).</p>
        <div className="flex gap-8">
          <div className="border border-gray-700 rounded p-4 w-32 text-center text-sm">Request</div>
          <span className="self-center text-gray-600">→</span>
          <div className="border border-gray-700 rounded p-4 w-32 text-center text-sm">Build</div>
        </div>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {maps.map((m) => (
          <li key={m.id} className="border border-gray-800 rounded p-2">
            {m.map_name} — {m.map_data?.metrics?.flow_efficiency_pct != null ? `${m.map_data.metrics.flow_efficiency_pct}% flow eff.` : 'no metrics'}
          </li>
        ))}
      </ul>
    </div>
  )
}
