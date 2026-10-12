import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import TestingPageShell from '../../components/testing/TestingPageShell'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  listEvidenceForProject,
  filterEvidenceByOutcome,
  flattenEvidenceRow,
  getEvidenceSignedUrl,
  softDeleteExecutionEvidence,
} from '../../services/testCaseExecutionEvidenceService'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { resolveInternalUserId } from '@nidus/shared/utils/resolveInternalUserId'
import { canRemoveTestEvidence } from '@nidus/shared/utils/testEvidenceRequirement'

// PRD v1204 story 10–13: one list of test-result evidence, Passed by default.
const OUTCOMES = [
  { key: 'passed', label: 'Passed' },
  { key: 'failed', label: 'Failed' },
  { key: 'all', label: 'All' },
]

// Same closed-run set as the execution screen (PRD decision 5).
const CLOSED_RUN_STATUSES = new Set(['completed', 'cancelled', 'aborted'])

const EXPORT_COLUMNS = [
  { key: 'testCaseRef', label: 'Test case' },
  { key: 'testCaseTitle', label: 'Title' },
  { key: 'runName', label: 'Run' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'fileName', label: 'File' },
  { key: 'defectRef', label: 'Defect' },
  { key: 'uploadedBy', label: 'Uploaded by' },
  { key: 'uploadedAt', label: 'Uploaded at' },
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
      subtitle="Files attached to passed test results. Failed results link to their defect."
    >
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const [outcome, setOutcome] = useState('passed')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: null })
  const [currentUserId, setCurrentUserId] = useState(null)
  const { canEdit: isProjectManager } = useProjectRole(projectId)

  useEffect(() => {
    resolveInternalUserId().then(setCurrentUserId)
  }, [])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      setRows(await listEvidenceForProject(projectId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const s = search.trim().toLowerCase()
  // A search term widens scope past the selected outcome pill — otherwise a
  // search for something that only exists on a Failed result silently finds
  // nothing while "Passed" is still selected, which looks like a missing record.
  const searchingAcrossOutcomes = Boolean(s) && outcome !== 'all'
  const flat = useMemo(
    () => filterEvidenceByOutcome(rows, searchingAcrossOutcomes ? 'all' : outcome).map(flattenEvidenceRow),
    [rows, outcome, searchingAcrossOutcomes],
  )

  const filtered = !s
    ? flat
    : flat.filter((r) =>
        `${r.fileName} ${r.testCaseRef} ${r.testCaseTitle} ${r.runName} ${r.defectRef}`
          .toLowerCase()
          .includes(s),
      )

  const onSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  const sorted = sort.key
    ? [...filtered].sort((a, b) => {
        const av = a[sort.key] || ''
        const bv = b[sort.key] || ''
        if (av < bv) return sort.dir === 'asc' ? -1 : 1
        if (av > bv) return sort.dir === 'asc' ? 1 : -1
        return 0
      })
    : [...filtered].sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))

  const openFile = async (row) => {
    try {
      const url = await getEvidenceSignedUrl(row.storagePath)
      if (!url) return
      // Images and PDFs have a native browser viewer; most other types (csv, log,
      // json, plain text…) don't, so a direct link just downloads them instead of
      // opening. Fetch those and reopen as text/plain, which the browser does
      // display inline.
      if (row.mimeType?.startsWith('image/') || row.mimeType === 'application/pdf') {
        window.open(url, '_blank', 'noopener')
        return
      }
      const res = await fetch(url)
      const text = await res.text()
      const blobUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
      window.open(blobUrl, '_blank', 'noopener')
    } catch (e) {
      console.error(e)
      toast.error('Could not open this file. It may not have been stored yet.')
    }
  }

  const canRemove = (row) =>
    canRemoveTestEvidence({
      runClosed: CLOSED_RUN_STATUSES.has(row.runStatus),
      isUploader: Boolean(currentUserId) && row.uploadedById === currentUserId,
      isProjectManager,
    })

  const onRemove = async (row) => {
    if (!window.confirm(`Remove ${row.fileName}? It stays in the audit history.`)) return
    try {
      await softDeleteExecutionEvidence(row.id)
      await load()
    } catch (e) {
      console.error(e)
      toast.error('Could not remove this file. Please try again.')
    }
  }

  if (!projectId) return <p className="text-gray-500 dark:text-gray-400 text-sm">Select a project.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setOutcome(o.key)}
            aria-pressed={outcome === o.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              outcome === o.key
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <input
          type="search"
          placeholder="Search file, test case, run or defect…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white min-w-[240px]"
        />
        <ExportListMenu
          columns={EXPORT_COLUMNS}
          data={sorted}
          baseFilename={`testing-evidence-${searchingAcrossOutcomes ? 'all' : outcome}`}
          disabled={!sorted.length}
        />
      </div>

      {searchingAcrossOutcomes && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Searching across all outcomes, not just {OUTCOMES.find((o) => o.key === outcome)?.label}.
        </p>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <SortHeader label="Test case" sortKey="testCaseRef" sort={sort} onSort={onSort} />
                <SortHeader label="Run" sortKey="runName" sort={sort} onSort={onSort} />
                <SortHeader label="Outcome" sortKey="outcome" sort={sort} onSort={onSort} />
                <SortHeader label="File" sortKey="fileName" sort={sort} onSort={onSort} />
                <th className="p-3">Defect</th>
                <SortHeader label="Uploaded by" sortKey="uploadedBy" sort={sort} onSort={onSort} />
                <SortHeader label="Uploaded" sortKey="uploadedAt" sort={sort} onSort={onSort} />
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-3 text-gray-900 dark:text-white">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.testCaseRef || '—'}</span>
                    <div>{r.testCaseTitle}</div>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{r.runName || '—'}</td>
                  <td className="p-3 capitalize text-gray-700 dark:text-gray-300">{r.outcome || '—'}</td>
                  <td className="p-3 text-gray-900 dark:text-white">{r.fileName}</td>
                  <td className="p-3">
                    {r.defectId ? (
                      <Link
                        to={`/platform/testing/defects/${r.defectId}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {r.defectRef || 'Defect'}
                      </Link>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{r.uploadedBy || '—'}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">
                    {r.uploadedAt ? new Date(r.uploadedAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <RowActionButton variant="view" label={`View ${r.fileName}`} onClick={() => openFile(r)} />
                      {canRemove(r) && (
                        <RowActionButton
                          variant="delete"
                          label={`Remove ${r.fileName}`}
                          onClick={() => onRemove(r)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">
              {outcome === 'passed'
                ? 'No evidence attached to passed tests yet.'
                : 'No evidence matches this filter.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
