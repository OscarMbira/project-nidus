import { useEffect, useState } from 'react'
import { getPendingEscalations, resolveEscalatedEvent } from '../../services/sim/turnEventService'

const SEVERITY_STYLES = {
  low: 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  critical: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
}

const ROLE_LABELS = {
  portfolio_manager: 'Portfolio Manager',
  programme_manager: 'Programme Manager',
  project_manager: 'Project Manager',
}

/**
 * "Waiting on me" indicator (v736 Phase D.2). Meant to be mounted inside a
 * participant's collaborative session view (Phase F builds that view) —
 * self-contained here so it can be dropped in once that page exists.
 */
export default function PendingEscalationsPanel({ sessionId, myRole }) {
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    const res = await getPendingEscalations(sessionId, myRole)
    if (res.success) setEscalations(res.data)
    setLoading(false)
  }

  useEffect(() => {
    if (sessionId && myRole) load()
  }, [sessionId, myRole])

  const handleResolve = async (event, decisionOptionId) => {
    setResolvingId(event.event_id)
    setErr(null)
    const res = await resolveEscalatedEvent(event.event_id, decisionOptionId, {})
    setResolvingId(null)
    if (!res.success) {
      setErr(res.error || 'Could not resolve this escalation')
      return
    }
    await load()
  }

  if (!sessionId || !myRole) return null
  if (loading) return null
  if (escalations.length === 0) return null

  return (
    <div className="mb-6 rounded border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
        Waiting on you ({escalations.length})
      </h2>
      {err && <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}
      <div className="space-y-3">
        {escalations.map((ev) => (
          <div key={ev.event_id} className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{ev.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Escalated from {ROLE_LABELS[ev.escalated_from_role] || ev.escalated_from_role}
                  {ev.escalation_reason ? ` — ${ev.escalation_reason}` : ''}
                </p>
              </div>
              {ev.severity && (
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[ev.severity] || SEVERITY_STYLES.medium}`}>
                  {ev.severity}
                </span>
              )}
            </div>
            {ev.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{ev.description}</p>
            )}
            {Array.isArray(ev.decision_options) && ev.decision_options.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ev.decision_options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={resolvingId === ev.event_id}
                    onClick={() => handleResolve(ev, opt.id)}
                    className="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
