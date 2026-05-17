import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as platformPlan from '../../services/projectIndustryPlanService'
import * as simPlan from '../../services/sim/simPracticeIndustryPlanService'
import { getTemplateById } from '../../services/industryTemplateService'
import IndustryPlanExportMenu from '../../components/industryPlan/IndustryPlanExportMenu'

const TABS = ['included_phases', 'included_activities', 'included_deliverables', 'included_risks', 'included_milestones', 'included_roles']
const LABELS = ['Phases', 'Activities', 'Deliverables', 'Risks', 'Milestones', 'Roles']

export default function ProjectIndustryPlanView({ isSim = false }) {
  const location = useLocation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const projectBase = location.pathname.startsWith('/pm/') ? '/pm/projects' : '/platform/projects'
  const [plan, setPlan] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [tab, setTab] = useState(0)

  const editPath = isSim
    ? `/simulator/practice-projects/${projectId}/industry-plan/edit?planId=`
    : `${projectBase}/${projectId}/industry-plan/edit?planId=`
  const newPath = isSim
    ? `/simulator/industry-templates?projectId=${projectId}`
    : location.pathname.startsWith('/pm/')
      ? `/pm/industry-templates?projectId=${projectId}`
      : `/platform/industry-templates?projectId=${projectId}`

  useEffect(() => {
    const load = isSim ? simPlan.getPracticePlan(projectId) : platformPlan.getProjectPlan(projectId)
    load
      .then(async (p) => {
        setPlan(p)
        if (p?.template_id) {
          const t = await getTemplateById(p.template_id)
          setTemplateName(t?.industry_name || '')
        }
      })
      .catch((e) => toast.error(e.message))
  }, [projectId, isSim])

  if (!plan) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500 mb-4">No industry plan for this project yet.</p>
        <Link to={newPath} className="text-blue-600 text-sm">
          Browse industry templates →
        </Link>
      </div>
    )
  }

  const key = TABS[tab]
  const items = (plan[key] || []).filter((x) => x.included !== false)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{plan.plan_title}</h1>
          <p className="text-sm text-slate-500">
            {templateName} · {plan.status}
            {plan.is_on_hold && ' (on hold)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`${editPath}${plan.id}`} className="rounded border px-3 py-1 text-sm">
            Edit
          </Link>
          <IndustryPlanExportMenu
            data={{
              plan_title: plan.plan_title,
              industry_code: plan.industry_code,
              description: plan.customisation_notes,
              customisation_notes: plan.customisation_notes,
              typical_duration: plan.typical_duration,
              status: plan.status,
              included_phases: plan.included_phases,
              included_activities: plan.included_activities,
              included_deliverables: plan.included_deliverables,
              included_risks: plan.included_risks,
              included_milestones: plan.included_milestones,
              included_roles: plan.included_roles,
            }}
          />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm text-red-600"
            onClick={async () => {
              if (!window.confirm('Archive this industry plan copy?')) return
              try {
                if (isSim) await simPlan.archivePracticePlan(plan.id)
                else await platformPlan.archivePlan(plan.id)
                toast.success('Plan archived')
                navigate(isSim ? `/simulator/practice-projects/${projectId}` : `${projectBase}/${projectId}`)
              } catch (e) {
                toast.error(e.message)
              }
            }}
          >
            Archive
          </button>
        </div>
      </div>
      {plan.customisation_notes && (
        <p className="mt-4 text-sm text-slate-600 border-l-2 pl-3">{plan.customisation_notes}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-1">
        {LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i)}
            className={`rounded px-2 py-1 text-xs ${tab === i ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={item.id || i} className="rounded border px-3 py-2 dark:border-slate-700">
            {item.phase_name ||
              item.activity_name ||
              item.deliverable_name ||
              item.risk_title ||
              item.milestone_name ||
              item.role_title}
            {item.activity_type && (
              <span className="ml-2 text-xs text-slate-400">
                {item.activity_type} · {item.typical_duration}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

