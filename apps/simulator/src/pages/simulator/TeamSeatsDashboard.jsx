import { useEffect, useState } from 'react'
import {
  getMyTeamSubscriptions,
  listTeamSeats,
  inviteTeamSeat,
  revokeTeamSeat,
} from '../../services/sim/simTeamSeatService'

const STATUS_STYLES = {
  invited: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  claimed: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  revoked: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/30',
}

function SeatStatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.revoked}`}>
      {status}
    </span>
  )
}

export default function TeamSeatsDashboard() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)
  const [seats, setSeats] = useState([])
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [err, setErr] = useState(null)
  const [notice, setNotice] = useState(null)

  const loadSeats = async (teamSubscriptionId) => {
    const res = await listTeamSeats(teamSubscriptionId)
    if (res.success) setSeats(res.data)
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const subsRes = await getMyTeamSubscriptions()
      const sub = subsRes.success ? subsRes.data[0] : null
      setSubscription(sub || null)
      if (sub) await loadSeats(sub.id)
      setLoading(false)
    })()
  }, [])

  const usedSeats = seats.filter((s) => s.status !== 'revoked').length
  const seatLimit = subscription?.seat_limit ?? 0

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!subscription || !email.trim()) return
    setInviting(true)
    setErr(null)
    setNotice(null)
    const res = await inviteTeamSeat(subscription.id, email.trim())
    setInviting(false)
    if (!res.success) {
      setErr(res.error || 'Could not send invite')
      return
    }
    setNotice(`Invite sent to ${email.trim()}`)
    setEmail('')
    await loadSeats(subscription.id)
  }

  const handleRevoke = async (seatId) => {
    setErr(null)
    setNotice(null)
    const res = await revokeTeamSeat(seatId)
    if (!res.success) {
      setErr(res.error || 'Could not revoke seat')
      return
    }
    setNotice('Seat revoked')
    await loadSeats(subscription.id)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading your team...</p>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
        <h1 className="text-2xl font-bold mb-2">Team seats</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You don't have a Team subscription yet. Upgrade to Team to invite your organisation's Portfolio, Programme,
          and Project Managers.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-2">Team seats</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {usedSeats} of {seatLimit} seats used
      </p>

      {err && <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}
      {notice && <div className="mb-4 rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm">{notice}</div>}

      <form onSubmit={handleInvite} className="mb-8 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={inviting || usedSeats >= seatLimit}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {inviting ? 'Inviting...' : 'Invite seat'}
        </button>
      </form>
      {usedSeats >= seatLimit && (
        <p className="text-xs text-amber-600 dark:text-amber-400 -mt-6 mb-6">
          All seats are in use. Revoke an unused seat or upgrade your seat limit to invite more people.
        </p>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded">
        {seats.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No seats invited yet.</p>
        )}
        {seats.map((seat) => (
          <div key={seat.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{seat.invited_email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {seat.status === 'claimed' && seat.claimed_at
                  ? `Claimed ${new Date(seat.claimed_at).toLocaleDateString()}`
                  : seat.status === 'invited'
                    ? `Invited ${new Date(seat.invited_at).toLocaleDateString()}`
                    : 'Revoked'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SeatStatusBadge status={seat.status} />
              {seat.status !== 'revoked' && (
                <button
                  type="button"
                  onClick={() => handleRevoke(seat.id)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
