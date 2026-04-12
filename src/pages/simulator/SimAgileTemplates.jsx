import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listTemplates, upsertTemplate } from '../../services/simAgileTemplateService'
import { simDb, platformDb } from '../../services/supabase/supabaseClient'

export default function SimAgileTemplates() {
  const { projectId } = useParams()
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({
    template_type: 'dod',
    items: [{ text: '', order: 0, is_required: true }],
    auto_apply_to_new_stories: false,
  })

  const load = async () => {
    setRows(await listTemplates(projectId))
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [projectId])

  const save = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser()
      let createdBy = null
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        createdBy = u?.id || null
      }
      const r = await upsertTemplate({
        practice_project_id: projectId,
        template_type: draft.template_type,
        items: draft.items.filter((i) => i.text?.trim()),
        auto_apply_to_new_stories: draft.auto_apply_to_new_stories,
        created_by_user_id: createdBy,
      })
      toast.success(`Saved template ${r.id}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Agile templates (sim)</h1>
      <div className="max-w-xl space-y-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <select
          value={draft.template_type}
          onChange={(e) => setDraft({ ...draft, template_type: e.target.value })}
          className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
        >
          <option value="dod">DoD</option>
          <option value="dor">DoR</option>
        </select>
        {draft.items.map((it, idx) => (
          <input
            key={idx}
            value={it.text}
            onChange={(e) => {
              const items = [...draft.items]
              items[idx] = { ...it, text: e.target.value }
              setDraft({ ...draft, items })
            }}
            className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
          />
        ))}
        <button type="button" onClick={save} className="px-4 py-2 rounded bg-blue-600 text-sm">
          Save
        </button>
      </div>
      <ul className="mt-6 text-sm space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="border border-gray-800 rounded p-2">
            {r.template_type} — {Array.isArray(r.items) ? r.items.length : 0} items
          </li>
        ))}
      </ul>
    </div>
  )
}
