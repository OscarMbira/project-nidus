import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTemplateById, buildSnapshotFromTemplate } from '../../services/industryTemplateService'
import * as platformPlan from '../../services/projectIndustryPlanService'
import * as simPlan from '../../services/sim/simPracticeIndustryPlanService'

const STEPS = ['Title', 'Phases', 'Activities', 'Deliverables', 'Risks', 'Milestones', 'Roles', 'Review']

export default function IndustryPlanCopyWizard({ isSim = false }) {
  const location = useLocation()
  const { projectId } = useParams()
  const projectBase = location.pathname.startsWith('/pm/') ? '/pm/projects' : '/platform/projects'
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('from_template')
  const planId = searchParams.get('planId')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [planTitle, setPlanTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [snap, setSnap] = useState(null)
  const [saving, setSaving] = useState(false)

  const svc = isSim ? simPlan : platformPlan
  const viewPath = isSim
    ? `/simulator/practice-projects/${projectId}/industry-plan`
    : `${projectBase}/${projectId}/industry-plan`

  useEffect(() => {
    if (planId) {
      const load = isSim ? svc.getPracticePlanById(planId) : svc.getProjectPlanById(planId)
      load.then((p) => {
        if (!p) return
        setPlanTitle(p.plan_title)
        setNotes(p.customisation_notes || '')
        setSnap({
          included_phases: p.included_phases,
          included_activities: p.included_activities,
          included_deliverables: p.included_deliverables,
          included_risks: p.included_risks,
          included_milestones: p.included_milestones,
          included_roles: p.included_roles,
        })
      })
      return
    }
    if (!templateId) return
    getTemplateById(templateId).then((t) => {
      if (!t) return
      setPlanTitle(`${t.industry_name} Plan`)
      setSnap(buildSnapshotFromTemplate(t))
    })
  }, [templateId, planId, isSim])

  const toggleIncluded = (key, index) => {
    setSnap((s) => {
      const arr = [...(s[key] || [])]
      arr[index] = { ...arr[index], included: !arr[index].included }
      return { ...s, [key]: arr }
    })
  }

  const save = async (onHold = false) => {
    if (!snap) return
    setSaving(true)
    try {
      const payload = {
        plan_title: planTitle,
        customisation_notes: notes,
        ...snap,
        status: onHold ? 'draft' : 'active',
        is_on_hold: onHold,
      }
      if (planId) {
        if (isSim) await simPlan.updatePracticePlan(planId, payload)
        else await platformPlan.updateProjectPlan(planId, payload)
      } else if (isSim) {
        await simPlan.createPracticePlan(projectId, templateId, payload)
      } else {
        await platformPlan.createProjectPlan(projectId, templateId, payload)
      }
      toast.success(onHold ? 'Saved on hold' : 'Industry plan saved')
      navigate(viewPath)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!snap && !planId) return <p className="p-6 text-sm">Select a template to copy.</p>

  const listKey =
    step === 1
      ? 'included_phases'
      : step === 2
        ? 'included_activities'
        : step === 3
          ? 'included_deliverables'
          : step === 4
            ? 'included_risks'
            : step === 5
              ? 'included_milestones'
              : step === 6
                ? 'included_roles'
                : null

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to={viewPath} className="text-sm text-blue-600">
        ← Back to plan
      </Link>
      <h1 className="text-xl font-bold mt-2">Customise industry plan</h1>
      <div className="mt-3 flex flex-wrap gap-1">
        {STEPS.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded px-2 py-0.5 text-xs ${step === i ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-xl border p-4 dark:border-slate-700">
        {step === 0 && (
          <>
            <input
              className="w-full rounded border px-3 py-2 text-sm mb-2 dark:bg-slate-900"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Plan title"
            />
            <textarea
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customisation notes"
            />
          </>
        )}
        {listKey && (
          <ul className="max-h-96 overflow-y-auto space-y-1 text-sm">
            {(snap[listKey] || []).map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.included !== false}
                  onChange={() => toggleIncluded(listKey, i)}
                />
                <span>
                  {item.phase_name ||
                    item.activity_name ||
                    item.deliverable_name ||
                    item.risk_title ||
                    item.milestone_name ||
                    item.role_title}
                </span>
              </li>
            ))}
          </ul>
        )}
        {step === 7 && (
          <p className="text-sm">
            {planTitle} — {(snap.included_phases || []).filter((p) => p.included !== false).length} phases selected
          </p>
        )}
        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded border px-3 py-1 text-sm">
              Back
            </button>
          )}
          {step < 7 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
              Next
            </button>
          ) : (
            <>
              <button type="button" disabled={saving} onClick={() => save(true)} className="rounded border px-3 py-1 text-sm">
                Put on hold
              </button>
              <button type="button" disabled={saving} onClick={() => save(false)} className="rounded bg-green-600 px-3 py-1 text-sm text-white">
                Save plan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

