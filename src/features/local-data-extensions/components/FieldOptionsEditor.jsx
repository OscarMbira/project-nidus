import { useState } from 'react'

export default function FieldOptionsEditor({ options = [], onChange }) {
  const [rows, setRows] = useState(
    () =>
      (options.length ? options : [{ option_value: '', option_label: '', sort_order: 0 }]).map((o, i) => ({
        ...o,
        sort_order: o.sort_order ?? i,
      }))
  )

  const sync = (next) => {
    setRows(next)
    onChange?.(
      next
        .filter((r) => r.option_value.trim())
        .map((r, idx) => ({
          option_value: r.option_value.trim(),
          option_label: (r.option_label || r.option_value).trim(),
          sort_order: idx,
        }))
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">Dropdown / multi-select choices</p>
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-center">
          <input
            className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
            placeholder="Value"
            value={row.option_value}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...next[idx], option_value: e.target.value }
              sync(next)
            }}
          />
          <input
            className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
            placeholder="Label"
            value={row.option_label}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...next[idx], option_label: e.target.value }
              sync(next)
            }}
          />
          <button
            type="button"
            className="text-xs text-red-600"
            onClick={() => sync(rows.filter((_, i) => i !== idx))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-blue-600 dark:text-blue-400"
        onClick={() => sync([...rows, { option_value: '', option_label: '', sort_order: rows.length }])}
      >
        + Add option
      </button>
    </div>
  )
}
