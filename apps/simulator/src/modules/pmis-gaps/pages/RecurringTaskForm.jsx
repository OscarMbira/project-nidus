/**
 * Recurring Tasks (GAP-08) — create/edit form. v963 Phase 11 (Simulator).
 * Mirrors apps/platform/src/modules/pmis-gaps/pages/RecurringTaskForm.jsx, adapted for
 * simDb / practice-project scoping (usePlanningProjectId, carried over from the list
 * page's `?projectId=` query param — see RecurringTaskListPage's "New Template" link).
 * Routed page per rule 65 (create/:id/edit, no modal).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import {
  getRecurringTaskTemplate,
  createRecurringTaskTemplate,
  updateRecurringTaskTemplate,
} from '../services/recurringTaskService'

const ENTITY_TYPES = ['task', 'risk_review', 'status_report', 'meeting', 'other']
const RECURRENCE_PATTERNS = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function RecurringTaskForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projectId = usePlanningProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = isEdit ? '../..' : '..'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    template_name: '',
    entity_type: 'task',
    recurrence_pattern: 'weekly',
    end_condition: 'never',
    max_occurrences: '',
    end_date: '',
    is_active: true,
    next_run_at: '',
    timezone: 'UTC',
  })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        return
      }
      setLoading(true)
      const result = await getRecurringTaskTemplate(id)
      if (cancelled) return
      if (result.success) {
        const t = result.data
        const next = {
          template_name: t.template_name || '',
          entity_type: t.entity_type || 'task',
          recurrence_pattern: t.recurrence_pattern || 'weekly',
          end_condition: t.end_condition || 'never',
          max_occurrences: t.max_occurrences ?? '',
          end_date: t.end_date || '',
          is_active: t.is_active !== false,
          next_run_at: t.schedule?.next_run_at ? t.schedule.next_run_at.slice(0, 16) : '',
          timezone: t.schedule?.timezone || 'UTC',
        }
        setForm(next)
        setInitialSnapshot(JSON.stringify(next))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const isDirty = useMemo(() => initialSnapshot !== null && JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot])
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this recurring task template.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.template_name.trim()) return
    setSaving(true)
    const payload = {
      template_name: form.template_name.trim(),
      entity_type: form.entity_type,
      recurrence_pattern: form.recurrence_pattern,
      end_condition: form.end_condition,
      max_occurrences: form.end_condition === 'after_count' && form.max_occurrences ? Number(form.max_occurrences) : null,
      end_date: form.end_condition === 'until_date' && form.end_date ? form.end_date : null,
      is_active: form.is_active,
      next_run_at: form.next_run_at ? new Date(form.next_run_at).toISOString() : null,
      timezone: form.timezone || 'UTC',
    }
    const result = isEdit
      ? await updateRecurringTaskTemplate(id, payload)
      : await createRecurringTaskTemplate(projectId, payload)
    setSaving(false)
    if (!result.success) return

    showSuccess({
      recordId: isEdit ? id : result.data?.id,
      operation: isEdit ? 'updated' : 'created',
      onOk: () => navigate(backPath, { replace: true }),
    })
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(backPath))
    else requestNavigation(backPath)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  if (!isEdit && !projectId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Select a practice project first, then create a recurring task template.</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Recurring Tasks
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Recurring Task Template' : 'New Recurring Task Template'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template name *</label>
          <input type="text" value={form.template_name} onChange={(e) => handleChange('template_name', e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity type</label>
            <select value={form.entity_type} onChange={(e) => handleChange('entity_type', e.target.value)} className={inputClass}>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recurrence pattern</label>
            <select value={form.recurrence_pattern} onChange={(e) => handleChange('recurrence_pattern', e.target.value)} className={inputClass}>
              {RECURRENCE_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next run</label>
            <input type="datetime-local" value={form.next_run_at} onChange={(e) => handleChange('next_run_at', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <input type="text" value={form.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className={inputClass} placeholder="UTC" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ends</label>
          <select value={form.end_condition} onChange={(e) => handleChange('end_condition', e.target.value)} className={inputClass}>
            <option value="never">Never</option>
            <option value="after_count">After a number of occurrences</option>
            <option value="until_date">On a specific date</option>
          </select>
        </div>

        {form.end_condition === 'after_count' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of occurrences</label>
            <input type="number" min="1" value={form.max_occurrences} onChange={(e) => handleChange('max_occurrences', e.target.value)} className={inputClass} />
          </div>
        )}
        {form.end_condition === 'until_date' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
            <input type="date" value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} className={inputClass} />
          </div>
        )}

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || !form.template_name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
