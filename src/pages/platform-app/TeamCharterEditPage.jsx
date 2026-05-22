import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shield, Save, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getTeamCharter, createTeamCharter, updateTeamCharter } from '../../services/teamCharterService'

const EMPTY = {
  title: 'Team Charter',
  status: 'draft',
  purpose: '',
  objectives: '',
  values: '',
  ways_of_working: '',
  norms: '',
  communication_plan: '',
  raci_notes: '',
}

function Field({ label, name, value, onChange, rows = 4, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-1.5">{hint}</p>}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
      />
    </div>
  )
}

export default function TeamCharterEditPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [charterId, setCharterId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTeamCharter(projectId)
        if (data) {
          setCharterId(data.id)
          setForm({
            title: data.title || 'Team Charter',
            status: data.status || 'draft',
            purpose: data.purpose || '',
            objectives: data.objectives || '',
            values: data.values || '',
            ways_of_working: data.ways_of_working || '',
            norms: data.norms || '',
            communication_plan: data.communication_plan || '',
            raci_notes: data.raci_notes || '',
          })
        }
      } catch (e) {
        toast.error(e?.message || 'Failed to load charter')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      const {
        data: { user },
      } = await platformDb.auth.getUser()

      const payload = { ...form, project_id: projectId, updated_by: user?.id }

      if (charterId) {
        await updateTeamCharter(charterId, payload)
      } else {
        const result = await createTeamCharter({ ...payload, created_by: user?.id })
        setCharterId(result.id)
      }
      setSaved(true)
      toast.success('Team charter saved')
      setTimeout(() => setSaved(false), 3000)
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
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            {charterId ? 'Edit Team Charter' : 'Create Team Charter'}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white min-h-[40px]"
          >
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Charter'}
          </button>
        </div>

        {/* Status + Title row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">Charter Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <Field label="Purpose" name="purpose" value={form.purpose} onChange={handleChange}
          hint="Why does this team exist? What is the team's mission?" />
        <Field label="Objectives" name="objectives" value={form.objectives} onChange={handleChange}
          hint="What specific outcomes is the team responsible for delivering?" />
        <Field label="Team Values" name="values" value={form.values} onChange={handleChange}
          hint="What values guide how the team works and behaves?" />
        <Field label="Ways of Working" name="ways_of_working" value={form.ways_of_working} onChange={handleChange}
          hint="How does the team collaborate, make decisions, and deliver work?" />
        <Field label="Team Norms" name="norms" value={form.norms} onChange={handleChange}
          hint="Agreed rules, meeting cadences, communication standards." />
        <Field label="Communication Plan" name="communication_plan" value={form.communication_plan} onChange={handleChange}
          hint="How and when does the team communicate internally and with stakeholders?" />
        <Field label="RACI Notes" name="raci_notes" value={form.raci_notes} onChange={handleChange}
          hint="Responsibilities, accountability, consulting, and informing notes." />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-sm font-medium text-white min-h-[44px]"
          >
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Charter'}
          </button>
        </div>
      </div>
    </div>
  )
}
