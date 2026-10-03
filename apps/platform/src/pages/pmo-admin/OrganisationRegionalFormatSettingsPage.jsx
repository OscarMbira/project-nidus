/**
 * Organisation Regional & Format Settings (v1062 + local fields v1065)
 * Routes: /platform/pmo-admin/regional-format-settings
 *         /platform/organisation/regional-format-settings
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { REGIONAL_FORMAT_DEFAULTS } from '@nidus/shared/utils/regionalFormatConstants.js'
import { resolveLocalFieldValues, parseLocalFieldDefault } from '@nidus/shared/utils/resolveRegionalFormatSettings.js'
import {
  getRegionalFormatOrgAccess,
  getOrganisationRegionalFormatSettings,
  upsertOrganisationRegionalFormatSettings,
  listRegionalFormatLocalFields,
  createRegionalFormatLocalField,
  softDeleteRegionalFormatLocalField,
} from '@nidus/shared/services/regionalFormatSettingsService.js'
import RegionalFormatFields, { REGIONAL_FORMAT_EXPORT_SECTIONS } from '../../components/regionalFormat/RegionalFormatFields'

export default function OrganisationRegionalFormatSettingsPage() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [viewMode, setViewMode] = useViewMode('regional-format-org', 'list')
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [accountId, setAccountId] = useState(null)
  const [row, setRow] = useState(null)
  const [form, setForm] = useState({ ...REGIONAL_FORMAT_DEFAULTS })
  const [localDefinitions, setLocalDefinitions] = useState([])
  const [localValues, setLocalValues] = useState({})
  const [snapshot, setSnapshot] = useState('')
  const [error, setError] = useState(null)

  const isDirty = snapshot !== '' && JSON.stringify({ form, localValues }) !== snapshot
  useUnsavedChangesGuard(isDirty && canManage)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const access = await getRegionalFormatOrgAccess()
    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(access.accountId)
    setCanManage(access.canManage)
    const [res, defsRes] = await Promise.all([
      getOrganisationRegionalFormatSettings(access.accountId),
      listRegionalFormatLocalFields(access.accountId, { includeProjectOnly: false }),
    ])
    if (!res.success) {
      setError(res.error)
      setLoading(false)
      return
    }
    if (!defsRes.success) {
      setError(defsRes.error)
      setLoading(false)
      return
    }
    const next = { ...REGIONAL_FORMAT_DEFAULTS, ...(res.data || {}) }
    const defs = defsRes.data || []
    const stored = res.data?.local_field_values || {}
    const resolved = resolveLocalFieldValues(defs, stored, null, null)
    setRow(res.data)
    setForm(next)
    setLocalDefinitions(defs)
    setLocalValues(resolved.values)
    setSnapshot(JSON.stringify({ form: next, localValues: resolved.values }))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const onLocalValueChange = (id, value) => setLocalValues((prev) => ({ ...prev, [id]: value }))

  const handleCreateDefinition = async ({ label, fieldKey, valueType, defaultValue }) => {
    const res = await createRegionalFormatLocalField({
      accountId,
      projectId: null,
      label,
      fieldKey,
      valueType,
      defaultValue,
      sortOrder: localDefinitions.length,
    })
    if (!res.success) return res
    const def = res.data
    setLocalDefinitions((prev) => [...prev, def])
    const seed = parseLocalFieldDefault(def.value_type, def.default_value)
    setLocalValues((prev) => ({ ...prev, [def.id]: seed }))
    showSuccess({
      recordId: def.field_key,
      operation: 'created',
      message: `Local field “${def.label}” added.`,
    })
    return res
  }

  const handleSoftDeleteDefinition = async (id) => {
    const res = await softDeleteRegionalFormatLocalField(id)
    if (!res.success) return res
    setLocalDefinitions((prev) => prev.filter((d) => d.id !== id))
    setLocalValues((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    showSuccess({
      recordId: id,
      operation: 'deleted',
      message: 'Local field removed from the list.',
    })
    return res
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!accountId || !canManage) return
    setSaving(true)
    try {
      const res = await upsertOrganisationRegionalFormatSettings(accountId, {
        ...form,
        local_field_values: localValues,
      })
      if (!res.success) throw new Error(res.error || 'Save failed')
      setRow(res.data)
      const next = { ...REGIONAL_FORMAT_DEFAULTS, ...res.data }
      const stored = res.data?.local_field_values || localValues
      setForm(next)
      setLocalValues(stored)
      setSnapshot(JSON.stringify({ form: next, localValues: stored }))
      showSuccess({
        recordId: res.data?.account_id || accountId,
        operation: row ? 'updated' : 'created',
        message: 'Organisation Regional & Format Settings saved.',
      })
    } catch (err) {
      toast.error(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Regional & Format Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Organisation defaults for currency, dates, time zones, and numbers</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Regional format fields layout"
            />
            <ExportRecordButtons
              sections={REGIONAL_FORMAT_EXPORT_SECTIONS}
              record={form}
              baseFilename={`OrgRegionalFormat_${accountId || 'settings'}`}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Regional format sections"
            tabs={[
              { value: 'details', label: 'Details' },
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSave} className="space-y-4">
            <fieldset disabled={!canManage} className="space-y-4">
              <RegionalFormatFields
                values={form}
                onChange={onChange}
                disabled={!canManage}
                mode="org"
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showViewToggle={false}
                localDefinitions={localDefinitions}
                localValues={localValues}
                onLocalValueChange={onLocalValueChange}
                canManageDefinitions={canManage}
                onCreateDefinition={handleCreateDefinition}
                onSoftDeleteDefinition={handleSoftDeleteDefinition}
              />
            </fieldset>
            {canManage && (
              <div className="flex justify-end">
                <button type="submit" disabled={saving || !isDirty} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            )}
            {!canManage && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Only PMO Admin or Account Owner can change organisation defaults.</p>
            )}
          </form>
        ) : (
          <AuditDetailsPanel description={row ? 'Where this organisation settings record stands.' : 'Audit details appear after this record is saved'}>
            {row ? (
              <>
                <AuditCard title="Identity" description="Organisation settings scope.">
                  <AuditField label="Account" value={row.account_id} />
                  <AuditField label="Currency" value={row.currency_code} />
                  <AuditField label="Locale" value={row.locale} />
                </AuditCard>
                <AuditCard title="Classification" description="Key format choices.">
                  <AuditField label="Date format" value={row.date_format} />
                  <AuditField label="Time zone" value={row.time_zone} />
                  <AuditField label="Local fields" value={String(localDefinitions.length)} />
                </AuditCard>
                <AuditCard title="Record history" description="When this record was created and last updated.">
                  <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
                  <AuditTimestampPair dateLabel="Updated at" value={row.updated_at} />
                </AuditCard>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
            )}
          </AuditDetailsPanel>
        )}
      </div>
      {modal}
    </div>
  )
}
