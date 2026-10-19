/**
 * v1272 — Highlight report layout editor (PRD D12a, stories 27a–27c). Routed page (rule 65):
 *   <basePath>/new  and  <basePath>/:nodeId
 * Sections: built-in (map to highlight report fields) or custom; enable/disable, optional, order,
 * title and an AI drafting instruction. Organisation layouts also set whether projects may adjust.
 * Saving goes through ai_save_report_layout (permission rules live in the database).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import DetailAuditTabList from '../DetailAuditTabList.jsx'
import AuditDetailsPanel from '../AuditDetailsPanel.jsx'
import AuditCard from '../AuditCard.jsx'
import AuditField from '../AuditField.jsx'

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

function slug(text) {
  return String(text || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'section'
}

export default function ReportLayoutEditor({ basePath }) {
  const { db } = useAppConfig()
  const { nodeId } = useParams()
  const navigate = useNavigate()
  const isNew = !nodeId || nodeId === 'new'
  const [tab, setTab] = useState('details')
  const [form, setForm] = useState(null)
  const [initial, setInitial] = useState(null)
  const [meta, setMeta] = useState(null)
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { showSuccess, modal } = useSuccessModal()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: projs }, { data: list }, { data: defaults }] = await Promise.all([
        db.from('ai_v_projects').select('id, project_name').order('project_name').limit(500),
        db.rpc('ai_list_report_layouts'),
        platformDb.from('report_layout_defaults').select('layout').eq('report_type', 'highlight').maybeSingle(),
      ])
      if (!alive) return
      setProjects(projs || [])
      let next
      if (isNew) {
        next = { name: '', description: '', tier: 'pmo', projectId: '', status: 'draft', allowProjectAdjust: true,
          sections: (defaults?.layout?.sections || []).map((s) => ({ ...s })) }
      } else {
        const row = (list || []).find((r) => r.node_id === nodeId)
        if (!row) { setError('That layout could not be found.'); return }
        setMeta(row)
        next = { name: row.name, description: row.description || '', tier: row.tier, projectId: row.project_id || '', status: row.status,
          allowProjectAdjust: row.allow_project_adjust, sections: (row.layout?.sections || []).map((s) => ({ ...s })) }
      }
      setForm(next)
      setInitial(next)
    })()
    return () => { alive = false }
  }, [db, nodeId, isNew])

  const isDirty = useMemo(() => Boolean(form && initial && JSON.stringify(form) !== JSON.stringify(initial)), [form, initial])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty)
  const readOnly = Boolean(meta && !meta.can_edit)

  const setSection = (i, patch) => setForm((f) => ({ ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
  const move = (i, dir) => setForm((f) => {
    const s = [...f.sections]
    const j = i + dir
    if (j < 0 || j >= s.length) return f
    ;[s[i], s[j]] = [s[j], s[i]]
    return { ...f, sections: s }
  })
  const addCustom = () => setForm((f) => {
    const taken = new Set(f.sections.map((s) => s.key))
    let key = 'custom_section'
    for (let n = 2; taken.has(key); n += 1) key = `custom_section_${n}`
    return { ...f, sections: [...f.sections, { key, title: 'New section', kind: 'custom', enabled: true, optional: true, instruction: '', field_type: 'text' }] }
  })
  const removeCustom = (i) => {
    if (!window.confirm('Remove this custom section from the layout?')) return
    setForm((f) => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))
  }

  const save = async () => {
    setError('')
    if (!form.name.trim()) { setError('Give the layout a name.'); return }
    if (form.tier === 'project' && !form.projectId) { setError('Choose the project this layout is for.'); return }
    if (!form.sections.some((s) => s.enabled !== false)) { setError('Turn on at least one section.'); return }
    // Custom section keys follow their titles so they read well in exports.
    const used = new Set()
    const sections = form.sections.map((s) => {
      let key = s.kind === 'custom' ? slug(s.title) : s.key
      while (used.has(key)) key = `${key}_x`
      used.add(key)
      return { ...s, key }
    })
    setSaving(true)
    try {
      const { data, error: e } = await db.rpc('ai_save_report_layout', {
        p_node_id: isNew ? null : nodeId,
        p_name: form.name.trim(),
        p_tier: form.tier,
        p_project_id: form.tier === 'project' ? form.projectId : null,
        p_layout: { sections },
        p_allow_project_adjust: form.allowProjectAdjust,
        p_status: form.status,
        p_description: form.description.trim() || null,
      })
      if (e) throw e
      const saved = { ...form, sections }
      setForm(saved)
      setInitial(saved)
      showSuccess({
        recordId: data.name, subject: 'Report layout', operation: isNew ? 'created' : 'updated',
        onOk: isNew ? () => navigate(`${basePath}/${data.node_id}`, { replace: true }) : undefined,
      })
    } catch (e) {
      setError(e?.message || 'The layout could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this layout? Reports already written keep their content.')) return
    const { error: e } = await db.rpc('ai_delete_report_layout', { p_node_id: nodeId })
    if (e) { setError(e.message); return }
    setInitial(form)
    showSuccess({ recordId: form.name, subject: 'Report layout', operation: 'deleted', onOk: () => navigate(basePath) })
  }

  if (!form) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">{error || 'Loading…'}</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <button type="button" onClick={() => confirmDiscard(() => navigate(-1))} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to layouts
      </button>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{isNew ? 'New highlight report layout' : form.name}</h1>
      <DetailAuditTabList activeTab={tab} onChange={setTab} ariaLabel="Layout sections" />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</p>}

      {tab === 'details' && (
        <fieldset disabled={readOnly || saving} className="space-y-4">
          {readOnly && <p className="text-sm text-gray-600 dark:text-gray-400">You can view this layout. Only the PMO (or the project, when allowed) can change it.</p>}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-2">
            <div>
              <label htmlFor="rl-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
              <input id="rl-name" value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label htmlFor="rl-status" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
              <select id="rl-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`mt-1 ${inputCls}`}>
                <option value="draft">Draft (not used yet)</option>
                <option value="published">Published (used for reports)</option>
              </select>
            </div>
            <div>
              <label htmlFor="rl-tier" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Applies to</label>
              <select id="rl-tier" value={form.tier} disabled={!isNew} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={`mt-1 ${inputCls}`}>
                <option value="pmo">The whole organisation</option>
                <option value="project">One project</option>
              </select>
            </div>
            {form.tier === 'project' && (
              <div>
                <label htmlFor="rl-project" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Project</label>
                <select id="rl-project" value={form.projectId} disabled={!isNew} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className={`mt-1 ${inputCls}`}>
                  <option value="">Choose a project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="rl-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
              <input id="rl-desc" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`mt-1 ${inputCls}`} />
            </div>
            {form.tier === 'pmo' && (
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 sm:col-span-2">
                <input type="checkbox" checked={form.allowProjectAdjust} onChange={(e) => setForm({ ...form, allowProjectAdjust: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                Project managers may make their own version of this layout for their project
              </label>
            )}
          </div>

          <div className="space-y-3">
            {form.sections.map((s, i) => (
              <div key={`${s.key}-${i}`} className={`rounded-lg border p-3 ${s.enabled === false ? 'border-gray-200 bg-gray-50 opacity-75 dark:border-gray-700 dark:bg-gray-800/50' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-label="Section title" value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} className={`${inputCls} flex-1 font-medium`} />
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{s.kind === 'custom' ? 'Custom' : 'Standard'}</span>
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={s.enabled !== false} onChange={(e) => setSection(i, { enabled: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" /> Included
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={Boolean(s.optional)} onChange={(e) => setSection(i, { optional: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" /> Optional
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-white" aria-label="Move up" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === form.sections.length - 1} className="rounded p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-white" aria-label="Move down" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                  {s.kind === 'custom' && (
                    <button type="button" onClick={() => removeCustom(i)} className="rounded p-1 text-red-600 hover:text-red-700" aria-label="Remove section" title="Remove section"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor={`rl-instr-${i}`}>AI drafting instruction</label>
                <input id={`rl-instr-${i}`} value={s.instruction || ''} maxLength={500} placeholder="e.g. Summarise supplier performance in 3 bullet points"
                  onChange={(e) => setSection(i, { instruction: e.target.value })} className={`mt-1 ${inputCls}`} />
              </div>
            ))}
            <button type="button" onClick={addCustom} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              <Plus className="h-4 w-4" /> Add custom section
            </button>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div>{!isNew && <button type="button" onClick={remove} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20">Delete layout</button>}</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => confirmDiscard(() => navigate(basePath))} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancel</button>
                <button type="button" onClick={save} disabled={saving || (!isDirty && !isNew)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save layout'}</button>
              </div>
            </div>
          )}
        </fieldset>
      )}

      {tab === 'audit' && (
        meta ? (
          <AuditDetailsPanel>
            <AuditCard title="Identity">
              <AuditField label="Layout" value={meta.name} />
              <AuditField label="Applies to" value={meta.tier === 'pmo' ? 'The whole organisation' : 'One project'} />
            </AuditCard>
            <AuditCard title="Classification">
              <AuditField label="Status" value={meta.status === 'published' ? 'Published' : 'Draft'} />
              <AuditField label="Projects may adjust" value={meta.tier === 'pmo' ? (meta.allow_project_adjust ? 'Yes' : 'No') : null} />
            </AuditCard>
            <AuditCard title="Record history">
              <AuditField label="Created" value={meta.created_at ? new Date(meta.created_at).toLocaleString() : null} />
              <AuditField label="Last updated" value={meta.updated_at ? new Date(meta.updated_at).toLocaleString() : null} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
      )}
      {modal}
    </div>
  )
}
