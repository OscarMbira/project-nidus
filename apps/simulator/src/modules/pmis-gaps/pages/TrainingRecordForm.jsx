/**
 * Training Tracker (GAP-20) — member training record create/edit form. v963 Phase 14
 * (Simulator port). Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * TrainingRecordForm.jsx. Always sim schema (simDb.auth.getUser() for the record owner).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { simDb } from '@nidus/supabase'
import {
  getMemberTrainingRecord,
  createMemberTrainingRecord,
  updateMemberTrainingRecord,
  listCertifications,
} from '../services/trainingService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function TrainingRecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = isEdit ? '../..' : '..'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [certifications, setCertifications] = useState([])
  const [form, setForm] = useState({
    certification_id: '',
    record_type: 'certification',
    title: '',
    issue_date: '',
    expiry_date: '',
    completion_status: 'in_progress',
    notes: '',
  })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const certResult = await listCertifications()
      if (cancelled) return
      setCertifications(certResult.data || [])

      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        setLoading(false)
        return
      }
      const result = await getMemberTrainingRecord(id)
      if (cancelled) return
      if (result.success) {
        const r = result.data
        const next = {
          certification_id: r.certification_id || '',
          record_type: r.record_type || 'certification',
          title: r.title || '',
          issue_date: r.issue_date || '',
          expiry_date: r.expiry_date || '',
          completion_status: r.completion_status || 'in_progress',
          notes: r.notes || '',
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
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this training record.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleCertificationChange = async (certId) => {
    handleChange('certification_id', certId)
    if (!certId) return
    const cert = certifications.find((c) => c.id === certId)
    if (cert && !form.title.trim()) handleChange('title', cert.certification_name)
    if (cert?.validity_months && form.issue_date) {
      const issue = new Date(form.issue_date)
      issue.setMonth(issue.getMonth() + cert.validity_months)
      handleChange('expiry_date', issue.toISOString().slice(0, 10))
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      certification_id: form.certification_id || null,
      record_type: form.record_type,
      title: form.title.trim(),
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      completion_status: form.completion_status,
      notes: form.notes.trim() || null,
    }
    if (!isEdit) {
      const {
        data: { user },
      } = await simDb.auth.getUser()
      payload.user_id = user?.id
    }
    const result = isEdit ? await updateMemberTrainingRecord(id, payload) : await createMemberTrainingRecord(payload)
    setSaving(false)
    if (!result.success) return
    showSuccess({
      recordId: form.title,
      operation: isEdit ? 'updated' : 'created',
      onOk: () => navigate(backPath, { replace: true }),
    })
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(backPath))
    else requestNavigation(backPath)
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to My Training Records
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Training Record' : 'New Training Record'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification (optional)</label>
          <select value={form.certification_id} onChange={(e) => handleCertificationChange(e.target.value)} className={inputClass}>
            <option value="">— None / free-text below —</option>
            {certifications.map((c) => <option key={c.id} value={c.id}>{c.certification_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
          <input type="text" value={form.title} onChange={(e) => handleChange('title', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={form.record_type} onChange={(e) => handleChange('record_type', e.target.value)} className={inputClass}>
              <option value="certification">Certification</option>
              <option value="training">Training</option>
              <option value="development_plan">Development plan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={form.completion_status} onChange={(e) => handleChange('completion_status', e.target.value)} className={inputClass}>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not started</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue date</label>
            <input type="date" value={form.issue_date} onChange={(e) => handleChange('issue_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
