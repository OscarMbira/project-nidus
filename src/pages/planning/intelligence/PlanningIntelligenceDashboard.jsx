import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import ViewToggle from '../../../components/ui/ViewToggle'
import { useViewMode } from '../../../hooks/useViewMode'
import * as api from '../../../services/planIntelligenceService'
import * as simApi from '../../../services/sim/simPlanIntelligenceService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
import RowNumberBadge from '../../../components/ui/RowNumberBadge'

const EXPORT_COLS = [
  { key: 'severity', label: 'Severity' },
  { key: 'finding_text', label: 'Finding' },
  { key: 'status', label: 'Status' },
  { key: 'scanned_at', label: 'Scanned' },
]

export default function PlanningIntelligenceDashboard() {
  const location = useLocation()
  const isSim = location.pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useViewMode('planning-intel', 'table')
  const [filterSev, setFilterSev] = useState('')

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const data = isSim ? await simApi.getFindings(projectId) : await api.getFindings(projectId)
      setRows(data || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load findings')
    } finally {
      setLoading(false)
    }
  }, [projectId, isSim])

  useEffect(() => {
    load()
  }, [load])

  const runScan = async () => {
    if (!projectId) return
    try {
      const r = isSim ? await simApi.runIntelligenceScan(projectId) : await api.runIntelligenceScan(projectId)
      toast.success(`Scan complete: ${r.findingsCreated} new finding(s)`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Scan failed')
    }
  }

  const filtered = rows.filter((r) => (filterSev ? r.severity === filterSev : true))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Planning intelligence</h1>
        <PlanningProjectBar />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <>
            <div className="flex flex-wrap gap-2 items-center my-4">
              <button
                type="button"
                onClick={runScan}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              >
                Run scan
              </button>
              <select
                value={filterSev}
                onChange={(e) => setFilterSev(e.target.value)}
                className="rounded-lg bg-gray-900 border border-gray-600 text-sm px-2 py-2"
              >
                <option value="">All severities</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <ExportListMenu
                columns={EXPORT_COLS}
                rows={filtered}
                filename="planning-findings"
              />
            </div>
            {loading ? (
              <p className="text-gray-500">Loading…</p>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-900 text-gray-400">
                    <tr>
                <TableRowNumberHeader className="!normal-case" />
                      <th className="text-left p-2">Severity</th>
                      <th className="text-left p-2">Finding</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, index) => (
                      <tr key={r.id} className="border-t border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="p-2 capitalize">{r.severity}</td>
                        <td className="p-2">{r.finding_text}</td>
                        <td className="p-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((r, index) => (
                  <li key={r.id} className="rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                    <div className="flex items-start gap-2">
                      <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                      <div className="min-w-0">
                    <span className="text-xs uppercase text-gray-500">{r.severity}</span>
                    <p className="text-gray-200 mt-1">{r.finding_text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
