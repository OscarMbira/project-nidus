import { Plus, Trash2 } from 'lucide-react'
import {
  linesToOptionRows,
  optionRowsToLines,
  slugifyOptionValue,
} from '@nidus/shared/utils/formSelectOptions'

const inputClass =
  'w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

function emptyRow() {
  return { label: '', customValue: '', showCustom: false }
}

export default function SelectOptionsEditor({ value = [], onChange }) {
  const rows = linesToOptionRows(value?.length ? value : [''])

  const commit = (nextRows) => {
    onChange(optionRowsToLines(nextRows))
  }

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    commit(next)
  }

  const addRow = () => commit([...rows, emptyRow()])

  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index)
    commit(next.length ? next : [emptyRow()])
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const slugPreview = row.label.trim() ? slugifyOptionValue(row.label) : ''
        return (
          <div
            key={`option-row-${index}`}
            className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 p-3 space-y-2"
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-[10rem] flex-1">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Display label
                </label>
                <input
                  className={inputClass}
                  value={row.label}
                  placeholder="e.g. High"
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="mt-5 inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1.5 text-xs text-red-500 hover:bg-red-950/30"
                aria-label="Remove option"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            {row.label.trim() && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Stored value:{' '}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {row.showCustom && row.customValue.trim() ? row.customValue.trim() : slugPreview || '—'}
                </span>
              </p>
            )}

            {!row.showCustom ? (
              <button
                type="button"
                onClick={() => updateRow(index, { showCustom: true, customValue: slugPreview })}
                className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Use a custom stored value
              </button>
            ) : (
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Custom stored value
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputClass} max-w-xs font-mono`}
                    value={row.customValue}
                    placeholder={slugPreview || 'stored_value'}
                    onChange={(e) => updateRow(index, { customValue: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => updateRow(index, { showCustom: false, customValue: '' })}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Use auto value
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add option
      </button>
    </div>
  )
}
