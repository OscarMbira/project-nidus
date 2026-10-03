/**
 * Scope items with per-item benefit owner for Benefits Review Plans.
 * Columns: Scope item | Benefit owner | Actions
 */

import { useMemo, useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  parseScopeItemsWithOwners,
  serializeScopeItemsWithOwners,
} from '@nidus/shared/utils/scopeItemsWithOwnersUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowActionButton from '@nidus/ui/RowActionButton'
import Modal from '@nidus/ui/Modal'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import SelectField from '@nidus/ui/SelectField'

function userLabel(user) {
  if (!user) return ''
  const name = (user.full_name || '').trim()
  const email = (user.email || '').trim()
  if (name && email) return `${name} (${email})`
  return name || email || user.id || ''
}

export default function ScopeItemsWithOwnerTable({
  value = '',
  onChange,
  users = [],
  disabled = false,
  viewModeId = 'brp-scope-items-with-owners',
}) {
  const rows = useMemo(() => parseScopeItemsWithOwners(value), [value])
  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const [itemDraft, setItemDraft] = useState('')
  const [ownerDraft, setOwnerDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editItem, setEditItem] = useState('')
  const [editOwner, setEditOwner] = useState('')
  const [deleteIndex, setDeleteIndex] = useState(null)

  const ownerOptions = useMemo(
    () => [
      { value: '', label: 'Select benefit owner…' },
      ...users.map((u) => ({ value: u.id, label: userLabel(u) })),
    ],
    [users]
  )

  const resolveOwnerName = (ownerId) => {
    if (!ownerId) return ''
    const u = users.find((x) => x.id === ownerId)
    return u ? userLabel(u) : ''
  }

  const commit = (nextRows) => {
    onChange?.(serializeScopeItemsWithOwners(nextRows))
  }

  const handleAdd = () => {
    const item = itemDraft.trim()
    if (!item || disabled) return
    const owner_user_id = ownerDraft.trim()
    const owner_name = resolveOwnerName(owner_user_id)
    commit([...rows, { item, owner_user_id, owner_name }])
    setItemDraft('')
    setOwnerDraft('')
  }

  const startEdit = (index) => {
    const row = rows[index]
    if (!row || disabled) return
    setViewMode('list')
    setEditingIndex(index)
    setEditItem(row.item || '')
    setEditOwner(row.owner_user_id || '')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditItem('')
    setEditOwner('')
  }

  const saveEdit = () => {
    if (editingIndex == null) return
    const item = editItem.trim()
    if (!item) return
    const owner_user_id = editOwner.trim()
    const owner_name = resolveOwnerName(owner_user_id)
    commit(rows.map((r, i) => (i === editingIndex ? { item, owner_user_id, owner_name } : r)))
    cancelEdit()
  }

  const confirmDelete = () => {
    if (deleteIndex == null) return
    commit(rows.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)
    if (editingIndex === deleteIndex) cancelEdit()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            3. Scope Description
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add each benefits scope to measure, and assign the benefit owner responsible for it.
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                  Scope item
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                  Benefit owner
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
                  const displayOwner = row.owner_name || resolveOwnerName(row.owner_user_id) || '—'
                  return (
                    <tr key={`${row.item}-${index}`} className="group">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItem}
                            onChange={(e) => setEditItem(e.target.value)}
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
                          row.item
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 align-top">
                        {isEditing ? (
                          <SelectField
                            id={`brp-scope-edit-owner-${index}`}
                            value={editOwner}
                            onChange={setEditOwner}
                            options={ownerOptions}
                            forceSearchable={users.length >= 12}
                          />
                        ) : (
                          displayOwner
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
                                aria-label="Save scope item"
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
                key={`${row.item}-card-${index}`}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">#{getDisplayRowNumber(index)}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.item}</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                  Owner: {row.owner_name || resolveOwnerName(row.owner_user_id) || '—'}
                </p>
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
          <div className="flex-[2] min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Scope item
            </label>
            <input
              type="text"
              value={itemDraft}
              onChange={(e) => setItemDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="e.g. Measure cost-reduction benefits for retail channel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Benefit owner
            </label>
            <SelectField
              id="brp-scope-add-owner"
              value={ownerDraft}
              onChange={setOwnerDraft}
              options={ownerOptions}
              forceSearchable={users.length >= 12}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!itemDraft.trim()}
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
        title="Remove scope item?"
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
          Remove this scope item and its benefit owner assignment?
        </p>
      </Modal>
    </div>
  )
}
