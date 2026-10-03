/**
 * Client Portal (GAP-07) — guest list, nested under a portal. v963 Phase 10 (Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/ClientPortalGuestsPage.jsx.
 * Security: same "generate once, show once" convention as Guest Access (GAP-19) — the
 * plaintext access token is shown exactly once, right after invite/reissue, then only ever
 * displayed masked. Always sim schema.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Ban, RefreshCw } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getPortal, listGuests, inviteGuest, reissueGuestToken, revokeGuest } from '../../../services/clientPortalService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function ClientPortalGuestsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [portal, setPortal] = useState(null)
  const [guests, setGuests] = useState([])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ guest_email: '', guest_name: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [p, g] = await Promise.all([getPortal(id), listGuests(id)])
    setPortal(p)
    setGuests(g)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleInvite = async () => {
    if (!draft.guest_email.trim()) return
    setBusy(true)
    const result = await inviteGuest(id, { guest_email: draft.guest_email.trim(), guest_name: draft.guest_name.trim() || null })
    setBusy(false)
    if (!result.success) return
    setDraft({ guest_email: '', guest_name: '' })
    await load()
    showSuccess({
      recordId: result.data.plainToken,
      operation: 'created',
      message: `${draft.guest_email} has been invited. Copy this access token now — for security it will never be shown again.`,
    })
  }

  const handleReissue = async (guest) => {
    setBusy(true)
    const result = await reissueGuestToken(guest.id)
    setBusy(false)
    if (!result.success) return
    await load()
    showSuccess({
      recordId: result.data.plainToken,
      operation: 'updated',
      message: 'A new access token has been issued. Copy it now — it will never be shown again.',
    })
  }

  const handleRevoke = async (guest) => {
    setBusy(true)
    await revokeGuest(guest.id)
    setBusy(false)
    await load()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!portal) return <div className="p-8 text-gray-500 dark:text-gray-400">Client portal not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate(`../${id}`)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to {portal.portal_name}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guests — {portal.portal_name}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        {guests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No guests invited yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 mb-4">
            {guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{guest.guest_email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {guest.guest_name || '—'} · <span className="font-mono">{guest.masked_token}</span>
                    {guest.expires_at && <> · expires {new Date(guest.expires_at).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button type="button" onClick={() => handleReissue(guest)} disabled={busy} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-sky-300 hover:underline disabled:opacity-50">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reissue
                  </button>
                  <button type="button" onClick={() => handleRevoke(guest)} disabled={busy} className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                    <Ban className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Invite a guest</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="email" value={draft.guest_email} onChange={(e) => setDraft((d) => ({ ...d, guest_email: e.target.value }))} placeholder="Email" className={inputClass} />
            <input type="text" value={draft.guest_name} onChange={(e) => setDraft((d) => ({ ...d, guest_name: e.target.value }))} placeholder="Name (optional)" className={inputClass} />
            <button type="button" onClick={handleInvite} disabled={busy || !draft.guest_email.trim()} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              Invite
            </button>
          </div>
        </div>
      </div>
      {modal}
    </div>
  )
}
