/**
 * v1272 — "Draft with AI" for highlight reports (PRD stories 25–27c; D12). Shared by Platform and
 * Simulator. Calls the status-report-agent edge function, which saves a DRAFT report; the PM then
 * edits and submits it through the normal approval flow (rules 37, 53).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { callAiFunction } from '@nidus/shared/services/askNidusService'

export default function DraftWithAiButton({ projectId, className = '' }) {
  const { app, db } = useAppConfig()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { showSuccess, modal } = useSuccessModal()

  const draft = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await callAiFunction(db, 'status-report-agent', {
        app,
        project_id: projectId,
        period_start: start || undefined,
        period_end: end || undefined,
      })
      const missing = res.needs_input?.length ? ` ${res.needs_input.length} section(s) are marked "needs your input".` : ''
      showSuccess({
        recordId: 'Draft highlight report',
        subject: 'Highlight report',
        operation: 'created',
        message: `AI drafted ${res.sections_drafted} section(s) from your project data.${missing} Review and edit it before you submit.`,
        okLabel: 'Review draft',
        onOk: () => navigate(res.edit_path),
      })
    } catch (e) {
      setError(e?.message || 'The draft could not be created.')
    } finally {
      setBusy(false)
    }
  }

  if (!projectId) return null
  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          Let AI draft this report from your schedule, risks, issues, changes and budget.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">
            {open ? 'Hide period' : 'Choose period'}
          </button>
          <button type="button" onClick={draft} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? 'Drafting…' : 'Draft with AI'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-700 dark:text-gray-300">From
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="ml-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </label>
          <label className="text-xs text-gray-700 dark:text-gray-300">To
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="ml-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">Leave blank to cover the time since the last report.</p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
      {modal}
    </div>
  )
}
