import { useEffect, useState, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LayoutGrid, Table2, Search, ArrowUpDown, Download } from 'lucide-react'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/microPlanService'
import * as simApi from '../../../services/sim/simMicroPlanService'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '../../../utils/exportUtils'

const VIEW_KEY = 'pm-microplan-list-view-v1'

const EXPORT_COLS = [
  { key: 'plan_reference', label: 'Reference' },
  { key: 'plan_name', label: 'Name' },
  { key: 'plan_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'overall_rag', label: 'RAG' },
  { key: 'overall_progress_pct', label: 'Progress %' },
]

function sortRows(rows, key, dir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = a[key] ?? ''
    const vb = b[key] ?? ''
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul
    return String(va).localeCompare(String(vb)) * mul
  })
}

export default function MicroPlanList({ scope }) {
  const isSim = useLocation().pathname.includes('/simulator/')
  const [searchParams] = useSearchParams()
  const workPackageFilter = searchParams.get('workPackageId')
  // scope can be 'individual' (My Plans) or 'team' (Team Workstream Plans)
  const scopeParam = scope || searchParams.get('scope')
  const projectId = usePlanningProjectId()
  const base = isSim ? '/simulator/pm/planning' : '/pm/planning'
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const [rows, setRows] = useState([])
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || 'card'
    } catch {
      return 'card'
    }
  })
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('plan_reference')
  const [sortDir, setSortDir] = useState('asc')
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      try {
        const filters = {}
        if (scopeParam === 'individual') filters.plan_type = 'individual'
        if (scopeParam === 'team') filters.plan_type = 'team_delivery'
        const data = isSim ? await simApi.getMicroPlans(projectId) : await api.getMicroPlans(projectId, filters)
        setRows(data || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load micro-plans')
      }
    })()
  }, [projectId, isSim, scopeParam])

  const filtered = useMemo(() => {
    let list = workPackageFilter ? rows.filter((p) => p.linked_work_package_id === workPackageFilter) : rows
    const t = search.trim().toLowerCase()
    if (t) {
      list = list.filter(
        (p) =>
          (p.plan_name || '').toLowerCase().includes(t) ||
          (p.plan_reference || '').toLowerCase().includes(t) ||
          (p.plan_type || '').toLowerCase().includes(t) ||
          (p.status || '').toLowerCase().includes(t)
      )
    }
    return sortRows(list, sortKey, sortDir)
  }, [rows, workPackageFilter, search, sortKey, sortDir])

  const cycleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  const exportRows = filtered.map((r) => ({
    ...r,
    overall_progress_pct: r.overall_progress_pct ?? '',
  }))

  const handleExport = (fmt) => {
    const name = `micro-plans-${projectId || 'project'}`
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, exportRows, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, exportRows, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, exportRows, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, exportRows, name, null)
    setExportOpen(false)
  }

  const SortBtn = ({ k, label }) => (
    <button
      type="button"
      onClick={() => cycleSort(k)}
      className="inline-flex items-center gap-1 text-left font-medium text-gray-300 hover:text-white"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h1 className="text-xl font-semibold text-white">
            {scopeParam === 'individual' ? 'My Plans' : scopeParam === 'team' ? 'Team Workstream Plans' : 'Team Micro-Plans'}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-600 p-0.5">
              <button
                type="button"
                onClick={() => setView('card')}
                className={`px-2 py-1 rounded ${view === 'card' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`px-2 py-1 rounded ${view === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                title="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              {exportOpen && filtered.length > 0 && (
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-600 bg-gray-900 py-1 shadow-lg">
                  {['csv', 'json', 'xml', 'print'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleExport(fmt)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              to={projectId ? `${base}/microplans/drafts?projectId=${projectId}` : `${base}/microplans/drafts`}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Draft queue
            </Link>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, reference, type, status…"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <PlanningProjectBar isSim={isSim} />
        {workPackageFilter && projectId && (
          <p className="mt-2 rounded-lg border border-indigo-800/60 bg-indigo-950/30 px-3 py-2 text-sm text-indigo-100/90">
            Showing micro-plans linked to the selected work package.
          </p>
        )}
        {!projectId && <p className="text-amber-400/90 text-sm mt-2">Select a project.</p>}
        {projectId && view === 'card' && (
          <ul className="mt-4 space-y-2">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-gray-700 p-4 flex flex-wrap items-center justify-between gap-3 bg-gray-900/50 hover:border-gray-600 transition-colors"
              >
                <div>
                  <Link
                    to={`${base}/microplans/${p.id}${q}`}
                    className="font-medium text-white hover:text-blue-300"
                  >
                    {p.plan_name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    {p.plan_reference} · {p.plan_type} · {p.status} · RAG {p.overall_rag || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{p.overall_progress_pct ?? 0}%</span>
                  <Link
                    to={`${base}/microplans/${p.id}${q}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Open →
                  </Link>
                </div>
              </li>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-sm">No micro-plans match.</p>}
          </ul>
        )}
        {projectId && view === 'table' && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-800/90 text-gray-400">
                <tr>
                  <th className="px-3 py-2">
                    <SortBtn k="plan_reference" label="Reference" />
                  </th>
                  <th className="px-3 py-2">
                    <SortBtn k="plan_name" label="Name" />
                  </th>
                  <th className="px-3 py-2">
                    <SortBtn k="plan_type" label="Type" />
                  </th>
                  <th className="px-3 py-2">
                    <SortBtn k="status" label="Status" />
                  </th>
                  <th className="px-3 py-2">
                    <SortBtn k="overall_rag" label="RAG" />
                  </th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-gray-700/80 hover:bg-gray-800/40">
                    <td className="px-3 py-2 font-mono text-gray-300">{p.plan_reference}</td>
                    <td className="px-3 py-2 text-gray-200">{p.plan_name}</td>
                    <td className="px-3 py-2 text-gray-400">{p.plan_type}</td>
                    <td className="px-3 py-2 text-gray-400">{p.status}</td>
                    <td className="px-3 py-2 text-gray-400">{p.overall_rag}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to={`${base}/microplans/${p.id}${q}`} className="text-blue-400 hover:text-blue-300 text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-4 text-gray-500 text-sm">No micro-plans match.</p>}
          </div>
        )}
      </div>
      {exportOpen && (
        <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close" onClick={() => setExportOpen(false)} />
      )}
    </div>
  )
}
