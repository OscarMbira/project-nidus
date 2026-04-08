import { useState, useEffect } from 'react'
import DefectStatusBadge from './DefectStatusBadge'

const STATUSES = ['pending', 'passed', 'failed', 'blocked', 'skipped']

export default function TestExecutionRow({ execution, onUpdate, disabled }) {
  const [notes, setNotes] = useState(execution.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(execution.notes || '')
  }, [execution.id, execution.notes])
  const tc = execution.test_cases || execution.test_case
  const defect = execution.defect || execution.defects

  const setStatus = async (status) => {
    if (disabled || saving) return
    setSaving(true)
    try {
      await onUpdate(execution.id, {
        status,
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500">{tc?.test_case_ref}</p>
          <p className="font-medium text-white">{tc?.title}</p>
          {defect?.id && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-400">Linked:</span>
              <span className="text-emerald-400">{defect.defect_ref}</span>
              <DefectStatusBadge status={defect.status} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              disabled={disabled || saving}
              onClick={() => setStatus(st)}
              className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                execution.status === st
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes / actual result…"
        rows={2}
        disabled={disabled}
        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
      />
    </div>
  )
}
