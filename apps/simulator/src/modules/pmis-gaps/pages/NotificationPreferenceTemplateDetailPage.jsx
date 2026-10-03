/**
 * Notification Preference Template — create/view/edit (GAP-21, v963 Phase 15, Simulator
 * port). Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * NotificationPreferenceTemplateDetailPage.jsx. Rule 65 dedicated routed page + rule 63.1
 * Audit tab. Route: :basePath/create · :basePath/:id · :basePath/:id/edit
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Bell } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import {
  NOTIFICATION_EVENT_CATEGORIES,
  NOTIFICATION_FREQUENCIES,
  getTemplate,
  createTemplate,
  updateTemplate,
} from '../services/notificationPreferencesService'

const BASE_PATH_DEFAULT = '/simulator/pmo/admin/notification-templates'

export default function NotificationPreferenceTemplateDetailPage({ basePath = BASE_PATH_DEFAULT, forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [template, setTemplate] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [templateName, setTemplateName] = useState('')
  const [roleName, setRoleName] = useState('')
  const [eventCategory, setEventCategory] = useState(NOTIFICATION_EVENT_CATEGORIES[0].value)
  const [channelInApp, setChannelInApp] = useState(true)
  const [channelEmail, setChannelEmail] = useState(true)
  const [channelPush, setChannelPush] = useState(false)
  const [frequency, setFrequency] = useState('instant')

  const load = useCallback(async () => {
    if (isCreate) {
      setLoading(false)
      return
    }
    setLoading(true)
    const row = await getTemplate(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setTemplate(row)
    setTemplateName(row.template_name || '')
    setRoleName(row.role_name || '')
    setEventCategory(row.event_category || NOTIFICATION_EVENT_CATEGORIES[0].value)
    setChannelInApp(!!row.channel_in_app)
    setChannelEmail(!!row.channel_email)
    setChannelPush(!!row.channel_push)
    setFrequency(row.frequency || 'instant')
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        templateName: template?.template_name || '',
        roleName: template?.role_name || '',
        eventCategory: template?.event_category || '',
        channelInApp: !!template?.channel_in_app,
        channelEmail: !!template?.channel_email,
        channelPush: !!template?.channel_push,
        frequency: template?.frequency || 'instant',
      }),
    [template]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    return (
      JSON.stringify({ templateName, roleName, eventCategory, channelInApp, channelEmail, channelPush, frequency }) !== baselineSnapshot
    )
  }, [loading, readOnly, templateName, roleName, eventCategory, channelInApp, channelEmail, channelPush, frequency, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved notification template changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!templateName.trim()) {
      setError('Template name is required')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { templateName, roleName, eventCategory, channelInApp, channelEmail, channelPush, frequency }
    try {
      if (isCreate) {
        await createTemplate(payload)
        setSaving(false)
        showSuccess({ recordId: templateName.trim(), operation: 'created', message: `"${templateName.trim()}" was created successfully.`, onOk: goToList })
      } else {
        await updateTemplate(id, payload)
        setSaving(false)
        showSuccess({ recordId: templateName.trim(), operation: 'updated', message: `"${templateName.trim()}" was updated successfully.`, onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading template…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Template not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Templates</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Notification Template' : readOnly ? 'View Notification Template' : 'Edit Notification Template'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <fieldset disabled={readOnly} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role (blank = all roles)</label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. project_manager"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event category</label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {NOTIFICATION_EVENT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={channelInApp} onChange={(e) => setChannelInApp(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  In-app
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  Email
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={channelPush} onChange={(e) => setChannelPush(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  Push
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {NOTIFICATION_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Create Template' : 'Save Changes'}
                </button>
              )}
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this template is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created this template, and how it is classified.">
                <AuditCard title="Identity" description="How this template is labelled.">
                  <AuditField label="Template name" value={templateName || template?.template_name} />
                  <AuditField label="Role" value={roleName || 'All roles'} />
                </AuditCard>
                <AuditCard title="Classification" description="What this template configures.">
                  <AuditField label="Event category" value={eventCategory} />
                  <AuditField label="Frequency" value={frequency} />
                </AuditCard>
                <AuditCard title="Record history" description="When this template was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={template?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={template?.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
