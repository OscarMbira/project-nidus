import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, List, Search, Settings, UserMinus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import AssignManagerModal from '../../../components/pmo/AssignManagerModal'
import ExportListMenu from '../../../components/ui/ExportListMenu'
import {
  getEligibleManagers,
  getActiveAssignmentCountsForUsers,
  getSystemAssignmentLimit,
} from '../../../services/managerAssignmentService'
import {
  getSimAssignmentsSummaryForCurrentUser,
  assignPracticeProjectManager,
  assignPracticeProgrammeManager,
  assignPracticePortfolioManager,
  removePracticeProjectManager,
  removePracticeProgrammeManager,
  removePracticePortfolioManager,
} from '../../../services/sim/simManagerAssignmentService'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const VIEW_KEY = 'sim-pmo-manager-assignments-view'
const SORT_PREFIX = 'sim-pmo-manager-assignments-sort-'

function cycleDir(d) {
  if (d == null) return 'asc'
  if (d === 'asc') return 'desc'
  return null
}

function SortBtn({ label, sortKey, activeKey, dir, onClick }) {
  const active = activeKey === sortKey && dir
  let icon = '⇅'
  if (active && dir === 'asc') icon = '↑'
  if (active && dir === 'desc') icon = '↓'
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 font-medium text-left text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
    >
      {label} <span className="text-xs tabular-nums opacity-70">{icon}</span>
    </button>
  )
}

