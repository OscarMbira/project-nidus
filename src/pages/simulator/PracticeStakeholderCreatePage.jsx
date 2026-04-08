/**
 * Practice Stakeholder Create – Simulator form with draft queue support.
 * Route: /simulator/practice-stakeholders/create
 * Resume from draft: location.state { isResumingDraft, formData, draftId }
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useDraftQueue } from '../../hooks/useDraftQueue'
import { createPracticeStakeholder } from '../../services/sim/practiceStakeholderService'

const DEFAULT_FORM = {
  stakeholder_name: '',
  stakeholder_title: '',
  stakeholder_organization: '',
  stakeholder_department: '',
  stakeholder_type: 'internal',
  stakeholder_status: 'active',
  project_role: '',
  email: '',
  phone: '',
  notes: '',
  practice_project_id: '',
}

export default function PracticeStakeholderCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const urlProjectId = searchParams.get('projectId') || location.state?.projectId || ''
  const isResumingDraft = location.state?.isResumingDraft === true
  const draftFormData = location.state?.formData || null

  const [formData, setFormData] = useState(() => {
    if (draftFormData && typeof draftFormData === 'object') {
      return { ...DEFAULT_FORM, ...draftFormData }
    }
    return { ...DEFAULT_FORM, practice_project_id: urlProjectId }
  })
  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  const projectId = urlProjectId || formData.practice_project_id || ''

  const {
    saveDraft,
    canCreateDraft,
    existingDraftInfo,
    dismissExistingDraft,
    resumeDraft,
  } = useDraftQueue('practice_stakeholder', null, {
    projectId: projectId || undefined,
    formRoute: '/simulator/practice-stakeholders/create',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSaveAsDraft = async () => {
    if (!canCreateDraft) return
    setSavingDraft(true)
    try {
      await saveDraft(
        { ...formData, practice_project_id: projectId || formData.practice_project_id },
        {
          projectId: projectId || undefined,
          entityTitle: formData.stakeholder_name || 'Untitled practice stakeholder',
        }
      )
    } catch (e) {
      console.error(e)
      alert(e?.message || 'Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleRestoreDraft = async () => {
    try {
      const data = await resumeDraft()
      if (data) setFormData((prev) => ({ ...prev, ...data }))
      dismissExistingDraft()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectId) {
      alert('Select a practice project first.')
      return
    }
    if (!formData.stakeholder_name?.trim()) {
      alert('Stakeholder name is required.')
      return
    }
    setSaving(true)
    try {
      const result = await createPracticeStakeholder(projectId, {
        stakeholder_name: formData.stakeholder_name.trim(),
        stakeholder_title: formData.stakeholder_title?.trim() || null,
        stakeholder_organization: formData.stakeholder_organization?.trim() || null,
        stakeholder_department: formData.stakeholder_department?.trim() || null,
        stakeholder_type: formData.stakeholder_type || 'internal',
        stakeholder_status: formData.stakeholder_status || 'active',
        project_role: formData.project_role?.trim() || null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        notes: formData.notes?.trim() || null,
      })
      if (result.success) {
        navigate('/simulator/practice-stakeholders/register', {
          replace: true,
          state: { projectId: projectId || formData.practice_project_id, toast: { type: 'success', message: `Practice stakeholder created. ID: ${result.data?.id}` } },
        })
      } else {
        alert(result.error || 'Failed to create')
      }
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to create practice stakeholder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/simulator/practice-stakeholders/register' + (projectId ? `?projectId=${projectId}` : ''))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Practice Stakeholder</h1>
      </div>

      {existingDraftInfo && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm text-amber-800 dark:text-amber-200">You have a saved draft. Restore it?</span>
          <div className="flex gap-2">
            <button type="button" onClick={handleRestoreDraft} className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg">Restore</button>
            <button type="button" onClick={dismissExistingDraft} className="px-3 py-1.5 text-sm border border-amber-600 text-amber-700 dark:text-amber-300 rounded-lg">Dismiss</button>
          </div>
        </div>
      )}

      {!projectId && (
        <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
          Go back to the register and select a practice project, then click &quot;Add Stakeholder&quot; to create one for that project.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input name="stakeholder_name" value={formData.stakeholder_name} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Stakeholder name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization</label>
          <input name="stakeholder_organization" value={formData.stakeholder_organization} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Organization" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select name="stakeholder_type" value={formData.stakeholder_type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="internal">Internal</option>
              <option value="external">External</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="partner">Partner</option>
              <option value="regulator">Regulator</option>
              <option value="community">Community</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select name="stakeholder_status" value={formData.stakeholder_status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="departed">Departed</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project role</label>
          <input name="project_role" value={formData.project_role} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g. Sponsor" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Notes" />
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={() => navigate('/simulator/practice-stakeholders/register' + (projectId ? `?projectId=${projectId}` : ''))} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="button" onClick={handleSaveAsDraft} disabled={savingDraft || !canCreateDraft} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {savingDraft ? 'Saving draft...' : 'Save as Draft'}
          </button>
          <button type="submit" disabled={saving || !projectId || !formData.stakeholder_name?.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
