/**
 * Training Tracker (GAP-20) — certification catalog create/edit form. v963 Phase 14
 * (Simulator port). Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * TrainingCertificationForm.jsx. Always sim schema.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getCertification, createCertification, updateCertification } from '../services/trainingService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function TrainingCertificationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = isEdit ? '../..' : '..'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ certification_name: '', certification_code: '', issuing_body: '', validity_months: '' })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        return
      }
      setLoading(true)
      const result = await getCertification(id)
      if (cancelled) return
      if (result.success) {
        const c = result.data
        const next = {
          certification_name: c.certification_name || '',
          certification_code: c.certification_code || '',
          issuing_body: c.issuing_body || '',
          validity_months: c.validity_months ?? '',
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
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this certification.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.certification_name.trim()) return
    setSaving(true)
    const payload = {
      certification_name: form.certification_name.trim(),
      certification_code: form.certification_code.trim() || null,
      issuing_body: form.issuing_body.trim() || null,
      validity_months: form.validity_months ? Number(form.validity_months) : null,
    }
    const result = isEdit ? await updateCertification(id, payload) : await createCertification(payload)
    setSaving(false)
    if (!result.success) return
    showSuccess({
      recordId: result.data?.certification_code || form.certification_name,
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
        Back to Certification Catalog
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Certification' : 'New Certification'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification name *</label>
          <input type="text" value={form.certification_name} onChange={(e) => handleChange('certification_name', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
            <input type="text" value={form.certification_code} onChange={(e) => handleChange('certification_code', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issuing body</label>
            <input type="text" value={form.issuing_body} onChange={(e) => handleChange('issuing_body', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validity (months, blank = never expires)</label>
          <input type="number" min="0" value={form.validity_months} onChange={(e) => handleChange('validity_months', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || !form.certification_name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
