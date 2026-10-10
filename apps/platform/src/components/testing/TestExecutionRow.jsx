import { useState, useEffect } from 'react'
import { RowActionButton } from '@nidus/ui'
import DefectStatusBadge from './DefectStatusBadge'
import { isEvidenceGateBlocking } from '@nidus/shared/utils/testEvidenceRequirement'

const STATUSES = ['pending', 'passed', 'failed', 'blocked', 'skipped']

const GATE_MESSAGE = 'Attach evidence before marking this test as passed.'

/** Pasted image items from the clipboard (Ctrl+V), named like a screenshot. */
function filesFromClipboard(event) {
  const items = event.clipboardData?.items
  if (!items?.length) return []
  const files = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const named = file.name && file.name !== 'image.png'
          ? file
          : new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type })
        files.push(named)
      }
    }
  }
  return files
}

export default function TestExecutionRow({
  execution,
  onUpdate,
  disabled,
  evidence = [],
  requirement = 'optional',
  canRemoveEvidence = () => false,
  onAttach,
  onRemoveEvidence,
}) {
  const [notes, setNotes] = useState(execution.notes || '')
  const [saving, setSaving] = useState(false)
  const [gateMessage, setGateMessage] = useState(null)
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    setNotes(execution.notes || '')
  }, [execution.id, execution.notes])
  const tc = execution.test_cases || execution.test_case
  const defect = execution.defect || execution.defects

  const setStatus = async (status) => {
    if (disabled || saving) return
    if (isEvidenceGateBlocking({ status, requirement, fileCount: evidence.length })) {
      setGateMessage(GATE_MESSAGE)
      return
    }
    setGateMessage(null)
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

  // Notes only rode along with a status change before — typing notes without
  // touching the status silently never saved them. Save on blur too.
  const handleNotesBlur = async () => {
    if (disabled || saving) return
    const trimmed = notes.trim()
    if (trimmed === (execution.notes || '').trim()) return
    setSaving(true)
    try {
      await onUpdate(execution.id, { notes: trimmed || null })
    } finally {
      setSaving(false)
    }
  }

  const sendFiles = async (files) => {
    const list = [...files].filter(Boolean)
    if (!list.length || !onAttach) return
    setAttaching(true)
    try {
      for (const file of list) {
        await onAttach(execution, file)
      }
    } finally {
      setAttaching(false)
    }
  }

  const handleFiles = (event) => {
    const files = event.target.files
    event.target.value = ''
    sendFiles(files)
  }

  const onPaste = (event) => {
    const files = filesFromClipboard(event)
    if (!files.length) return
    event.preventDefault()
    sendFiles(files)
  }

  const onDrop = (event) => {
    event.preventDefault()
    sendFiles(event.dataTransfer?.files)
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{tc?.test_case_ref}</p>
          <p className="font-medium text-gray-900 dark:text-white">{tc?.title}</p>
          {defect?.id && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Linked:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{defect.defect_ref}</span>
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
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      {gateMessage && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
          {gateMessage}
        </p>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleNotesBlur}
        placeholder="Notes / actual result…"
        rows={2}
        disabled={disabled}
        className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
      />
      <div className="space-y-2">
        <div
          data-testid="evidence-dropzone"
          tabIndex={0}
          onPaste={onPaste}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex flex-wrap items-center gap-2 text-xs rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <span className="text-gray-500 dark:text-gray-400">Evidence</span>
          <label className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
            {attaching ? 'Attaching…' : 'Attach file'}
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={disabled || attaching}
              onChange={handleFiles}
              aria-label="Attach evidence files"
            />
          </label>
          <span className="text-gray-400 dark:text-gray-500">or click here and paste (Ctrl+V) / drop a file</span>
        </div>
        {evidence.length > 0 && (
          <ul className="space-y-1">
            {evidence.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300"
              >
                <span className="truncate">{ev.file_name}</span>
                {canRemoveEvidence(ev) && onRemoveEvidence && (
                  <RowActionButton
                    variant="delete"
                    label={`Remove ${ev.file_name}`}
                    onClick={() => onRemoveEvidence(ev)}
                    disabled={disabled}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
