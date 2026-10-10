/**
 * Project Regional & Format Settings — per-field overrides (v1062 + local fields v1065)
 * Route: /platform/project-setup/regional-format-settings?projectId=…
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import ViewToggle from '@nidus/ui/ViewToggle'
import TestEvidenceSettingCard from '../../components/testing/TestEvidenceSettingCard'
import { useProjectRole } from '../../hooks/useProjectRole'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { resolveProjectRouteKeyFromId } from '@nidus/shared/utils/projectRouteParam.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { REGIONAL_FORMAT_DEFAULTS, REGIONAL_FORMAT_FIELD_KEYS, FIELD_LABELS } from '@nidus/shared/utils/regionalFormatConstants.js'
import {
  resolveRegionalFormatSettings,
  buildProjectOverridePayload,
  resolveLocalFieldValues,
  buildLocalFieldProjectPayload,
  parseLocalFieldDefault,
} from '@nidus/shared/utils/resolveRegionalFormatSettings.js'
import {
  getOrganisationRegionalFormatSettings,
  getProjectRegionalFormatSettings,
  upsertProjectRegionalFormatSettings,
  listRegionalFormatLocalFields,
  createRegionalFormatLocalField,
  softDeleteRegionalFormatLocalField,
} from '@nidus/shared/services/regionalFormatSettingsService.js'
import RegionalFormatFields, { REGIONAL_FORMAT_EXPORT_SECTIONS } from '../../components/regionalFormat/RegionalFormatFields'

export default function ProjectRegionalFormatSettingsPage() {
  const { projectId, routeKey, loading: projectIdLoading, error: projectIdError } = usePlatformProjectId()
  const { canEdit: canEditProject } = useProjectRole(projectId)
  const { showSuccess, modal } = useSuccessModal()
  const [viewMode, setViewMode] = useViewMode('regional-format-project', 'list')
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accountId, setAccountId] = useState(null)
  const [orgDefaults, setOrgDefaults] = useState({ ...REGIONAL_FORMAT_DEFAULTS })
  const [form, setForm] = useState({ ...REGIONAL_FORMAT_DEFAULTS })
  const [overrideFlags, setOverrideFlags] = useState({})
  const [localDefinitions, setLocalDefinitions] = useState([])
  const [localValues, setLocalValues] = useState({})
  const [localOverrideFlags, setLocalOverrideFlags] = useState({})
  const [localOrgDefaults, setLocalOrgDefaults] = useState({})
  const [row, setRow] = useState(null)
  const [projectLabel, setProjectLabel] = useState(null)
  const [snapshot, setSnapshot] = useState('')
  const [error, setError] = useState(null)

  const isDirty = snapshot !== '' && JSON.stringify({
    form, overrideFlags, localValues, localOverrideFlags,
  }) !== snapshot
  useUnsavedChangesGuard(isDirty)

  const exportRecord = useMemo(() => {
    const rec = { ...form }
    for (const key of REGIONAL_FORMAT_FIELD_KEYS) {
      rec[`override_${key}`] = overrideFlags[key] ? 'Yes' : 'No'
    }
    return rec
  }, [form, overrideFlags])

  const exportSections = useMemo(
    () => [
      {
        title: 'Regional & Format Settings',
        fields: [
          ...REGIONAL_FORMAT_EXPORT_SECTIONS[0].fields,
          ...REGIONAL_FORMAT_FIELD_KEYS.map((key) => ({
            key: `override_${key}`,
            label: `Override ${FIELD_LABELS[key]}`,
          })),
        ],
      },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (projectIdLoading) return
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const acctId = await getCurrentUserAccountId()
      setAccountId(acctId)
      const orgRes = acctId
        ? await getOrganisationRegionalFormatSettings(acctId)
        : { success: true, data: null }
      if (!orgRes.success) throw new Error(orgRes.error)
      const org = { ...REGIONAL_FORMAT_DEFAULTS, ...(orgRes.data || {}) }
      setOrgDefaults(org)

      const [pRes, defsRes] = await Promise.all([
        getProjectRegionalFormatSettings(projectId),
        acctId
          ? listRegionalFormatLocalFields(acctId, { projectId, includeProjectOnly: true })
          : { success: true, data: [] },
      ])
      if (!pRes.success) throw new Error(pRes.error)
      if (!defsRes.success) throw new Error(defsRes.error)
      setRow(pRes.data)
      const label = await resolveProjectRouteKeyFromId(projectId)
      setProjectLabel(label || routeKey || projectId)
      const resolved = resolveRegionalFormatSettings(org, pRes.data)
      const flags = {}
      for (const key of REGIONAL_FORMAT_FIELD_KEYS) flags[key] = !!resolved.overrides[key]
      const values = { ...REGIONAL_FORMAT_DEFAULTS }
      for (const key of REGIONAL_FORMAT_FIELD_KEYS) values[key] = resolved[key]

      const defs = defsRes.data || []
      const orgLocal = orgRes.data?.local_field_values || {}
      const projLocal = pRes.data?.local_field_values || {}
      const projLocalFlags = pRes.data?.local_field_overrides || {}
      const localResolved = resolveLocalFieldValues(defs, orgLocal, projLocal, projLocalFlags)
      const orgOnlyResolved = resolveLocalFieldValues(
        defs.filter((d) => !d.project_id),
        orgLocal,
        null,
        null,
      )

      setForm(values)
      setOverrideFlags(flags)
      setLocalDefinitions(defs)
      setLocalValues(localResolved.values)
      setLocalOverrideFlags(localResolved.overrides)
      setLocalOrgDefaults(orgOnlyResolved.values)
      setSnapshot(JSON.stringify({
        form: values,
        overrideFlags: flags,
        localValues: localResolved.values,
        localOverrideFlags: localResolved.overrides,
      }))
    } catch (e) {
      setError(e?.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [projectId, projectIdLoading, routeKey])

  useEffect(() => { load() }, [load])

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const onToggleOverride = (key, on) => {
    setOverrideFlags((prev) => ({ ...prev, [key]: on }))
    if (!on) setForm((prev) => ({ ...prev, [key]: orgDefaults[key] }))
  }
  const onLocalValueChange = (id, value) => setLocalValues((prev) => ({ ...prev, [id]: value }))
  const onToggleLocalOverride = (id, on) => {
    setLocalOverrideFlags((prev) => ({ ...prev, [id]: on }))
    if (!on) setLocalValues((prev) => ({ ...prev, [id]: localOrgDefaults[id] }))
  }

  const handleCreateDefinition = async ({ label, fieldKey, valueType, defaultValue }) => {
    if (!accountId || !projectId) return { success: false, error: 'No project' }
    const res = await createRegionalFormatLocalField({
      accountId,
      projectId,
      label,
      fieldKey,
      valueType,
      defaultValue,
      sortOrder: localDefinitions.filter((d) => d.project_id).length,
    })
    if (!res.success) return res
    const def = res.data
    setLocalDefinitions((prev) => [...prev, def])
    const seed = parseLocalFieldDefault(def.value_type, def.default_value)
    setLocalValues((prev) => ({ ...prev, [def.id]: seed }))
    setLocalOverrideFlags((prev) => ({ ...prev, [def.id]: true }))
    showSuccess({
      recordId: def.field_key,
      operation: 'created',
      message: `Project-only local field “${def.label}” added.`,
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
    setLocalOverrideFlags((prev) => {
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
    if (!projectId) return
    setSaving(true)
    try {
      const payload = {
        ...buildProjectOverridePayload(overrideFlags, form),
        ...buildLocalFieldProjectPayload(localDefinitions, localOverrideFlags, localValues),
      }
      const res = await upsertProjectRegionalFormatSettings(projectId, payload)
      if (!res.success) throw new Error(res.error || 'Save failed')
      setRow(res.data)
      const resolved = resolveRegionalFormatSettings(orgDefaults, res.data)
      const flags = {}
      for (const key of REGIONAL_FORMAT_FIELD_KEYS) flags[key] = !!resolved.overrides[key]
      const values = { ...REGIONAL_FORMAT_DEFAULTS }
      for (const key of REGIONAL_FORMAT_FIELD_KEYS) values[key] = resolved[key]
      const orgLocalMap = {}
      for (const def of localDefinitions) {
        if (!def.project_id) orgLocalMap[def.id] = localOrgDefaults[def.id]
      }
      const localResolved = resolveLocalFieldValues(
        localDefinitions,
        orgLocalMap,
        res.data?.local_field_values || {},
        res.data?.local_field_overrides || {},
      )
      setForm(values)
      setOverrideFlags(flags)
      setLocalValues(localResolved.values)
      setLocalOverrideFlags(localResolved.overrides)
      setSnapshot(JSON.stringify({
        form: values,
        overrideFlags: flags,
        localValues: localResolved.values,
        localOverrideFlags: localResolved.overrides,
      }))
      showSuccess({
        recordId: projectLabel || projectId,
        operation: 'updated',
        message: 'Project Regional & Format Settings saved.',
      })
    } catch (err) {
      toast.error(err?.message || 'Failed to save — you may not have permission.')
    } finally {
      setSaving(false)
    }
  }

  if (projectIdLoading || loading) {
    return <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  if (!projectId || projectIdError === 'missing' || projectIdError === 'not_found') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">
        Select a project from the project picker to manage Regional & Format Settings.
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to={`/platform/project-details?projectId=${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Regional & Format Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Override organisation defaults for this project (per field)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Regional format fields layout"
            />
            <ExportRecordButtons
              sections={exportSections}
              record={exportRecord}
              baseFilename={`RegionalFormat_${projectId}`}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <TestEvidenceSettingCard scope="project" targetId={projectId} canManage={canEditProject} />

        <div className="border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Project regional format sections"
            tabs={[
              { value: 'details', label: 'Details' },
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSave} className="space-y-4">
            <RegionalFormatFields
              values={form}
              onChange={onChange}
              mode="project"
              orgDefaults={orgDefaults}
              overrideFlags={overrideFlags}
              onToggleOverride={onToggleOverride}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle={false}
              localDefinitions={localDefinitions}
              localValues={localValues}
              onLocalValueChange={onLocalValueChange}
              localOverrideFlags={localOverrideFlags}
              onToggleLocalOverride={onToggleLocalOverride}
              localOrgDefaults={localOrgDefaults}
              canManageDefinitions
              onCreateDefinition={handleCreateDefinition}
              onSoftDeleteDefinition={handleSoftDeleteDefinition}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={saving || !isDirty} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </form>
        ) : (
          <AuditDetailsPanel description={row ? 'Where this project override record stands.' : 'Audit details appear after this record is saved'}>
            {row ? (
              <>
                <AuditCard title="Identity" description="Project override scope.">
                  <AuditField label="Project" value={projectLabel || routeKey || row.project_id} />
                </AuditCard>
                <AuditCard title="Classification" description="Active overrides.">
                  <AuditField
                    label="Overridden fields"
                    value={REGIONAL_FORMAT_FIELD_KEYS.filter((k) => overrideFlags[k]).join(', ') || 'None'}
                  />
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
