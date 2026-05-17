import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  createTemplate,
  getTemplateById,
  updateTemplate,
  replaceTemplateChildren,
} from '../../services/industryTemplateService'
import {
  PhaseEditor,
  ActivityEditor,
  DeliverableEditor,
  RiskEditor,
  MilestoneEditor,
  RoleEditor,
} from '../../components/industryPlan/IndustryTemplateWizardEditors'

function attachPhaseNumbers(phases, rows) {
  const byId = new Map((phases || []).map((p) => [p.id, p.phase_number]))
  return (rows || []).map((row) => ({
    ...row,
    phase_number:
      row.phase_number ??
      (row.phase_id ? byId.get(row.phase_id) : null) ??
      phases[0]?.phase_number ??
      1,
  }))
}

const STEPS = ['Header', 'Phases', 'Activities', 'Deliverables', 'Risks', 'Milestones', 'Roles', 'Review']

const emptyHeader = {
  industry_code: '',
  industry_name: '',
  description: '',
  typical_duration: '',
  icon: 'layers',
  tags: '',
  status: 'draft',
}

export default function IndustryTemplateForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [step, setStep] = useState(0)
  const [header, setHeader] = useState(emptyHeader)
  const [phases, setPhases] = useState([])
  const [activities, setActivities] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [risks, setRisks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [roles, setRoles] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getTemplateById(id).then((t) => {
      if (!t) return
      setHeader({
        industry_code: t.industry_code,
        industry_name: t.industry_name,
        description: t.description || '',
        typical_duration: t.typical_duration || '',
        icon: t.icon || 'layers',
        tags: (t.tags || []).join(', '),
        status: t.status,
      })
      const loadedPhases = t.phases || []
      setPhases(loadedPhases)
      setActivities(attachPhaseNumbers(loadedPhases, t.activities))
      setDeliverables(attachPhaseNumbers(loadedPhases, t.deliverables))
      setRisks(t.risks || [])
      setMilestones(attachPhaseNumbers(loadedPhases, t.milestones))
      setRoles(t.roles || [])
    })
  }, [id])

  const save = async (publish = false) => {
    setSaving(true)
    try {
      const tags = header.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const payload = {
        industry_code: header.industry_code.trim(),
        industry_name: header.industry_name.trim(),
        description: header.description,
        typical_duration: header.typical_duration,
        icon: header.icon,
        tags,
        status: publish ? 'published' : header.status,
      }
      let templateId = id
      if (isEdit) {
        await updateTemplate(id, payload)
      } else {
        const created = await createTemplate(payload)
        templateId = created.id
      }
      await replaceTemplateChildren(templateId, {
        phases,
        activities,
        deliverables,
        risks,
        milestones,
        roles,
      })
      toast.success(publish ? 'Template published' : 'Template saved')
      navigate(`/pmo/industry-templates/${templateId}`)
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/pmo/industry-templates" className="text-sm text-blue-600">
        ← Back to list
      </Link>
      <h1 className="text-2xl font-bold mt-2">{isEdit ? 'Edit' : 'New'} Industry Template</h1>
      <div className="mt-4 flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded px-2 py-1 text-xs ${step === i ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        {step === 0 && (
          <div className="space-y-3">
            <input
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              placeholder="Industry code (unique)"
              value={header.industry_code}
              onChange={(e) => setHeader({ ...header, industry_code: e.target.value })}
              disabled={isEdit}
            />
            <input
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              placeholder="Industry name"
              value={header.industry_name}
              onChange={(e) => setHeader({ ...header, industry_name: e.target.value })}
            />
            <textarea
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              rows={3}
              placeholder="Description"
              value={header.description}
              onChange={(e) => setHeader({ ...header, description: e.target.value })}
            />
            <input
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              placeholder="Typical duration"
              value={header.typical_duration}
              onChange={(e) => setHeader({ ...header, typical_duration: e.target.value })}
            />
            <select
              className="w-full rounded border px-3 py-2 text-sm dark:bg-slate-900"
              value={header.status}
              onChange={(e) => setHeader({ ...header, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}

        {step === 1 && <PhaseEditor phases={phases} setPhases={setPhases} />}
        {step === 2 && <ActivityEditor phases={phases} activities={activities} setActivities={setActivities} />}
        {step === 3 && (
          <DeliverableEditor phases={phases} deliverables={deliverables} setDeliverables={setDeliverables} />
        )}
        {step === 4 && <RiskEditor risks={risks} setRisks={setRisks} />}
        {step === 5 && (
          <MilestoneEditor phases={phases} milestones={milestones} setMilestones={setMilestones} />
        )}
        {step === 6 && <RoleEditor roles={roles} setRoles={setRoles} />}

        {step === 7 && (
          <div className="text-sm space-y-2">
            <p>
              <strong>{header.industry_name}</strong> ({header.industry_code}) — {phases.length} phases,{' '}
              {activities.length} activities, {deliverables.length} deliverables, {risks.length} risks
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded border px-4 py-2 text-sm">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Next
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => save(false)}
                className="rounded border px-4 py-2 text-sm"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save(true)}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white"
              >
                Publish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
