import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listMaps } from '../../services/leanValueStreamService'
import { listKaizenItems } from '../../services/leanKaizenService'

export default function LeanMetrics() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [maps, setMaps] = useState([])
  const [kaizen, setKaizen] = useState([])
  const [taktNum, setTaktNum] = useState('480')
  const [demand, setDemand] = useState('10')

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const [m, k] = await Promise.all([listMaps(projectId), listKaizenItems(projectId)])
        if (!cancelled) {
          setMaps(m)
          setKaizen(k)
        }
      } catch (e) {
        toast.error(e?.message || 'Failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const wasteBreakdown = kaizen.reduce((acc, i) => {
    acc[i.waste_type] = (acc[i.waste_type] || 0) + 1
    return acc
  }, {})

  const takt = Number(demand) > 0 ? Number(taktNum) / Number(demand) : 0
  const avgFe =
    maps.length > 0
      ? maps.reduce((s, m) => s + (m.map_data?.metrics?.flow_efficiency_pct || 0), 0) / maps.length
      : 0

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
      <h1 className="text-2xl font-bold text-white mb-6">Lean metrics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="text-xs text-gray-500">Avg flow efficiency (from VSM)</div>
          <div className="text-2xl font-semibold text-emerald-400">{avgFe.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="text-xs text-gray-500 mb-2">Takt time (min/unit)</div>
          <div className="flex gap-2 text-sm">
            <input value={taktNum} onChange={(e) => setTaktNum(e.target.value)} className="w-20 rounded border border-gray-700 bg-gray-950 px-1" />
            <span>/</span>
            <input value={demand} onChange={(e) => setDemand(e.target.value)} className="w-20 rounded border border-gray-700 bg-gray-950 px-1" />
          </div>
          <div className="text-xl font-semibold mt-2">{takt.toFixed(1)} min</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="text-xs text-gray-500">Kaizen items</div>
          <div className="text-2xl font-semibold">{kaizen.length}</div>
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-2">Waste mix</h2>
      <ul className="text-sm space-y-1">
        {Object.entries(wasteBreakdown).map(([k, v]) => (
          <li key={k}>
            {k}: {v}
          </li>
        ))}
      </ul>
    </div>
  )
}
