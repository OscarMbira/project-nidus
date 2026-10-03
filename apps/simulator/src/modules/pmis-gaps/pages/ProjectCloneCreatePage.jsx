/**
 * Clone Project — trigger form (GAP-22, v963 Phase 16, Simulator port). Simulator mirror of
 * apps/platform/src/modules/pmis-gaps/pages/ProjectCloneCreatePage.jsx. Creates a
 * project_clone_jobs row and runs the clone synchronously against sim.practice_projects.
 * `includeTasks` is accepted for shape-compatibility with the shared job contract but is a
 * documented no-op in Simulator — practice projects have no task child table
 * (see projectCloneService.js's header comment).
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, Loader } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { listCloneableProjects, runProjectClone } from '../services/projectCloneService'

export default function ProjectCloneCreatePage({ basePath = '/simulator/pmo/admin/project-clone' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [sourceProjectId, setSourceProjectId] = useState(searchParams.get('sourceProjectId') || '')
  const [includeTasks, setIncludeTasks] = useState(true)
  const [dateShiftDays, setDateShiftDays] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const rows = await listCloneableProjects()
      setProjects(rows)
      if (!sourceProjectId && rows.length) setSourceProjectId(rows[0].id)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToList = () => navigate(basePath)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sourceProjectId) {
      setError('Choose a source project to clone')
      return
    }
    setRunning(true)
    setError(null)
    try {
      const job = await runProjectClone({
        sourceProjectId,
        cloneOptions: { includeTasks },
        dateShiftDays: Number(dateShiftDays) || 0,
      })
      setRunning(false)
      if (job.job_status === 'failed') {
        setError(job.error_message || 'The clone failed.')
        return
      }
      const sourceName = projects.find((p) => p.id === sourceProjectId)?.project_name || 'Project'
      showSuccess({
        recordId: sourceName,
        operation: 'created',
        message: `"${sourceName}" was cloned successfully.`,
        onOk: () => navigate(`${basePath}/${job.id}`),
      })
    } catch (err) {
      setRunning(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading projects…</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={goToList} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Copy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clone Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source project *</label>
          <select
            value={sourceProjectId}
            onChange={(e) => setSourceProjectId(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name} ({p.project_code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shift dates by (days)</label>
          <input
            type="number"
            value={dateShiftDays}
            onChange={(e) => setDateShiftDays(e.target.value)}
            className="w-full sm:w-40 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Applies to the new project's start date.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What to clone</label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked disabled className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
            Project core fields (always included)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-2">
            <input type="checkbox" checked={includeTasks} onChange={(e) => setIncludeTasks(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
            Tasks
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Practice projects have no task child table in the Simulator — this option has no effect here.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={running} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {running ? <Loader className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {running ? 'Cloning…' : 'Clone Project'}
          </button>
          <button type="button" onClick={goToList} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </form>
      {successModal}
    </div>
  )
}
