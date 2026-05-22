import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { getTimesheetEntry, createTimesheetEntry, updateTimesheetEntry } from '../../../services/timesheetService'

const EMPTY = {
  entry_date: new Date().toISOString().slice(0, 10),
  hours_worked: '',
  work_category: 'general',
  description: '',
  status: 'draft',
}

const CATEGORIES = ['general','design','development','testing','review','meeting','documentation','training','support','other']

function parseHours(raw) {
  const s = String(raw || '').trim().replace(/h$/i, '')
  const n = parseFloat(s)
  return isNaN(n) ? '' : String(Math.round(n * 4) / 4)
}

export default function TimesheetEntryForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTimesheetEntry(id)
        setForm({
          entry_date: data.entry_date || '',
          hours_worked: String(data.hours_worked || ''),
          work_category: data.work_category || 'general',
          description: data.description || '',
          status: data.status || 'draft',
        })
      } catch (e) {
        toast.error(e?.message || 'Failed to load entry')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleHoursBlur = () => {
    const parsed = parseHours(form.hours_worked)
    if (parsed !== '') setForm(f => ({ ...f, hours_worked: parsed }))
  }

  const handleSave = async (submitAfter = false) => {
    if (!form.entry_date) { toast.error('Date is required'); return }
    const hrs = parseFloat(form.hours_worked)
    if (!hrs || hrs <= 0 || hrs > 24) { toast.error('Hours must be between 0 and 24'); return }
    if (!projectId) { toast.error('No project selected'); return }

    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const payload = {
        project_id: projectId,
        user_id: user?.id,
        entry_date: form.entry_date,
        hours_worked: hrs,
        work_category: form.work_category,
        description: form.description,
        status: submitAfter ? 'submitted' : 'draft',
      }

      if (isEdit) {
        await updateTimesheetEntry(id, { ...payload, status: form.status })
      } else {
        await createTimesheetEntry(payload)
      }

      setSaved(true)
      toast.success(isEdit ? 'Entry updated' : submitAfter ? 'Entry logged and submitted' : 'Entry saved as draft')
      setTimeout(() => navigate(`/platform/timesheets?projectId=${projectId}`), 1000)
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            {isEdit ? 'Edit Time Entry' : 'Log Time'}
          </h1>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
              <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Hours *</label>
              <p className="text-xs text-slate-500 mb-1">Enter hours (e.g. 1.5, 2h, 7.5h)</p>
              <input type="text" name="hours_worked" value={form.hours_worked} onChange={handleChange}
                onBlur={handleHoursBlur}
                placeholder="e.g. 7.5"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Work Category</label>
            <select name="work_category" value={form.work_category} onChange={handleChange}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none">
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4}
              placeholder="What did you work on?"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-y" />
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!isEdit && (
            <button type="button" onClick={() => handleSave(false)} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 px-4 py-2.5 text-sm text-slate-300">
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
          )}
          <button type="button" onClick={() => handleSave(isEdit ? false : true)} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-sm font-medium text-white min-h-[44px]">
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
