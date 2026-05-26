import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, List, Search, UserMinus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '../ui/ExportListMenu'
import {
  getEligibleManagers,
  getActiveAssignmentCountsForUsers,
  getSystemAssignmentLimit,
} from '../../services/managerAssignmentService'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const AssignManagerModal = lazy(() => import('../pmo/AssignManagerModal'))

function cycleDir(d) {
  if (d == null) return 'asc'
  if (d === 'asc') return 'desc'
  return null
}

const SortBtn = memo(function SortBtn({ label, sortKey, activeKey, dir, onClick }) {
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
})

const AssignmentTableRow = memo(function AssignmentTableRow({
  row,
  codeField,
  nameField,
  managerIdField,
  limit,
  workload,
  onAssign,
  onRemove,
}) {
  const mid = row[managerIdField]
  const w = mid ? workload[mid] ?? 0 : null
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{row[codeField]}</td>
      <td className="px-4 py-2 text-gray-900 dark:text-white">{row[nameField]}</td>
      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
        {row.manager?.full_name || row.manager?.email || '—'}
      </td>
      <td className="px-4 py-2 tabular-nums text-gray-600 dark:text-gray-400">
        {mid != null ? `${w} / ${limit}` : '—'}
      </td>
      <td className="px-4 py-2 text-right space-x-2">
        <button
          type="button"
          onClick={() => onAssign(row)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {mid ? 'Change' : 'Assign'}
        </button>
        {mid ? (
          <button
            type="button"
            onClick={() => onRemove(row)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <UserMinus className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </td>
    </tr>
  )
})

const AssignmentCard = memo(function AssignmentCard({
  row,
  codeField,
  nameField,
  managerIdField,
  limit,
  workload,
  onAssign,
  onRemove,
}) {
  const mid = row[managerIdField]
  const w = mid ? workload[mid] ?? 0 : null
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col gap-2">
      <div className="text-xs font-mono text-gray-500">{row[codeField]}</div>
      <div className="font-semibold text-gray-900 dark:text-white">{row[nameField]}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Manager: {row.manager?.full_name || row.manager?.email || '—'}
      </div>
      <div className="text-xs text-gray-500">Workload: {mid != null ? `${w} / ${limit}` : '—'}</div>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => onAssign(row)}
          className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          {mid ? 'Change' : 'Assign'}
        </button>
        {mid ? (
          <button
            type="button"
            onClick={() => onRemove(row)}
            className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  )
})

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.backTo
 * @param {string} props.backLabel
 * @param {Array<[string, string]>} props.tabs — [id, label]
 * @param {string} props.storageKeyPrefix
 * @param {() => Promise<Record<string, object[]>>} props.loadRowsByTab — returns { programmes?, projects? }
 * @param {(type: 'programme'|'project', id: string, userId: string) => Promise<void>} props.onAssign
 * @param {(type: 'programme'|'project', id: string) => Promise<void>} props.onRemove
 */
export default function ManagerAssignmentsWorkbench({
  title,
  description,
  backTo,
  backLabel = 'Back',
  tabs,
  storageKeyPrefix,
  loadRowsByTab,
  onAssign,
  onRemove,
}) {
  const [tab, setTab] = useState(tabs[0]?.[0] || 'programmes')
  const [rowsByTab, setRowsByTab] = useState({})
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState([])
  const [limit, setLimit] = useState(5)
  const [workload, setWorkload] = useState({})
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [view, setView] = useState(() => localStorage.getItem(`${storageKeyPrefix}-view`) || 'table')
  const [sortDir, setSortDir] = useState({ key: 'name', dir: null })
  const [modal, setModal] = useState(null)

  const entityTypeForTab = tab === 'programmes' ? 'programme' : 'project'
  const codeField = tab === 'programmes' ? 'programme_code' : 'project_code'
  const nameField = tab === 'programmes' ? 'programme_name' : 'project_name'
  const managerIdField = tab === 'programmes' ? 'programme_manager_user_id' : 'project_manager_user_id'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [byTab, mgrs, lim] = await Promise.all([
        loadRowsByTab(),
        getEligibleManagers(),
        getSystemAssignmentLimit(),
      ])
      setRowsByTab(byTab)
      setEligible(mgrs)
      setLimit(lim)
      const ids = new Set()
      Object.values(byTab).forEach((list) => {
        ;(list || []).forEach((r) => {
          const mid = r.programme_manager_user_id || r.project_manager_user_id
          if (mid) ids.add(mid)
        })
      })
      mgrs.forEach((m) => ids.add(m.id))
      const w = await getActiveAssignmentCountsForUsers([...ids])
      setWorkload(w)
    } catch (e) {
      toast.error(e?.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [loadRowsByTab])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${storageKeyPrefix}-sort-${tab}`)
      setSortDir(raw ? JSON.parse(raw) : { key: 'name', dir: null })
    } catch {
      setSortDir({ key: 'name', dir: null })
    }
  }, [tab, storageKeyPrefix])

  useEffect(() => {
    localStorage.setItem(`${storageKeyPrefix}-view`, view)
  }, [view, storageKeyPrefix])

  useEffect(() => {
    localStorage.setItem(`${storageKeyPrefix}-sort-${tab}`, JSON.stringify(sortDir))
  }, [sortDir, tab, storageKeyPrefix])

  const rows = useMemo(() => {
    let list = rowsByTab[tab] || []
    const term = deferredSearch.trim().toLowerCase()
    if (term) {
      list = list.filter((r) => {
        const name = (r[nameField] || '').toLowerCase()
        const code = (r[codeField] || '').toLowerCase()
        return name.includes(term) || code.includes(term)
      })
    }
    const getMgr = (r) => r.manager?.full_name || r.manager?.email || ''
    if (!sortDir.dir) return list
    const mult = sortDir.dir === 'asc' ? 1 : -1
    const sk = sortDir.key
    return [...list].sort((a, b) => {
      if (sk === 'code') return mult * String(a[codeField] || '').localeCompare(String(b[codeField] || ''), undefined, { sensitivity: 'base' })
      if (sk === 'name') return mult * String(a[nameField] || '').localeCompare(String(b[nameField] || ''), undefined, { sensitivity: 'base' })
      if (sk === 'manager') return mult * getMgr(a).localeCompare(getMgr(b), undefined, { sensitivity: 'base' })
      return 0
    })
  }, [rowsByTab, tab, deferredSearch, sortDir, codeField, nameField])

  const exportColumns = useMemo(
    () => [
      { key: codeField, label: 'Code' },
      { key: nameField, label: 'Name' },
      { key: 'manager_label', label: 'Manager' },
      { key: 'workload_label', label: 'Workload' },
    ],
    [codeField, nameField]
  )

  const exportData = useMemo(
    () =>
      rows.map((r) => {
        const mid = r[managerIdField]
        const w = mid ? workload[mid] ?? 0 : '—'
        return {
          ...r,
          manager_label: r.manager?.full_name || r.manager?.email || '—',
          workload_label: mid ? `${w} / ${limit}` : '—',
        }
      }),
    [rows, workload, limit, managerIdField]
  )

  const openAssign = useCallback(
    (row) => {
      setModal({
        type: entityTypeForTab,
        id: row.id,
        name: row[nameField],
        code: row[codeField] || null,
        currentManagerId: row[managerIdField] || row.manager_public_user_id || null,
      })
    },
    [entityTypeForTab, nameField, codeField, managerIdField]
  )

  const handleModalConfirm = useCallback(
    async (userId) => {
      if (!modal) return
      await onAssign(modal.type, modal.id, userId)
      toast.success('Manager assigned')
      setModal(null)
      await load()
    },
    [modal, onAssign, load]
  )

  const handleRemove = useCallback(
    async (row) => {
      if (!confirm('Remove manager assignment for this record?')) return
      try {
        await onRemove(entityTypeForTab, row.id)
        toast.success('Manager removed')
        await load()
      } catch (e) {
        toast.error(e?.message || 'Remove failed')
      }
    },
    [entityTypeForTab, onRemove, load]
  )

  const emptyMessage =
    tab === 'programmes'
      ? 'No programmes in portfolios you manage. Assignments appear when you are set as portfolio manager.'
      : 'No projects in your scope. Link projects to programmes under your portfolios first.'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={backTo}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">{backLabel}</span>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </div>
          <ExportListMenu
            columns={exportColumns}
            data={exportData}
            baseFilename={`${storageKeyPrefix}_${tab}`}
            disabled={!rows.length}
          />
        </div>

        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            {tabs.map(([id, label]) => (
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
        )}

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

        <Suspense fallback={null}>
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
            onConfirm={handleModalConfirm}
          />
        </Suspense>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">{emptyMessage}</p>
        ) : view === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3">
                    <SortBtn label="Code" sortKey="code" activeKey={sortDir.key} dir={sortDir.dir} onClick={(k) => setSortDir((p) => (p.key !== k ? { key: k, dir: 'asc' } : { key: k, dir: cycleDir(p.dir) }))} />
                  </th>
                  <th className="px-4 py-3">
                    <SortBtn label="Name" sortKey="name" activeKey={sortDir.key} dir={sortDir.dir} onClick={(k) => setSortDir((p) => (p.key !== k ? { key: k, dir: 'asc' } : { key: k, dir: cycleDir(p.dir) }))} />
                  </th>
                  <th className="px-4 py-3">
                    <SortBtn label="Manager" sortKey="manager" activeKey={sortDir.key} dir={sortDir.dir} onClick={(k) => setSortDir((p) => (p.key !== k ? { key: k, dir: 'asc' } : { key: k, dir: cycleDir(p.dir) }))} />
                  </th>
                  <th className="px-4 py-3">Workload</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r, index) => (
                  <AssignmentTableRow
                    key={r.id}
                    row={r}
                    codeField={codeField}
                    nameField={nameField}
                    managerIdField={managerIdField}
                    limit={limit}
                    workload={workload}
                    onAssign={openAssign}
                    onRemove={handleRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r, index) => (
              <AssignmentCard
                key={r.id}
                row={r}
                codeField={codeField}
                nameField={nameField}
                managerIdField={managerIdField}
                limit={limit}
                workload={workload}
                onAssign={openAssign}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
