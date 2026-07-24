import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { simDb } from '../../../services/supabase/supabaseClient'
import { getSimAuthUserId } from '../../../services/sim/simAuth'
import { getCollaborativeSessionDetail, completeCollaborativeSessionIfReady } from '../../../services/sim/simCollaborativeSessionService'
import { getRoleScoreSummary } from '../../../services/sim/roleScoringService'
import { checkCollaborativeCertificateEligibility } from '../../../services/sim/certificateEligibilityService'

const ROLE_LABELS = {
  portfolio_manager: 'Portfolio Manager',
  programme_manager: 'Programme Manager',
  project_manager: 'Project Manager',
}

/** Team-level version of SimulationComplete.jsx — all 3 roles' outcomes side by side, plus escalation history. */
export default function CollaborativeSessionDebrief() {
  const { sessionId } = useParams()
  const [detail, setDetail] = useState(null)
  const [scoresByRole, setScoresByRole] = useState({})
  const [escalations, setEscalations] = useState([])
  const [teamScore, setTeamScore] = useState(null)
  const [certCheck, setCertCheck] = useState(null)

  useEffect(() => {
    ;(async () => {
      // Belt-and-braces: complete_collaborative_session_if_ready() is
      // already called from SimulationTurnView.jsx when a participant's run
      // finishes, but it's a no-op unless all 3 are done, so calling it
      // again here is harmless and covers the case where this debrief page
      // loads before that last completion round-trip has landed.
      await completeCollaborativeSessionIfReady(sessionId)

      const res = await getCollaborativeSessionDetail(sessionId)
      if (!res.success) return
      setDetail(res.data)

      const scores = {}
      await Promise.all(
        res.data.roster.map(async ({ role, run }) => {
          if (!run) return
          scores[role] = await getRoleScoreSummary(run.user_id, role)
        }),
      )
      setScoresByRole(scores)

      if (res.data.runIds.length) {
        const { data: escalatedEvents } = await simDb
          .from('turn_events')
          .select('id, title, escalated_from_role, escalated_to_role, escalated_at, escalation_resolved_at')
          .in('run_id', res.data.runIds)
          .not('escalated_to_role', 'is', null)
          .order('escalated_at', { ascending: true })
        setEscalations(escalatedEvents || [])
      }

      const { data: scoreRow } = await simDb
        .from('collaborative_session_scores')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()
      setTeamScore(scoreRow || null)

      if (res.data.myRole) {
        const authUserId = await getSimAuthUserId()
        setCertCheck(await checkCollaborativeCertificateEligibility(authUserId, sessionId))
      }
    })()
  }, [sessionId])

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading debrief...</p>
      </div>
    )
  }

  const { session, roster } = detail

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold">Team Debrief</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {session.scenarios?.name || 'PMO Practice session'} — how Portfolio, Programme, and Project Manager
        coordinated across the same scenario.
      </p>

      {teamScore && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="font-semibold mb-2">Team coordination score</h2>
          {teamScore.coordination_score != null ? (
            <>
              <p className="text-3xl font-bold text-blue-600 mb-2">{teamScore.coordination_score}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {teamScore.resolved_escalations} of {teamScore.total_escalations} escalations resolved
                {teamScore.avg_response_minutes != null && ` — average response time ${Math.round(teamScore.avg_response_minutes)} min`}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No issues were escalated between roles this session — nothing to score.
            </p>
          )}
        </div>
      )}

      {certCheck && (
        <div className={`rounded-lg p-4 text-sm ${certCheck.eligible ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          {certCheck.eligible
            ? `You meet the PMO Collaborative Practice certificate criteria (coordination score ${certCheck.coordinationScore}%).`
            : `PMO Collaborative Practice certificate: ${certCheck.reason}`}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {roster.map(({ role, participant }) => {
          const scores = scoresByRole[role]
          return (
            <div key={role} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <h2 className="font-semibold text-sm mb-2">{ROLE_LABELS[role]}</h2>
              {!participant ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Role was never filled</p>
              ) : scores ? (
                <>
                  <p className="text-2xl font-bold text-blue-600">{Math.round(scores.overall)}%</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {Object.entries(scores.competencies || {}).map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                        <span>{Math.round(v)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No score yet</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="font-semibold mb-3">Escalations</h2>
        {escalations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No issues were escalated between roles in this session.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {escalations.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>
                  {ev.title} — {ROLE_LABELS[ev.escalated_from_role] || ev.escalated_from_role} → {ROLE_LABELS[ev.escalated_to_role] || ev.escalated_to_role}
                </span>
                <span className={ev.escalation_resolved_at ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                  {ev.escalation_resolved_at ? 'Resolved' : 'Unresolved'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/simulator/collaborative/lobby" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
          Back to sessions
        </Link>
      </div>
    </div>
  )
}
