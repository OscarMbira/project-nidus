import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createTemplate, listTemplateCategories } from '../../services/templateLibraryService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { TEMPLATE_TYPE_OPTIONS, defaultContentSchemaForType, emptyContentFromSchema } from '../../services/templateLibraryConstants'

const BASE = '/platform/templates'

export default function TemplateCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [accountId, setAccountId] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    category_id: '',
    template_type_code: 'generic',
    title: '',
    description: '',
    purpose: '',
    tags: '',
    status: 'draft',
    contentJson: '{}',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      if (id) {
        const { data } = await listTemplateCategories()
        setCategories(data || [])
      }
    })()
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    const schema = defaultContentSchemaForType(form.template_type_code)
    const empty = emptyContentFromSchema(schema)
    setForm((f) => ({ ...f, contentJson: JSON.stringify(empty, null, 2) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset JSON when type changes
  }, [form.template_type_code])

  const submit = async () => {
    if (!accountId || !form.title.trim()) {
      setErr('Organisation and title are required')
      return
    }
    let content
    try {
      content = JSON.parse(form.contentJson || '{}')
    } catch {
      setErr('Content must be valid JSON')
      return
    }
    setSaving(true)
    setErr(null)
    const schema = defaultContentSchemaForType(form.template_type_code)
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const { data, error } = await createTemplate({
      account_id: accountId,
      category_id: form.category_id || null,
      template_type_code: form.template_type_code,
      title: form.title.trim(),
      description: form.description || null,
      purpose: form.purpose || null,
      content,
      content_schema: schema,
      status: form.status,
      tags,
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSuccess({ id: data.id, op: 'created' })
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">Template {success.op} successfully.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Record ID: {success.id}</p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-violet-600 text-white" onClick={() => navigate(`${BASE}/${success.id}`)}>
            View template
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">New template</h1>
      <div className="flex gap-2 mb-6 text-sm">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`px-3 py-1 rounded-lg ${step === s ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            {s === 1 && 'Category & type'}
            {s === 2 && 'Details'}
            {s === 3 && 'Content'}
            {s === 4 && 'Review'}
          </button>
        ))}
      </div>
      {err && <p className="text-red-600 dark:text-red-400 mb-4">{err}</p>}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-600 dark:text-gray-400">Category</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Template type</span>
            <select
              value={form.template_type_code}
              onChange={(e) => set('template_type_code', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            >
              {TEMPLATE_TYPE_OPTIONS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-violet-600 text-white">
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Title *</span>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Purpose</span>
            <textarea
              value={form.purpose}
              onChange={(e) => set('purpose', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm">Tags (comma-separated)</span>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
              Back
            </button>
            <button type="button" onClick={() => setStep(3)} className="px-4 py-2 rounded-lg bg-violet-600 text-white">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Structured content (JSON)</span>
            <textarea
              value={form.contentJson}
              onChange={(e) => set('contentJson', e.target.value)}
              rows={16}
              className="mt-1 w-full font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-900 text-gray-100 px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
              Back
            </button>
            <button type="button" onClick={() => setStep(4)} className="px-4 py-2 rounded-lg bg-violet-600 text-white">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Save as</span>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400">Review fields, then save.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
