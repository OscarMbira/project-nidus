/**
 * v1239 Slice 3 — routed calendar exception page (rule 65): `calendar/exceptions/create`,
 * `calendar/exceptions/:exceptionId`, `calendar/exceptions/:exceptionId/edit`.
 * Exceptions have no display ID, so the URL carries the UUID (rule 16.3 allows this).
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import BackButton from '../../components/BackButton.jsx'
import { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useScheduleData, useScheduleLinks, useScheduleProjectId } from '../../hooks/useSchedule.js'

const EMPTY = { exception_date: '', exception_type: 'holiday', is_working_day: false, description: '' }
const input = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

export default function CalendarExceptionFormScreen() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { exceptionId } = useParams()
  const link = useScheduleLinks()
  const data = useScheduleData()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const isNew = !exceptionId
  const isEdit = isNew || pathname.endsWith('/edit')
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('details')
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [snapshot, setSnapshot] = useState(JSON.stringify(EMPTY))
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isNew || !projectId) return
    let cancelled = false
    setLoading(true)
    data.getCalendarException(projectId, exceptionId)
      .then((row) => {
        if (cancelled) return
        if (!row) { setError('This exception was not found in the selected project.'); return }
        const f = { exception_date: row.exception_date, exception_type: row.exception_type || 'holiday', is_working_day: !!row.is_working_day, description: row.description || '' }
        setRecord(row)
        setForm(f)
        setSnapshot(JSON.stringify(f))
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [data, projectId, exceptionId, isNew])

  const { confirmDiscard } = useUnsavedChangesGuard(isEdit && JSON.stringify(form) !== snapshot, 'You have unsaved changes to this exception. Leave without saving?')

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: saved, operation } = await data.saveCalendarException(projectId, form, record)
      setSnapshot(JSON.stringify(form))
      showSuccess({
        recordId: saved.exception_date,
        operation,
        message: 'Calendar exception saved. Press Recalculate on the schedule to move the dates.',
        onOk: () => navigate(link('calendar'), { replace: true }),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return <div className="p-6">{projectLoading ? <Loading /> : <ChooseProject />}</div>
  if (loading) return <Loading text="Loading exception…" />

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4 max-w-3xl">
      <BackButton label="Back to calendar" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isNew ? 'New calendar exception' : `${isEdit ? 'Edit' : ''} exception ${record?.exception_date || ''}`.trim()}</h1>
        <div className="flex gap-2">
          {!isEdit && record && <RowActionButton variant="edit" label="Edit exception" onClick={() => navigate(link(`calendar/exceptions/${record.id}/edit`))} />}
          {isEdit && (
            <>
              <button type="button" onClick={() => confirmDiscard(() => navigate(-1))} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList activeTab={tab} onChange={setTab} />
        </div>
        {tab === 'audit' ? (
          <div className="p-4">
            {!record ? <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this exception is saved.</p> : (
              <AuditDetailsPanel description="Who created or changed this exception, and how it is classified.">
                <AuditCard title="Identity" description="Which date this is.">
                  <AuditField label="Date" value={record.exception_date} />
                </AuditCard>
                <AuditCard title="Classification" description="How the date is treated.">
                  <AuditField label="Type" value={record.exception_type === 'holiday' ? 'Holiday' : 'Other'} />
                  <AuditField label="Working day" value={record.is_working_day ? 'Yes' : 'No'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this exception was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
          <fieldset disabled={!isEdit || saving} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs text-gray-600 dark:text-gray-400">Date *
              <input type="date" className={input} value={form.exception_date} onChange={(e) => setForm({ ...form, exception_date: e.target.value })} />
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400">Type
              <select className={input} value={form.exception_type} onChange={(e) => setForm({ ...form, exception_type: e.target.value, is_working_day: e.target.value === 'holiday' ? false : form.is_working_day })}>
                <option value="holiday">Holiday (day off)</option>
                <option value="other">Other</option>
              </select>
            </label>
            {form.exception_type === 'other' && (
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="checkbox" checked={form.is_working_day} onChange={(e) => setForm({ ...form, is_working_day: e.target.checked })} />
                This is an extra working day (for example, weekend work)
              </label>
            )}
            <label className="sm:col-span-2 text-xs text-gray-600 dark:text-gray-400">Description
              <input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </fieldset>
        )}
      </div>
      {modal}
    </div>
  )
}
