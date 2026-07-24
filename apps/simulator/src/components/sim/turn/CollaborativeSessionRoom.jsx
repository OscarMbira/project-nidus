import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSimAuthUserId } from '../../../services/sim/simAuth'
import {
  getCollaborativeSessionDetail,
  joinSessionRole,
  leaveSessionRole,
  startCollaborativeSession,
  getTeamMembersForInvite,
  inviteCollaborativeSessionRole,
  cancelCollaborativeSessionInvite,
  declineCollaborativeSessionInvite,
} from '../../../services/sim/simCollaborativeSessionService'
import { startSimulationRun } from '../../../services/sim/simRunBootstrapService'
import { subscribeToCollaborativeSession, subscribeToSessionPresence } from '../../../services/sim/simCollaborativeRealtimeService'

const ROLE_LABELS = {
  portfolio_manager: 'Portfolio Manager',
  programme_manager: 'Programme Manager',
  project_manager: 'Project Manager',
}

/** Inline "invite a teammate to this role" picker (v736 Phase F.2). */
function InviteTeammatePicker({ sessionId, role, onInvited, onCancel }) {
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const res = await getTeamMembersForInvite(sessionId)
      if (res.success) {
        setCandidates(res.data)
        if (res.data.length) setSelected(res.data[0].user_id)
      }
      setLoading(false)
    })()
  }, [sessionId])

  const handleSend = async () => {
    if (!selected) return
    setBusy(true)
    setErr(null)
    const res = await inviteCollaborativeSessionRole(sessionId, role, selected)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not send invite')
      return
    }
    onInvited()
  }

  if (loading) return <p className="text-xs text-gray-500 dark:text-gray-400">Loading your team...</p>

  if (candidates.length === 0) {
    return (
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>No other teammates available to invite — everyone with a Team seat is already in this session, or you have no teammates yet.</span>
        <button type="button" onClick={onCancel} className="ml-2 shrink-0 hover:underline">Cancel</button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {err && <p className="w-full text-xs text-red-600 dark:text-red-400">{err}</p>}
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
      >
        {candidates.map((c) => (
          <option key={c.user_id} value={c.user_id}>{c.invited_email || c.user_id}</option>
        ))}
      </select>
      <button type="button" disabled={busy} onClick={handleSend} className="rounded bg-blue-600 text-white px-3 py-1 text-xs font-medium disabled:opacity-50">
        {busy ? 'Sending...' : 'Send invite'}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
    </div>
  )
}

