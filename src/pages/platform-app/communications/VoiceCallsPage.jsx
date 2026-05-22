import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Phone, Plus, Search, ExternalLink, Calendar, Clock, Pencil, Trash2, X, Save } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { getCalls, createCall, updateCall, deleteCall } from '../../../services/communicationsService'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'

const STATUS_COLORS = {
  scheduled:   'bg-blue-900/40 text-blue-300 border-blue-700',
  in_progress: 'bg-amber-900/40 text-amber-300 border-amber-700',
  completed:   'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  cancelled:   'bg-slate-700 text-slate-300 border-slate-600',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  scheduled_at: '',
  duration_minutes: '',
  join_link: '',
  platform_name: '',
  status: 'scheduled',
  notes: '',
}

function formatScheduled(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function CallForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  return (
    <div className="rounded-xl border border-blue-700 bg-slate-800 p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Scheduled Date & Time</label>
          <input type="datetime-local" name="scheduled_at" value={form.scheduled_at} onChange={handleChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
          <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} min="1"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Dial-in / Join Link</label>
          <input type="text" name="join_link" value={form.join_link} onChange={handleChange}
            placeholder="Phone number, conference ID, or URL"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
          <select name="status" value={form.status} onChange={handleChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none">
            {['scheduled','in_progress','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">Purpose / Agenda</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none resize-y" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes / Action Items</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none resize-y" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="button" onClick={() => onSave(form)} disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Call'}
        </button>
      </div>
    </div>
  )
}

export default function VoiceCallsPage() {
  const projectId = usePlanningProjectId()
  const [userId, setUserId] = useState(null)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingCall, setEditingCall] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getCalls(projectId, 'voice')
      setCalls(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load calls')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    return t ? calls.filter(c =>
      (c.title || '').toLowerCase().includes(t) ||
      (c.status || '').toLowerCase().includes(t)
    ) : calls
  }, [calls, search])

  const handleCreate = async (form) => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const created = await createCall({
        ...form,
        project_id: projectId,
        call_type: 'voice',
        organiser_id: userId,
        created_by: userId,
        scheduled_at: form.scheduled_at || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      })
      setCalls(prev => [created, ...prev])
      setShowForm(false)
      toast.success('Voice call scheduled')
    } catch (e) {
      toast.error(e?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (form) => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const updated = await updateCall(editingId, {
        ...form,
        scheduled_at: form.scheduled_at || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      })
      setCalls(prev => prev.map(c => c.id === editingId ? updated : c))
      setEditingId(null)
      setEditingCall(null)
      toast.success('Call updated')
    } catch (e) {
      toast.error(e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this call?')) return
    try {
      await deleteCall(id)
      setCalls(prev => prev.filter(c => c.id !== id))
      toast.success('Call deleted')
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <PlanningProjectBar />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-400" />
            Voice Calls
          </h1>
          {projectId && (
            <button type="button" onClick={() => { setShowForm(true); setEditingId(null) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Schedule Call
            </button>
          )}
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search calls…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
        </div>

        {showForm && !editingId && (
          <div className="mb-5">
            <CallForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && !showForm && (
          <div className="text-center py-16 text-slate-500">
            <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No voice calls scheduled yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(call => (
            <div key={call.id}>
              {editingId === call.id ? (
                <CallForm
                  initial={editingCall}
                  onSave={handleUpdate}
                  onCancel={() => { setEditingId(null); setEditingCall(null) }}
                  saving={saving}
                />
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-white">{call.title}</h3>
                    <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[call.status] || STATUS_COLORS.scheduled}`}>
                      {call.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3">
                    {call.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {formatScheduled(call.scheduled_at)}
                      </span>
                    )}
                    {call.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {call.duration_minutes} min
                      </span>
                    )}
                    {call.join_link && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {call.join_link}
                      </span>
                    )}
                  </div>
                  {call.description && <p className="text-sm text-slate-400 mb-3">{call.description}</p>}
                  {call.notes && (
                    <div className="rounded-lg bg-slate-900/60 px-3 py-2 mb-3">
                      <p className="text-xs font-medium text-slate-400 mb-0.5">Notes</p>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{call.notes}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                    <button type="button" onClick={() => { setEditingId(call.id); setEditingCall(call); setShowForm(false) }}
                      className="text-slate-400 hover:text-slate-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(call.id)}
                      className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
