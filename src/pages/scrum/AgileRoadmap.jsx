import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listReleases } from '../../services/agileReleaseService'
import { platformProjectPath } from '../../utils/projectRouteParam'

export default function AgileRoadmap() {
  const { projectId, routeKey, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await listReleases(projectId)
        if (!cancelled) setRows(r)
      } catch (e) {
        toast.error(e?.message || 'Failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

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
      <h1 className="text-2xl font-bold text-white mb-6">Release roadmap</h1>
      <div className="relative border-l-2 border-gray-700 ml-3 space-y-8 pl-6">
        {rows.map((r) => (
          <div key={r.id} className="relative">
            <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-gray-950" />
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-semibold text-white">{r.release_name}</div>
                  <div className="text-xs text-gray-500">{r.release_status}</div>
                </div>
                <div className="text-sm text-gray-400">
                  {r.target_date ? format(new Date(r.target_date), 'MMM d, yyyy') : 'No date'}
                </div>
              </div>
              <Link to={platformProjectPath(routeKey, 'scrum', 'releases', r.id)} className="text-blue-400 text-sm mt-2 inline-block">
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
