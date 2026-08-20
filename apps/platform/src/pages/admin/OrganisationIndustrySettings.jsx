/**
 * Organisation Settings — Industries & Capabilities (v918, CLAUDE.md Phase 7)
 * Route: admin/organisation-industries
 * Two sections: (1) manage the org's selected industries + primary + optional sub-industry,
 * re-provisioned via the same provision_organisation_tenant() RPC registration used at signup
 * (v923 — re-provisioning IS the update path, no separate RPC); (2) "Modules & Capabilities" —
 * disable-only toggles over the org's currently-available industry-pack menu items, via
 * toggle_organisation_capability() (v926).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// No single "Organisation Settings" hub page exists yet to route back to (this settings
// surface introduces admin/organisation-industries as its own top-level admin/* route,
// same tier as admin/manage-roles and admin/manage-menu-bundles) — browser back is the
// simplest correct choice until a dedicated hub exists.
import { ArrowLeft, Factory, Loader, Save } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getManageRolesAccess, getIndustryCategories, getIndustrySegments } from '../../services/organisationCustomRoleService'
import { provisionOrganisationTenant, getOrganisationById } from '../../services/organisationService'
import { getOrgIndustries, getOrgCapabilities, toggleOrganisationCapability } from '../../services/organisationIndustryService'

export default function OrganisationIndustrySettings() {
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accountId, setAccountId] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [account, setAccount] = useState(null)

  const [activeTab, setActiveTab] = useState('details')

  const [industries, setIndustries] = useState([])
  const [segmentsByIndustry, setSegmentsByIndustry] = useState({})
  const [savedIndustryIds, setSavedIndustryIds] = useState(new Set())
  const [selectedIndustryIds, setSelectedIndustryIds] = useState(new Set())
  const [primaryIndustryId, setPrimaryIndustryId] = useState(null)
  const [segmentIdByIndustry, setSegmentIdByIndustry] = useState({})
  const [savingIndustries, setSavingIndustries] = useState(false)

  const [capabilities, setCapabilities] = useState([])
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const accessPromise = getManageRolesAccess()
    const industryCategoriesPromise = getIndustryCategories()

    const [access, categoriesRes] = await Promise.all([accessPromise, industryCategoriesPromise])

    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(access.accountId)
    setCanManage(access.canManage)
    setIndustries(categoriesRes.success ? categoriesRes.data : [])

    const [accountRow, orgIndustriesRes, capabilitiesRes] = await Promise.all([
      getOrganisationById(access.accountId).catch((e) => {
        console.error('getOrganisationById:', e)
        return null
      }),
      getOrgIndustries(access.accountId),
      getOrgCapabilities(access.accountId),
    ])

    setAccount(accountRow)
    setCapabilities(capabilitiesRes.success ? capabilitiesRes.data : [])
    setCapabilitiesLoading(false)

    if (orgIndustriesRes.success) {
      const ids = new Set(orgIndustriesRes.data.map((r) => r.industry_category_id))
      const primary = orgIndustriesRes.data.find((r) => r.is_primary)?.industry_category_id || null
      const segMap = {}
      orgIndustriesRes.data.forEach((r) => {
        if (r.industry_segment_id) segMap[r.industry_category_id] = r.industry_segment_id
      })
      setSavedIndustryIds(ids)
      setSelectedIndustryIds(new Set(ids))
      setPrimaryIndustryId(primary)
      setSegmentIdByIndustry(segMap)

      await Promise.all(
        Array.from(ids).map(async (industryId) => {
          const segRes = await getIndustrySegments(industryId)
          if (segRes.success) {
            setSegmentsByIndustry((prev) => ({ ...prev, [industryId]: segRes.data }))
          }
        }),
      )
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const isIndustriesDirty = useMemo(() => {
    if (selectedIndustryIds.size !== savedIndustryIds.size) return true
    for (const id of selectedIndustryIds) {
      if (!savedIndustryIds.has(id)) return true
    }
    return false
  }, [selectedIndustryIds, savedIndustryIds])

  useUnsavedChangesGuard(isIndustriesDirty, 'You have unsaved industry changes. Leave without saving?')

  const toggleIndustry = async (industryId) => {
    setSelectedIndustryIds((prev) => {
      const next = new Set(prev)
      if (next.has(industryId)) next.delete(industryId)
      else next.add(industryId)
      return next
    })
    setPrimaryIndustryId((prev) => (prev === industryId ? null : prev))

    if (!segmentsByIndustry[industryId]) {
      const segRes = await getIndustrySegments(industryId)
      if (segRes.success) setSegmentsByIndustry((prev) => ({ ...prev, [industryId]: segRes.data }))
    }
  }

  const canSaveIndustries =
    selectedIndustryIds.size > 0 && primaryIndustryId && selectedIndustryIds.has(primaryIndustryId)

  const handleSaveIndustries = async () => {
    if (!canSaveIndustries || !accountId) return
    setSavingIndustries(true)
    setError(null)
    try {
      const industryCategoryIds = Array.from(selectedIndustryIds)
      const industrySegmentIds = industryCategoryIds.map((id) => segmentIdByIndustry[id] || null)
      const result = await provisionOrganisationTenant(accountId, industryCategoryIds, primaryIndustryId, industrySegmentIds)
      if (!result.success) throw new Error(result.error || 'Failed to save industries')

      setSavedIndustryIds(new Set(industryCategoryIds))
      const capabilitiesRes = await getOrgCapabilities(accountId)
      if (capabilitiesRes.success) setCapabilities(capabilitiesRes.data)

      showSuccess({
        recordId: account?.account_code || account?.account_name,
        operation: 'updated',
        message: 'Organisation industries updated.',
      })
    } catch (err) {
      setError(err.message || 'Failed to save industries')
    } finally {
      setSavingIndustries(false)
    }
  }

  const handleToggleCapability = async (item) => {
    if (!accountId) return
    setTogglingId(item.id)
    const nextDisabled = !item.disabled
    setCapabilities((prev) => prev.map((c) => (c.id === item.id ? { ...c, disabled: nextDisabled } : c)))
    const result = await toggleOrganisationCapability(accountId, item.id, nextDisabled)
    if (!result.success) {
      // Revert on failure
      setCapabilities((prev) => prev.map((c) => (c.id === item.id ? { ...c, disabled: item.disabled } : c)))
      setError(result.error || 'Failed to update capability')
    }
    setTogglingId(null)
  }

  const capabilitiesByPack = useMemo(() => {
    const groups = new Map()
    capabilities.forEach((item) => {
      if (!groups.has(item.packName)) groups.set(item.packName, [])
      groups.get(item.packName).push(item)
    })
    return Array.from(groups.entries())
  }, [capabilities])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Loader className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Factory className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Industries &amp; Capabilities</h1>
      </div>

      {!canManage && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          You can view this organisation's industry configuration but do not have permission to change it.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <fieldset disabled={!canManage} className="p-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Industries</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select every industry that applies to your organisation and mark one as primary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {industries.map((industry) => {
                  const checked = selectedIndustryIds.has(industry.id)
                  const segments = segmentsByIndustry[industry.id] || []
                  return (
                    <div
                      key={industry.id}
                      className={`border rounded-lg p-4 transition ${
                        checked
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndustry(industry.id)}
                          className="mt-1 w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{industry.name}</span>
                      </label>

                      {checked && (
                        <div className="mt-3 pl-7 space-y-3">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="radio"
                              name="primaryIndustry"
                              checked={primaryIndustryId === industry.id}
                              onChange={() => setPrimaryIndustryId(industry.id)}
                            />
                            Primary industry
                          </label>

                          {segments.length > 0 && (
                            <select
                              value={segmentIdByIndustry[industry.id] || ''}
                              onChange={(e) =>
                                setSegmentIdByIndustry((prev) => ({ ...prev, [industry.id]: e.target.value || null }))
                              }
                              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">No specific sub-industry (optional)</option>
                              {segments.map((seg) => (
                                <option key={seg.id} value={seg.id}>{seg.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleSaveIndustries}
                disabled={!canSaveIndustries || !isIndustriesDirty || savingIndustries}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingIndustries ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Industries
              </button>
            </section>

            <section className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Modules &amp; Capabilities</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Turn off menu items your organisation doesn't need. You can always turn them back on later.
                </p>
              </div>

              {capabilitiesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading capabilities...</p>
              ) : capabilitiesByPack.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No industry-specific capabilities to configure yet — your organisation currently has full access.
                </p>
              ) : (
                <div className="space-y-5">
                  {capabilitiesByPack.map(([packName, items]) => (
                    <div key={packName}>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{packName}</h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5"
                          >
                            <span className="text-sm text-gray-900 dark:text-gray-100">{item.menuLabel}</span>
                            <input
                              type="checkbox"
                              checked={!item.disabled}
                              disabled={togglingId === item.id}
                              onChange={() => handleToggleCapability(item)}
                              className="w-4 h-4"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </fieldset>
        ) : (
          <div className="p-6">
            <AuditDetailsPanel description="How this organisation's industry configuration is classified.">
              <AuditCard title="Identity" description="How this organisation is labelled.">
                <AuditField label="Organisation name" value={account?.account_name} />
                <AuditField label="Account code" value={account?.account_code} />
              </AuditCard>
              <AuditCard title="Classification" description="Industry configuration.">
                <AuditField label="Industries selected" value={selectedIndustryIds.size} />
                <AuditField
                  label="Primary industry"
                  value={industries.find((i) => i.id === primaryIndustryId)?.name || '—'}
                />
              </AuditCard>
              <AuditCard title="Record history" description="When this organisation was created and last changed.">
                <AuditTimestampPair dateLabel="Created at" value={account?.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={account?.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          </div>
        )}
      </div>

      {successModal}
    </div>
  )
}
