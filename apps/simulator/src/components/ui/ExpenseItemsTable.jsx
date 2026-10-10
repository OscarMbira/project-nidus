/**
 * ExpenseItemsTable — itemized line-items editor for a grouped expense claim (v1226).
 * Controlled: `items` is an array of {description, amount, category_id}; `onChange(nextItems)`
 * is called on add/edit/delete. Shows a running total footer. `readOnly` hides all editing UI.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import RowActionButton from './RowActionButton'
import SmartAmountInput from './SmartAmountInput'
import SelectField from './SelectField'
import { TableRowNumberHeader, TableRowNumberCell } from './Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const EMPTY_DRAFT = { description: '', amount: null, category_id: '', notes: '' }

export default function ExpenseItemsTable({ items = [], onChange, categories = [], readOnly = false, currency = '' }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT)

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.category_name }))
  const categoryLabel = (id) => categories.find((c) => c.id === id)?.category_name || '—'
  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)

  const handleAdd = () => {
    const description = draft.description.trim()
    const amount = Number(draft.amount)
    if (!description || !(amount > 0)) return
    onChange([...items, { description, amount, category_id: draft.category_id || null, notes: draft.notes.trim() || null }])
    setDraft(EMPTY_DRAFT)
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setEditDraft({ notes: '', ...items[index] })
  }

  const saveEdit = () => {
    const description = (editDraft.description || '').trim()
    const amount = Number(editDraft.amount)
    if (!description || !(amount > 0)) return
    const next = items.map((it, i) =>
      i === editingIndex
        ? { ...it, description, amount, category_id: editDraft.category_id || null, notes: (editDraft.notes || '').trim() || null }
        : it,
    )
    onChange(next)
    setEditingIndex(null)
  }

  const cancelEdit = () => setEditingIndex(null)

  const handleDelete = (index) => {
    onChange(items.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const colCount = readOnly ? 4 : 5

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <TableRowNumberHeader />
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              {!readOnly && (
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  No items added.
                </td>
              </tr>
            ) : (
              items.map((item, index) =>
                editingIndex === index ? (
                  <tr key={index}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editDraft.description}
                        onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        aria-label={`Edit item ${index + 1} description`}
                        autoFocus
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectField
                        options={categoryOptions}
                        value={editDraft.category_id || ''}
                        onChange={(v) => setEditDraft({ ...editDraft, category_id: v })}
                        placeholder="Category"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <SmartAmountInput
                        value={editDraft.amount}
                        onChange={(v) => setEditDraft({ ...editDraft, amount: v })}
                        currency={currency}
                        placeholder="Amount"
                      />
                      <input
                        type="text"
                        value={editDraft.notes || ''}
                        onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                        className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                        placeholder="Notes (optional)"
                        aria-label={`Edit item ${index + 1} notes`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="p-2 rounded text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                          aria-label={`Save item ${index + 1}`}
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-2 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-label={`Cancel editing item ${index + 1}`}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={index}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {item.description}
                      {item.notes && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{categoryLabel(item.category_id)}</td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900 dark:text-gray-100 tabular-nums">
                      {Number(item.amount).toLocaleString()}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <RowActionButton variant="edit" label={`Edit item ${index + 1}`} onClick={() => startEdit(index)} />
                          <RowActionButton variant="delete" label={`Delete item ${index + 1}`} onClick={() => handleDelete(index)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td colSpan={2} />
                <td className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 text-right">Total</td>
                <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums">
                  {total.toLocaleString()} {currency}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-end">
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Item description"
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label="New item description"
          />
          <div className="w-40">
            <SelectField
              options={categoryOptions}
              value={draft.category_id || ''}
              onChange={(v) => setDraft({ ...draft, category_id: v })}
              placeholder="Category"
            />
          </div>
          <div className="w-32">
            <SmartAmountInput value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} currency={currency} placeholder="Amount" />
          </div>
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes (optional)"
            className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label="New item notes"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.description.trim() || !(Number(draft.amount) > 0)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      )}
    </div>
  )
}
