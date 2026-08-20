import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getEEFById, listEEFCategories, listProjectsForOrganisation, updateEEF } from '../../services/eefService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

function formFromRecord(data) {
  return {
    title: data.title || '',
    description: data.description || '',
    category_id: data.category_id || '',
    eef_type: data.eef_type || 'internal',
    impact_level: data.impact_level || 'medium',
    impact_direction: data.impact_direction || 'neutral',
    source_reference: data.source_reference || '',
    related_project_id: data.related_project_id || '',
    status: data.status || 'active',
    notes: data.notes || '',
    is_on_hold: !!data.is_on_hold,
    on_hold_reason: data.on_hold_reason || '',
  }
}

export default function EEFEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState(null)
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by])
      if (!cancelled) setAuditUserLabels(labels)
    })()
    return () => {
      cancelled = true
    }
  }, [formTab, record])

  // Load the record immediately; fill category/project dropdowns in parallel (do not block the form).
  useEffect(() => {
    if (!id) {
      setError('Missing record id')
      return
    }
    let cancelled = false
    setError(null)
    setForm(null)
    setRecord(null)

    ;(async () => {
      try {
        const recordPromise = getEEFById(id)
        const dropdownPromise = (async () => {
          const aid = await getCurrentUserAccountId()
          if (!aid || cancelled) return
          const [c, p] = await Promise.all([listEEFCategories(aid), listProjectsForOrganisation(aid)])
          if (cancelled) return
          setCategories(c.data || [])
          setProjects(p.data || [])
        })()

        const { data, error: e } = await recordPromise
        if (cancelled) return
        if (e || !data) {
          setError(e?.message || 'Not found')
          return
        }
        setRecord(data)
        setForm(formFromRecord(data))
        await dropdownPromise
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load EEF')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form?.title?.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: e } = await updateEEF(id, {
      title: form.title.trim(),
      description: form.description || null,
      category_id: form.category_id || null,
      eef_type: form.eef_type,
      impact_level: form.impact_level,
      impact_direction: form.impact_direction,
      source_reference: form.source_reference || null,
      related_project_id: form.related_project_id || null,
      status: form.status,
      notes: form.notes || null,
      is_on_hold: form.is_on_hold,
      on_hold_reason: form.is_on_hold ? form.on_hold_reason || null : null,
    })
    setSaving(false)
    if (e) {
      setError(e.message)
      return
    }
    setSuccess({ id: data.id })
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">EEF updated successfully.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Record ID: {success.id}</p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => navigate(`/simulator/eef/${success.id}`)}>
            View record
          </button>
        </div>
      </div>
    )
  }

  if (error && !form) return <div className="p-8 text-red-600 dark:text-red-400">{error}</div>
  if (!form) return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/simulator/eef/${id}`} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit EEF</h1>

      <div className="mb-4">
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      </div>

      {formTab === 'audit' ? (
        <AuditDetailsPanel description="Who created this EEF record, and how it is classified.">
          <AuditCard title="Identity" description="How this EEF record is labelled and tracked.">
            <AuditField label="Title" value={record?.title} />
            <AuditField label="Status" value={humanizeAuditToken(record?.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="How this EEF record is categorised.">
            <AuditField label="Type" value={humanizeAuditToken(record?.eef_type)} />
            <AuditField label="Impact level" value={humanizeAuditToken(record?.impact_level)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this EEF record was created and last changed.">
            <AuditField label="Created by" value={record?.created_by ? auditUserLabels[record.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={record?.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={record?.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <>
          {error && (
            <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title *</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[100px] text-gray-900 dark:text-gray-100"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">EEF type</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.eef_type}
                  onChange={(e) => set('eef_type', e.target.value)}
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="under_review">Under review</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact level</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.impact_level}
                  onChange={(e) => set('impact_level', e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact direction</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.impact_direction}
                  onChange={(e) => set('impact_direction', e.target.value)}
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Related project</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.related_project_id}
                  onChange={(e) => set('related_project_id', e.target.value)}
                >
                  <option value="">— None —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source / reference</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                value={form.source_reference}
                onChange={(e) => set('source_reference', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[80px] text-gray-900 dark:text-gray-100"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_on_hold} onChange={(e) => set('is_on_hold', e.target.checked)} />
              <span className="text-sm text-gray-700 dark:text-gray-300">On hold</span>
            </label>
            {form.is_on_hold && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">On-hold reason</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px] text-gray-900 dark:text-gray-100"
                  value={form.on_hold_reason}
                  onChange={(e) => set('on_hold_reason', e.target.value)}
                />
              </label>
            )}
            <div className="flex justify-end pt-4">
              <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white disabled:opacity-50">
                <Save className="h-4 w-4" /> Save changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
