import { Plus, Trash2, GripVertical } from 'lucide-react'
import Textarea from '../ui/Textarea'

const emptyRow = (n) => ({ step_no: n, action: '', input: '', expected: '' })

/**
 * @param {object} props
 * @param {Array<{ step_no, action, input, expected }>} props.steps
 * @param {(rows: object[]) => void} props.onChange
 */
export default function TestStepsBuilder({ steps, onChange }) {
  const rows = Array.isArray(steps) && steps.length ? steps : [emptyRow(1)]

  const setRows = (next) => {
    onChange(next.map((r, i) => ({ ...r, step_no: i + 1 })))
  }

  const add = () => setRows([...rows, emptyRow(rows.length + 1)])
  const remove = (idx) => {
    if (rows.length <= 1) return
    setRows(rows.filter((_, i) => i !== idx))
  }
  const patch = (idx, key, value) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    setRows(next)
  }

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white/50 dark:bg-gray-900/40"
        >
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
            <GripVertical className="w-4 h-4 opacity-50" aria-hidden />
            <span>Step {row.step_no || idx + 1}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-auto p-1 rounded text-red-500 hover:bg-red-500/10"
              aria-label="Remove step"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Textarea
              label="Action"
              rows={2}
              value={row.action}
              onChange={(e) => patch(idx, 'action', e.target.value)}
            />
            <Textarea
              label="Input / data"
              rows={2}
              value={row.input}
              onChange={(e) => patch(idx, 'input', e.target.value)}
            />
            <Textarea
              label="Expected"
              rows={2}
              value={row.expected}
              onChange={(e) => patch(idx, 'expected', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        <Plus className="w-4 h-4" />
        Add step
      </button>
    </div>
  )
}
