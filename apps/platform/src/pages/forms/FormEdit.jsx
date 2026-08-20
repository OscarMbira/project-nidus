import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useLanguageContext } from '@nidus/shared/context/LanguageContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { schemaToExportSections, buildFormTemplateExportFilename } from '@nidus/shared/utils/formTemplateExportUtils'
import { validateSchemaFields } from '@nidus/shared/utils/formValidation'
import {
  formInstanceRouteKeyFromRow,
  resolveFormInstanceDetailPath,
  resolveFormInstanceRecordsListPath,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import { platformDb } from '@nidus/supabase'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormAutosaveIndicator from '../../components/forms/FormAutosaveIndicator'
import {
  getFieldTranslations,
  getFormInstance,
  getFormTemplate,
  submitFormForApproval,
  syncFormInstanceToLatestVersion,
  updateFormValues,
} from '../../services/formEngineService'
import { resolveAttachmentFieldsForExport } from '../../services/formFieldAttachmentService'

function groupRowsBySection(rowList = []) {
  const rows = {}
  for (const row of rowList) {
    const key = row.section_key
    if (!rows[key]) rows[key] = []
    rows[key][row.row_index] = row.row_value
  }
  for (const key of Object.keys(rows)) {
    rows[key] = (rows[key] || []).filter((v) => v != null)
  }
  return rows
}

function decodeSeg(raw) {
  try {
    return decodeURIComponent(String(raw || '').trim())
  } catch {
    return String(raw || '').trim()
  }
}

export default function FormEdit({ mode = 'platform', basePath = '/platform/projects' }) {
  const { formInstanceId: formInstanceKey } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const location = useLocation()
  const navigate = useNavigate()
  const { languageCode } = useLanguageContext()
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [instance, setInstance] = useState(null)
  const [projectCode, setProjectCode] = useState(null)
  const [values, setValues] = useState({})
  const [rows, setRows] = useState({})
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [translations, setTranslations] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [exportOverrides, setExportOverrides] = useState({ textValues: {}, assets: {} })
  const [versionStatus, setVersionStatus] = useState({ checked: false, isOutdated: false, latestVersionNumber: null })
  const [syncingVersion, setSyncingVersion] = useState(false)

  const resolvedInstanceId = instance?.id || null
  const projectRouteKey = projectCode || routeKey || projectId

  const listPath = useMemo(
    () =>
      resolveFormInstanceRecordsListPath({
        pathname: location.pathname,
        projectId,
        projectKey: projectRouteKey,
        templateCode: instance?.template?.template_code,
        fallbackBasePath: basePath,
      }),
    [location.pathname, projectId, projectRouteKey, instance?.template?.template_code, basePath],
  )
  const viewPath = useMemo(
    () => (instance ? resolveFormInstanceDetailPath(listPath, instance, 'view') : null),
    [listPath, instance],
  )

  useEffect(() => {
    setLoadError(null)
    getFormInstance(formInstanceKey, mode).then((r) => {
      if (!r.success) {
        setLoadError(r.message || 'Failed to load form')
        return
      }
      setInstance(r.data)
      const nextValues = {}
      for (const item of r.data.values || []) nextValues[item.field_key] = item.field_value
      setValues(nextValues)
      setRows(groupRowsBySection(r.data.rows || []))
    })
  }, [formInstanceKey, mode])

  useEffect(() => {
    if (!instance?.template_id) return
    getFieldTranslations(instance.template_id, mode).then((r) => r.success && setTranslations(r.data))
  }, [instance?.template_id, mode])

  // Detect whether a newer template version exists than the one this record was created
  // against (v863) — surfaces a "Update to latest template" action when fields were added
  // (or otherwise changed) since this record's schema snapshot was taken.
  useEffect(() => {
    if (!instance?.template?.template_code || !instance?.template_version_id) return
    let cancelled = false
    getFormTemplate(instance.template.template_code, mode).then((r) => {
      if (cancelled || !r.success) return
      const latest = r.data?.current_version
      setVersionStatus({
        checked: true,
        isOutdated: Boolean(latest?.id) && latest.id !== instance.template_version_id,
        latestVersionNumber: latest?.version_number ?? null,
      })
    })
    return () => { cancelled = true }
  }, [instance?.template?.template_code, instance?.template_version_id, mode])

  useEffect(() => {
    const pid = projectId || instance?.project_id
    if (!pid) {
      setProjectCode(null)
      return
    }
    let cancelled = false
    platformDb
      .from('projects')
      .select('project_code')
      .eq('id', pid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectCode(data?.project_code || null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, instance?.project_id])

  // Canonicalize URL to project_code + instance_reference (rule 16.1).
  useEffect(() => {
    if (!instance?.id || !projectRouteKey) return
    const desiredInstanceKey = formInstanceRouteKeyFromRow(instance)
    if (!desiredInstanceKey) return
    const desiredPath = resolveFormInstanceDetailPath(
      resolveFormInstanceRecordsListPath({
        pathname: location.pathname,
        projectId: projectId || instance.project_id,
        projectKey: projectRouteKey,
        fallbackBasePath: basePath,
      }),
      instance,
      'edit',
    )
    if (!desiredPath) return
    const currentInstanceKey = decodeSeg(formInstanceKey)
    const currentProjectKey = decodeSeg(routeKey)
    const needsReplace =
      currentInstanceKey !== desiredInstanceKey ||
      (projectCode && currentProjectKey && currentProjectKey !== projectCode)
    if (needsReplace && desiredPath !== location.pathname) {
      navigate(desiredPath + (location.search || ''), { replace: true })
    }
  }, [
    instance,
    projectRouteKey,
    projectCode,
    projectId,
    formInstanceKey,
    routeKey,
    location.pathname,
    location.search,
    basePath,
    navigate,
  ])

  const schema = instance?.schema || { sections: [] }
  const exportSections = useMemo(() => schemaToExportSections(schema), [schema])
  const exportFilename = buildFormTemplateExportFilename({
    templateCode: instance?.template?.template_code,
    templateName: instance?.template?.name || 'form',
  })

  // Re-resolve attachment field export data only when an attachment field's own value
  // (the array of attachment_group_ids) changes — not on every keystroke in other fields.
  const attachmentFieldKeys = useMemo(
    () => (schema.sections || []).flatMap((s) => s.fields || []).filter((f) => f.type === 'attachment').map((f) => f.key),
    [schema],
  )
  const attachmentValuesSignature = attachmentFieldKeys.map((k) => JSON.stringify(values[k] || [])).join('|')
  useEffect(() => {
    if (!resolvedInstanceId || attachmentFieldKeys.length === 0) return
    let cancelled = false
    resolveAttachmentFieldsForExport(schema, values, mode).then((result) => {
      if (!cancelled && result.success) setExportOverrides(result.data)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature intentionally narrows deps to attachment fields only
  }, [resolvedInstanceId, attachmentValuesSignature, mode])

  // NOTE: exportRecord is a display-only copy for ExportRecordMenu — never write it back via
  // updateFormValues, or the real attachment_group_id references in `values` would be corrupted.
  const exportRecord = useMemo(
    () => ({ ...values, ...exportOverrides.textValues }),
    [values, exportOverrides],
  )

  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!resolvedInstanceId) return
    setSaving(true)
    const result = await updateFormValues(resolvedInstanceId, values, mode)
    setSaving(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to save form — see details below', { duration: 8000 })
      setLoadError(result.message || 'Failed to save form')
      return
    }
    setLoadError(null)
    setLastSavedAt(new Date().toLocaleTimeString())
    showSuccess({
      recordId: instance?.instance_reference || instance?.display_title,
      operation: 'updated',
      message: `${instance?.display_title || instance?.template?.name || 'Form'} saved successfully.`,
    })
  }

  const handleSyncVersion = async () => {
    if (!resolvedInstanceId) return
    const confirmed = window.confirm(
      `Update this record to template version ${versionStatus.latestVersionNumber}? Fields added since this record was created will appear here (blank, until filled in). If any fields were removed or changed type on the template, previously entered data for those fields will no longer be shown here — it is not deleted.`,
    )
    if (!confirmed) return
    setSyncingVersion(true)
    const result = await syncFormInstanceToLatestVersion(resolvedInstanceId, mode)
    setSyncingVersion(false)
    if (!result.success) {
      toast.error(result.message || 'Failed to update to the latest template version')
      return
    }
    if (result.data.alreadyCurrent) {
      toast.success('Already on the latest template version')
      setVersionStatus((prev) => ({ ...prev, isOutdated: false }))
      return
    }
    toast.success(`Updated to template version ${result.data.versionNumber}`)
    const reloaded = await getFormInstance(formInstanceKey, mode)
    if (reloaded.success) {
      setInstance(reloaded.data)
      const nextValues = {}
      for (const item of reloaded.data.values || []) nextValues[item.field_key] = item.field_value
      setValues(nextValues)
      setRows(groupRowsBySection(reloaded.data.rows || []))
    }
  }

  const submitForApproval = async () => {
    if (!resolvedInstanceId) return
    const errors = validateSchemaFields(schema, values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted fields before submitting')
      return
    }
    const saveResult = await updateFormValues(resolvedInstanceId, values, mode)
    if (!saveResult.success) {
      toast.error(saveResult.message || 'Failed to save form before submitting')
      return
    }
    const submitResult = await submitFormForApproval(resolvedInstanceId, mode)
    if (!submitResult.success) {
      toast.error(submitResult.message || 'Failed to submit form for approval')
      return
    }
    toast.success('Submitted for approval')
  }

  return (
    <div className="mx-auto w-full md:w-3/4 space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={listPath}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to records
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {versionStatus.checked && versionStatus.isOutdated && (
            <button
              type="button"
              onClick={handleSyncVersion}
              disabled={syncingVersion}
              title="This record was created from an earlier version of the template — update it to pick up newly added fields."
              className="rounded border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50"
            >
              {syncingVersion ? 'Updating…' : `Update to latest template (v${versionStatus.latestVersionNumber})`}
            </button>
          )}
          {viewPath && (
            <RowActionButton variant="view" label="View form" onClick={() => navigate(viewPath)} />
          )}
          <ExportRecordMenu
            sections={exportSections}
            record={exportRecord}
            attachmentAssets={exportOverrides.assets}
            baseFilename={exportFilename}
            disabled={!instance || exportSections.length === 0}
          />
        </div>
      </div>
      <div>
        <h1 className="text-lg font-semibold">
          {instance
            ? `Edit: ${instance.display_title || instance.template?.name || 'Form'}`
            : 'Edit Form'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {[
            instance?.template?.name,
            instance?.template?.template_code,
            instance?.status,
            instance?.instance_reference,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {loadError}
        </div>
      )}
      <FormAutosaveIndicator lastSavedAt={lastSavedAt} isSaving={false} />
      <DynamicFormRenderer
        schema={schema}
        values={values}
        rows={rows}
        onValueChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onRowsChange={(sectionKey, nextRows) => setRows((prev) => ({ ...prev, [sectionKey]: nextRows }))}
        translations={translations}
        languageCode={languageCode}
        showCalculated
        errors={fieldErrors}
        formInstanceId={resolvedInstanceId}
        mode={mode}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !resolvedInstanceId}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {successModal}
      <ApprovalWorkflowPanel status={instance?.status} onSubmit={submitForApproval} />
    </div>
  )
}
