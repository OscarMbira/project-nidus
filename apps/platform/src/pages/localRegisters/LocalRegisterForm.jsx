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
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { getRecord, createRecord, updateRecord } from '../../services/localRegisterRecordService'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'

function FieldInput({ field, value, onChange }) {
  const commonClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

  if (field.field_type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
      </label>
    )
  }
  if (field.field_type === 'dropdown') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={commonClass}>
        <option value="">Select…</option>
        {(field.dropdown_options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }
  if (field.field_type === 'date') {
    return <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={commonClass} />
  }
  if (field.field_type === 'number' || field.field_type === 'currency') {
    return (
      <input
        type="number"
        step={field.field_type === 'currency' ? '0.01' : 'any'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={commonClass}
      />
    )
  }
  // text, user_picker (plain text entry for v1 — a real user picker is a future extension)
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={commonClass} />
}

export default function LocalRegisterForm() {
  const { registerId, recordId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!recordId
  const { projectId: contextProjectId } = usePlatformProjectId()

  // Only meaningful when creating a record for a system-defined register (it carries no scope
  // of its own, v932) — e.g. reached from a project's own "Permits" list with
  // ?scopeLevel=project&scopeEntityId=<id>. Ignored when editing (the record already has its
  // own scope) or for a member-created register (its own scope_*_id is used instead).
  //
  // Every industry-pack menu item's own leaf (v947-v960) links straight to the list page with
  // no query string, so the list page's own resolved project (via usePlatformProjectId()) is
  // what actually reaches here through its "New record" link. This fallback additionally
  // covers a direct/bookmarked visit to the create URL with no query string at all — without
  // it, the record saves with no project id (see LocalRegisterListPage.jsx for the full story,
  // found live 2026-09-10 while auditing the ICT industry pack).
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

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this record.'
  )

  const routeKey = register?.register_key || registerId
  const listPath = `/platform/local-registers/${routeKey}`

  const handleFieldChange = (fieldKey, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload = { title: title.trim(), description: description.trim() || null, status, fieldValues }

    if (!isEdit) {
      // Resolve which entity this record belongs to: the register's own scope for a
      // member-created register, or the create link's query params for a system-defined one —
      // falling back to the current project context when the register is project-scoped and no
      // query params were supplied (see the fallback comment above the query param reads).
      const isProjectScoped = register?.scope_level === 'project'
      const effectiveScopeLevel =
        queryScopeLevel || (register?.is_system_defined && isProjectScoped ? 'project' : '')
      const effectiveScopeEntityId =
        queryScopeEntityId || (register?.is_system_defined && isProjectScoped ? contextProjectId || '' : '')
      const scopeLevel = register?.is_system_defined ? effectiveScopeLevel : register?.scope_level
      const scopeEntityId = register?.is_system_defined
        ? effectiveScopeEntityId
        : register?.scope_portfolio_id || register?.scope_programme_id || register?.scope_project_id || null
      if (scopeLevel === 'portfolio') payload.recordPortfolioId = scopeEntityId
      else if (scopeLevel === 'programme') payload.recordProgrammeId = scopeEntityId
      else if (scopeLevel === 'project') payload.recordProjectId = scopeEntityId

      // Required by submit_for_authorisation()'s dynamic account_id lookup (v937) — every
      // record carries the creating user's own account, not one derived from the scope entity.
      payload.accountId = await getCurrentUserAccountId()
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
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

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        <div>
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

        {(register.fields || []).map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.field_label} {field.is_required && '*'}
            </label>
            <FieldInput
              field={field}
              value={fieldValues[field.field_key]}
              onChange={(value) => handleFieldChange(field.field_key, value)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim()}
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
      {modal}
    </div>
  )
}
