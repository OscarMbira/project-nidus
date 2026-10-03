/**
 * MultiLineListInput — system-wide multi-line list field with Card ⊞ / Table-List ≡ toggle.
 * Value is a newline-joined string. Table mode supports inline edit and confirm-before-delete.
 * Optional primary flagging (v1092 Contact Directory): primaryValue + onPrimaryChange.
 * Requires a stable `viewModeId` for useViewMode persistence (CLAUDE.md rule 67).
 */

import { useState, useEffect } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import ViewToggle from './ViewToggle'
import RowActionButton from './RowActionButton'
import Modal from './Modal'
import { TableRowNumberHeader, TableRowNumberCell } from './Table'

export function parseMultiLineValue(value) {
  if (!value || typeof value !== 'string') return []
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export function joinMultiLineValue(lines) {
  return (Array.isArray(lines) ? lines : []).map((l) => String(l).trim()).filter(Boolean).join('\n')
}

export default function MultiLineListInput({
  viewModeId,
  id,
  value,
  onChange,
  placeholder = '',
  ariaLabelPrefix = 'item',
  itemColumnLabel = 'Item',
  disabled = false,
  /** When set with onPrimaryChange, each row can be flagged as primary */
  primaryValue = null,
  onPrimaryChange = null,
  primaryLabel = 'Primary',
  /** Optional per-item validator: return error message string, or null/undefined if valid */
  validateItem = null,
}) {
  if (!viewModeId && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('MultiLineListInput: viewModeId is required for view persistence (rule 67).')
  }

  const allowPrimary = typeof onPrimaryChange === 'function'
  const [viewMode, setViewMode] = useViewMode(viewModeId || `multiline-missing-${id || 'field'}`, 'list')
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // number | 'all' | null
  const [itemError, setItemError] = useState('')

  const lines = parseMultiLineValue(value)

  useEffect(() => {
    setEditingIndex(null)
    setEditDraft('')
    setItemError('')
  }, [viewMode])

  // Keep primary in sync when the list changes (deleted / emptied)
  useEffect(() => {
    if (!allowPrimary) return
    const current = String(primaryValue || '').trim()
    if (!lines.length) {
      if (current) onPrimaryChange('')
      return
    }
    if (!current || !lines.includes(current)) {
      onPrimaryChange(lines[0])
    }
  }, [lines.join('\n'), allowPrimary]) // eslint-disable-line react-hooks/exhaustive-deps

  const setLines = (next) => onChange(joinMultiLineValue(next))

  const runValidate = (raw) => {
    if (typeof validateItem !== 'function') return null
    const msg = validateItem(raw)
    return msg ? String(msg) : null
  }

  const addDraft = () => {
    const t = draft.trim()
    if (!t) return
    const err = runValidate(t)
    if (err) {
      setItemError(err)
      return
    }
    setItemError('')
    const next = [...lines, t]
    setLines(next)
    setDraft('')
    if (allowPrimary && (!primaryValue || !lines.length)) {
      onPrimaryChange(t)
    }
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setEditDraft(lines[index] || '')
    setItemError('')
  }

  const saveEdit = () => {
    if (editingIndex == null) return
    const t = editDraft.trim()
    if (!t) return
    const err = runValidate(t)
    if (err) {
      setItemError(err)
      return
    }
    setItemError('')
    const prev = lines[editingIndex]
    const next = [...lines]
    next[editingIndex] = t
    setLines(next)
    if (allowPrimary && String(primaryValue || '').trim() === prev) {
      onPrimaryChange(t)
    }
    setEditingIndex(null)
    setEditDraft('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDraft('')
    setItemError('')
  }

  const confirmDelete = () => {
    if (pendingDelete === 'all') {
      setLines([])
      setDraft('')
      setEditingIndex(null)
      if (allowPrimary) onPrimaryChange('')
    } else if (typeof pendingDelete === 'number') {
      const removed = lines[pendingDelete]
      const next = lines.filter((_, i) => i !== pendingDelete)
      setLines(next)
      if (allowPrimary && String(primaryValue || '').trim() === removed) {
        onPrimaryChange(next[0] || '')
      }
      if (editingIndex === pendingDelete) {
        setEditingIndex(null)
        setEditDraft('')
      } else if (editingIndex != null && pendingDelete < editingIndex) {
        setEditingIndex(editingIndex - 1)
      }
    }
    setPendingDelete(null)
  }

  const deleteModalTitle =
    pendingDelete === 'all' ? 'Clear all items?' : `Remove ${ariaLabelPrefix}?`
  const deleteModalBody =
    pendingDelete === 'all'
      ? 'This removes every line from this field. You can still discard the parent form later if you have not saved.'
      : `Remove this ${ariaLabelPrefix}? You can still discard the parent form later if you have not saved.`

  const isPrimary = (line) =>
    allowPrimary && String(primaryValue || '').trim() === String(line || '').trim()

  const primaryControl = (line, index) => {
    if (!allowPrimary) return null
    const active = isPrimary(line)
    const inputId = `primary-${ariaLabelPrefix}-${index}`
    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={active}
          disabled={disabled}
          onChange={() => {
            if (disabled || active) return
            onPrimaryChange(line)
          }}
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:checked:bg-blue-600"
          aria-label={`${primaryLabel} ${ariaLabelPrefix} ${index + 1}`}
        />
        <span>{primaryLabel}</span>
      </label>
    )
  }

  const actionColSpan = disabled ? (allowPrimary ? 3 : 2) : allowPrimary ? 4 : 3

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          ariaLabel={`${ariaLabelPrefix} layout`}
        />
      </div>

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                >
                  {itemColumnLabel}
                </th>
                {allowPrimary && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-28"
                  >
                    {primaryLabel}
                  </th>
                )}
                {!disabled && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-28"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={actionColSpan}
                    className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400"
                  >
                    None recorded.
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr key={`${index}-${line.slice(0, 24)}`} className="group">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveEdit()
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelEdit()
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          aria-label={`Edit ${ariaLabelPrefix} ${index + 1}`}
                          autoFocus
                        />
                      ) : (
                        <span className="whitespace-pre-wrap">{line}</span>
                      )}
                    </td>
                    {allowPrimary && (
                      <td className="px-3 py-2">{primaryControl(line, index)}</td>
                    )}
                    {!disabled && (
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          {editingIndex === index ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={!editDraft.trim()}
                                className="p-2 rounded text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 disabled:opacity-50"
                                aria-label={`Save ${ariaLabelPrefix} ${index + 1}`}
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-2 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                aria-label={`Cancel editing ${ariaLabelPrefix} ${index + 1}`}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <RowActionButton
                                variant="edit"
                                label={`Edit ${ariaLabelPrefix} ${index + 1}`}
                                onClick={() => startEdit(index)}
                              />
                              <RowActionButton
                                variant="delete"
                                label={`Remove ${ariaLabelPrefix} ${index + 1}`}
                                onClick={() => setPendingDelete(index)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {lines.length > 0 && (
            <ul className="space-y-2">
              {lines.map((line, index) => (
                <li
                  key={`${index}-${line.slice(0, 24)}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                >
                  <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                    {line}
                  </span>
                  {primaryControl(line, index)}
                  {!disabled && (
                    <RowActionButton
                      variant="delete"
                      label={`Remove ${ariaLabelPrefix} ${index + 1}`}
                      onClick={() => setPendingDelete(index)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {lines.length === 0 && disabled && (
            <p className="text-sm text-gray-500 dark:text-gray-400">None recorded.</p>
          )}
        </div>
      )}

      {!disabled && lines.length > 0 && (
        <button
          type="button"
          onClick={() => setPendingDelete('all')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" /> Clear all
        </button>
      )}

      {!disabled && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              id={id}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (itemError) setItemError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDraft()
                }
              }}
              placeholder={placeholder}
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                itemError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-label={`New ${ariaLabelPrefix}`}
              aria-invalid={Boolean(itemError)}
            />
            <button
              type="button"
              onClick={addDraft}
              disabled={!draft.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {itemError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{itemError}</p>
          )}
        </div>
      )}

      {allowPrimary && lines.length > 1 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tick {primaryLabel} on the preferred {ariaLabelPrefix}. Only one can be selected.
        </p>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={deleteModalTitle}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
            >
              Remove
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">{deleteModalBody}</p>
      </Modal>
    </div>
  )
}