export default function SimManagerAssignments() {
  const [tab, setTab] = useState('portfolios')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ projects: [], programmes: [], portfolios: [] })
  const [eligible, setEligible] = useState([])
  const [limit, setLimit] = useState(5)
  const [workload, setWorkload] = useState({})
  const [search, setSearch] = useState('')
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'table')
  const [sortDir, setSortDir] = useState({ key: 'name', dir: null })
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, mgrs, lim] = await Promise.all([
        getSimAssignmentsSummaryForCurrentUser(),
        getEligibleManagers(),
        getSystemAssignmentLimit(),
      ])
      setSummary(sum)
      setEligible(mgrs)
      setLimit(lim)
      const ids = new Set()
      ;(sum.projects || []).forEach((r) => r.manager_public_user_id && ids.add(r.manager_public_user_id))
      ;(sum.programmes || []).forEach((r) => r.manager_public_user_id && ids.add(r.manager_public_user_id))
      ;(sum.portfolios || []).forEach((r) => r.manager_public_user_id && ids.add(r.manager_public_user_id))
      mgrs.forEach((m) => ids.add(m.id))
      const w = await getActiveAssignmentCountsForUsers([...ids])
      setWorkload(w)
    } catch (e) {
      toast.error(e?.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${SORT_PREFIX}${tab}`)
      setSortDir(raw ? JSON.parse(raw) : { key: 'name', dir: null })
    } catch {
      setSortDir({ key: 'name', dir: null })
    }
  }, [tab])

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    localStorage.setItem(`${SORT_PREFIX}${tab}`, JSON.stringify(sortDir))
  }, [sortDir, tab])

  const rows = useMemo(() => {
    let list =
      tab === 'projects'
        ? summary.projects
        : tab === 'programmes'
          ? summary.programmes
          : summary.portfolios
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((r) => {
        const name = (r.project_name || r.programme_name || r.portfolio_name || '').toLowerCase()
        const code = (r.project_code || r.programme_code || r.portfolio_code || '').toLowerCase()
        return name.includes(term) || code.includes(term)
      })
    }
    const nameKey = tab === 'projects' ? 'project_name' : tab === 'programmes' ? 'programme_name' : 'portfolio_name'
    const codeKey = tab === 'projects' ? 'project_code' : tab === 'programmes' ? 'programme_code' : 'portfolio_code'
    const getMgr = (r) => r.manager?.full_name || r.manager?.email || ''
    if (!sortDir.dir) return list
    const mult = sortDir.dir === 'asc' ? 1 : -1
    const sk = sortDir.key
    return [...list].sort((a, b) => {
      if (sk === 'code') return mult * String(a[codeKey] || '').localeCompare(String(b[codeKey] || ''), undefined, { sensitivity: 'base' })
      if (sk === 'name') return mult * String(a[nameKey] || '').localeCompare(String(b[nameKey] || ''), undefined, { sensitivity: 'base' })
      if (sk === 'manager') return mult * getMgr(a).localeCompare(getMgr(b), undefined, { sensitivity: 'base' })
      return 0
    })
  }, [summary, tab, search, sortDir])

  const handleSortClick = (key) => {
    setSortDir((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      const next = cycleDir(prev.dir)
      return { key, dir: next }
    })
  }

  const exportColumns = useMemo(() => {
    const name = tab === 'projects' ? 'project_name' : tab === 'programmes' ? 'programme_name' : 'portfolio_name'
    const code = tab === 'projects' ? 'project_code' : tab === 'programmes' ? 'programme_code' : 'portfolio_code'
    return [
      { key: code, label: 'Code' },
      { key: name, label: 'Name' },
      { key: 'manager_label', label: 'Manager' },
      { key: 'workload_label', label: 'Workload' },
    ]
  }, [tab])

  const exportData = useMemo(() => {
    return rows.map((r) => {
      const mid = r.manager_public_user_id
      const w = mid ? workload[mid] ?? 0 : '—'
      return {
        ...r,
        manager_label: r.manager?.full_name || r.manager?.email || '—',
        workload_label: mid ? `${w} / ${limit}` : '—',
      }
    })
  }, [rows, workload, limit, tab])

  const openAssign = (row) => {
    const type = tab === 'projects' ? 'project' : tab === 'programmes' ? 'programme' : 'portfolio'
    const id = row.id
    const name = row.project_name || row.programme_name || row.portfolio_name
    const code = row.project_code || row.programme_code || row.portfolio_code
    const current = row.manager_public_user_id || null
    setModal({ type, id, name, code: code || null, currentManagerId: current })
  }

  const handleModalConfirm = async (userId) => {
    if (!modal) return
    if (modal.type === 'project') await assignPracticeProjectManager(modal.id, userId)
    if (modal.type === 'programme') await assignPracticeProgrammeManager(modal.id, userId)
    if (modal.type === 'portfolio') await assignPracticePortfolioManager(modal.id, userId)
    toast.success('Manager assigned')
    await load()
  }

  const handleRemove = async (row) => {
    if (!confirm('Remove manager assignment for this record?')) return
    try {
      if (tab === 'projects') await removePracticeProjectManager(row.id)
      if (tab === 'programmes') await removePracticeProgrammeManager(row.id)
      if (tab === 'portfolios') await removePracticePortfolioManager(row.id)
      toast.success('Manager removed')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Remove failed')
    }
  }

  const nameField = tab === 'projects' ? 'project_name' : tab === 'programmes' ? 'programme_name' : 'portfolio_name'
  const codeField = tab === 'projects' ? 'project_code' : tab === 'programmes' ? 'programme_code' : 'portfolio_code'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/simulator/pmo/dashboard"
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Back to Simulator PMO"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Practice manager assignments</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assign managers on practice portfolios, programmes, and projects you own (shared limit {limit} active assignments per manager with Platform).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu
              columns={exportColumns}
              data={exportData}
              baseFilename={`sim_manager_assignments_${tab}`}
            />
            <Link
              to="/simulator/pmo/manager-assignment-settings"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          {[
            ['portfolios', 'Portfolios'],
            ['programmes', 'Programmes'],
            ['projects', 'Projects'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">View</span>
            <button
              type="button"
              onClick={() => setView('cards')}
              className={`p-2 rounded-lg border ${view === 'cards' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
              aria-label="Card view"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`p-2 rounded-lg border ${view === 'table' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
              aria-label="Table view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <AssignManagerModal
          open={!!modal}
          onClose={() => setModal(null)}
          entityType={modal?.type}
          entityName={modal?.name || ''}
          entityCode={modal?.code}
          currentManagerId={modal?.currentManagerId}
          eligibleUsers={eligible}
          workloadByUserId={workload}
          limit={limit}
          onConfirm={(userId) => handleModalConfirm(userId)}
        />

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : view === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3">
                    <SortBtn label="Code" sortKey="code" activeKey={sortDir.key} dir={sortDir.dir} onClick={handleSortClick} />
                  </th>
                  <th className="px-4 py-3">
                    <SortBtn label="Name" sortKey="name" activeKey={sortDir.key} dir={sortDir.dir} onClick={handleSortClick} />
                  </th>
                  <th className="px-4 py-3">
                    <SortBtn label="Manager" sortKey="manager" activeKey={sortDir.key} dir={sortDir.dir} onClick={handleSortClick} />
                  </th>
                  <th className="px-4 py-3">Workload</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r, index) => {
                  const mid = r.manager_public_user_id
                  const w = mid ? workload[mid] ?? 0 : null
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{r[codeField]}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{r[nameField]}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.manager?.full_name || r.manager?.email || '—'}</td>
                      <td className="px-4 py-2 tabular-nums text-gray-600 dark:text-gray-400">{mid != null ? `${w} / ${limit}` : '—'}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openAssign(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {mid ? 'Change' : 'Assign'}
                        </button>
                        {mid && (
                          <button
                            type="button"
                            onClick={() => handleRemove(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="p-6 text-center text-gray-500 dark:text-gray-400">No records match your filters.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => {
              const mid = r.manager_public_user_id
              const w = mid ? workload[mid] ?? 0 : null
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col gap-2"
                >
                  <div className="text-xs font-mono text-gray-500">{r[codeField]}</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{r[nameField]}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Manager: {r.manager?.full_name || r.manager?.email || '—'}
                  </div>
                  <div className="text-xs text-gray-500">Workload: {mid != null ? `${w} / ${limit}` : '—'}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openAssign(r)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                      {mid ? 'Change' : 'Assign'}
                    </button>
                    {mid && (
                      <button
                        type="button"
                        onClick={() => handleRemove(r)}
                        className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {rows.length === 0 && (
              <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">No records match your filters.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
