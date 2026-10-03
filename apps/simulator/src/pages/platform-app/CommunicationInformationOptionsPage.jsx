/**
 * Catalog of communication-plan formats and levels of detail.
 * Same page from Stakeholders and from PMO Configuration.
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { RowActionButton } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import {
  canMaintainCommunicationInformationOptions,
  deleteCommunicationInformationOption,
  listCommunicationInformationOptions,
} from '../../services/stakeholderService'
import {
  communicationOptionKindLabel,
  communicationOptionPath,
  communicationOptionsBasePath,
  COMMUNICATION_OPTION_KINDS,
} from './communicationOptionPaths'

const COLUMNS = [
  { key: 'option_label', label: 'Name' },
  { key: 'kind_label', label: 'Used for' },
  { key: 'option_code', label: 'Code' },
  { key: 'sort_order', label: 'Order' },
  { key: 'status', label: 'Status' },
]

function decorate(row) {
  return {
    ...row,
    kind_label: communicationOptionKindLabel(row.option_kind),
    status: row.is_active ? 'Active' : 'Inactive',
  }
}

export default function CommunicationInformationOptionsPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const basePath = communicationOptionsBasePath(pathname)
  const { showSuccess, modal } = useSuccessModal()
  const [viewMode, setViewMode] = useViewMode('communication-information-options', 'list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canMaintain, setCanMaintain] = useState(false)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'option_label', direction: 'asc' },
    storageKey: 'communication-information-options-sort',
  })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [allowed, listed] = await Promise.all([
        canMaintainCommunicationInformationOptions(),
        listCommunicationInformationOptions(),
      ])
      setCanMaintain(allowed)
      setRows((listed || []).map(decorate))
    } catch (err) {
      setError(err?.message || 'Could not load communication formats')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (kind && row.option_kind !== kind) return false
      if (!term) return true
      return [row.option_label, row.option_code, row.kind_label]
        .some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [rows, search, kind])

  const displayRows = sortedData(filtered, {
    option_label: (row) => row.option_label,
    kind_label: (row) => row.kind_label,
    option_code: (row) => row.option_code,
    sort_order: (row) => row.sort_order,
    status: (row) => row.status,
    created_at: (row) => row.created_at,
  })

  async function remove(row) {
    const ok = window.confirm(`Delete ${row.option_label}? Communication plans that already use this code keep the code.`)
    if (!ok) return
    try {
      await deleteCommunicationInformationOption(row.id)
      showSuccess({
        recordId: row.option_code,
        operation: 'deleted',
        message: `${row.option_label} was removed from the list.`,
      })
      await load()
    } catch (err) {
      setError(err?.message || 'Could not delete this option')
    }
  }

  function Actions({ row }) {
    return (
      <div className="flex justify-end gap-1">
        <RowActionButton variant="view" label="View" onClick={() => navigate(communicationOptionPath(basePath, row, 'view'))} />
        {canMaintain && (
          <RowActionButton variant="edit" label="Edit" onClick={() => navigate(communicationOptionPath(basePath, row, 'edit'))} />
        )}
        {canMaintain && (
          <RowActionButton variant="delete" label="Delete" onClick={() => remove(row)} />
        )}
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Communication formats</h1>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
            Names used for format and level of detail on a communication plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Communication format layout" />
          <ExportListMenu columns={COLUMNS} data={displayRows} baseFilename="Communication formats" disabled={!displayRows.length} />
          {canMaintain && (
            <button
              type="button"
              onClick={() => navigate(`${basePath}/new`)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add option
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search names or codes"
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All</option>
          {COMMUNICATION_OPTION_KINDS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <p className="text-gray-700 dark:text-gray-200">Loading options…</p>
      ) : displayRows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-700 dark:text-gray-200">No options match this search.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayRows.map((row, index) => (
            <article key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">{row.option_label}</h2>
                </div>
                <Actions row={row} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{row.kind_label} · {row.option_code} · {row.status}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('option_label')} onSort={() => handleSort('option_label')}>Name</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('kind_label')} onSort={() => handleSort('kind_label')}>Used for</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('option_code')} onSort={() => handleSort('option_code')}>Code</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('sort_order')} onSort={() => handleSort('sort_order')}>Order</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>Status</TableHeaderCell>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">{row.option_label}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{row.kind_label}</td>
                  <td className="px-3 py-3 font-mono text-gray-700 dark:text-gray-200">{row.option_code}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{row.sort_order}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{row.status}</td>
                  <td className="px-3 py-3"><Actions row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
