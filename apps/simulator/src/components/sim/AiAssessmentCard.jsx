import React, { useState } from 'react'
import { flagAssessment } from '../../services/sim/simAiAgentsService'

/**
 * v1272 Phase 3 (D14) — AI Assessor feedback for one decision or a whole run: overall score, each
 * rubric criterion's level (1–4) with the reason, and a way to flag a result the learner disagrees with.
 */
export default function AiAssessmentCard({ assessment, flagged = false, onFlagged }) {
  const [open, setOpen] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [reason, setReason] = useState('')
  const [criterion, setCriterion] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(flagged)
  if (!assessment) return null

  const submitFlag = async () => {
    setError('')
    try {
      await flagAssessment(assessment.id, criterion || null, reason)
      setDone(true)
      setFlagging(false)
      onFlagged?.()
    } catch (e) {
      setError(e.message || 'Could not send the flag.')
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-800 dark:bg-indigo-900/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-indigo-900 dark:text-indigo-100">
          AI Assessor feedback · {Math.round(Number(assessment.overall_score))}/100
          {!assessment.counts_toward_score && <span className="ml-2 text-xs font-normal text-indigo-700 dark:text-indigo-300">(advisory — not in your score)</span>}
        </p>
        <button type="button" onClick={() => setOpen(!open)} className="text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300">
          {open ? 'Hide details' : 'Show details'}
        </button>
      </div>
      {assessment.summary && <p className="mt-1 text-gray-700 dark:text-gray-300">{assessment.summary}</p>}
      {open && (
        <ul className="mt-2 space-y-2">
          {(assessment.criteria || []).map((c) => (
            <li key={c.criterion_key} className="rounded bg-white p-2 dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-gray-100">{c.title || c.criterion_key}: level {c.level} of 4</p>
              <p className="text-gray-700 dark:text-gray-300">{c.reason}</p>
            </li>
          ))}
        </ul>
      )}
      {done ? (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">You flagged this result. Scenario authors review flags when calibrating the Assessor.</p>
      ) : flagging ? (
        <div className="mt-2 space-y-2">
          <select value={criterion} onChange={(e) => setCriterion(e.target.value)} aria-label="Which criterion"
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
            <option value="">The whole assessment</option>
            {(assessment.criteria || []).map((c) => <option key={c.criterion_key} value={c.criterion_key}>{c.title || c.criterion_key}</option>)}
          </select>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={2000} placeholder="Why do you disagree?" aria-label="Why do you disagree"
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          <div className="flex gap-2">
            <button type="button" onClick={submitFlag} disabled={reason.trim().length < 3} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50">Send flag</button>
            <button type="button" onClick={() => setFlagging(false)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <button type="button" onClick={() => setFlagging(true)} className="mt-2 text-xs text-gray-600 hover:underline dark:text-gray-400">I disagree with this</button>
      )}
    </div>
  )
}