export default function CollaborativeSessionRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [onlineByRole, setOnlineByRole] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [invitingRole, setInvitingRole] = useState(null)

  const load = useCallback(async () => {
    const res = await getCollaborativeSessionDetail(sessionId)
    if (res.success) setDetail(res.data)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!detail?.session) return undefined
    const unsubscribeChanges = subscribeToCollaborativeSession(sessionId, detail.runIds, {
      onParticipantChange: () => load(),
    })
    let unsubscribePresence = () => {}
    if (detail.myRole) {
      ;(async () => {
        const userId = await getSimAuthUserId()
        unsubscribePresence = subscribeToSessionPresence(sessionId, userId, detail.myRole, setOnlineByRole)
      })()
    }
    return () => {
      unsubscribeChanges()
      unsubscribePresence()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, detail?.session?.status, detail?.myRole])

  const handleJoin = async (role) => {
    setBusy(true)
    setErr(null)
    const res = await joinSessionRole(sessionId, role)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not join this role')
      return
    }
    await load()
  }

  const handleLeave = async () => {
    setBusy(true)
    setErr(null)
    const res = await leaveSessionRole(sessionId)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not leave')
      return
    }
    await load()
  }

  const handleAcceptInvite = async (role) => {
    await handleJoin(role)
  }

  const handleDeclineInvite = async () => {
    setBusy(true)
    setErr(null)
    const res = await declineCollaborativeSessionInvite(sessionId)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not decline')
      return
    }
    await load()
  }

  const handleCancelInvite = async (role) => {
    setBusy(true)
    setErr(null)
    const res = await cancelCollaborativeSessionInvite(sessionId, role)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not cancel invite')
      return
    }
    await load()
  }

  const handleStart = async () => {
    setBusy(true)
    setErr(null)
    const res = await startCollaborativeSession(sessionId)
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not start this session')
      return
    }
    await load()
  }

  const handleEnterScenario = async () => {
    if (!detail?.myRole) return
    setBusy(true)
    setErr(null)
    const res = await startSimulationRun({
      scenarioId: detail.session.scenario_id,
      userRole: detail.myRole,
      collaborativeSessionId: sessionId,
    })
    setBusy(false)
    if (!res.success) {
      setErr(res.error || 'Could not start your scenario')
      return
    }
    navigate(`/simulator/run/${res.runId}/turns`)
  }

  if (loading || !detail) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading session...</p>
      </div>
    )
  }

  const { session, roster, isCreator, myRole, myPendingInviteRole, myRunId } = detail
  const allJoined = roster.every((r) => r.status === 'joined')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <button type="button" onClick={() => navigate('/simulator/collaborative/lobby')} className="mb-2 text-xs text-gray-400 hover:text-gray-200">
        ← Back to sessions
      </button>
      <h1 className="text-2xl font-bold mb-1">{session.scenarios?.name || 'PMO Practice session'}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 capitalize">Status: {session.status}</p>

      {err && <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}

      <div className="space-y-3 mb-6">
        {roster.map(({ role, participant, status }) => {
          const isMe = participant?.user_id && myRole === role
          const isMyPendingInvite = status === 'invited' && myPendingInviteRole === role
          const isSomeoneElsesPendingInvite = status === 'invited' && !isMyPendingInvite
          const online = Boolean(onlineByRole[role])

          let statusLabel = 'Open'
          if (status === 'joined') statusLabel = isMe ? 'You' : 'Filled'
          else if (isMyPendingInvite) statusLabel = 'Invited — awaiting your response'
          else if (isSomeoneElsesPendingInvite) statusLabel = 'Reserved for a teammate'

          return (
            <div key={role} className="rounded border border-gray-200 dark:border-gray-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                  <div>
                    <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{statusLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {session.status === 'forming' && status === 'open' && (
                    <>
                      <button
                        type="button"
                        disabled={busy || Boolean(myRole) || Boolean(myPendingInviteRole)}
                        onClick={() => handleJoin(role)}
                        className="rounded bg-blue-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Claim role
                      </button>
                      {isCreator && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setInvitingRole(invitingRole === role ? null : role)}
                          className="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        >
                          Invite teammate
                        </button>
                      )}
                    </>
                  )}

                  {session.status === 'forming' && isMyPendingInvite && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAcceptInvite(role)}
                        className="rounded bg-blue-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleDeclineInvite}
                        className="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {session.status === 'forming' && isSomeoneElsesPendingInvite && isCreator && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCancelInvite(role)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Cancel invite
                    </button>
                  )}

                  {session.status === 'forming' && isMe && (
                    <button type="button" disabled={busy} onClick={handleLeave} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                      Leave
                    </button>
                  )}
                </div>
              </div>

              {invitingRole === role && (
                <InviteTeammatePicker
                  sessionId={sessionId}
                  role={role}
                  onInvited={() => {
                    setInvitingRole(null)
                    load()
                  }}
                  onCancel={() => setInvitingRole(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {session.status === 'forming' && isCreator && (
        <button
          type="button"
          disabled={busy || !allJoined}
          onClick={handleStart}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {allJoined ? 'Start session' : 'Waiting for all 3 roles to be filled'}
        </button>
      )}

      {session.status === 'active' && myRole && !myRunId && (
        <button
          type="button"
          disabled={busy}
          onClick={handleEnterScenario}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Begin your scenario as {ROLE_LABELS[myRole]}
        </button>
      )}

      {session.status === 'active' && myRunId && (
        <button
          type="button"
          onClick={() => navigate(`/simulator/run/${myRunId}/turns`)}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium"
        >
          Continue your scenario
        </button>
      )}

      {session.status === 'completed' && (
        <button
          type="button"
          onClick={() => navigate(`/simulator/collaborative/session/${sessionId}/debrief`)}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium"
        >
          View team debrief
        </button>
      )}
    </div>
  )
}
