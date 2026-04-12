import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { listTemplates, upsertTemplate } from '../../services/agileTemplateService'
import { supabase } from '../../services/supabaseClient'

export default function AgileTemplates() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({
    template_type: 'dod',
    items: [{ text: '', order: 0, is_required: true }],
    auto_apply_to_new_stories: false,
  })

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const t = await listTemplates(projectId)
      setRows(t)
    } catch (e) {
      toast.error(e?.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const save = async () => {
    if (!projectId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let createdBy = null
      if (user) {
        const { data: u } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        createdBy = u?.id || null
      }
      const r = await upsertTemplate({
        project_id: projectId,
        template_type: draft.template_type,
        items: draft.items.filter((i) => i.text?.trim()),
        auto_apply_to_new_stories: draft.auto_apply_to_new_stories,
        created_by_user_id: createdBy,
        is_active: true,
      })
      toast.success(`Template saved (id: ${r.id})`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    }
  }

  if (pidLoading || loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">Agile templates (DoD / DoR)</h1>
      <p className="text-gray-400 text-sm mb-6">Project-level reusable checklists.</p>

      <div className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <label className="block text-sm text-gray-400">Template type</label>
        <select
          value={draft.template_type}
          onChange={(e) => setDraft({ ...draft, template_type: e.target.value })}
          className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2"
        >
          <option value="dod">Definition of Done</option>
          <option value="dor">Definition of Ready</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.auto_apply_to_new_stories}
            onChange={(e) => setDraft({ ...draft, auto_apply_to_new_stories: e.target.checked })}
          />
          Auto-apply to new stories
        </label>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Items</label>
          {draft.items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={it.text}
                onChange={(e) => {
                  const items = [...draft.items]
                  items[idx] = { ...it, text: e.target.value }
                  setDraft({ ...draft, items })
                }}
                className="flex-1 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                placeholder="Checklist item"
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-blue-400"
            onClick={() => setDraft({ ...draft, items: [...draft.items, { text: '', order: draft.items.length, is_required: true }] })}
          >
            + Add item
          </button>
        </div>
        <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
          Save template
        </button>
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-2">Active templates</h2>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-gray-800 p-3 bg-gray-900">
            <span className="uppercase text-gray-500">{r.template_type}</span> — {Array.isArray(r.items) ? r.items.length : 0} items
            {r.auto_apply_to_new_stories && <span className="ml-2 text-emerald-400">auto-apply</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
