import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listMaps, saveMap } from '../../services/simLeanValueStreamService'
import { simDb, platformDb } from '../../services/supabase/supabaseClient'

export default function SimValueStreamMap() {
  const { projectId } = useParams()
  const [maps, setMaps] = useState([])

  const load = async () => setMaps(await listMaps(projectId))

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const save = async () => {
    const { data: { user } } = await simDb.auth.getUser()
    let uid = null
    if (user) {
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      uid = u?.id || null
    }
    const map_data = {
      nodes: [{ id: 'n1', label: 'Step', process_time_min: 5, wait_time_min: 10, x: 0, y: 0 }],
      edges: [],
      metrics: { lead_time_min: 15, process_time_min: 5, flow_efficiency_pct: 33.3 },
    }
    await saveMap({
      practice_project_id: projectId,
      map_name: 'Practice map',
      map_data,
      created_by_user_id: uid,
    })
    toast.success('Saved')
    load()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Value stream (sim)</h1>
      <button type="button" onClick={save} className="px-4 py-2 rounded bg-blue-600 text-sm">
        Save sample map
      </button>
      <ul className="mt-6 text-sm space-y-2">
        {maps.map((m) => (
          <li key={m.id} className="border border-gray-800 rounded p-2">
            {m.map_name}
          </li>
        ))}
      </ul>
    </div>
  )
}
