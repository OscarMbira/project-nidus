/**
 * Project Calendar — exception create/view/edit (Simulator, v963 PMIS Core Gap Closure —
 * Phase 4). Mirrors apps/platform/src/pages/schedule/ProjectCalendarExceptionDetail.jsx.
 * Routes: practice-projects/:projectId/schedule/calendar/exceptions/create ·
 *         practice-projects/:projectId/schedule/calendar/exceptions/:exceptionId ·
 *         practice-projects/:projectId/schedule/calendar/exceptions/:exceptionId/edit
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import {
  getCalendarException,
  createCalendarException,
  updateCalendarException,
} from '../../../services/projectCalendarService'

/** @param {{ forceEdit?: boolean }} props */
export default function ProjectCalendarExceptionDetail({ forceEdit = false }) {
  const { projectId, exceptionId } = useParams()
  const navigate = useNavigate()
  const isCreate = !exceptionId
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const listPath = `/simulator/practice-projects/${projectId}/schedule/calendar/exceptions`

  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionType, setExceptionType] = useState('holiday')
  const [isWorkingDay, setIsWorkingDay] = useState(false)
  const [description, setDescription] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  const load = useCallback(async () => {
    if (isCreate) {
      setInitialSnapshot(JSON.stringify({ exceptionDate: '', exceptionType: 'holiday', isWorkingDay: false, description: '' }))
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await getCalendarException(exceptionId)
    if (!res.success || !res.data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRecord(res.data)
    setExceptionDate(res.data.exception_date || '')
    setExceptionType(res.data.exception_type || 'holiday')
    setIsWorkingDay(!!res.data.is_working_day)
    setDescription(res.data.description || '')
    setInitialSnapshot(
      JSON.stringify({
        exceptionDate: res.data.exception_date || '',
        exceptionType: res.data.exception_type || 'holiday',
        isWorkingDay: !!res.data.is_working_day,
        description: res.data.description || '',
      })
    )
    setLoading(false)
  }, [exceptionId, isCreate])

  useEffect(() => { load() }, [load])

  const isDirty = useMemo(() => {
    if (loading || readOnly || initialSnapshot === null) return false
    return JSON.stringify({ exceptionDate, exceptionType, isWorkingDay, description }) !== initialSnapshot
  }, [loading, readOnly, exceptionDate, exceptionType, isWorkingDay, description, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this calendar exception.'
  )

  const handleBack = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!exceptionDate) {
      setError('Date is required')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { exception_date: exceptionDate, exception_type: exceptionType, is_working_day: isWorkingDay, description: description.trim() || null }

    const result = isCreate
      ? await createCalendarException(projectId, payload)
      : await updateCalendarException(exceptionId, payload)
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({
      recordId: result.data?.exception_date || exceptionDate,
      operation: isCreate ? 'created' : 'updated',
      onOk: () => navigate(listPath, { replace: true }),
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Calendar exception not found.</p>
        <button onClick={() => navigate(listPath)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to Public Holidays & Exceptions
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Add Calendar Exception' : readOnly ? 'View Calendar Exception' : 'Edit Calendar Exception'}
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
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                  <input
                    type="date"
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select
                    value={exceptionType}
                    onChange={(e) => setExceptionType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isWorkingDay}
                  onChange={(e) => setIsWorkingDay(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Treat this date as a working day (e.g. weekend work) rather than a day off
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Add Exception' : 'Save Changes'}
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate || !record ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this calendar exception.">
                <AuditCard title="Identity" description="How this exception is labelled and tracked.">
                  <AuditField label="Date" value={record.exception_date} />
                  <AuditField label="Type" value={exceptionType} />
                </AuditCard>
                <AuditCard title="Classification" description="How this exception behaves.">
                  <AuditField label="Treated as working day" value={isWorkingDay ? 'Yes' : 'No'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this exception was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
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
