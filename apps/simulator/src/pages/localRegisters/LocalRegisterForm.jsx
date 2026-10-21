/**
 * Local Register Engine — generic create/edit form (v931). One input per field-config row,
 * switching on field_type. See projectplan/v931_local_register_engine_plan.md Phase 3.
 * Routed page per rule 65 (non-modal — create/edit are their own routes, not a dialog).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
import AddRegisterCustomFieldDialog from '@nidus/ui/AddRegisterCustomFieldDialog'
import { useRegisterCustomFields } from '../../lib/useRegisterCustomFields'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { getRecord, createRecord, updateRecord } from '../../services/localRegisterRecordService'

export default function LocalRegisterForm() {
  const { registerId, recordId } = useParams()
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
  const [register, setRegister] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [fieldValues, setFieldValues] = useState({})
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [savedRecord, setSavedRecord] = useState(null)
  const [activeTab, setActiveTab] = useState(DETAILS_TAB)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const registerResult = await getRegisterDefinition(registerId)
      if (cancelled) return
      setRegister(registerResult.data)
      const defaultStatus = registerResult.data?.status_workflow?.[0]?.key || ''

      if (isEdit) {
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
  }, [registerId, recordId, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ title, description, status, fieldValues }) !== initialSnapshot
  }, [title, description, status, fieldValues, initialSnapshot])

  // One tab per field_group (v1297); ungrouped fields stay on Details with Title/Description/Status.
  const { detailsFields, groups } = useMemo(() => groupRegisterFields(register?.fields), [register])

  // Organisation custom fields (v1311): values live in fieldValues under cf__<id>, so they save
  // with the record; the "Custom Fields" tab sits just before Audit details.
  const customFields = useRegisterCustomFields(register)
  const [addFieldOpen, setAddFieldOpen] = useState(false)

  // Required custom fields must be filled before Save (booleans always have a value). Listed
  // with their tab beside Save, since a missing field may sit on a tab that isn't open.
  const missingRequiredLabels = useMemo(() => {
    const isMissing = (field) => {
      if (!field.is_required || field.field_type === 'boolean') return false
      const value = fieldValues[field.field_key]
      return value === undefined || value === null || String(value).trim() === ''
    }
    const withTab = (fields, tabLabel) => fields.filter(isMissing).map((f) => `${f.field_label} (${tabLabel})`)
    return [
      ...withTab(detailsFields, 'Details'),
      ...groups.flatMap((g) => withTab(g.fields, g.label)),
      ...withTab(customFields.fields, 'Custom Fields'),
    ]
  }, [detailsFields, groups, customFields.fields, fieldValues])
  const hasMissingRequired = missingRequiredLabels.length > 0

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this record.'
  )

  const routeKey = register?.register_key || registerId
  const listPath = `/simulator/local-registers/${routeKey}`

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

  const handleSave = async () => {
    if (!title.trim() || hasMissingRequired) return
    setSaving(true)
    const payload = { title: title.trim(), description: description.trim() || null, status, fieldValues }

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
    if (!result.success) return

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

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isEdit ? `Edit ${register.label}` : `New ${register.label}`}
      </h1>

      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={buildRegisterTabs(groups, { includeCustomFields: true })}
        ariaLabel={`${register.label} sections`}
      />

      {activeTab === AUDIT_TAB ? (
        <LocalRegisterAuditPanel register={register} record={savedRecord} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        {activeTab === DETAILS_TAB && (
        <>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          >
            {(register.status_workflow || []).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        </>
        )}

        {activeTab === CUSTOM_FIELDS_TAB && (
          <RegisterCustomFieldsHeader
            count={customFields.used}
            limit={customFields.limit}
            loading={customFields.loading}
            error={customFields.error}
            onAdd={openAddCustomField}
            onManage={customFields.canManage ? () => navigate(customFields.managePath) : null}
          />
        )}

        {(activeTab === DETAILS_TAB
          ? detailsFields
          : activeTab === CUSTOM_FIELDS_TAB
            ? customFields.fields
            : groups.find((g) => g.value === activeTab)?.fields || []
        ).map((field) => (
          <div key={field.id} className={['multi_line', 'long_text'].includes(field.field_type) ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.field_label} {field.is_required && '*'}
            </label>
            <RegisterFieldInput
              field={field}
              value={fieldValues[field.field_key]}
              onChange={(value) => handleFieldChange(field.field_key, value)}
            />
          </div>
        ))}
      </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim() || hasMissingRequired}
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
      <AddRegisterCustomFieldDialog
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
      {modal}
    </div>
  )
}
