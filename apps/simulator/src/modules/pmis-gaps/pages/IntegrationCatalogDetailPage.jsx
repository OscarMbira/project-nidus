/**
 * Integrations Marketplace catalog entry — create/view/edit (GAP-25, v963 Phase 21, Simulator),
 * rule 65 + rule 63.1 Audit tab. sim.integration_catalog already has full authenticated-user
 * write RLS (v963u), so there's no admin-gating requirement parity issue here the way there was
 * on the Platform side — but this page still gates the form for consistency with the Platform
 * page and to keep catalog management a PMO-admin action in both apps' UX.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Plug } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { getSessionPMOAdminStatus } from '../../../services/pmoAdminService'
import { getCatalogEntry, createCatalogEntry, updateCatalogEntry } from '../services/integrationCatalogService'

export default function IntegrationCatalogDetailPage({ basePath = '/simulator/pmo/admin/integrations', configBasePath = '/simulator/integrations', forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const [isAdmin, setIsAdmin] = useState(false)
  const readOnly = !isCreate && (!forceEdit || !isAdmin)
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [entry, setEntry] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [integrationCode, setIntegrationCode] = useState('')
  const [integrationName, setIntegrationName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [setupGuideUrl, setSetupGuideUrl] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [isComingSoon, setIsComingSoon] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const { isPMOAdmin } = await getSessionPMOAdminStatus()
    setIsAdmin(!!isPMOAdmin)

    if (isCreate) {
      setLoading(false)
      return
    }
    const row = await getCatalogEntry(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setEntry(row)
    setIntegrationCode(row.integration_code || '')
    setIntegrationName(row.integration_name || '')
    setCategory(row.category || '')
    setDescription(row.description || '')
    setLogoUrl(row.logo_url || '')
    setSetupGuideUrl(row.setup_guide_url || '')
    setIsAvailable(row.is_available !== false)
    setIsComingSoon(!!row.is_coming_soon)
    setSortOrder(row.sort_order ?? 0)
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        integrationCode: entry?.integration_code || '',
        integrationName: entry?.integration_name || '',
        category: entry?.category || '',
        description: entry?.description || '',
        logoUrl: entry?.logo_url || '',
        setupGuideUrl: entry?.setup_guide_url || '',
        isAvailable: entry?.is_available !== false,
        isComingSoon: !!entry?.is_coming_soon,
        sortOrder: entry?.sort_order ?? 0,
      }),
    [entry]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    return (
      JSON.stringify({ integrationCode, integrationName, category, description, logoUrl, setupGuideUrl, isAvailable, isComingSoon, sortOrder }) !==
      baselineSnapshot
    )
  }, [loading, readOnly, integrationCode, integrationName, category, description, logoUrl, setupGuideUrl, isAvailable, isComingSoon, sortOrder, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved integration changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!integrationCode.trim()) {
      setError('Integration code is required')
      return
    }
    if (!integrationName.trim()) {
      setError('Integration name is required')
      return
    }
    if (!category.trim()) {
      setError('Category is required')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { integrationCode, integrationName, category, description, logoUrl, setupGuideUrl, isAvailable, isComingSoon, sortOrder }
    try {
      if (isCreate) {
        await createCatalogEntry(payload)
        setSaving(false)
        showSuccess({ recordId: integrationName.trim(), operation: 'created', message: `"${integrationName.trim()}" was added to the integrations catalog.`, onOk: goToList })
      } else {
        await updateCatalogEntry(id, payload)
        setSaving(false)
        showSuccess({ recordId: integrationName.trim(), operation: 'updated', message: `"${integrationName.trim()}" was updated successfully.`, onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  const handleConnect = () => {
    navigate(`${configBasePath}/create?type=${encodeURIComponent(integrationCode)}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading integration…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Integration not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Integrations Marketplace</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Plug className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCreate ? 'Add Integration' : readOnly ? 'View Integration' : 'Edit Integration'}
          </h1>
        </div>
        {!isCreate && isAvailable && !isComingSoon && (
          <button onClick={handleConnect} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            Connect
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <fieldset disabled={readOnly} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
              )}
              {!isAdmin && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  Only PMO administrators can create or edit catalog entries.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Integration name *</label>
                  <input
                    type="text"
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label>
                  <input
                    type="text"
                    value={integrationCode}
                    onChange={(e) => setIntegrationCode(e.target.value)}
                    disabled={!isCreate}
                    required
                    placeholder="e.g. jira, github, slack"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="e.g. Development Tools, Communication"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Setup guide URL</label>
                  <input
                    type="text"
                    value={setupGuideUrl}
                    onChange={(e) => setSetupGuideUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4" />
                  Available
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isComingSoon} onChange={(e) => setIsComingSoon(e.target.checked)} className="w-4 h-4" />
                  Coming soon
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Add Integration' : 'Save Changes'}
                </button>
              )}
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this integration is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this catalog entry is labelled and classified.">
                <AuditCard title="Identity" description="How this integration is labelled.">
                  <AuditField label="Integration name" value={integrationName || entry?.integration_name} />
                  <AuditField label="Code" value={integrationCode || entry?.integration_code} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this integration sits in the marketplace.">
                  <AuditField label="Category" value={category || '—'} />
                  <AuditField label="Available" value={isAvailable ? 'Yes' : 'No'} />
                  <AuditField label="Coming soon" value={isComingSoon ? 'Yes' : 'No'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this catalog entry was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={entry?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={entry?.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
