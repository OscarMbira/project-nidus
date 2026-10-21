/**
 * Local Register Engine — generic list page (v931). Renders ANY register (system-defined or
 * member-created) from its field-config, not a hardcoded column set. See
 * projectplan/v931_local_register_engine_plan.md Phase 3.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List as ListIcon } from 'lucide-react'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import Modal from '@nidus/ui/Modal'
import Button from '@nidus/ui/Button'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { listRecords, deleteRecord } from '../../services/localRegisterRecordService'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { registerFieldExportValue, registerRecordSearchText } from '@nidus/shared/utils/registerCustomFields'
import { useRegisterCustomFields } from '../../lib/useRegisterCustomFields'

const PAGE_SIZE = 20

function fieldValueToText(value, field) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  // Dropdown / multi-select values are option keys — show their labels.
  const labelOf = (v) => (field?.dropdown_options || []).find((o) => o.value === v)?.label || v
  if (Array.isArray(value)) return value.length ? value.map(labelOf).join('; ') : '—'
  if (field?.field_type === 'dropdown') return labelOf(value)
  // Multi-line list fields are newline-joined — show them inline in a table cell.
  return String(value).split(/\r?\n/).filter(Boolean).join('; ')
}

export default function LocalRegisterListPage() {
  const { registerId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Required for a system-defined register (it carries no scope of its own, v932) so its
  // records don't mix across every project/org that uses it. A member-created register is
  // already tied to one entity via its own scope_*_id, so these are unused for it.
  const queryScopeLevel = searchParams.get('scopeLevel') || ''
  const queryScopeEntityId = searchParams.get('scopeEntityId') || ''
  const scopeQuerySuffix = queryScopeEntityId
    ? `?scopeLevel=${queryScopeLevel}&scopeEntityId=${queryScopeEntityId}`
    : ''

  const [loading, setLoading] = useState(true)
  const [register, setRegister] = useState(null)
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useViewMode(`local-register-${registerId}`, 'list')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { showSuccess, modal: successModal } = useSuccessModal()
  // Organisation custom fields (v1311): extra list columns, searchable, exported.
  const customFields = useRegisterCustomFields(register)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: `local-register-${registerId}-sort`,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const registerResult = await getRegisterDefinition(registerId)
      if (cancelled) return
      setRegister(registerResult.data)

      // Self-correct a raw-UUID URL to the friendly register_key (rule 16.3), same pattern as
      // Platform's copy of this page.
      if (
        registerResult.data?.register_key &&
        isLikelyDatabaseUuid(registerId) &&
        registerId !== registerResult.data.register_key
      ) {
        navigate(`/simulator/local-registers/${registerResult.data.register_key}${scopeQuerySuffix}`, { replace: true })
      }

      const isSystemDefined = registerResult.data?.is_system_defined
      const scopeFilter = isSystemDefined
        ? { scopeLevel: queryScopeLevel, scopeEntityId: queryScopeEntityId }
        : {
            scopeLevel: registerResult.data?.scope_level,
            scopeEntityId:
              registerResult.data?.scope_portfolio_id ||
              registerResult.data?.scope_programme_id ||
              registerResult.data?.scope_project_id ||
              null,
          }

      const recordsResult = await listRecords(registerResult.data?.id, scopeFilter)
      if (cancelled) return
      setRecords(recordsResult.data || [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [registerId, queryScopeLevel, queryScopeEntityId])

  const routeKey = register?.register_key || registerId

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return records
    return records.filter((r) => registerRecordSearchText(r).includes(term))
  }, [records, search])

  const sortAccessors = useMemo(() => ({
    title: (r) => r.title || '',
    status: (r) => r.status || '',
    created_at: (r) => r.created_at || '',
  }), [])

  const sorted = sortedData(filteredRecords, sortAccessors)
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  // Built-in then custom fields; values exported readably (option labels, Yes/No, one list item per line).
  const exportFields = useMemo(
    () => [...(register?.fields || []), ...customFields.fields],
    [register, customFields.fields]
  )

  const exportColumns = useMemo(() => {
    const base = [{ key: 'title', label: register?.label ? `${register.label} Title` : 'Title' }, { key: 'status', label: 'Status' }]
    return [...base, ...exportFields.map((f) => ({ key: f.field_key, label: f.field_label }))]
  }, [register, exportFields])

  const exportRows = useMemo(
    () => sorted.map((r) => ({
      title: r.title,
      status: (register?.status_workflow || []).find((st) => st.key === r.status)?.label || r.status,
      ...Object.fromEntries(exportFields.map((f) => [f.field_key, registerFieldExportValue(r.field_values?.[f.field_key], f)])),
    })),
    [sorted, register, exportFields]
  )

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading register…</div>
  }
  if (!register) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Register not found.</div>
  }

  const fields = register.fields || []
  const tableFields = [...fields.slice(0, 4), ...customFields.fields]
  const statusOptions = register.status_workflow || []

  // Soft delete (is_deleted). Not offered while a record awaits approval — it is locked (rule 53).
  const canDelete = (record) => record.record_status !== 'unauthorised'
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError('')
    const result = await deleteRecord(pendingDelete.id)
    setDeleting(false)
    if (!result.success) {
      setDeleteError(result.error || 'Failed to delete record')
      return
    }
    setRecords((prev) => prev.filter((r) => r.id !== pendingDelete.id))
    showSuccess({ recordId: pendingDelete.display_id || pendingDelete.title, operation: 'deleted' })
    setPendingDelete(null)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{register.label}</h1>
          {register.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{register.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu
            columns={exportColumns}
            data={exportRows}
            baseFilename={register.register_key || 'local-register'}
            disabled={exportRows.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate(`/simulator/local-registers/${routeKey}/create${scopeQuerySuffix}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New {register.label}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={`Search ${register.label.toLowerCase()}…`}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            aria-label="Table view"
          >
            <ListIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No records yet.
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('title')}
                  onSort={() => handleSort('title')}
                  className="!normal-case whitespace-nowrap"
                >
                  Title
                </TableHeaderCell>
                {tableFields.map((f) => (
                  <TableHeaderCell key={f.id} sortable={false} className="!normal-case whitespace-nowrap">
                    {f.field_label}
                  </TableHeaderCell>
                ))}
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('status')}
                  onSort={() => handleSort('status')}
                  className="!normal-case whitespace-nowrap"
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pageRows.map((record, index) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableRowNumberCell number={getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })} />
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{record.title}</td>
                  {tableFields.map((f) => (
                    <td key={f.id} className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {fieldValueToText(record.field_values?.[f.field_key], f)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      {statusOptions.find((s) => s.key === record.status)?.label || record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <RowActionButton
                        variant="view"
                        label={`View ${register.label}`}
                        onClick={() => navigate(`/simulator/local-registers/${routeKey}/${record.id}`)}
                      />
                      <RowActionButton
                        variant="edit"
                        label={`Edit ${register.label}`}
                        onClick={() => navigate(`/simulator/local-registers/${routeKey}/${record.id}/edit`)}
                      />
                      {canDelete(record) && (
                        <RowActionButton
                          variant="delete"
                          label={`Delete ${register.label}`}
                          onClick={() => { setDeleteError(''); setPendingDelete(record) }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageRows.map((record, index) => (
            <div
              key={record.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-400">#{getDisplayRowNumber(index, { page, pageSize: PAGE_SIZE })}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  {statusOptions.find((s) => s.key === record.status)?.label || record.status}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{record.title}</h3>
              <div className="flex items-center gap-3 pt-2">
                <RowActionButton
                  variant="view"
                  label={`View ${register.label}`}
                  onClick={() => navigate(`/simulator/local-registers/${routeKey}/${record.id}`)}
                />
                <RowActionButton
                  variant="edit"
                  label={`Edit ${register.label}`}
                  onClick={() => navigate(`/simulator/local-registers/${routeKey}/${record.id}/edit`)}
                />
                {canDelete(record) && (
                  <RowActionButton
                    variant="delete"
                    label={`Delete ${register.label}`}
                    onClick={() => { setDeleteError(''); setPendingDelete(record) }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        isOpen={!!pendingDelete}
        onClose={() => !deleting && setPendingDelete(null)}
        title={`Delete ${register.label}`}
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Delete <span className="font-medium text-gray-900 dark:text-gray-100">{pendingDelete?.title}</span>
          {pendingDelete?.display_id ? ` (${pendingDelete.display_id})` : ''}? It will be removed from this register.
        </p>
        {deleteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
      </Modal>
      {successModal}
    </div>
  )
}
