/**
 * Local Register Engine — generic create/edit form (v931). One input per field-config row,
 * switching on field_type. See projectplan/v931_local_register_engine_plan.md Phase 3.
 * Routed page per rule 65 (non-modal — create/edit are their own routes, not a dialog).
 * Template mode (v1336): `…/templates/:templateId/edit` edits an organisation template's name,
 * description and every tab; Save updates the template (the record itself is never touched).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, LayoutTemplate, Pencil } from 'lucide-react'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import SaveAsTemplateDialog from '@nidus/ui/SaveAsTemplateDialog'
import toastNotify from 'react-hot-toast'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import {
  groupRegisterFields,
  buildRegisterTabs,
  DETAILS_TAB,
  AUDIT_TAB,
  CUSTOM_FIELDS_TAB,
} from '@nidus/shared/utils/registerFieldGroups'
import LocalRegisterAuditPanel from './LocalRegisterAuditPanel'
import RegisterFieldInput from '@nidus/ui/RegisterFieldInput'
import RegisterCustomFieldsHeader from '@nidus/ui/RegisterCustomFieldsHeader'
import AddRegisterCustomFieldPanel from '@nidus/ui/AddRegisterCustomFieldPanel'
import { useRegisterCustomFields } from '../../lib/useRegisterCustomFields'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import {
  customFieldDefaultValue,
  customFieldHint,
  validateRegisterCustomValue,
} from '@nidus/shared/utils/registerCustomFields'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { getRecord, createRecord, updateRecord, listRecords } from '../../services/localRegisterRecordService'
import { applyCalculations } from '@nidus/shared/utils/registerCalculations'
import { needsSequenceCheck, sequenceWarnings, appendOverrideReason } from '@nidus/shared/utils/runbookSequencing'
import SequenceWarningDialog from '@nidus/ui/SequenceWarningDialog'
import { isRecordLockedForSignoff, selectableRecordStatuses } from '@nidus/shared/services/localRegisterSignoffService'
import { getRegisterTemplate, updateTemplate, canManageRegisterTemplates, listRegisterTemplates, saveRecordAsTemplate } from '@nidus/shared/services/localRegisterTemplateService'
import { exportRegisterRecordDocument, buildRegisterRecordDocumentPdfBlob } from '@nidus/shared/services/registerDocumentExportService'
import { buildRegisterRecordExport } from '@nidus/shared/utils/registerRecordExport'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { recordPlaceholderSummary } from '@nidus/shared/utils/registerPlaceholders'
import PlaceholderBanner from '@nidus/ui/PlaceholderBanner'
import { simDb } from '@nidus/supabase'

export default function LocalRegisterForm() {
  const { registerId, recordId, templateId } = useParams()
  const isTemplate = !!templateId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!recordId

  // Only meaningful when creating a record for a system-defined register (it carries no scope
  // of its own, v932) — e.g. reached from a project's own "Permits" list with
  // ?scopeLevel=project&scopeEntityId=<id>. Ignored when editing (the record already has its
  // own scope) or for a member-created register (its own scope_*_id is used instead).
  const queryScopeLevel = searchParams.get('scopeLevel') || ''
  const queryScopeEntityId = searchParams.get('scopeEntityId') || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sequenceCheck, setSequenceCheck] = useState(null)
  const [register, setRegister] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [fieldValues, setFieldValues] = useState({})
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [savedRecord, setSavedRecord] = useState(null)
  const [activeTab, setActiveTab] = useState(DETAILS_TAB)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [template, setTemplate] = useState(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const registerResult = await getRegisterDefinition(registerId)
      if (cancelled) return
      setRegister(registerResult.data)
      const defaultStatus = registerResult.data?.status_workflow?.[0]?.key || ''

      if (isTemplate) {
        const templateResult = await getRegisterTemplate(simDb, templateId)
        if (cancelled) return
        const t = templateResult.data
        setTemplate(t)
        setTemplateName(t?.name || '')
        setTemplateDescription(t?.description || '')
        setTitle(t?.record_title || '')
        setDescription(t?.record_description || '')
        setStatus(defaultStatus)
        setFieldValues(t?.field_values || {})
        setInitialSnapshot(JSON.stringify({ title: t?.record_title || '', description: t?.record_description || '', status: defaultStatus, fieldValues: t?.field_values || {}, templateName: t?.name || '', templateDescription: t?.description || '' }))
      } else if (isEdit) {
        const recordResult = await getRecord(recordId)
        if (cancelled) return
        const record = recordResult.data
        setSavedRecord(record)
        setTitle(record?.title || '')
        setDescription(record?.description || '')
        setStatus(record?.status || defaultStatus)
        setFieldValues(record?.field_values || {})
        setInitialSnapshot(JSON.stringify({ title: record?.title, description: record?.description, status: record?.status, fieldValues: record?.field_values }))
      } else {
        setStatus(defaultStatus)
        setInitialSnapshot(JSON.stringify({ title: '', description: '', status: defaultStatus, fieldValues: {} }))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [registerId, recordId, isEdit, isTemplate, templateId])

  // Document records under sign-off are read-only (v1318; the database refuses the save too).
  const locked = isEdit && isRecordLockedForSignoff(savedRecord)

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    const current = isTemplate
      ? { title, description, status, fieldValues, templateName, templateDescription }
      : { title, description, status, fieldValues }
    return JSON.stringify(current) !== initialSnapshot
  }, [title, description, status, fieldValues, initialSnapshot, isTemplate, templateName, templateDescription])

  // One tab per field_group (v1297); ungrouped fields stay on Details with Title/Description/Status.
  // Conditional fields (visible_when, v1346) follow the values being typed.
  const { detailsFields, groups } = useMemo(() => groupRegisterFields(register?.fields, fieldValues), [register, fieldValues])
  // A conditional tab (v1346) can vanish when its controlling value changes — show Details then.
  const shownTab = activeTab.startsWith('group-') && !groups.some((g) => g.value === activeTab) ? DETAILS_TAB : activeTab

  // Organisation custom fields (v1311): values live in fieldValues under cf__<id>, so they save
  // with the record; the "Custom Fields" tab sits just before Audit details.
  const customFields = useRegisterCustomFields(register)
  // Currency + decimals for amount inputs (rule 68) — organisation settings.
  const regionalSettings = useRegionalFormatSettings(null)
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  // View, Export and Save as template (same bar as the record page). Any register, not only documents.
  const [viewerAccountId, setViewerAccountId] = useState(null)
  const [templateRights, setTemplateRights] = useState({ forKey: null, canManage: false, orgTemplates: [] })
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId().then((id) => { if (!cancelled) setViewerAccountId(id) })
    return () => { cancelled = true }
  }, [])

  // Custom-field defaults (v1314) apply to new records only; anything the user typed (even blank) wins.
  const effectiveFieldValues = useMemo(() => {
    if (isEdit || isTemplate) return fieldValues
    const defaults = {}
    for (const f of customFields.fields) {
      const d = customFieldDefaultValue(f)
      if (d !== undefined) defaults[f.field_key] = d
    }
    return { ...defaults, ...fieldValues }
  }, [isEdit, isTemplate, customFields.fields, fieldValues])

  // Calculated fields (v1337) follow the values being typed and are stored on save.
  const calculatedValues = useMemo(() => applyCalculations(register?.fields, effectiveFieldValues), [register, effectiveFieldValues])

  // "Record reference" fields (v1337): records of the target register in this record's project.
  const refProjectId = savedRecord?.record_project_id || (queryScopeLevel === 'project' ? queryScopeEntityId : '') || null
  const loadRecordOptions = useCallback(async (registerKey) => {
    if (!refProjectId) return []
    const target = await getRegisterDefinition(registerKey)
    if (!target.data) return []
    const result = await listRecords(target.data.id, { scopeLevel: 'project', scopeEntityId: refProjectId })
    if (!result.success && result.error) throw new Error(result.error)
    return (result.data || []).filter((r) => r.id !== savedRecord?.id)
  }, [refProjectId, savedRecord?.id])

  const templateAccountId = savedRecord?.account_id || viewerAccountId
  const templateRightsKey = isEdit && !isTemplate && templateAccountId && register?.register_key
    ? `${templateAccountId}|${register.register_key}`
    : null
  useEffect(() => {
    if (!templateRightsKey) return undefined
    let cancelled = false
    Promise.all([
      canManageRegisterTemplates(simDb, templateAccountId),
      listRegisterTemplates(simDb, register.register_key),
    ]).then(([canManage, list]) => {
      if (cancelled) return
      setTemplateRights({
        forKey: templateRightsKey,
        canManage,
        orgTemplates: list.success ? list.data.filter((t) => t.template_scope === 'organisation') : [],
      })
    })
    return () => { cancelled = true }
  }, [templateRightsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportRecord = useMemo(() => ({
    ...(savedRecord || {}),
    title,
    description,
    status,
    field_values: effectiveFieldValues,
  }), [savedRecord, title, description, status, effectiveFieldValues])

  const exportData = useMemo(() => {
    if (!register || isTemplate) return null
    return buildRegisterRecordExport({
      register,
      record: exportRecord,
      customFields: customFields.fields,
      settings: regionalSettings,
    })
  }, [register, isTemplate, exportRecord, customFields.fields, regionalSettings])

  const handleSaveAsTemplate = async ({ name, description: templateDescriptionText, templateId: replaceId }) => {
    if (!savedRecord?.id) return
    if (isDirty) {
      toastNotify.error('Save the record first, then save it as a template.')
      return
    }
    setSavingTemplate(true)
    const result = await saveRecordAsTemplate(simDb, {
      recordId: savedRecord.id,
      name,
      description: templateDescriptionText,
      templateId: replaceId,
      accountId: templateAccountId,
      mode: 'sim',
    })
    setSavingTemplate(false)
    if (!result.success) {
      toastNotify.error(result.message || 'The template could not be saved')
      return
    }
    setTemplateDialogOpen(false)
    if (result.data.failedFiles.length) toastNotify.error(`Template saved, but these annexures could not be copied: ${result.data.failedFiles.join(', ')}`)
    else toastNotify.success(`Template “${name}” saved — find it on the Templates tab`)
    setTemplateRights((prev) => ({ ...prev, forKey: null }))
  }

  // Custom-field values that break their rules (min/max, length, allowed characters).
  const customFieldErrors = useMemo(
    () => Object.fromEntries(
      customFields.fields
        .map((f) => [f.field_key, validateRegisterCustomValue(f, effectiveFieldValues[f.field_key])])
        .filter(([, errors]) => errors.length > 0)
    ),
    [customFields.fields, effectiveFieldValues]
  )
  const invalidCustomLabels = customFields.fields
    .filter((f) => customFieldErrors[f.field_key])
    .map((f) => `${f.field_label} (Custom Fields): ${customFieldErrors[f.field_key][0]}`)
  const hasInvalidCustom = invalidCustomLabels.length > 0

  // Required custom fields must be filled before Save (booleans always have a value). Listed
  // with their tab beside Save, since a missing field may sit on a tab that isn't open.
  const missingRequiredLabels = useMemo(() => {
    const isMissing = (field) => {
      if (!field.is_required || field.field_type === 'boolean') return false
      const value = effectiveFieldValues[field.field_key]
      return value === undefined || value === null || String(value).trim() === ''
    }
    const withTab = (fields, tabLabel) => fields.filter(isMissing).map((f) => `${f.field_label} (${tabLabel})`)
    return [
      ...withTab(detailsFields, 'Details'),
      ...groups.flatMap((g) => withTab(g.fields, g.label)),
      ...withTab(customFields.fields, 'Custom Fields'),
    ]
  }, [detailsFields, groups, customFields.fields, effectiveFieldValues])
  const hasMissingRequired = missingRequiredLabels.length > 0

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this record.'
  )

  const routeKey = register?.register_key || registerId
  const listPath = `/simulator/local-registers/${routeKey}${isTemplate ? '?tab=templates' : ''}`
  // [Placeholders] still in the record or template (v1336).
  const placeholderSummary = useMemo(
    () => recordPlaceholderSummary(register, { title, description, field_values: effectiveFieldValues }),
    [register, title, description, effectiveFieldValues]
  )

  const handleFieldChange = (fieldKey, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const openAddCustomField = () => {
    customFields.loadLibrary()
    setAddFieldOpen(true)
  }
  const handleAttachCustomField = async (definitionId) => {
    const result = await customFields.attach(definitionId)
    if (result.success) {
      setAddFieldOpen(false)
      showSuccess({
        recordId: result.field?.label,
        operation: 'updated',
        message: `“${result.field?.label}” was added to ${register.label}.`,
      })
    }
    return result
  }
  const handleCreateCustomField = async (input) => {
    const result = await customFields.create(input)
    if (result.success) {
      setAddFieldOpen(false)
      showSuccess({
        recordId: result.field?.label,
        operation: 'created',
        message: `Custom field “${result.field?.label}” is now available to everyone in your organisation.`,
      })
    }
    return result
  }

  // Runbook steps (v1337, PRD D7): starting or finishing a step out of order warns; the user may carry on with a reason.
  const runbookStepWarnings = async () => {
    if (register?.behaviour?.type !== 'runbook_steps' || !refProjectId) return []
    if (!needsSequenceCheck(savedRecord?.status, status)) return []
    const steps = await listRecords(register.id, { scopeLevel: 'project', scopeEntityId: refProjectId })
    if (!steps.success) return []
    return sequenceWarnings({ id: savedRecord?.id || 'new', title: title.trim(), field_values: calculatedValues }, steps.data)
  }

  const handleSave = async (overrideReason) => {
    const reason = typeof overrideReason === 'string' ? overrideReason : ''
    if (!title.trim() || hasMissingRequired || hasInvalidCustom) return
    setSaving(true)
    setSaveError('')
    if (isTemplate) {
      const result = await updateTemplate(simDb, {
        templateId,
        name: templateName.trim(),
        description: templateDescription.trim(),
        recordTitle: title.trim(),
        recordDescription: description.trim() || null,
        fieldValues: calculatedValues,
      })
      setSaving(false)
      if (!result.success) {
        setSaveError(result.message || 'The template could not be saved.')
        return
      }
      showSuccess({
        recordId: result.data?.display_id || templateName.trim(),
        operation: 'updated',
        message: `Template “${templateName.trim()}” saved (version ${result.data?.version || ''}).`,
        onOk: () => navigate(listPath, { replace: true }),
      })
      return
    }
    if (!reason) {
      const warnings = await runbookStepWarnings()
      if (warnings.length) {
        setSaving(false)
        setSequenceCheck(warnings)
        return
      }
    }
    const savedValues = reason
      ? { ...calculatedValues, sequence_override_reason: appendOverrideReason(calculatedValues.sequence_override_reason, reason) }
      : calculatedValues
    setSequenceCheck(null)
    const payload = { title: title.trim(), description: description.trim() || null, status, fieldValues: savedValues }

    if (!isEdit) {
      // Resolve which entity this record belongs to: the register's own scope for a
      // member-created register, or the create link's query params for a system-defined one.
      const scopeLevel = register?.is_system_defined ? queryScopeLevel : register?.scope_level
      const scopeEntityId = register?.is_system_defined
        ? queryScopeEntityId
        : register?.scope_portfolio_id || register?.scope_programme_id || register?.scope_project_id || null
      if (scopeLevel === 'portfolio') payload.recordPortfolioId = scopeEntityId
      else if (scopeLevel === 'programme') payload.recordProgrammeId = scopeEntityId
      else if (scopeLevel === 'project') payload.recordProjectId = scopeEntityId

      // sim.local_register_records.is_system_register must match where registerId came from
      // (public.local_registers vs sim.local_registers) — see localRegisterService.js.
      payload.isSystemRegister = !!register?.is_system_defined
    }

    const result = isEdit ? await updateRecord(recordId, payload) : await createRecord(register.id, payload)
    setSaving(false)
    if (!result.success) {
      setSaveError(result.error || result.message || 'The record could not be saved.')
      return
    }

    showSuccess({
      recordId: isEdit ? recordId : result.data?.display_id || result.data?.id,
      operation: isEdit ? 'updated' : 'created',
      onOk: () => navigate(listPath, { replace: true }),
    })
  }

  const handleCancel = () => {
    if (isDirty) {
      confirmDiscard(() => navigate(listPath))
    } else {
      requestNavigation(listPath)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!register) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Register not found.</div>
  }

  const exportDocument = async (format, branding) => {
    try {
      await exportRegisterRecordDocument(simDb, {
        format, register, record: exportRecord, customFields: customFields.fields, settings: regionalSettings, branding,
        accountId: templateAccountId,
      })
    } catch (error) {
      toastNotify.error(error?.message || 'Failed to build the document')
    }
  }
  const buildDocumentPdf = (branding) => buildRegisterRecordDocumentPdfBlob(simDb, {
    register, record: exportRecord, customFields: customFields.fields, settings: regionalSettings, branding,
    accountId: templateAccountId,
  })

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {register.label}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isTemplate ? `Edit template — ${templateName || register.label}` : isEdit ? `Edit ${register.label}` : `New ${register.label}`}
        </h1>
        {!isTemplate && exportData && (
          <div className="flex flex-wrap items-center gap-2">
            <ExportRecordButtons
              sections={exportData.sections}
              record={exportData.record}
              baseFilename={exportData.baseFilename}
              onExportDocument={register.is_document ? exportDocument : null}
              onBuildDocumentPdf={register.is_document ? buildDocumentPdf : null}
            />
            {isEdit && savedRecord && (
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    toastNotify.error('Save the record first, then save it as a template.')
                    return
                  }
                  setTemplateDialogOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <LayoutTemplate className="h-4 w-4" />
                Save as template
              </button>
            )}
            {isEdit && (
              <button
                type="button"
                aria-current="page"
                title="You are editing this record"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        )}
      </div>
      {isTemplate && template && (
        <p className="-mt-4 text-sm text-gray-500 dark:text-gray-400">
          {template.template_scope === 'system' ? 'System template (read-only)' : 'Organisation template'} · version {template.version}
          {template.display_id ? ` · ${template.display_id}` : ''}
        </p>
      )}

      <PlaceholderBanner summary={placeholderSummary} />

      {locked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          This document is locked for sign-off and cannot be changed. To make changes, open it and use Restart sign-off on the Sign-off tab.
        </p>
      )}

      <DetailAuditTabList
        activeTab={shownTab}
        onChange={setActiveTab}
        tabs={buildRegisterTabs(groups, { includeCustomFields: !isTemplate })}
        ariaLabel={`${register.label} sections`}
      />

      {shownTab === AUDIT_TAB ? (
        <LocalRegisterAuditPanel register={register} record={savedRecord} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        {shownTab === DETAILS_TAB && (
        <>
        {isTemplate && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                aria-label="Template name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template description</label>
              <input
                type="text"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                aria-label="Template description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isTemplate ? 'Title of new records *' : 'Title *'}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        {!isTemplate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          >
            {selectableRecordStatuses(register, savedRecord?.status).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          {register.is_document && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">In Review and Approved are set by sign-off (Sign-off tab on the record).</p>
          )}
        </div>
        )}
        </>
        )}

        {shownTab === CUSTOM_FIELDS_TAB && (
          <RegisterCustomFieldsHeader
            count={customFields.used}
            limit={customFields.limit}
            loading={customFields.loading}
            error={customFields.error}
            onAdd={addFieldOpen ? null : openAddCustomField}
            onManage={customFields.canManage ? () => navigate(customFields.managePath) : null}
          />
        )}

        {/* Non-modal (rule 65): opens inline so the record being edited stays on screen. */}
        {shownTab === CUSTOM_FIELDS_TAB && (
          <AddRegisterCustomFieldPanel
            isOpen={addFieldOpen}
            onClose={() => setAddFieldOpen(false)}
            registerLabel={register.label}
            library={customFields.library}
            libraryLoading={customFields.libraryLoading}
            count={customFields.used}
            limit={customFields.limit}
            onAttach={handleAttachCustomField}
            onCreate={handleCreateCustomField}
          />
        )}

        {(shownTab === DETAILS_TAB
          ? detailsFields
          : shownTab === CUSTOM_FIELDS_TAB
            ? customFields.fields
            : groups.find((g) => g.value === shownTab)?.fields || []
        ).map((field) => (
          <div key={field.id} className={['multi_line', 'long_text', 'table', 'linked_records'].includes(field.field_type) ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.field_label} {field.is_required && '*'}
            </label>
            <RegisterFieldInput
              field={field}
              settings={regionalSettings}
              value={calculatedValues[field.field_key]}
              onChange={(value) => handleFieldChange(field.field_key, value)}
              loadRecordOptions={loadRecordOptions}
            />
            {field.is_custom && customFieldHint(field) && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{customFieldHint(field)}</p>
            )}
            {customFieldErrors[field.field_key]?.map((message) => (
              <p key={message} className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
            ))}
          </div>
        ))}
      </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving || locked || !title.trim() || hasMissingRequired || hasInvalidCustom || (isTemplate && (!templateName.trim() || template?.template_scope === 'system'))}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      {(!title.trim() || hasMissingRequired) && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Required to save: {[...(!title.trim() ? ['Title (Details)'] : []), ...missingRequiredLabels].join(', ')}
        </p>
      )}
      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{saveError}</p>
      )}
      {hasInvalidCustom && (
        <p className="text-sm text-red-600 dark:text-red-400">Fix before saving: {invalidCustomLabels.join('; ')}</p>
      )}
      {templateDialogOpen && (
        <SaveAsTemplateDialog
          isOpen
          onClose={() => !savingTemplate && setTemplateDialogOpen(false)}
          defaultName={title}
          organisationTemplates={templateRights.orgTemplates}
          busy={savingTemplate}
          onSave={handleSaveAsTemplate}
        />
      )}
      {modal}
      <SequenceWarningDialog
        isOpen={Boolean(sequenceCheck)}
        warnings={sequenceCheck || []}
        busy={saving}
        onCancel={() => setSequenceCheck(null)}
        onConfirm={(r) => handleSave(r)}
      />
    </div>
  )
}
