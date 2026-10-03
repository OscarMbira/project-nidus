import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getProjectDefectAttachments, getProjectDefectHistory } from '../../services/defectService'

const TABS = [
  { key: 'all', label: 'Test Evidence' },
  { key: 'screenshots', label: 'Screenshots' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'history', label: 'History' },
]

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`p-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  )
}

export default function TestEvidence() {
  return (
    <TestingPageShell
      title="Evidence"
      subtitle="Screenshots, attachments, and change history captured across this project's testing."
    >
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const [tab, setTab] = useState('all')
  const [attachments, setAttachments] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: null })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [a, h] = await Promise.all([
        getProjectDefectAttachments(projectId),
        getProjectDefectHistory(projectId),
      ])
      setAttachments(a)
      setHistory(h)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 dark:text-gray-400 text-sm">Select a project.</p>

  const isHistory = tab === 'history'
  const baseRows = isHistory
    ? history
    : attachments.filter((a) =>
        tab === 'screenshots' ? a.is_screenshot : tab === 'attachments' ? !a.is_screenshot : true
      )

  const s = search.trim().toLowerCase()
  const filtered = !s
    ? baseRows
    : baseRows.filter((r) => {
        const ref = r.defects?.defect_ref || ''
        const title = r.defects?.title || ''
        const needle = isHistory ? r.field_changed || '' : r.file_name || ''
        return `${needle} ${ref} ${title}`.toLowerCase().includes(s)
      })

  const onSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  const dateField = isHistory ? 'changed_at' : 'created_at'
  const sortValue = (row, key) => {
    if (key === 'date') return row[dateField] || ''
    if (key === 'defect_ref_sort') return row.defects?.defect_ref || row.defects?.title || ''
    return row[key] || ''
  }
  const sorted = sort.key
    ? [...filtered].sort((a, b) => {
        const av = sortValue(a, sort.key)
        const bv = sortValue(b, sort.key)
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    : [...filtered].sort((a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0))

  const exportCols = isHistory
    ? [
        { key: 'field_changed', label: 'Field' },
        { key: 'old_value', label: 'Old value' },
        { key: 'new_value', label: 'New value' },
        { key: 'changed_at', label: 'Changed at' },
      ]
    : [
        { key: 'file_name', label: 'File' },
        { key: 'is_screenshot', label: 'Type' },
        { key: 'created_at', label: 'Uploaded at' },
      ]

  const exportRows = sorted.map((r) => ({
    ...r,
    defect_ref: r.defects?.defect_ref,
    defect_title: r.defects?.title,
    is_screenshot: isHistory ? undefined : r.is_screenshot ? 'Screenshot' : 'Attachment',
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <input
          type="search"
          placeholder={isHistory ? 'Search field, defect ref or title…' : 'Search file name, defect ref or title…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white min-w-[240px]"
        />
        <ExportListMenu
          columns={exportCols}
          data={exportRows}
          baseFilename={isHistory ? 'testing-evidence-history' : `testing-evidence-${tab}`}
          disabled={!exportRows.length}
        />
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                {isHistory ? (
                  <>
                    <SortHeader label="Defect" sortKey="defect_ref_sort" sort={sort} onSort={onSort} />
                    <SortHeader label="Field" sortKey="field_changed" sort={sort} onSort={onSort} />
                    <th className="p-3">Old value</th>
                    <th className="p-3">New value</th>
                    <SortHeader label="Changed" sortKey="date" sort={sort} onSort={onSort} />
                  </>
                ) : (
                  <>
                    <SortHeader label="File" sortKey="file_name" sort={sort} onSort={onSort} />
                    <th className="p-3">Defect</th>
                    <th className="p-3">Type</th>
                    <SortHeader label="Uploaded" sortKey="date" sort={sort} onSort={onSort} />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  {isHistory ? (
                    <>
                      <td className="p-3">
                        <Link
                          to={`/platform/testing/defects/${r.defects?.id}`}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          {r.defects?.defect_ref || r.defects?.title || '—'}
                        </Link>
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">{r.field_changed}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{r.old_value || '—'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{r.new_value || '—'}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">
                        {r.changed_at ? new Date(r.changed_at).toLocaleString() : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">
                        <a
                          href={r.preview_url || (/^https?:\/\//i.test(r.file_url || '') ? r.file_url : undefined)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline truncate"
                        >
                          {r.file_name}
                        </a>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/platform/testing/defects/${r.defects?.id}`}
                          className="text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          {r.defects?.defect_ref || r.defects?.title || '—'}
                        </Link>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">
                        {r.is_screenshot ? 'Screenshot' : 'Attachment'}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">
              {isHistory ? 'No defect history for this project yet.' : 'No evidence uploaded for this project yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
