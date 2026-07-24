import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listReleases } from '../../services/simAgileReleaseService'

export default function SimAgileRoadmap() {
  const { projectId } = useParams()
  const [rows, setRows] = useState([])

  useEffect(() => {
    listReleases(projectId)
      .then(setRows)
      .catch((e) => toast.error(e?.message))
  }, [projectId])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Roadmap (sim)</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="border border-gray-800 rounded p-3">
            {r.release_name} — {r.release_status}
          </li>
        ))}
      </ul>
    </div>
  )
}
