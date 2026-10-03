/**
 * Public Intake Forms (GAP-06) — field definitions sub-view. v963 Phase 9.
 * Nested under a form (routed page per rule 65 — :id/fields). Field definitions are small
 * (key/label/type/required/order) so this page manages them inline — add form + editable
 * list — rather than a further set of dedicated field-level create/edit routes (rule 62:
 * keep the UX simple, proportionate to the size of the thing being edited).
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getForm, listFields, createField, updateField, deleteField } from '../../../services/intakeFormService'

const FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox', 'date', 'email', 'number']
const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function IntakeFormFieldsPage({ sim = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ field_key: '', field_label: '', field_type: 'text', is_required: false })

  const load = useCallback(async () => {
    setLoading(true)
    const [f, fl] = await Promise.all([getForm(id, { sim }), listFields(id, { sim })])
    setForm(f)
    setFields(fl)
    setLoading(false)
  }, [id, sim])

  useEffect(() => { load() }, [load])

  const handleAddField = async () => {
    if (!draft.field_key.trim() || !draft.field_label.trim()) return
    setSaving(true)
    try {
      await createField({
        form_id: id,
        field_key: draft.field_key.trim(),
        field_label: draft.field_label.trim(),
        field_type: draft.field_type,
        is_required: draft.is_required,
        sort_order: fields.length,
      }, { sim })
      setDraft({ field_key: '', field_label: '', field_type: 'text', is_required: false })
      await load()
      showSuccess({ recordId: draft.field_label, operation: 'created' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRequired = async (field) => {
    await updateField(field.id, { is_required: !field.is_required }, { sim })
    await load()
  }

  const handleDeleteField = async (field) => {
    await deleteField(field.id, { sim })
    await load()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!form) return <div className="p-8 text-gray-500 dark:text-gray-400">Intake form not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate(`../${id}`)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to {form.form_name}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fields — {form.form_name}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No fields defined yet — add the first one below.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 mb-4">
            {fields.map((field) => (
              <div key={field.id} className="flex items-center gap-3 py-2.5">
                <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{field.field_label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{field.field_key} · {field.field_type}</p>
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 shrink-0">
                  <input type="checkbox" checked={field.is_required} onChange={() => handleToggleRequired(field)} />
                  Required
                </label>
                <button type="button" onClick={() => handleDeleteField(field)} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 shrink-0" aria-label={`Delete ${field.field_label}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add a field</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="text" value={draft.field_label} onChange={(e) => setDraft((d) => ({ ...d, field_label: e.target.value }))} placeholder="Label" className={inputClass} />
            <input type="text" value={draft.field_key} onChange={(e) => setDraft((d) => ({ ...d, field_key: e.target.value.replace(/\s+/g, '_').toLowerCase() }))} placeholder="key_name" className={inputClass} />
            <select value={draft.field_type} onChange={(e) => setDraft((d) => ({ ...d, field_type: e.target.value }))} className={inputClass}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" onClick={handleAddField} disabled={saving || !draft.field_key.trim() || !draft.field_label.trim()} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </div>
      {modal}
    </div>
  )
}
