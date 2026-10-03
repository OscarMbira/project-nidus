/**
 * Local Register Engine — no-code register definition builder (v931). Reached contextually
 * from whatever PMO/Portfolio/Programme/Project space the user has creation rights in (PRD
 * decision 5/6) via scopeLevel/scopeEntityId/scopeLabel query params — not confined to one
 * admin settings screen. Routed page per rule 65 (not a modal).
 */
import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { createRegisterDefinition } from '../../services/localRegisterService'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'user_picker', label: 'Person' },
]

export function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function RegisterDefinitionBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, modal } = useSuccessModal()

  const scopeLevel = searchParams.get('scopeLevel') || 'project'
  const scopeEntityId = searchParams.get('scopeEntityId') || null
  const scopeLabel = searchParams.get('scopeLabel') || ''

  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusWorkflow, setStatusWorkflow] = useState([{ key: 'open', label: 'Open' }])
  const [fields, setFields] = useState([])

  const registerKey = useMemo(() => slugify(label), [label])

  const addStatus = () => setStatusWorkflow((prev) => [...prev, { key: '', label: '' }])
  const updateStatus = (index, patch) =>
    setStatusWorkflow((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const removeStatus = (index) => setStatusWorkflow((prev) => prev.filter((_, i) => i !== index))

  const addField = () =>
    setFields((prev) => [...prev, { fieldKey: '', fieldLabel: '', fieldType: 'text', isRequired: false, dropdownOptions: [] }])
  const updateField = (index, patch) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  const removeField = (index) => setFields((prev) => prev.filter((_, i) => i !== index))
  const moveField = (index, direction) => {
    setFields((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const canSave =
    label.trim().length > 0 &&
    statusWorkflow.length > 0 &&
    statusWorkflow.every((s) => s.key.trim() && s.label.trim()) &&
    fields.every((f) => f.fieldLabel.trim())

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const accountId = await getCurrentUserAccountId()
    const params = {
      registerKey: registerKey || `register_${Date.now()}`,
      label: label.trim(),
      description: description.trim() || null,
      scopeLevel,
      accountId,
      statusWorkflow,
      fields: fields.map((f, index) => ({
        fieldKey: f.fieldKey.trim() || slugify(f.fieldLabel),
        fieldLabel: f.fieldLabel.trim(),
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        displayOrder: index,
        dropdownOptions: f.fieldType === 'dropdown' ? f.dropdownOptions : null,
      })),
    }
    if (scopeLevel === 'portfolio') params.scopePortfolioId = scopeEntityId
    else if (scopeLevel === 'programme') params.scopeProgrammeId = scopeEntityId
    else if (scopeLevel === 'project') params.scopeProjectId = scopeEntityId

    const result = await createRegisterDefinition(params)
    setSaving(false)
    if (!result.success) return

    showSuccess({
      recordId: result.data?.register_key,
      operation: 'created',
      onOk: () => navigate(`/platform/local-registers/${result.data.id}`, { replace: true }),
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Local Register</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {scopeLabel ? `Scoped to ${scopeLabel} (${scopeLevel})` : `Scoped to ${scopeLevel}`}
        </p>
      </div>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Register Name *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Client Onboarding Checklist"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Status Workflow</h2>
          <button type="button" onClick={addStatus} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
            <Plus className="h-4 w-4" /> Add status
          </button>
        </div>
        {statusWorkflow.map((s, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
            <input
              type="text"
              value={s.label}
              onChange={(e) => updateStatus(index, { label: e.target.value, key: slugify(e.target.value) })}
              placeholder="Status label (e.g. In Review)"
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
            {statusWorkflow.length > 1 && (
              <button type="button" onClick={() => removeStatus(index)} aria-label="Remove status">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900 dark:text-white">Fields</h2>
          <button type="button" onClick={addField} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
            <Plus className="h-4 w-4" /> Add field
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-sm text-gray-400">Every register already has Title, Description, Status, and Owner — add fields beyond those here.</p>
        )}
        {fields.map((f, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="text-xs disabled:opacity-30">▲</button>
              <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="text-xs disabled:opacity-30">▼</button>
            </div>
            <input
              type="text"
              value={f.fieldLabel}
              onChange={(e) => updateField(index, { fieldLabel: e.target.value })}
              placeholder="Field label"
              className="flex-1 min-w-[10rem] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
            <select
              value={f.fieldType}
              onChange={(e) => updateField(index, { fieldType: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={f.isRequired} onChange={(e) => updateField(index, { isRequired: e.target.checked })} />
              Required
            </label>
            {f.fieldType === 'dropdown' && (
              <input
                type="text"
                value={(f.dropdownOptions || []).map((o) => o.label).join(', ')}
                onChange={(e) =>
                  updateField(index, {
                    dropdownOptions: e.target.value.split(',').map((v) => v.trim()).filter(Boolean).map((v) => ({ value: slugify(v), label: v })),
                  })
                }
                placeholder="Options, comma separated"
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />
            )}
            <button type="button" onClick={() => removeField(index)} aria-label="Remove field">
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Creating…' : 'Create Register'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      {modal}
    </div>
  )
}
