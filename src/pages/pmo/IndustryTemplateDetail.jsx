import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { archiveTemplate, duplicateTemplate, getTemplateById } from '../../services/industryTemplateService'
import IndustryPlanExportMenu from '../../components/industryPlan/IndustryPlanExportMenu'

const TABS = ['phases', 'activities', 'deliverables', 'risks', 'milestones', 'roles']

export default function IndustryTemplateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tpl, setTpl] = useState(null)
  const [tab, setTab] = useState('phases')

  useEffect(() => {
    getTemplateById(id).then(setTpl).catch((e) => toast.error(e.message))
  }, [id])

  if (!tpl) return <p className="p-6 text-sm text-slate-500">Loading…</p>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/pmo/industry-templates" className="text-sm text-blue-600">
        ← Templates
      </Link>
      <div className="mt-2 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tpl.industry_name}</h1>
          <p className="text-sm text-slate-500">{tpl.industry_code} · {tpl.status}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/pmo/industry-templates/${id}/edit`} className="rounded border px-3 py-1 text-sm">
            Edit
          </Link>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={async () => {
              const c = await duplicateTemplate(id)
              navigate(`/pmo/industry-templates/${c.id}/edit`)
            }}
          >
            Duplicate
          </button>
          <IndustryPlanExportMenu data={tpl} />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm text-red-600"
            onClick={async () => {
              await archiveTemplate(id)
              toast.success('Archived')
              navigate('/pmo/industry-templates')
            }}
          >
            Archive
          </button>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">{tpl.description}</p>
      <div className="mt-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-2 py-1 text-xs capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
          >
            {t} ({(tpl[t] || []).length})
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {(tpl[tab] || []).map((item) => (
          <li key={item.id} className="rounded border px-3 py-2 dark:border-slate-700">
            {item.phase_name ||
              item.activity_name ||
              item.deliverable_name ||
              item.risk_title ||
              item.milestone_name ||
              item.role_title}
          </li>
        ))}
      </ul>
    </div>
  )
}
