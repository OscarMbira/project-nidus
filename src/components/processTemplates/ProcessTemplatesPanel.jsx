import { Link } from 'react-router-dom'
import { FileText, ExternalLink, Copy } from 'lucide-react'
import { getTemplatesByGroup, getTemplateListPath, resolvePath } from './processTemplatesRegistry'
import { canCreateMasterTemplate } from '../../services/processTemplatesService'

const KIND_BADGE = {
  new: 'bg-blue-900/50 text-blue-300 border-blue-700',
  existing: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  partial: 'bg-amber-900/40 text-amber-300 border-amber-700',
}

export default function ProcessTemplatesPanel({ groupId, roleKey, hubBase }) {
  const templates = getTemplatesByGroup(groupId)
  const canCreate = canCreateMasterTemplate(roleKey)

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Templates & Documents
      </h2>
      <ul className="space-y-2">
        {templates.map((t) => {
          const listPath = t.kind === 'new' ? getTemplateListPath(roleKey, t.slug) : null
          const extPath = t.paths ? resolvePath(t, roleKey) : null
          const href = listPath || extPath
          const badge = KIND_BADGE[t.kind] || KIND_BADGE.existing

          return (
            <li key={t.slug}>
              {href ? (
                <Link
                  to={href}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/80 group"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {t.kind === 'existing' || t.kind === 'partial' ? (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    )}
                    <span className="truncate">{t.label}</span>
                  </span>
                  <span className={`shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded border ${badge}`}>
                    {t.kind === 'new' ? 'CRUD' : t.kind === 'partial' ? 'Partial' : 'Link'}
                  </span>
                </Link>
              ) : (
                <span className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">{t.label}</span>
              )}
            </li>
          )
        })}
      </ul>
      {!canCreate && (
        <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <Copy className="h-3 w-3" />
          Open a template list to copy masters into your workspace.
        </p>
      )}
    </section>
  )
}
