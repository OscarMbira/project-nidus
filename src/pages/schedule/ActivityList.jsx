import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, LayoutGrid, Table2 } from 'lucide-react'
import { useProjectRole } from '../../hooks/useProjectRole'
import { listActivities, saveActivity } from '../../services/activityListService'
import { platformDb } from '../../services/supabase/supabaseClient'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const EXPORT_COLS = [
  { key: 'activity_code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'planned_start_date', label: 'Start' },
  { key: 'planned_end_date', label: 'End' },
  { key: 'expected_duration', label: 'Expected (PERT)' },
]

function SortTh({ label, col, sortCol, sortDir, onSort }) {
  const cycle = () => {
    if (sortCol !== col) onSort(col, 'asc')
    else if (sortDir === 'asc') onSort(col, 'desc')
    else if (sortDir === 'desc') onSort(col, null)
    else onSort(col, 'asc')
  }
  let icon = '⇅'
  if (sortCol === col && sortDir === 'asc') icon = '↑'
  if (sortCol === col && sortDir === 'desc') icon = '↓'
  return (
    <button type="button" onClick={cycle} className="flex items-center gap-1 text-left text-gray-700 hover:text-blue-600 dark:text-gray-200">
      {label} <span className="text-xs">{icon}</span>
    </button>
  )
}

export default function ActivityList() {
  const { projectId } = useParams()
  const { canEdit } = useProjectRole(projectId)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('activity_code')
  const [sortDir, setSortDir] = useState('asc')
  const viewKey = projectId ? `planning-act-view-${projectId}` : 'planning-act-view'
  const [view, setView] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem(viewKey) || 'table' : 'table'))
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkMsg, setBulkMsg] = useState(null)

  const setSort = (col, dir) => {
    setSortCol(col)
    setSortDir(dir)
  }

  const persistView = (v) => {
    setView(v)
    try {
      localStorage.setItem(viewKey, v)
    } catch {
      /* ignore */
    }
  }

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await listActivities(projectId)
    if (res.success) setRows(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (!q) return true
      return (r.name || '').toLowerCase().includes(q) || (r.activity_code || '').toLowerCase().includes(q)
    })
    if (sortCol && sortDir) {
      list = [...list].sort((a, b) => {
        const va = (a[sortCol] ?? '').toString().toLowerCase()
        const vb = (b[sortCol] ?? '').toString().toLowerCase()
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [rows, search, sortCol, sortDir])

  const runBulk = async () => {
    if (!projectId || !canEdit) return
    setBulkMsg(null)
    const lines = bulkText.split(/\r?\n/).filter(Boolean)
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) {
      setBulkMsg('Not signed in.')
      return
    }
    let header = true
    let ok = 0
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
      if (header && parts[0]?.toLowerCase() === 'activity_code') {
        header = false
        continue
      }
      header = false
      const [code, name] = parts
      if (!name) continue
      const res = await saveActivity(projectId, { activity_code: code || null, name, status: 'not_started' }, user.id)
      if (res.success) ok += 1
    }
    setBulkMsg(`Imported ${ok} activity(ies).`)
    setBulkOpen(false)
    setBulkText('')
    load()
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/platform/projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Activity list</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity list</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Define activities and durations (Process Guide 5.7, 5.9).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportListMenu columns={EXPORT_COLS} data={filtered} baseFilename={`Activities_${projectId}`} />
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button type="button" onClick={() => persistView('table')} className={`p-2 ${view === 'table' ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Table">
              <Table2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => persistView('card')} className={`p-2 ${view === 'card' ? 'bg-gray-200 dark:bg-gray-700' : ''}`} title="Cards">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {canEdit && (
            <>
              <button type="button" onClick={() => setBulkOpen(true)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600">
                Bulk CSV
              </button>
              <Link to={`/platform/projects/${projectId}/schedule/activities/new`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
                <Plus className="h-4 w-4" /> New
              </Link>
            </>
          )}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="mb-4 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">
                  <SortTh label="Code" col="activity_code" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3">
                  <SortTh label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3">
                  <SortTh label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">PERT exp.</th>
                <th className="p-3"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 font-mono text-xs">{r.activity_code || '—'}</td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3 text-xs">{r.planned_start_date || '—'}</td>
                  <td className="p-3 text-xs">{r.planned_end_date || '—'}</td>
                  <td className="p-3 text-xs">{r.expected_duration != null ? String(r.expected_duration) : '—'}</td>
                  <td className="p-3">
                    <Link to={`/platform/projects/${projectId}/schedule/activities/${r.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, index) => (
            <Link
              key={r.id}
              to={`/platform/projects/${projectId}/schedule/activities/${r.id}`}
              className="rounded-xl border border-gray-200 p-4 hover:border-blue-500 dark:border-gray-700"
            >
              <div className="font-mono text-xs text-gray-500">{r.activity_code || '—'}</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{r.name}</div>
              <div className="mt-2 text-xs text-gray-500">                {r.status} · {r.planned_start_date || '—'} → {r.planned_end_date || '—'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-600 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-white">Bulk CSV</h3>
            <p className="mt-2 text-sm text-gray-400">Optional header: activity_code,name — one row per line.</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="mt-4 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
            />
            {bulkMsg && <p className="mt-2 text-sm text-emerald-400">{bulkMsg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setBulkOpen(false)} className="rounded-lg border border-gray-500 px-4 py-2 text-gray-300">
                Cancel
              </button>
              <button type="button" onClick={runBulk} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
