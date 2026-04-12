import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listMaps } from '../../services/simLeanValueStreamService'
import { listKaizenItems } from '../../services/simLeanKaizenService'

export default function SimLeanMetrics() {
  const { projectId } = useParams()
  const [maps, setMaps] = useState([])
  const [kaizen, setKaizen] = useState([])

  useEffect(() => {
    Promise.all([listMaps(projectId), listKaizenItems(projectId)])
      .then(([m, k]) => {
        setMaps(m)
        setKaizen(k)
      })
      .catch((e) => toast.error(e?.message))
  }, [projectId])

  const avgFe =
    maps.length > 0
      ? maps.reduce((s, m) => s + (m.map_data?.metrics?.flow_efficiency_pct || 0), 0) / maps.length
      : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Lean metrics (sim)</h1>
      <p className="text-emerald-400">Avg flow efficiency: {avgFe.toFixed(1)}%</p>
      <p className="text-gray-400 text-sm mt-2">Kaizen items: {kaizen.length}</p>
    </div>
  )
}
