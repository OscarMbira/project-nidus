/**
 * TableListInput — multi-row, multi-column list for a Local Register "Table" field (v1326), e.g.
 * Version History (Version | Date | Author | Change). Same behaviour as MultiLineListInput
 * (rule 67): Card ⊞ / Table-List ≡ toggle (default table), # row numbers, inline edit with
 * Save/Cancel, confirm before delete / clear all. Value is the stored text from
 * registerTableField.js (one row per line, tab between cells).
 */
import { useMemo, useState } from 'react'
import { Plus, X, Check, Search } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { joinTableValue, parseTableValue } from '@nidus/shared/utils/registerTableField'
import ViewToggle from './ViewToggle'
import RowActionButton from './RowActionButton'
import Modal from './Modal'
import SelectField from './SelectField'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table'

// Unsorted keeps the saved row order. These rows are document lines (a glossary, a version
// history) and have no created date of their own, so A→Z is a click away rather than the default.
const DOCUMENT_ORDER = { column: null, direction: null }

const INPUT_CLASS =
  'w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'

/**
 * @param {object} props
 * @param {string} props.viewModeId  stable key for the remembered view (rule 67)
 * @param {{ key: string, label: string, type?: 'text'|'date'|'select', options?: string[] }[]} props.columns
 * @param {string} props.value
 * @param {(next: string) => void} props.onChange
 * @param {string} [props.ariaLabelPrefix]
 * @param {boolean} [props.disabled]
 * @param {(iso: string) => string} [props.formatDate]  display format for date cells
 */
