/**
 * Project Clone Jobs — list (GAP-22, v963 Phase 16, Simulator port). Rules 40/41/44/61/38.
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/ProjectCloneJobsPage.jsx.
 * When `scopedToCurrentProject` is set, the list is filtered to the current practice project
 * via the established Simulator project-scoping convention (PlanningProjectBar/
 * usePlanningProjectId), not usePlatformProjectId (which resolves public.projects, not
 * sim.practice_projects — see Phase 11's RecurringTaskListPage.jsx for the same pattern).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Plus, ArrowLeft } from 'lucide-react'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { listCloneJobs } from '../services/projectCloneService'

const STATUS_BADGE = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  running: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
}

export default function ProjectCloneJobsPage({ basePath = '/simulator/pmo/admin/project-clone', scopedToCurrentProject = false }) {
  const navigate = useNavigate()
  const planningProjectId = usePlanningProjectId()
  const projectId = scopedToCurrentProject ? planningProjectId : null
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: `project-clone-jobs-sim-sort${scopedToCurrentProject ? '-pm' : ''}`,
  })

  const load = useCallback(async () => {
    if (scopedToCurrentProject && !projectId) return
    setLoading(true)
    const rows = await listCloneJobs(scopedToCurrentProject ? { sourceProjectId: projectId } : {})
    setJobs(rows)
    setLoading(false)
  }, [scopedToCurrentProject, projectId])

  useEffect(() => {
    load()
  }, [load])

  const sortAccessors = useMemo(() => ({ created_at: (r) => r.created_at || '', job_status: (r) => r.job_status || '' }), [])
  const sorted = sortedData(jobs, sortAccessors)

  const exportColumns = [
    { key: 'source_project_id', label: 'Source Project' },
    { key: 'target_project_id', label: 'Target Project' },
    { key: 'job_status', label: 'Status' },
    { key: 'error_message', label: 'Error' },
    { key: 'created_at', label: 'Created' },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Copy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{scopedToCurrentProject ? 'Clone This Project' : 'Project Cloning'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Copy a practice project's core fields into a new project.</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`${basePath}/create${scopedToCurrentProject && projectId ? `?sourceProjectId=${projectId}` : ''}`)}
          disabled={scopedToCurrentProject && !projectId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Clone Project
        </button>
      </div>

      {scopedToCurrentProject && <PlanningProjectBar isSim />}

      {scopedToCurrentProject && !projectId ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Select a practice project to view its clone jobs.</div>
      ) : loading ? (
        <div className="flex items-center justify-center min-h-[20vh] text-gray-500 dark:text-gray-400">Loading clone jobs…</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="ProjectCloneJobs" />
          </div>
          {sorted.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No clone jobs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <TableRowNumberHeader className="!normal-case" />
                    <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Source</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Target</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('job_status')} onSort={() => handleSort('job_status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('created_at')} onSort={() => handleSort('created_at')} className="!normal-case whitespace-nowrap">Created</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sorted.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-sm font-mono text-xs text-gray-600 dark:text-gray-300">{row.source_project_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs text-gray-600 dark:text-gray-300">{row.target_project_id ? `${row.target_project_id.slice(0, 8)}…` : '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.job_status] || STATUS_BADGE.pending}`}>{row.job_status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActionButton variant="view" label="View clone job" onClick={() => navigate(`${basePath}/${row.id}`)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
