/**
 * Dependencies section of a project mandate (v1340 wave 4 follow-up, SQL v1447).
 * One row per dependency: description, type, status, and whether it affects the project while it
 * runs and/or after implementation. Saves each change straight away through the app's service
 * (Platform: public.mandate_dependencies; Simulator: sim.mandate_dependencies).
 *
 * @param {{
 *   mandateId: string|null,
 *   readOnly?: boolean,
 *   viewModeId: string,
 *   onRowsChange?: (rows: object[]) => void,      // e.g. to include the dependencies in the mandate export
 *   service: {
 *     list: (mandateId: string) => Promise<object[]>,
 *     add: (mandateId: string, row: object) => Promise<object>,
 *     update: (id: string, row: object) => Promise<object>,
 *     remove: (id: string) => Promise<unknown>,
 *   },
 * }} props
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table.jsx'
import RowActionButton from './RowActionButton.jsx'
import RowNumberBadge from './RowNumberBadge.jsx'
import ViewToggle from './ViewToggle.jsx'

// Values match the CHECK constraints on mandate_dependencies (v160 / v1447).
const TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'interdependency', label: 'Interdependency' },
  { value: 'unknown', label: 'Unknown' },
]
const STATUSES = [
  { value: 'identified', label: 'Identified' },
  { value: 'analysed', label: 'Analysed' },
  { value: 'managed', label: 'Managed' },
]
const labelOf = (list, v) => list.find((o) => o.value === v)?.label || v || '—'
const yesNo = (v) => (v ? 'Yes' : 'No')

const EMPTY = {
  dependency_description: '',
  dependency_type: 'internal',
  dependency_status: 'identified',
  impact_during_project: true,
  impact_after_implementation: false,
}

const ACCESSORS = {
  dependency_description: (r) => r.dependency_description,
  dependency_type: (r) => labelOf(TYPES, r.dependency_type),
  dependency_status: (r) => labelOf(STATUSES, r.dependency_status),
  impact_during_project: (r) => Boolean(r.impact_during_project),
  impact_after_implementation: (r) => Boolean(r.impact_after_implementation),
}

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const shortName = (text) => {
  const t = String(text || '').trim()
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || 'Dependency'
}

export default function MandateDependenciesSection({ mandateId, readOnly = false, viewModeId, service, onRowsChange }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row id
  const [draft, setDraft] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const { showSuccess, modal } = useSuccessModal()
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'dependency_description', direction: 'asc' },
    storageKey: `${viewModeId}-sort`,
  })

  const load = useCallback(async () => {
    if (!mandateId) { setRows([]); return }
    setLoading(true)
    setError('')
    try {
      setRows(await service.list(mandateId))
    } catch (e) {
      setError(e?.message || 'Could not load dependencies')
    } finally {
      setLoading(false)
    }
  }, [mandateId, service])

  useEffect(() => { load() }, [load])
  useEffect(() => { onRowsChange?.(rows) }, [rows, onRowsChange])

  const visible = useMemo(() => {
    const t = search.trim().toLowerCase()
    const byCreated = [...rows].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    const filtered = t
      ? byCreated.filter((r) => [r.dependency_description, labelOf(TYPES, r.dependency_type), labelOf(STATUSES, r.dependency_status)]
          .some((v) => String(v || '').toLowerCase().includes(t)))
      : byCreated
    return sortedData(filtered, ACCESSORS)
  }, [rows, search, sortedData])

  const startAdd = () => { setDraft(EMPTY); setEditing('new') }
  const startEdit = (row) => {
    setDraft({
      dependency_description: row.dependency_description || '',
      dependency_type: row.dependency_type || 'internal',
      dependency_status: row.dependency_status || 'identified',
      impact_during_project: Boolean(row.impact_during_project),
      impact_after_implementation: Boolean(row.impact_after_implementation),
    })
    setEditing(row.id)
  }
  const cancel = () => { setEditing(null); setDraft(EMPTY) }

  const save = async () => {
    const description = draft.dependency_description.trim()
    if (!description) { setError('Describe the dependency before saving.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...draft, dependency_description: description }
      if (editing === 'new') {
        const created = await service.add(mandateId, { ...payload, display_order: rows.length })
        setRows((prev) => [...prev, created])
        showSuccess({ recordId: shortName(description), operation: 'created', message: 'Dependency added to the mandate.' })
      } else {
        const updated = await service.update(editing, payload)
        setRows((prev) => prev.map((r) => (r.id === editing ? { ...r, ...updated } : r)))
        showSuccess({ recordId: shortName(description), operation: 'updated', message: 'Dependency updated.' })
      }
      cancel()
    } catch (e) {
      setError(e?.message || 'Could not save the dependency')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm('Delete this dependency?')) return
    setError('')
    try {
      await service.remove(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      showSuccess({ recordId: shortName(row.dependency_description), operation: 'deleted', message: 'Dependency deleted.' })
    } catch (e) {
      setError(e?.message || 'Could not delete the dependency')
    }
  }

  const actions = (row) => (readOnly ? null : (
    <div className="flex items-center gap-1">
      <RowActionButton variant="edit" label="Edit dependency" onClick={() => startEdit(row)} />
      <RowActionButton variant="delete" label="Delete dependency" onClick={() => remove(row)} />
    </div>
  ))

  const header = (column, label) => (
    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn(column)} onSort={() => handleSort(column)}>
      {label}
    </TableHeaderCell>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dependencies</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Other work this project relies on, or that relies on it, and whether it matters during the project, after it, or both.
          </p>
        </div>
        {!readOnly && mandateId && editing === null && (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 self-start"
          >
            <Plus className="h-4 w-4" /> Add dependency
          </button>
        )}
      </div>

      {!mandateId && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Save the mandate first, then add its dependencies.</p>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {editing !== null && (
        <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
          <div>
            <label htmlFor="mandate-dependency-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dependency <span className="text-red-500">*</span>
            </label>
            <textarea
              id="mandate-dependency-description"
              rows={2}
              className={inputClass}
              value={draft.dependency_description}
              onChange={(e) => setDraft((d) => ({ ...d, dependency_description: e.target.value }))}
              placeholder="e.g. Network upgrade by the infrastructure programme"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="mandate-dependency-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select id="mandate-dependency-type" className={inputClass} value={draft.dependency_type}
                onChange={(e) => setDraft((d) => ({ ...d, dependency_type: e.target.value }))}>
                {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mandate-dependency-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select id="mandate-dependency-status" className={inputClass} value={draft.dependency_status}
                onChange={(e) => setDraft((d) => ({ ...d, dependency_status: e.target.value }))}>
                {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={draft.impact_during_project}
                onChange={(e) => setDraft((d) => ({ ...d, impact_during_project: e.target.checked }))} />
              Affects the project while it runs
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={draft.impact_after_implementation}
                onChange={(e) => setDraft((d) => ({ ...d, impact_after_implementation: e.target.checked }))} />
              Continues after implementation
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : editing === 'new' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {mandateId && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <input
              type="search"
              aria-label="Search dependencies"
              placeholder="Search dependencies…"
              className={`${inputClass} sm:max-w-xs`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Dependencies layout" className="sm:ml-auto" />
          </div>

          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading dependencies…</p>}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rows.length === 0 ? 'No dependencies recorded.' : 'No dependencies match your search.'}
            </p>
          )}

          {!loading && visible.length > 0 && viewMode === 'list' && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <TableRowNumberHeader />
                    {header('dependency_description', 'Dependency')}
                    {header('dependency_type', 'Type')}
                    {header('impact_during_project', 'During project')}
                    {header('impact_after_implementation', 'After implementation')}
                    {header('dependency_status', 'Status')}
                    {!readOnly && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {visible.map((row, index) => (
                    <tr key={row.id}>
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{row.dependency_description}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{labelOf(TYPES, row.dependency_type)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{yesNo(row.impact_during_project)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{yesNo(row.impact_after_implementation)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{labelOf(STATUSES, row.dependency_status)}</td>
                      {!readOnly && <td className="px-6 py-4 text-right">{actions(row)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && visible.length > 0 && viewMode !== 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map((row, index) => (
                <div key={row.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    {actions(row)}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{row.dependency_description}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="text-gray-800 dark:text-gray-200">{labelOf(TYPES, row.dependency_type)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">Status</dt><dd className="text-gray-800 dark:text-gray-200">{labelOf(STATUSES, row.dependency_status)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">During project</dt><dd className="text-gray-800 dark:text-gray-200">{yesNo(row.impact_during_project)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">After implementation</dt><dd className="text-gray-800 dark:text-gray-200">{yesNo(row.impact_after_implementation)}</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {modal}
    </div>
  )
}