export default function TableListInput({
  viewModeId,
  columns = [],
  value,
  onChange,
  ariaLabelPrefix = 'row',
  disabled = false,
  formatDate = (v) => v,
}) {
  const [viewMode, setViewMode] = useViewMode(viewModeId || 'table-list-input', 'list')
  const [search, setSearch] = useState('')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    storageKey: `${viewModeId || 'table-list-input'}-sort`,
    defaultSort: DOCUMENT_ORDER,
  })
  const emptyRow = () => columns.map(() => '')
  const [draft, setDraft] = useState(emptyRow)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null) // number | 'all' | null

  const rows = parseTableValue(value, columns.length)
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const indexed = rows.map((row, index) => ({ row, index }))
    const filtered = term
      ? indexed.filter(({ row }) => row.some((cell) => String(cell || '').toLowerCase().includes(term)))
      : indexed
    const accessors = Object.fromEntries(columns.map((col, c) => [col.key, (item) => item.row[c] || '']))
    return sortedData(filtered, accessors)
  }, [rows, search, columns, sortedData])
  const setRows = (next) => onChange(joinTableValue(next))
  const hasContent = (row) => row.some((c) => String(c || '').trim())
  const show = (col, cell) => (col.type === 'date' && cell ? formatDate(cell) : cell)

  const addDraft = () => {
    if (!hasContent(draft)) return
    setRows([...rows, draft])
    setDraft(emptyRow())
  }
  const startEdit = (index) => {
    setEditingIndex(index)
    setEditDraft([...rows[index]])
  }
  const saveEdit = () => {
    if (editingIndex == null || !hasContent(editDraft)) return
    setRows(rows.map((r, i) => (i === editingIndex ? editDraft : r)))
    setEditingIndex(null)
  }
  const confirmDelete = () => {
    if (pendingDelete === 'all') setRows([])
    else if (typeof pendingDelete === 'number') setRows(rows.filter((_, i) => i !== pendingDelete))
    setEditingIndex(null)
    setPendingDelete(null)
  }

  const cellInput = (col, cell, onCell, label, autoFocus = false) => (col.type === 'select' ? (
    // Fixed list (v1351); a value captured before the list existed stays selectable.
    <SelectField
      options={cell && !col.options.includes(cell) ? [cell, ...col.options] : col.options}
      value={cell}
      onChange={(v) => onCell(String(v ?? ''))}
      placeholder={col.label}
      aria-label={label}
      disabled={disabled}
    />
  ) : (
    <input
      type={col.type === 'date' ? 'date' : 'text'}
      value={cell}
      onChange={(e) => onCell(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (editingIndex != null) saveEdit()
          else addDraft()
        }
        if (e.key === 'Escape' && editingIndex != null) setEditingIndex(null)
      }}
      className={INPUT_CLASS}
      aria-label={label}
      placeholder={col.type === 'date' ? undefined : col.label}
      autoFocus={autoFocus}
    />
  ))

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows…"
            aria-label={`Search ${ariaLabelPrefix}`}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel={`${ariaLabelPrefix} layout`} />
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                {columns.map((col) => (
                  <TableHeaderCell
                    key={col.key}
                    sortable
                    sortDirection={getSortDirectionForColumn(col.key)}
                    onSort={() => handleSort(col.key)}
                    className="!px-3 !text-gray-600 dark:!text-gray-300"
                  >
                    {col.label}
                  </TableHeaderCell>
                ))}
                {!disabled && (
                  <TableHeaderCell sortable={false} className="!px-3 w-28 text-right !text-gray-600 dark:!text-gray-300">
                    Actions
                  </TableHeaderCell>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (disabled ? 1 : 2)} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {rows.length === 0 ? 'None recorded.' : 'No matching rows.'}
                  </td>
                </tr>
              ) : (
                visible.map(({ row, index }, visibleIndex) => (
                  <tr key={`${index}-${row.join('|').slice(0, 24)}`}>
                    <TableRowNumberCell number={getDisplayRowNumber(visibleIndex)} />
                    {columns.map((col, c) => (
                      <td key={col.key} className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 align-top">
                        {editingIndex === index
                          ? cellInput(col, editDraft[c] ?? '', (v) => setEditDraft((d) => d.map((x, i) => (i === c ? v : x))), `Edit ${col.label} ${visibleIndex + 1}`, c === 0)
                          : <span className="whitespace-pre-wrap">{show(col, row[c])}</span>}
                      </td>
                    ))}
                    {!disabled && (
                      <td className="px-3 py-2 text-right align-top">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          {editingIndex === index ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={!hasContent(editDraft)}
                                className="rounded p-2 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                aria-label={`Save ${ariaLabelPrefix} ${visibleIndex + 1}`}
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingIndex(null)}
                                className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                aria-label={`Cancel editing ${ariaLabelPrefix} ${visibleIndex + 1}`}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <RowActionButton variant="edit" label={`Edit ${ariaLabelPrefix} ${visibleIndex + 1}`} onClick={() => startEdit(index)} />
                              <RowActionButton variant="delete" label={`Remove ${ariaLabelPrefix} ${visibleIndex + 1}`} onClick={() => setPendingDelete(index)} />
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
          {viewMode !== 'list' && columns.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={`Sort ${ariaLabelPrefix}`}>
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort by</span>
              {columns.map((col) => {
                const dir = getSortDirectionForColumn(col.key)
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-pressed={dir != null}
                  >
                    <span>{col.label}</span>
                    <span className="text-xs" aria-hidden="true">{dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅'}</span>
                  </button>
                )
              })}
            </div>
          )}
          {visible.map(({ row, index }, visibleIndex) => (
            <div key={`${index}-${row.join('|').slice(0, 24)}`} className="flex items-start gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
              <span className="pt-0.5 text-xs font-medium text-gray-700 dark:text-gray-200">#{getDisplayRowNumber(visibleIndex)}</span>
              <dl className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {columns.map((col, c) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-xs uppercase text-gray-400 dark:text-gray-500">{col.label}</dt>
                    <dd className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{show(col, row[c]) || '—'}</dd>
                  </div>
                ))}
              </dl>
              {!disabled && (
                <RowActionButton variant="delete" label={`Remove ${ariaLabelPrefix} ${visibleIndex + 1}`} onClick={() => setPendingDelete(index)} />
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{rows.length === 0 ? 'None recorded.' : 'No matching rows.'}</p>
          )}
        </div>
      )}

      {!disabled && rows.length > 0 && (
        <button
          type="button"
          onClick={() => setPendingDelete('all')}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
        >
          <X className="h-4 w-4" /> Clear all
        </button>
      )}

      {!disabled && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((col, c) => (
              <label key={col.key} className="block">
                <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{col.label}</span>
                {cellInput(col, draft[c] ?? '', (v) => setDraft((d) => d.map((x, i) => (i === c ? v : x))), `New ${ariaLabelPrefix} — ${col.label}`)}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={addDraft}
            disabled={!hasContent(draft)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete === 'all' ? 'Clear all rows?' : `Remove ${ariaLabelPrefix}?`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Remove
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {pendingDelete === 'all'
            ? 'This removes every row from this field. You can still discard the form if you have not saved.'
            : 'Remove this row? You can still discard the form if you have not saved.'}
        </p>
      </Modal>
    </div>
  )
}
