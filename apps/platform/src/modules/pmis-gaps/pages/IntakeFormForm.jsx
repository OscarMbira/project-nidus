/**
 * Public Intake Forms (GAP-06) — create/edit form. v963 Phase 9.
 * Routed page per rule 65 (create/:id/edit, no modal). project_id is optional (intake_forms
 * allows account-wide forms with no project link), so a "Project" picker replaces the URL-based
 * current-project context other gap features (Recurring Tasks, Guest Access) rely on.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getForm, createForm, updateForm, listProjectOptions } from '../../../services/intakeFormService'

const TARGET_ENTITY_TYPES = ['issue', 'risk', 'task', 'change', 'feedback', 'other']
const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function IntakeFormForm({ sim = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = isEdit ? '../..' : '..'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    form_name: '', form_code: '', target_entity_type: 'issue', project_id: '',
    is_active: true, active_from: '', active_to: '',
  })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    listProjectOptions({ sim }).then((rows) => { if (!cancelled) setProjects(rows || []) }).catch(() => {})
    return () => { cancelled = true }
  }, [sim])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        return
      }
      setLoading(true)
      const f = await getForm(id, { sim })
      if (cancelled) return
      if (f) {
        const next = {
          form_name: f.form_name || '',
          form_code: f.form_code || '',
          target_entity_type: f.target_entity_type || 'issue',
          project_id: f.project_id || '',
          is_active: f.is_active !== false,
          active_from: f.active_from || '',
          active_to: f.active_to || '',
        }
        setForm(next)
        setInitialSnapshot(JSON.stringify(next))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, sim])

  const isDirty = useMemo(() => initialSnapshot !== null && JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot])
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this intake form.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.form_name.trim() || !form.form_code.trim()) return
    setSaving(true)
    const payload = {
      form_name: form.form_name.trim(),
      form_code: form.form_code.trim(),
      target_entity_type: form.target_entity_type,
      project_id: form.project_id || null,
      is_active: form.is_active,
      active_from: form.active_from || null,
      active_to: form.active_to || null,
    }
    try {
      const record = isEdit
        ? await updateForm(id, payload, { sim })
        : await createForm(payload, { sim })
      setSaving(false)
      showSuccess({
        recordId: record?.form_code || form.form_code,
        operation: isEdit ? 'updated' : 'created',
        message: !isEdit ? `The public submission link uses token "${record?.public_token}" — manage it from the form's detail page.` : undefined,
        onOk: () => navigate(backPath, { replace: true }),
      })
    } catch {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(backPath))
    else requestNavigation(backPath)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Intake Forms
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Intake Form' : 'New Intake Form'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Form name *</label>
            <input type="text" value={form.form_name} onChange={(e) => handleChange('form_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Form code *</label>
            <input type="text" value={form.form_code} onChange={(e) => handleChange('form_code', e.target.value)} disabled={isEdit} className={`${inputClass} disabled:opacity-60`} placeholder="e.g. client-issue-intake" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Creates a</label>
            <select value={form.target_entity_type} onChange={(e) => handleChange('target_entity_type', e.target.value)} className={inputClass}>
              {TARGET_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project (optional)</label>
            <select value={form.project_id} onChange={(e) => handleChange('project_id', e.target.value)} className={inputClass}>
              <option value="">Account-wide (no project link)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active from</label>
            <input type="date" value={form.active_from} onChange={(e) => handleChange('active_from', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active to</label>
            <input type="date" value={form.active_to} onChange={(e) => handleChange('active_to', e.target.value)} className={inputClass} />
          </div>
        </div>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || !form.form_name.trim() || !form.form_code.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
      {modal}
    </div>
  )
}
