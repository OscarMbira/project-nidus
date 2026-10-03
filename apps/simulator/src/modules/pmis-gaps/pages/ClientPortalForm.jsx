/**
 * Client Portal (GAP-07) — create/edit form. v963 Phase 10 (Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/ClientPortalForm.jsx.
 * practice_project_id is required (client_portal_configs.practice_project_id NOT NULL) so the
 * project picker is mandatory here. The project link is fixed at creation — not editable
 * afterwards. Always sim schema.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getPortal, createPortal, updatePortal, listProjectOptions } from '../../../services/clientPortalService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function ClientPortalForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = isEdit ? '../..' : '..'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ portal_name: '', practice_project_id: '', is_active: true })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    listProjectOptions().then((rows) => { if (!cancelled) setProjects(rows || []) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        return
      }
      setLoading(true)
      const p = await getPortal(id)
      if (cancelled) return
      if (p) {
        const next = { portal_name: p.portal_name || '', practice_project_id: p.practice_project_id || '', is_active: p.is_active !== false }
        setForm(next)
        setInitialSnapshot(JSON.stringify(next))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const isDirty = useMemo(() => initialSnapshot !== null && JSON.stringify(form) !== initialSnapshot, [form, initialSnapshot])
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this client portal.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.portal_name.trim() || (!isEdit && !form.practice_project_id)) return
    setSaving(true)
    try {
      const record = isEdit
        ? await updatePortal(id, { portal_name: form.portal_name.trim(), is_active: form.is_active })
        : await createPortal({ portal_name: form.portal_name.trim(), practice_project_id: form.practice_project_id, is_active: true })
      setSaving(false)
      showSuccess({
        recordId: record?.portal_name || form.portal_name,
        operation: isEdit ? 'updated' : 'created',
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
        Back to Client Portal
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Client Portal' : 'New Client Portal'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portal name *</label>
          <input type="text" value={form.portal_name} onChange={(e) => handleChange('portal_name', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
          <select value={form.practice_project_id} onChange={(e) => handleChange('practice_project_id', e.target.value)} disabled={isEdit} className={`${inputClass} disabled:opacity-60`}>
            <option value="">Select a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        {isEdit && (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || !form.portal_name.trim() || (!isEdit && !form.practice_project_id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
