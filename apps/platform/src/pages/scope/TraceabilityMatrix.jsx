import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listTraceabilityForProject, saveTraceabilityRow, softDeleteTraceabilityRow } from '../../services/requirementsTraceabilityService'
import { listWbsNodes } from '../../services/wbsNodeService'
import ExportListMenu from '@nidus/ui/ExportListMenu'

const COLS = [
  { key: 'requirement_label', label: 'Requirement' },
  { key: 'deliverable_description', label: 'Deliverable' },
  { key: 'wbs_code', label: 'WBS' },
  { key: 'status', label: 'Status' },
]

export default function TraceabilityMatrix() {
  const { projectId: routeProjectId } = useParams()
  // IT → Requirements → Traceability (v1338) opens without a project in the path: use the current project.
  const { projectId: contextProjectId } = usePlatformProjectId()
  const projectId = routeProjectId || contextProjectId
  const { canEdit } = useProjectRole(projectId)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [requirements, setRequirements] = useState([])
  const [wbsNodes, setWbsNodes] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ requirement_id: '', wbs_node_id: '', deliverable_description: '', status: 'open' })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [t, w] = await Promise.all([listTraceabilityForProject(projectId), listWbsNodes(projectId)])
    if (t.success) {
      setRows(t.data || [])
      setRequirements(t.requirements || [])
    }
    if (w.success) setWbsNodes(w.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const wbsById = Object.fromEntries((wbsNodes || []).map((n) => [n.id, n]))

  const tableData = rows.map((r) => {
    const req = requirements.find((x) => x.id === r.requirement_id)
    const wbs = r.wbs_node_id ? wbsById[r.wbs_node_id] : null
    return {
      ...r,
      requirement_label: req ? `${req.requirement_code || ''} ${req.name}`.trim() : r.requirement_id,
      wbs_code: wbs ? `${wbs.wbs_code || ''} ${wbs.title}`.trim() : '—',
    }
  })

  const openNew = () => {
    setEditing('new')
    setForm({ requirement_id: requirements[0]?.id || '', wbs_node_id: '', deliverable_description: '', status: 'open' })
  }

  const save = async () => {
    if (!form.requirement_id) return
    const res = await saveTraceabilityRow({ ...form, id: editing !== 'new' ? editing : undefined })
    if (res.success) {
      setEditing(null)
      load()
    }
  }

  const del = async (id) => {
    if (!window.confirm('Remove this trace row?')) return
    const res = await softDeleteTraceabilityRow(id)
    if (res.success) load()
  }

  if (!projectId) return <p className="p-6 text-gray-500 dark:text-gray-400">Select a project in the header to view traceability.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-gray-500 dark:text-gray-400">Loading…</div>

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/platform/projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">Traceability matrix</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Requirements traceability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Link requirements to WBS / deliverables.</p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={COLS} data={tableData} baseFilename={`Traceability_${projectId}`} />
          {canEdit && (
            <button type="button" onClick={openNew} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
              Add row
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full text-sm text-gray-900 dark:text-gray-100">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr className="text-gray-700 dark:text-gray-200">
              <th className="p-3 text-left">Requirement</th>
              <th className="p-3 text-left">Deliverable</th>
              <th className="p-3 text-left">WBS</th>
              <th className="p-3 text-left">Status</th>
              {canEdit && <th className="p-3"> </th>}
            </tr>
          </thead>
          <tbody>
            {tableData.map((r) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3">{r.requirement_label}</td>
                <td className="p-3 text-gray-700 dark:text-gray-200">{r.deliverable_description || '—'}</td>
                <td className="p-3 text-gray-700 dark:text-gray-200">{r.wbs_code}</td>
                <td className="p-3 text-gray-700 dark:text-gray-200">{r.status}</td>
                {canEdit && (
                  <td className="p-3">
                    <button type="button" className="text-red-600 hover:underline dark:text-red-400" onClick={() => del(r.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing === 'new' ? 'Add trace row' : 'Edit row'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Requirement</label>
                <select
                  value={form.requirement_id}
                  onChange={(e) => setForm((f) => ({ ...f, requirement_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  {requirements.map((q) => (
                    <option key={q.id} value={q.id}>
                      {(q.requirement_code || '') + ' ' + q.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">WBS node</label>
                <select
                  value={form.wbs_node_id}
                  onChange={(e) => setForm((f) => ({ ...f, wbs_node_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">—</option>
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {(n.wbs_code || '') + ' ' + n.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Deliverable description</label>
                <textarea
                  value={form.deliverable_description}
                  onChange={(e) => setForm((f) => ({ ...f, deliverable_description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="button" onClick={save} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
