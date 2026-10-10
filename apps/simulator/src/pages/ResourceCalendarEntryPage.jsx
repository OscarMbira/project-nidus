import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabaseClient'
import { getCurrentUserInternalUserId } from '../utils/accountResolution'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'

const EMPTY_FORM = {
  calendar_date: '',
  availability_type: 'unavailable',
  available_hours: '',
  capacity_percentage: 100,
  unavailability_reason: '',
  notes: '',
  is_recurring: false,
  recurrence_pattern: '',
  recurrence_end_date: '',
}

const RECURRING_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

function formatReasons(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(', ')
}

export default function ResourceCalendarEntryPage() {
  const { id: resourceId, entryId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(entryId)
  const { showSuccess, modal } = useSuccessModal()

  const initialForm = { ...EMPTY_FORM, calendar_date: searchParams.get('date') || '' }
  const [formData, setFormData] = useState(initialForm)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialForm))
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const isDirty = JSON.stringify(formData) !== savedSnapshot
  const { confirmDiscard, confirmBack } = useUnsavedChangesGuard(isDirty, 'You have unsaved calendar entry changes.')

  useEffect(() => {
    if (!isEdit) return
    supabase.from('resource_calendar').select('*').eq('id', entryId).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error(error?.message || 'Calendar entry not found')
          setLoading(false)
          return
        }
        const loaded = {
          calendar_date: data.calendar_date,
          availability_type: data.availability_type,
          available_hours: data.available_hours || '',
          capacity_percentage: data.capacity_percentage || 100,
          unavailability_reason: data.unavailability_reason || '',
          notes: data.notes || '',
          is_recurring: data.is_recurring || false,
          recurrence_pattern: data.recurrence_pattern || '',
          recurrence_end_date: data.recurrence_end_date || '',
        }
        setRecord(data)
        setFormData(loaded)
        setSavedSnapshot(JSON.stringify(loaded))
        setLoading(false)
      })
  }, [entryId, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : '') : value),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      const internalUserId = await getCurrentUserInternalUserId()
      if (!internalUserId) throw new Error('User record not found')

      const submitData = {
        resource_id: resourceId,
        calendar_date: formData.calendar_date,
        availability_type: formData.availability_type,
        available_hours: formData.available_hours ? parseFloat(formData.available_hours) : null,
        capacity_percentage: formData.capacity_percentage,
        unavailability_reason: formData.unavailability_reason || null,
        notes: formData.notes || null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern || null,
        recurrence_end_date: formData.recurrence_end_date || null,
        updated_by: internalUserId,
      }

      if (isEdit) {
        const { error } = await supabase.from('resource_calendar').update(submitData).eq('id', entryId)
        if (error) throw error
      } else {
        submitData.created_by = internalUserId
        const { error } = await supabase.from('resource_calendar').insert(submitData)
        if (error) throw error
      }

      setSavedSnapshot(JSON.stringify(formData))
      showSuccess({
        recordId: formData.calendar_date,
        operation: isEdit ? 'updated' : 'created',
        message: `Calendar entry ${isEdit ? 'updated' : 'added'} for ${formData.calendar_date}.`,
        onOk: () => navigate(-1),
      })
    } catch (error) {
      console.error('Error saving calendar entry:', error)
      toast.error('Error saving calendar entry: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-6 text-gray-500 dark:text-gray-400">Loading…</p>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => confirmBack()}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        {isEdit ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
      </h1>

      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this entry is saved.</p>
          ) : (
            <AuditDetailsPanel description="How this calendar entry is classified, and when it was created.">
              <AuditCard title="Identity" description="How this entry is labelled and tracked.">
                <AuditField label="Date" value={record.calendar_date} />
                <AuditField label="Availability type" value={record.availability_type} />
              </AuditCard>
              <AuditCard title="Classification" description="How this entry is categorised.">
                <AuditField label="Reason" value={formatReasons(record.unavailability_reason)} />
                <AuditField label="Available hours" value={record.available_hours} />
                <AuditField label="Capacity (%)" value={record.capacity_percentage} />
                <AuditField label="Recurring pattern" value={record.is_recurring ? RECURRING_LABELS[record.recurrence_pattern] || null : null} />
              </AuditCard>
              <AuditCard title="Record history" description="When this entry was created and last changed.">
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
            <input
              type="date"
              name="calendar_date"
              value={formData.calendar_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Availability Type *</label>
            <select
              name="availability_type"
              value={formData.availability_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="available">Available</option>
              <option value="partial">Partial</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {formData.availability_type === 'partial' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Hours</label>
                <input
                  type="number"
                  name="available_hours"
                  value={formData.available_hours}
                  onChange={handleChange}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity Percentage (%)</label>
                <input
                  type="number"
                  name="capacity_percentage"
                  value={formData.capacity_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </>
          )}

          {(formData.availability_type === 'unavailable' || formData.availability_type === 'partial') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Add one reason at a time. Press Enter or click Add after each.</p>
              <MultiLineListInput
                viewModeId="resource-calendar-reasons"
                id="unavailability_reason"
                value={formData.unavailability_reason}
                onChange={(v) => setFormData((prev) => ({ ...prev, unavailability_reason: v }))}
                placeholder="e.g. Vacation"
                ariaLabelPrefix="reason"
                itemColumnLabel="Reason"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurring Pattern</label>
          </div>

          {formData.is_recurring && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recurrence Pattern</label>
                <select
                  name="recurrence_pattern"
                  value={formData.recurrence_pattern}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select pattern</option>
                  {Object.entries(RECURRING_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  name="recurrence_end_date"
                  value={formData.recurrence_end_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <button
              type="button"
              onClick={() => confirmBack()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
      {modal}
    </div>
  )
}
