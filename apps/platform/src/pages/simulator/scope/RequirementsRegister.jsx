import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, LayoutGrid, Table2 } from 'lucide-react'
import { useSimPracticeOwner } from '../../../lib/useSimPracticeOwner'
import { simListRequirements, simSaveRequirement } from '../../../services/sim/simPlanningService'
import { simDb } from '../../../services/supabase/supabaseClient'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery'
import { useRequirementExtras } from '@nidus/shared/hooks/useRequirementExtras'
import { VERIFICATION_METHODS, optionLabel } from '@nidus/shared/services/requirementExtrasService'
import {
  REQUIREMENT_CATEGORIES,
  requirementCategoryFromQuery,
  requirementCategoryLabel,
  requirementListTitle,
} from '@nidus/shared/utils/requirementCategories'

const BASE_EXPORT_COLS = [
  { key: 'requirement_code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'version', label: 'Version' },
]
const EXTRA_EXPORT_COLS = [
  { key: 'nfr_area', label: 'Non-functional area' },
  { key: 'owner_name', label: 'Owner' },
  { key: 'verification', label: 'Verification method' },
  { key: 'rationale', label: 'Rationale' },
]

const TH_CLS = 'p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'
const TD_CLS = 'p-3 text-gray-700 dark:text-gray-200 whitespace-nowrap'

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

export default function RequirementsRegister() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const extras = useRequirementExtras(simDb)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // `?category=functional` opens the register already filtered (v1338).
  const queryFilter = useInitialFilterFromQuery(['category'])
  const queryCategory = requirementCategoryFromQuery(queryFilter.category)
  const [categoryFilter, setCategoryFilter] = useState(queryCategory)
  const [seenQueryCategory, setSeenQueryCategory] = useState(queryCategory)
  if (queryCategory !== seenQueryCategory) {
    setSeenQueryCategory(queryCategory)
    setCategoryFilter(queryCategory)
  }
  const [sortCol, setSortCol] = useState('requirement_code')
  const [sortDir, setSortDir] = useState('asc')
  const viewKey = projectId ? `planning-req-view-${projectId}` : 'planning-req-view'
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
    const res = await simListRequirements(projectId)
    if (res.success) setRows(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (!q) return true
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.requirement_code || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.owner_name || '').toLowerCase().includes(q)
      )
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
  }, [rows, search, categoryFilter, sortCol, sortDir])

  const exportCols = extras.available ? [...BASE_EXPORT_COLS, ...EXTRA_EXPORT_COLS] : BASE_EXPORT_COLS
  const exportRows = useMemo(
    () => filtered.map((r) => ({
      ...r,
      nfr_area: optionLabel(extras.areas, r.nfr_area_key),
      verification: optionLabel(VERIFICATION_METHODS, r.verification_method),
    })),
    [filtered, extras.areas]
  )

  const runBulk = async () => {
    if (!projectId || !canEdit) return
    setBulkMsg(null)
    const lines = bulkText.split(/\r?\n/).filter(Boolean)
    if (!lines.length) {
      setBulkMsg('No rows.')
      return
    }
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) {
      setBulkMsg('Not signed in.')
      return
    }
    let header = true
    let ok = 0
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
      if (header && parts[0]?.toLowerCase() === 'requirement_code') {
        header = false
        continue
      }
      header = false
      const [code, name, category, priority] = parts
      if (!name) continue
      const res = await simSaveRequirement(
        projectId,
        {
          requirement_code: code || null,
          name,
          category: category || null,
          priority: priority || null,
          status: 'draft',
        },
        user.id
      )
      if (res.success) ok += 1
    }
    setBulkMsg(`Imported ${ok} requirement(s).`)
    setBulkOpen(false)
    setBulkText('')
    load()
  }

  if (!projectId) return <p className="p-6 text-gray-500 dark:text-gray-400">Missing project.</p>

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">Requirements</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{requirementListTitle(categoryFilter)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Collect requirements (Process Guide 5.3).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportListMenu columns={exportCols} data={exportRows} baseFilename={`Requirements_${projectId}`} />
          <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              type="button"
              onClick={() => persistView('table')}
              className={`p-2 text-gray-600 dark:text-gray-300 ${view === 'table' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Table"
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => persistView('card')}
              className={`p-2 text-gray-600 dark:text-gray-300 ${view === 'card' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Bulk CSV
              </button>
              <Link
                to={`/simulator/practice-projects/${projectId}/scope/requirements/new`}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> New
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {REQUIREMENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm text-gray-900 dark:text-gray-100">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className={TH_CLS}>
                  <SortTh label="Code" col="requirement_code" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className={TH_CLS}>
                  <SortTh label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className={TH_CLS}>
                  <SortTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                {extras.available && (
                  <th className={TH_CLS}>
                    <SortTh label="Area" col="nfr_area_key" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                  </th>
                )}
                <th className={TH_CLS}>
                  <SortTh label="Priority" col="priority" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                {extras.available && (
                  <th className={TH_CLS}>
                    <SortTh label="Owner" col="owner_name" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                  </th>
                )}
                <th className={TH_CLS}>
                  <SortTh label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={setSort} />
                </th>
                <th className={TH_CLS}> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((r, index) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-200">{r.requirement_code || '—'}</td>
                  <td className="p-3 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className={TD_CLS}>{requirementCategoryLabel(r.category) || '—'}</td>
                  {extras.available && <td className={TD_CLS}>{optionLabel(extras.areas, r.nfr_area_key) || '—'}</td>}
                  <td className={`${TD_CLS} capitalize`}>{r.priority || '—'}</td>
                  {extras.available && <td className={TD_CLS}>{r.owner_name || '—'}</td>}
                  <td className={`${TD_CLS} capitalize`}>{r.status || '—'}</td>
                  <td className="p-3">
                    <Link to={`/simulator/practice-projects/${projectId}/scope/requirements/${r.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
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
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={`/simulator/practice-projects/${projectId}/scope/requirements/${r.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500"
            >
              <div className="font-mono text-xs text-gray-700 dark:text-gray-200">{r.requirement_code || '—'}</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{r.name}</div>
              <div className="mt-2 text-xs capitalize text-gray-600 dark:text-gray-300">
                {requirementCategoryLabel(r.category) || '—'} · {r.priority || '—'} · {r.status || '—'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk CSV</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              First line optional header: requirement_code,name,category,priority — then one row per line.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            {bulkMsg && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{bulkMsg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button type="button" onClick={runBulk} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
