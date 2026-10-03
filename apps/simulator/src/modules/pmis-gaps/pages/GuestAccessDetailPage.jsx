/**
 * Guest Access (GAP-19) — detail/view page. v963 Phase 13 (Simulator).
 * Mirrors apps/platform/src/modules/pmis-gaps/pages/GuestAccessDetailPage.jsx.
 * Tokens are always shown masked here (never plaintext after creation — see
 * GuestAccessForm's success modal for the one-time reveal). Reissuing shows the
 * new plaintext token once via the same success-modal convention.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, RefreshCw, Ban } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getGuestCollaborator, reissueGuestToken, revokeGuestToken } from '../services/guestAccessService'

const PERMISSION_LABEL = { view: 'View only', comment: 'Can comment', limited_edit: 'Limited edit' }

export default function GuestAccessDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getGuestCollaborator(id)
    if (result.success) setGuest(result.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleReissue = async () => {
    setBusy(true)
    const result = await reissueGuestToken(id)
    setBusy(false)
    if (!result.success) return
    showSuccess({
      recordId: result.data.plainToken,
      operation: 'updated',
      message: 'A new access token has been issued and the previous one revoked. Copy it now — it will never be shown again.',
      onOk: load,
    })
  }

  const handleRevoke = async (tokenId) => {
    setBusy(true)
    await revokeGuestToken(tokenId)
    setBusy(false)
    await load()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!guest) return <div className="p-8 text-gray-500 dark:text-gray-400">Guest not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate('..')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Guest Access
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{guest.guest_email}</h1>
          {guest.guest_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{guest.guest_name}</p>}
        </div>
        <button type="button" onClick={() => navigate('edit')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Guest sections" />

      {activeTab === 'details' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Permission level</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{PERMISSION_LABEL[guest.permission_level] || guest.permission_level}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${guest.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {guest.is_active ? 'Active' : 'Revoked'}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Expires</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{guest.expires_at ? new Date(guest.expires_at).toLocaleDateString() : 'No expiry set'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Access tokens</h2>
              <button type="button" onClick={handleReissue} disabled={busy} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium">
                <RefreshCw className="h-3.5 w-3.5" />
                Reissue token
              </button>
            </div>
            {guest.tokens.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No tokens issued yet.</p>
            ) : (
              <div className="space-y-2">
                {guest.tokens.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                    <div>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{t.masked_token}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {t.revoked_at ? 'Revoked' : new Date(t.expires_at) < new Date() ? 'Expired' : 'Active'}
                        {' · issued '}{new Date(t.issued_at).toLocaleDateString()}
                      </span>
                    </div>
                    {!t.revoked_at && (
                      <button type="button" onClick={() => handleRevoke(t.id)} disabled={busy} className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                        <Ban className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="Who invited this guest and when.">
          <AuditCard title="Identity">
            <AuditField label="Email" value={guest.guest_email} />
            <AuditField label="Name" value={guest.guest_name} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Permission level" value={PERMISSION_LABEL[guest.permission_level] || guest.permission_level} />
            <AuditField label="Status" value={guest.is_active ? 'Active' : 'Revoked'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={guest.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={guest.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
      {modal}
    </div>
  )
}
