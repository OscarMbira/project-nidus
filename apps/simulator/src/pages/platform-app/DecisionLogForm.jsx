import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, Gavel } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { getDecision, createDecision, updateDecision } from '../../services/decisionLogService'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const EMPTY = {
  decision_title: '',
  description: '',
  decision_date: '',
  decided_by_name: '',
  category: 'general',
  status: 'proposed',
  priority: 'medium',
  rationale: '',
  impact: '',
  alternatives_considered: '',
  review_date: '',
}

const CATEGORIES = ['general','technical','financial','risk','stakeholder','process','resource','compliance','other']
const STATUSES   = ['proposed','approved','rejected','deferred','superseded']
const PRIORITIES = ['low','medium','high','critical']

function Field({ label, name, value, onChange, type = 'text', options, rows }) {
  const base = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  if (options) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
        <select name={name} value={value} onChange={onChange} className={base}>
          {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      </div>
    )
  }
  if (rows) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
        <textarea name={name} value={value} onChange={onChange} rows={rows} className={`${base} resize-y`} />
      </div>
    )
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} className={base} />
    </div>
  )
}

export default function DecisionLogForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, record])

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getDecision(id)
        setRecord(data)
        setForm({
          decision_title: data.decision_title || '',
          description: data.description || '',
          decision_date: data.decision_date || '',
          decided_by_name: data.decided_by_name || '',
          category: data.category || 'general',
          status: data.status || 'proposed',
          priority: data.priority || 'medium',
          rationale: data.rationale || '',
          impact: data.impact || '',
          alternatives_considered: data.alternatives_considered || '',
          review_date: data.review_date || '',
        })
      } catch (e) {
        toast.error(e?.message || 'Failed to load decision')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.decision_title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const payload = { ...form, project_id: projectId, updated_by: user?.id }
      let result
      if (isEdit) {
        result = await updateDecision(id, payload)
      } else {
        result = await createDecision({ ...payload, created_by: user?.id })
      }
      setSaved(true)
      toast.success(isEdit ? 'Decision updated' : `Decision created: ${result.decision_reference}`)
      setTimeout(() => navigate(`/simulator/governance/decisions?projectId=${projectId}`), 1200)
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {isEdit ? 'Edit Decision' : 'Record Decision'}
          </h1>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white min-h-[40px]">
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

        {formTab === 'audit' ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            {!record ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this decision is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who recorded or changed this decision, and how it is classified.">
                <AuditCard title="Identity" description="How this decision is labelled and tracked.">
                  <AuditField label="Title" value={record.decision_title} />
                  <AuditField label="Status" value={humanizeAuditToken(record.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="How this decision is categorised.">
                  <AuditField label="Category" value={humanizeAuditToken(record.category)} />
                  <AuditField label="Priority" value={humanizeAuditToken(record.priority)} />
                  <AuditField label="Decided by" value={record.decided_by_name} />
                </AuditCard>
                <AuditCard title="Record history" description="When this decision was created and last changed.">
                  <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
        <>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
          <Field label="Decision Title *" name="decision_title" value={form.decision_title} onChange={handleChange} />
          <Field label="Description" name="description" value={form.description} onChange={handleChange} rows={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Decision Date" name="decision_date" value={form.decision_date} onChange={handleChange} type="date" />
            <Field label="Decided By" name="decided_by_name" value={form.decided_by_name} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Category" name="category" value={form.category} onChange={handleChange} options={CATEGORIES} />
            <Field label="Status" name="status" value={form.status} onChange={handleChange} options={STATUSES} />
            <Field label="Priority" name="priority" value={form.priority} onChange={handleChange} options={PRIORITIES} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Decision Details</h2>
          <Field label="Rationale" name="rationale" value={form.rationale} onChange={handleChange} rows={3} />
          <Field label="Impact" name="impact" value={form.impact} onChange={handleChange} rows={3} />
          <Field label="Alternatives Considered" name="alternatives_considered" value={form.alternatives_considered} onChange={handleChange} rows={3} />
          <Field label="Review Date" name="review_date" value={form.review_date} onChange={handleChange} type="date" />
        </div>
        </>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-sm font-medium text-white min-h-[44px]">
            {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : isEdit ? 'Update Decision' : 'Record Decision'}
          </button>
        </div>
      </div>
    </div>
  )
}
