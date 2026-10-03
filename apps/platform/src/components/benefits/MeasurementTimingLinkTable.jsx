/**
 * Linked Measurement Point ↔ Timing table for Benefits Review Plans.
 * Pick a measurement approach point, add timing rationale; display as two columns.
 */

import { useMemo, useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  parseMeasurementTimingLinks,
  serializeMeasurementTimingLinks,
  parseMeasurementPoints,
} from '@nidus/shared/utils/measurementTimingUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowActionButton from '@nidus/ui/RowActionButton'
import Modal from '@nidus/ui/Modal'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import SelectField from '@nidus/ui/SelectField'

export default function MeasurementTimingLinkTable({
  approachValue = '',
  value = '',
  onChange,
  disabled = false,
  viewModeId = 'brp-measurement-timing-links',
}) {
  const points = useMemo(() => parseMeasurementPoints(approachValue), [approachValue])
  const rows = useMemo(() => parseMeasurementTimingLinks(value), [value])

  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const [selectedPoint, setSelectedPoint] = useState('')
  const [timingDraft, setTimingDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editPoint, setEditPoint] = useState('')
  const [editTiming, setEditTiming] = useState('')
  const [deleteIndex, setDeleteIndex] = useState(null)

  const pointOptions = useMemo(
    () => [
      { value: '', label: points.length ? 'Select measurement point…' : 'Add measurement points above first' },
      ...points.map((p) => ({ value: p, label: p })),
    ],
    [points]
  )

  const commit = (nextRows) => {
    onChange?.(serializeMeasurementTimingLinks(nextRows))
  }

  const handleAdd = () => {
    const point = selectedPoint.trim()
    const timing = timingDraft.trim()
    if (!point || !timing || disabled) return

    const existingIdx = rows.findIndex((r) => r.point === point)
    let next
    if (existingIdx >= 0) {
      next = rows.map((r, i) => (i === existingIdx ? { point, timing } : r))
    } else {
      next = [...rows, { point, timing }]
    }
    commit(next)
    setSelectedPoint('')
    setTimingDraft('')
  }

  const startEdit = (index) => {
    const row = rows[index]
    if (!row || disabled) return
    setViewMode('list')
    setEditingIndex(index)
    setEditPoint(row.point || '')
    setEditTiming(row.timing || '')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditPoint('')
    setEditTiming('')
  }

  const saveEdit = () => {
    if (editingIndex == null) return
    const point = editPoint.trim()
    const timing = editTiming.trim()
    if (!point || !timing) return
    const next = rows.map((r, i) => (i === editingIndex ? { point, timing } : r))
    commit(next)
    cancelEdit()
  }

  const confirmDelete = () => {
    if (deleteIndex == null) return
    commit(rows.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)
    if (editingIndex === deleteIndex) cancelEdit()
  }

  const linkedMissing = rows.filter((r) => r.point && !points.includes(r.point))

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Measurement Timing Rationale
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pick a measurement point from the approach list, then add its timing. Shown as Measurement Point | Timing.
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {!points.length && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Add at least one measurement approach point above before linking timing.
        </p>
      )}

      {linkedMissing.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Some linked points were removed from the approach list. Re-pick or delete those rows.
        </p>
      )}

      {viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                  Measurement Point
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                  Measurement Timing
                </th>
                {!disabled && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={disabled ? 3 : 4}
                    className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center"
                  >
                    None recorded.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isEditing = editingIndex === index
                  const orphan = row.point && !points.includes(row.point)
                  return (
                    <tr key={`${row.point}-${index}`} className="group">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 align-top">
                        {isEditing ? (
                          <SelectField
                            id={`brp-timing-edit-point-${index}`}
                            value={editPoint}
                            onChange={(v) => setEditPoint(v)}
                            options={pointOptions}
                            forceNative={points.length < 12}
                          />
                        ) : (
                          <span className={orphan ? 'text-amber-700 dark:text-amber-300' : ''}>
                            {row.point || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTiming}
                            onChange={(e) => setEditTiming(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEdit()
                              }
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          row.timing || '—'
                        )}
                      </td>
                      {!disabled && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                title="Save"
                                aria-label="Save timing link"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title="Cancel"
                                aria-label="Cancel edit"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <RowActionButton variant="edit" label="Edit" onClick={() => startEdit(index)} />
                              <RowActionButton variant="delete" label="Delete" onClick={() => setDeleteIndex(index)} />
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full">None recorded.</p>
          ) : (
            rows.map((row, index) => (
              <div
                key={`${row.point}-card-${index}`}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">#{getDisplayRowNumber(index)}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.point || '—'}</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{row.timing || '—'}</p>
                {!disabled && (
                  <div className="mt-2 flex gap-1">
                    <RowActionButton variant="edit" label="Edit" onClick={() => startEdit(index)} />
                    <RowActionButton variant="delete" label="Delete" onClick={() => setDeleteIndex(index)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Measurement point
            </label>
            <SelectField
              id="brp-timing-add-point"
              value={selectedPoint}
              onChange={setSelectedPoint}
              options={pointOptions}
              disabled={!points.length}
              forceNative={points.length < 12}
            />
          </div>
          <div className="flex-[2] min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Measurement timing
            </label>
            <input
              type="text"
              value={timingDraft}
              onChange={(e) => setTimingDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={!points.length}
              placeholder="e.g. First review 90 days after go-live"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!points.length || !selectedPoint.trim() || !timingDraft.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      )}

      <Modal
        isOpen={deleteIndex != null}
        onClose={() => setDeleteIndex(null)}
        title="Remove timing link?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteIndex(null)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Remove this measurement point / timing pair from the plan?
        </p>
      </Modal>
    </div>
  )
}
