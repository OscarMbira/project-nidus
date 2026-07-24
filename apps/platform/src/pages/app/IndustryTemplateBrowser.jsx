import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Layers, Search } from 'lucide-react'
import { listIndustryTemplates, resolveEffectiveIndustryTemplate } from '../../services/industryTemplateService'
import TemplatePreviewPanel from '../../components/industryPlan/TemplatePreviewPanel'

export default function IndustryTemplateBrowser({ isSim = false }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const projectBase = location.pathname.startsWith('/pm/') ? '/pm/projects' : '/platform/projects'
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [previewId, setPreviewId] = useState(null)
  const [recommended, setRecommended] = useState(null)

  const baseCopy = isSim
    ? (id) => `/simulator/practice-projects/${projectId || ':projectId'}/industry-plan/new?from_template=${id}`
    : (id) => `${projectBase}/${projectId || ':projectId'}/industry-plan/new?from_template=${id}`

  useEffect(() => {
    listIndustryTemplates({ search }).then(setRows)
  }, [search])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    resolveEffectiveIndustryTemplate(projectId).then((r) => {
      if (!cancelled) setRecommended(r)
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Layers className="h-7 w-7 text-blue-600" />
        Industry Templates
      </h1>
      <p className="text-sm text-slate-600 mt-1">Browse PMO industry plan blueprints and copy into your project.</p>
      {!isSim && (
        <p className="mt-2 text-sm">
          <Link to="/pmo/legacy-templates" className="text-blue-600 hover:underline">
            Browse reference documents &amp; structured list templates →
          </Link>
        </p>
      )}
      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm dark:bg-slate-800"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, index) => (
          <div
            key={r.id}
            className={`rounded-xl border p-4 dark:border-slate-700 ${
              recommended?.templateId === r.id ? 'ring-2 ring-sky-500 border-sky-500' : ''
            }`}
          >
            {recommended?.templateId === r.id && (
              <p className="mb-2 inline-block rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-medium px-3 py-1">
                Inherited from: {recommended.tier === 'pmo' ? 'PMO default' : recommended.tier}
              </p>
            )}
            <h2 className="font-semibold">{r.industry_name}</h2>
            <p className="text-xs text-slate-500 mt-1">{r.typical_duration}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="text-xs text-blue-600" onClick={() => setPreviewId(r.id)}>
                Preview
              </button>
              <Link to={baseCopy(r.id)} className="text-xs text-green-700 font-medium">
                Use for my project →
              </Link>
            </div>
          </div>
        ))}
      </div>
      <TemplatePreviewPanel templateId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  )
}
