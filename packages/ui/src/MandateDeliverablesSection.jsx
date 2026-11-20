/**
 * Key deliverables of a project mandate (v1344, slice 2). Same shape as
 * MandateDependenciesSection: one row per deliverable — name, description, rough timeframe,
 * in or out of scope, major or minor. Saves each change straight away through the app's service
 * (Platform: public.mandate_deliverables; Simulator: sim.mandate_deliverables).
 *
 * @param {{
 *   mandateId: string|null,
 *   readOnly?: boolean,
 *   viewModeId: string,
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
import FieldLabelWithHelp from './FieldLabelWithHelp.jsx'

const yesNo = (v) => (v ? 'Yes' : 'No')
const EMPTY = { deliverable_name: '', deliverable_description: '', estimated_completion: '', is_in_scope: true, is_major_deliverable: true }
const ACCESSORS = {
  deliverable_name: (r) => r.deliverable_name,
  estimated_completion: (r) => r.estimated_completion,
  is_in_scope: (r) => Boolean(r.is_in_scope),
  is_major_deliverable: (r) => Boolean(r.is_major_deliverable),
}
const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
const shortName = (text) => {
  const t = String(text || '').trim()
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || 'Deliverable'
}

export default function MandateDeliverablesSection({ mandateId, readOnly = false, viewModeId, service, helpSchema = 'public' }) {
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
    defaultSort: { column: 'deliverable_name', direction: 'asc' },
    storageKey: `${viewModeId}-sort`,
  })

  const load = useCallback(async () => {
    if (!mandateId) return []
    return service.list(mandateId)
  }, [mandateId, service])

  useEffect(() => {
    let cancelled = false
    if (!mandateId) return undefined
    Promise.resolve()
      .then(() => { if (!cancelled) setLoading(true) })
      .then(load)
      .then((data) => { if (!cancelled) { setRows(data || []); setError('') } })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load deliverables') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mandateId, load])

  const visible = useMemo(() => {
    const t = search.trim().toLowerCase()
    const byCreated = [...rows].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    const filtered = t
      ? byCreated.filter((r) => [r.deliverable_name, r.deliverable_description, r.estimated_completion]
          .some((v) => String(v || '').toLowerCase().includes(t)))
      : byCreated
    return sortedData(filtered, ACCESSORS)
  }, [rows, search, sortedData])

  const startAdd = () => { setDraft(EMPTY); setEditing('new') }
  const startEdit = (row) => {
    setDraft({
      deliverable_name: row.deliverable_name || '',
      deliverable_description: row.deliverable_description || '',
      estimated_completion: row.estimated_completion || '',
      is_in_scope: row.is_in_scope !== false,
      is_major_deliverable: row.is_major_deliverable !== false,
    })
    setEditing(row.id)
  }
  const cancel = () => { setEditing(null); setDraft(EMPTY) }

  const save = async () => {
    const name = draft.deliverable_name.trim()
    if (!name) { setError('Name the deliverable before saving.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...draft,
        deliverable_name: name,
        deliverable_description: draft.deliverable_description.trim() || null,
        estimated_completion: draft.estimated_completion.trim() || null,
      }
      if (editing === 'new') {
        const created = await service.add(mandateId, { ...payload, display_order: rows.length })
        setRows((prev) => [...prev, created])
        showSuccess({ recordId: shortName(name), operation: 'created', message: 'Deliverable added to the mandate.' })
      } else {
        const updated = await service.update(editing, payload)
        setRows((prev) => prev.map((r) => (r.id === editing ? { ...r, ...updated } : r)))
        showSuccess({ recordId: shortName(name), operation: 'updated', message: 'Deliverable updated.' })
      }
      cancel()
    } catch (e) {
      setError(e?.message || 'Could not save the deliverable')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm('Delete this deliverable?')) return
    setError('')
    try {
      await service.remove(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      showSuccess({ recordId: shortName(row.deliverable_name), operation: 'deleted', message: 'Deliverable deleted.' })
    } catch (e) {
      setError(e?.message || 'Could not delete the deliverable')
    }
  }

  const actions = (row) => (readOnly ? null : (
    <div className="flex items-center gap-1">
      <RowActionButton variant="edit" label="Edit deliverable" onClick={() => startEdit(row)} />
      <RowActionButton variant="delete" label="Delete deliverable" onClick={() => remove(row)} />
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
          <FieldLabelWithHelp as="h2" helpKey={`${helpSchema}.project_mandates.key_deliverables`} className="text-lg font-semibold text-gray-900 dark:text-white">Key deliverables</FieldLabelWithHelp>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The main things the project is expected to produce, and anything explicitly out of scope.
          </p>
        </div>
        {!readOnly && mandateId && editing === null && (
          <button type="button" onClick={startAdd}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 self-start">
            <Plus className="h-4 w-4" /> Add deliverable
          </button>
        )}
      </div>

      {!mandateId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the mandate first, then add its deliverables.</p>}
      {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {editing !== null && (
        <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
          <div>
            <FieldLabelWithHelp helpKey={`${helpSchema}.mandate_deliverables.deliverable_name`} htmlFor="mandate-deliverable-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>
              Deliverable <span className="text-red-500">*</span>
            </FieldLabelWithHelp>
            <input id="mandate-deliverable-name" className={inputClass} value={draft.deliverable_name} maxLength={200}
              onChange={(e) => setDraft((d) => ({ ...d, deliverable_name: e.target.value }))}
              placeholder="e.g. New customer onboarding journey" />
          </div>
          <div>
            <FieldLabelWithHelp helpKey={`${helpSchema}.mandate_deliverables.deliverable_description`} htmlFor="mandate-deliverable-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</FieldLabelWithHelp>
            <textarea id="mandate-deliverable-description" rows={2} className={inputClass} value={draft.deliverable_description}
              onChange={(e) => setDraft((d) => ({ ...d, deliverable_description: e.target.value }))} />
          </div>
          <div>
            <FieldLabelWithHelp helpKey={`${helpSchema}.mandate_deliverables.estimated_completion`} htmlFor="mandate-deliverable-when" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rough timeframe</FieldLabelWithHelp>
            <input id="mandate-deliverable-when" className={inputClass} value={draft.estimated_completion} maxLength={100}
              onChange={(e) => setDraft((d) => ({ ...d, estimated_completion: e.target.value }))} placeholder="e.g. Q3 2027" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
            <FieldLabelWithHelp helpKey={`${helpSchema}.mandate_deliverables.is_in_scope`} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={draft.is_in_scope} onChange={(e) => setDraft((d) => ({ ...d, is_in_scope: e.target.checked }))} />
              In scope
            </FieldLabelWithHelp>
            <FieldLabelWithHelp helpKey={`${helpSchema}.mandate_deliverables.is_major_deliverable`} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={draft.is_major_deliverable} onChange={(e) => setDraft((d) => ({ ...d, is_major_deliverable: e.target.checked }))} />
              Major deliverable
            </FieldLabelWithHelp>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
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
            <input type="search" aria-label="Search deliverables" placeholder="Search deliverables…"
              className={`${inputClass} sm:max-w-xs`} value={search} onChange={(e) => setSearch(e.target.value)} />
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Deliverables layout" className="sm:ml-auto" />
          </div>
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading deliverables…</p>}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rows.length === 0 ? 'No deliverables recorded.' : 'No deliverables match your search.'}
            </p>
          )}
          {!loading && visible.length > 0 && viewMode === 'list' && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <TableRowNumberHeader />
                    {header('deliverable_name', 'Deliverable')}
                    {header('estimated_completion', 'Timeframe')}
                    {header('is_in_scope', 'In scope')}
                    {header('is_major_deliverable', 'Major')}
                    {!readOnly && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {visible.map((row, index) => (
                    <tr key={row.id}>
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {row.deliverable_name}
                        {row.deliverable_description && <span className="block text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{row.deliverable_description}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.estimated_completion || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{yesNo(row.is_in_scope !== false)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{yesNo(row.is_major_deliverable !== false)}</td>
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.deliverable_name}</p>
                  {row.deliverable_description && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{row.deliverable_description}</p>}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-gray-500 dark:text-gray-400">Timeframe</dt><dd className="text-gray-800 dark:text-gray-200">{row.estimated_completion || '—'}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">In scope</dt><dd className="text-gray-800 dark:text-gray-200">{yesNo(row.is_in_scope !== false)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">Major</dt><dd className="text-gray-800 dark:text-gray-200">{yesNo(row.is_major_deliverable !== false)}</dd>
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
