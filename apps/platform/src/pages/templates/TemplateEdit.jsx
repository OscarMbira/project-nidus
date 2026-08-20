import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getTemplateById, updateTemplate, listTemplateCategories } from '../../services/templateLibraryService'
import { defaultContentSchemaForType } from '../../services/templateLibraryConstants'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const BASE = '/platform/templates'

export default function TemplateEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [versionNote, setVersionNote] = useState('')
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  const [templateRecord, setTemplateRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !templateRecord) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        templateRecord.created_by,
        templateRecord.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, templateRecord])

  useEffect(() => {
    ;(async () => {
      const { data: c } = await listTemplateCategories()
      setCategories(c || [])
      const { data, error } = await getTemplateById(id)
      if (error || !data) {
        setErr(error?.message || 'Not found')
        setLoading(false)
        return
      }
      setTemplateRecord(data)
      setForm({
        category_id: data.category_id || '',
        template_type_code: data.template_type_code,
        title: data.title,
        description: data.description || '',
        purpose: data.purpose || '',
        tags: (data.tags || []).join(', '),
        status: data.status,
        version: data.version || '1.0',
        contentJson: JSON.stringify(data.content || {}, null, 2),
      })
      setLoading(false)
    })()
  }, [id])

  const save = async () => {
    if (!form) return
    let content
    try {
      content = JSON.parse(form.contentJson || '{}')
    } catch {
      setErr('Invalid JSON')
      return
    }
    setSaving(true)
    setErr(null)
    const schema = defaultContentSchemaForType(form.template_type_code)
    const parts = form.version.trim().split('.')
    const minor = parseInt(parts[1] || '0', 10) + 1
    const nextVersion = `${parts[0] || '1'}.${minor}`
    const { data, error } = await updateTemplate(id, {
      category_id: form.category_id || null,
      template_type_code: form.template_type_code,
      title: form.title.trim(),
      description: form.description || null,
      purpose: form.purpose || null,
      content,
      content_schema: schema,
      version: nextVersion,
      status: form.status,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSuccess({ id: data.id, version: data.version, op: 'updated' })
    setVersionNote('')
  }

  if (loading) return <div className="p-8 text-gray-600">Loading…</div>
  if (err && !form) return <div className="p-8 text-red-600">{err}</div>

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">Template {success.op}.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ID: {success.id} · Version: {success.version}
          </p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-violet-600 text-white" onClick={() => navigate(`${BASE}/${success.id}`)}>
            View
          </button>
        </div>
      </div>
    )
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`${BASE}/${id}`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit template</h1>
      {err && <p className="text-red-600 mb-4">{err}</p>}

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Template sections" />

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this template, and how it is classified.">
          <AuditCard title="Identity" description="How this template is labelled and tracked.">
            <AuditField label="Title" value={form.title || templateRecord?.title} />
            <AuditField label="Status" value={humanizeAuditToken(form.status || templateRecord?.status)} />
            <AuditField label="Version" value={form.version || templateRecord?.version} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this template sits.">
            <AuditField label="Type" value={humanizeAuditToken(form.template_type_code || templateRecord?.template_type_code)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this template was created and last changed.">
            <AuditField label="Created by" value={templateRecord?.created_by ? auditUserLabels[templateRecord.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={templateRecord?.created_at} />
            <AuditField label="Updated by" value={templateRecord?.updated_by ? auditUserLabels[templateRecord.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={templateRecord?.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'details' && (
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm">Title</span>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm">Category</span>
          <select
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Status</span>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
            <option value="deprecated">deprecated</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Optional note (for your records; version history is automatic)</span>
          <input
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm">Content JSON</span>
          <textarea
            value={form.contentJson}
            onChange={(e) => set('contentJson', e.target.value)}
            rows={14}
            className="mt-1 w-full font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-900 text-gray-100 px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white"
        >
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
      )}
    </div>
  )
}
