/**
 * Capability Profile picker (v982 Phase 6 — Capability Profiles, brief §12)
 * Shows the 4 tiers (Essential/Standard/Advanced/Comprehensive) with a plain-language
 * description, applies one as a bulk-set starting point (PRD decision 3 — not an ongoing
 * ceiling; the org can freely diverge item-by-item afterward via the existing "Modules &
 * Capabilities" settings page). Confirms before overwriting any hand-tuned customizations, since
 * applying a profile bulk-sets toggles the admin may have already adjusted.
 * Route: /platform/pmo-admin/capability-profile
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  getProfiles,
  getProfileMenuItems,
  getAccountCapabilityProfile,
  applyProfileToAccount,
} from '../../services/capabilityProfileService'

export default function CapabilityProfilePicker() {
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [currentProfile, setCurrentProfile] = useState(null)
  const [itemCounts, setItemCounts] = useState({})
  const [error, setError] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const acctId = await getCurrentUserAccountId()
    if (!acctId) {
      setError('Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(acctId)

    const [profilesRes, currentRes] = await Promise.all([getProfiles(), getAccountCapabilityProfile(acctId)])
    if (profilesRes.success) setProfiles(profilesRes.data)
    else setError(profilesRes.error)
    setCurrentProfile(currentRes.success ? currentRes.data : null)

    if (profilesRes.success && profilesRes.data.length > 0) {
      const counts = {}
      await Promise.all(
        profilesRes.data.map(async (p) => {
          const res = await getProfileMenuItems(p.id)
          counts[p.id] = res.success ? res.data.length : 0
        }),
      )
      setItemCounts(counts)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeTab !== 'audit' || !currentProfile?.appliedBy) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [currentProfile.appliedBy])
      setAuditUserLabels(labels)
    })()
  }, [activeTab, currentProfile])

  const handleApply = async (profileId) => {
    setApplyingId(profileId)
    setError(null)
    const result = await applyProfileToAccount(accountId, profileId)
    setApplyingId(null)
    setConfirmingId(null)
    if (!result.success) {
      setError(result.error)
      return
    }
    const profile = profiles.find((p) => p.id === profileId)
    showSuccess({
      recordId: profile?.tier_name || profileId,
      operation: 'updated',
      message: `"${profile?.tier_name}" applied — ${result.enabled} capability${result.enabled === 1 ? '' : 'ies'} enabled, ${result.disabled} disabled, ${result.unchanged} already matched. You can still fine-tune individual items afterward.`,
    })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading capability profiles…</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Capability Profile</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pick a starting point for which capabilities your organisation sees, then fine-tune individual items anytime from Modules &amp; Capabilities.
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'audit' ? (
          <div className="p-6">
            {!currentProfile ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No capability profile has been applied to this organisation yet.</p>
            ) : (
              <AuditDetailsPanel description="Which profile is currently applied, and when.">
                <AuditCard title="Identity" description="Which profile is applied.">
                  <AuditField label="Tier" value={currentProfile.tier_name} />
                  <AuditField label="Description" value={currentProfile.description} />
                </AuditCard>
                <AuditCard title="Classification" description="How this fits the escalating tier order.">
                  <AuditField label="Tier order" value={currentProfile.tier_order} />
                </AuditCard>
                <AuditCard title="Record history" description="When this profile was last applied.">
                  <AuditField label="Applied by" value={currentProfile.appliedBy ? auditUserLabels[currentProfile.appliedBy] || null : null} />
                  <AuditTimestampPair dateLabel="Applied at" value={currentProfile.appliedAt} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const isCurrent = currentProfile?.id === profile.id
              const isConfirming = confirmingId === profile.id
              return (
                <div
                  key={profile.id}
                  className={`rounded-lg border p-5 flex flex-col ${isCurrent ? 'border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{profile.tier_name}</h2>
                    {isCurrent && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">{profile.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{itemCounts[profile.id] ?? 0} capabilities included</p>

                  {isConfirming ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        This will bulk-set your organisation's capability toggles to match {profile.tier_name}. Any hand-tuned customizations outside this tier's set will be overwritten — you can still adjust individual items afterward.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={applyingId === profile.id}
                          onClick={() => handleApply(profile.id)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {applyingId === profile.id ? 'Applying…' : 'Confirm Apply'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(profile.id)}
                      className="mt-4 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {isCurrent ? 'Re-apply' : 'Apply'} <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
