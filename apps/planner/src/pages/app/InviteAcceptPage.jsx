/**
 * v1239 Slice 7.2 — accept a Planner invitation (/app/invite/:token). Joining adds the person
 * to the project with the invited role; it never creates a workspace for them.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { platformDb } from '@nidus/supabase'
import { useWorkspace } from '../../lib/workspace.jsx'
import { ROLE_LABELS } from '../../lib/inviteEmail.js'
import { clearPendingInvite } from '../../lib/pendingInvite.js'

export default function InviteAcceptPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { reload } = useWorkspace()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    platformDb.rpc('planner_invite_context', { p_token: token }).then(({ data, error: e }) => {
      if (e) setError(e.message)
      else if (!data) setError('This invitation link is not valid.')
      else setInfo(data)
    })
  }, [token])

  const accept = async () => {
    setBusy(true)
    setError(null)
    const { data, error: e } = await platformDb.rpc('planner_accept_invite', { p_token: token })
    if (e) { setError(e.message); setBusy(false); return }
    clearPendingInvite()
    await reload()
    navigate(`/app/schedule/activities?projectId=${encodeURIComponent(data.project_code)}`, { replace: true })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3">
        <h1 className="text-xl font-semibold">Project invitation</h1>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!info && !error && <p className="text-sm text-gray-600 dark:text-gray-300">Checking the invitation…</p>}
        {info && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {info.invited_by} invited <strong>{info.invited_email}</strong> to <strong>{info.project_name}</strong> ({info.account_name}) as <strong>{ROLE_LABELS[info.role_name] || 'Team member'}</strong>.
            </p>
            {info.status === 'pending' ? (
              <button type="button" onClick={accept} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                {busy ? 'Joining…' : 'Accept and open the project'}
              </button>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">This invitation is {info.status}. Ask for a new one if you still need access.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
