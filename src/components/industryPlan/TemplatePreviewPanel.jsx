import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTemplateById } from '../../services/industryTemplateService'

export default function TemplatePreviewPanel({ templateId, onClose }) {
  const [tpl, setTpl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('phases')

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTemplateById(templateId)
        if (!cancelled) setTpl(data)
      } catch {
        if (!cancelled) setTpl(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId])

  if (!templateId) return null

  const tabs = [
    ['phases', 'Phases'],
    ['activities', 'Activities'],
    ['deliverables', 'Deliverables'],
    ['risks', 'Risks'],
    ['milestones', 'Milestones'],
    ['roles', 'Roles'],
  ]

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {tpl?.industry_name || 'Template preview'}
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
            Close
          </button>
        )}
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}
      {!loading && tpl && (
        <>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">{tpl.description}</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded px-2 py-1 text-xs ${
                  tab === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {label} ({(tpl[key] || []).length})
              </button>
            ))}
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300">
            {(tpl[tab] || []).map((item) => (
              <li key={item.id} className="rounded bg-white px-2 py-1 dark:bg-slate-800">
                {item.phase_name ||
                  item.activity_name ||
                  item.deliverable_name ||
                  item.risk_title ||
                  item.milestone_name ||
                  item.role_title}
                {item.is_key_role && <span className="ml-1 text-amber-600">★</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
