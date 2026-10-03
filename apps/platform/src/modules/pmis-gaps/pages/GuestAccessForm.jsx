/**
 * Guest Access (GAP-19) — invite (create) / edit-permissions form. v963 Phase 13.
 * Security: the access token is generated, hashed, and shown in plaintext exactly
 * once — in the success modal right after invite — reusing the modal's built-in
 * copy-to-clipboard "recordId" slot for the token itself. It is never shown again
 * after this screen closes (see GuestAccessDetailPage's masked reference).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlatformProjectId } from '../../../hooks/usePlatformProjectId'
import { getGuestCollaborator, inviteGuest, updateGuestPermissions } from '../services/guestAccessService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function GuestAccessForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id
  const backPath = '../..'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ guest_email: '', guest_name: '', permission_level: 'view', expires_at: '', is_active: true })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isEdit) {
        setInitialSnapshot(JSON.stringify(form))
        return
      }
      setLoading(true)
      const result = await getGuestCollaborator(id)
      if (cancelled) return
      if (result.success) {
        const g = result.data
        const next = {
          guest_email: g.guest_email || '',
          guest_name: g.guest_name || '',
          permission_level: g.permission_level || 'view',
          expires_at: g.expires_at ? g.expires_at.slice(0, 10) : '',
          is_active: g.is_active !== false,
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
  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this guest.')

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!isEdit && !form.guest_email.trim()) return
    setSaving(true)

    if (isEdit) {
      const result = await updateGuestPermissions(id, {
        guest_name: form.guest_name.trim() || null,
        permission_level: form.permission_level,
        expires_at: form.expires_at || null,
        is_active: form.is_active,
      })
      setSaving(false)
      if (!result.success) return
      showSuccess({ recordId: form.guest_email, operation: 'updated', onOk: () => navigate(backPath, { replace: true }) })
      return
    }

    const result = await inviteGuest(projectId, {
      guest_email: form.guest_email.trim(),
      guest_name: form.guest_name.trim() || null,
      permission_level: form.permission_level,
      expires_at: form.expires_at || null,
    })
    setSaving(false)
    if (!result.success) return

    showSuccess({
      recordId: result.data.plainToken,
      operation: 'created',
      message: `${form.guest_email} has been invited. Copy this access token now — for security it will never be shown again.`,
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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Guest Access
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Guest Permissions' : 'Invite Guest'}</h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
          <input type="email" value={form.guest_email} onChange={(e) => handleChange('guest_email', e.target.value)} disabled={isEdit} className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input type="text" value={form.guest_name} onChange={(e) => handleChange('guest_name', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permission level</label>
            <select value={form.permission_level} onChange={(e) => handleChange('permission_level', e.target.value)} className={inputClass}>
              <option value="view">View only</option>
              <option value="comment">Can comment</option>
              <option value="limited_edit">Limited edit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires</label>
            <input type="date" value={form.expires_at} onChange={(e) => handleChange('expires_at', e.target.value)} className={inputClass} />
          </div>
        </div>
        {isEdit && (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving || (!isEdit && !form.guest_email.trim())} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Send Invite'}
        </button>
        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
      {modal}
    </div>
  )
}
