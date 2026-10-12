/**
 * Public Intake Forms (GAP-06) — submissions list. v963 Phase 9 (Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/IntakeFormSubmissionListPage.jsx.
 * Mounted both nested under a form (:id/submissions) and as a flat all-forms view. Status can
 * be updated inline; submissions themselves are created externally via the public form, not
 * from this UI (rule 65 — no create route here). Always sim schema.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Inbox } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowActionButton from '@nidus/ui/RowActionButton'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { listSubmissions, updateSubmissionStatus, getForm } from '../../../services/intakeFormService'

const PAGE_SIZE = 20
const STATUS_OPTIONS = ['received', 'processing', 'created', 'rejected', 'spam']
const STATUS_CLASS = {
  received: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  processing: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  created: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  rejected: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  spam: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

export default function IntakeFormSubmissionListPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'submitted_at', direction: 'desc' },
    storageKey: 'pmis-intake-submissions-sim-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [subs, f] = await Promise.all([
      listSubmissions({ formId: id }),
      id ? getForm(id) : Promise.resolve(null),
    ])
    setRows(subs)
    setForm(f)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => (r.submitter_name || '').toLowerCase().includes(term) || (r.submitter_email || '').toLowerCase().includes(term))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({
    submitter_name: (r) => r.submitter_name || '',
    submission_status: (r) => r.submission_status || '',
    submitted_at: (r) => r.submitted_at || '',
  }), [])

  const sorted = sortedData(filtered, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  const handleStatusChange = async (row, status) => {
    await updateSubmissionStatus(row.id, status)
    await load()
  }

  const exportColumns = [
    { key: 'submitter_name', label: 'Submitter' },
    { key: 'submitter_email', label: 'Email' },
    { key: 'submission_status', label: 'Status' },
    { key: 'submitted_at', label: 'Submitted' },
  ]

  const title = form ? `Submissions — ${form.form_name}` : 'All Intake Form Submissions'
  const submissionDetailPath = (row) => (id ? `${row.id}` : `../${row.form_id}/submissions/${row.id}`)

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {id && (
        <button type="button" onClick={() => navigate('..')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" />
          Back to {form?.form_name || 'form'}
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>
        <ExportListMenu columns={exportColumns} data={sorted} baseFilename="intake-form-submissions" disabled={sorted.length === 0} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search submitters…" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No submissions yet.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('submitter_name')} onSort={() => handleSort('submitter_name')} className="!normal-case whitespace-nowrap">Submitter</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Email</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('submission_status')} onSort={() => handleSort('submission_status')} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('submitted_at')} onSort={() => handleSort('submitted_at')} className="!normal-case whitespace-nowrap">Submitted</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.submitter_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.submitter_email || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={row.submission_status}
                      onChange={(e) => handleStatusChange(row, e.target.value)}
                      className={`rounded-full text-xs font-medium border-0 pr-6 ${STATUS_CLASS[row.submission_status] || STATUS_CLASS.received}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <RowActionButton variant="view" label="View submission" onClick={() => navigate(submissionDetailPath(row))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
