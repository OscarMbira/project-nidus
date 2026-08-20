import { useEffect, useMemo, useState } from 'react'
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
import {
  IndustryPlanEntityToolbar,
  IndustryPlanWbsGrid,
  IndustryPlanFlatEntityGrid,
} from '@nidus/ui'
import {
  addIndustryPlanCustomColumn,
  updateIndustryPlanCustomColumn,
  deleteIndustryPlanCustomColumn,
  ensureIndustryRowIds,
} from '@nidus/shared/utils/industryPlanCustomColumnOps.js'
import { normalizeCustomColumnDefs } from '@nidus/shared/utils/industryPlanGridColumns.js'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

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
const VIEW_STORAGE_PREFIX = 'nidus.industryPlan.view.'

function loadView(stepKey) {
  try {
    const v = localStorage.getItem(`${VIEW_STORAGE_PREFIX}${stepKey}`)
    return v === 'grid' ? 'grid' : 'card'
  } catch {
    return 'card'
  }
}

function saveView(stepKey, view) {
  try {
    localStorage.setItem(`${VIEW_STORAGE_PREFIX}${stepKey}`, view)
  } catch { /* ignore */ }
}

const emptyHeader = {
  industry_code: '',
  industry_name: '',
  description: '',
  typical_duration: '',
  icon: 'layers',
  tags: '',
  status: 'draft',
}

const ENTITY_STEPS = {
  1: 'phases',
  2: 'activities',
  3: 'deliverables',
  4: 'risks',
  5: 'milestones',
  6: 'roles',
}

export default function IndustryTemplateForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [step, setStep] = useState(0)
  const [header, setHeader] = useState(emptyHeader)
  const [templateUi, setTemplateUi] = useState({ custom_column_defs: [] })
  const [phases, setPhases] = useState([])
  const [activities, setActivities] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [risks, setRisks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [roles, setRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [templateRecord, setTemplateRecord] = useState(null)
  const [formTab, setFormTab] = useState('wizard')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [viewByTab, setViewByTab] = useState(() => ({
    phases: loadView('phases'),
    activities: loadView('activities'),
    deliverables: loadView('deliverables'),
    risks: loadView('risks'),
    milestones: loadView('milestones'),
    roles: loadView('roles'),
  }))

  useEffect(() => {
    if (formTab !== 'audit' || !templateRecord) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        templateRecord.created_by,
        templateRecord.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, templateRecord])

  useEffect(() => {
    if (!id) return
    getTemplateById(id).then((t) => {
      if (!t) return
      setTemplateRecord(t)
      setHeader({
        industry_code: t.industry_code,
        industry_name: t.industry_name,
        description: t.description || '',
        typical_duration: t.typical_duration || '',
        icon: t.icon || 'layers',
        tags: (t.tags || []).join(', '),
        status: t.status,
      })
      setTemplateUi(t.ui && typeof t.ui === 'object' ? t.ui : { custom_column_defs: [] })
      const loadedPhases = t.phases || []
      const bundled = ensureIndustryRowIds({
        phases: loadedPhases,
        activities: attachPhaseNumbers(loadedPhases, t.activities),
        deliverables: attachPhaseNumbers(loadedPhases, t.deliverables),
        milestones: attachPhaseNumbers(loadedPhases, t.milestones),
        risks: t.risks || [],
        roles: t.roles || [],
      }).plan
      setPhases(bundled.phases)
      setActivities(bundled.activities)
      setDeliverables(bundled.deliverables)
      setRisks(bundled.risks)
      setMilestones(bundled.milestones)
      setRoles(bundled.roles)
    })
  }, [id])

  const planSnapshot = useMemo(
    () => ({
      ui: templateUi,
      phases,
      activities,
      deliverables,
      risks,
      milestones,
      roles,
    }),
    [templateUi, phases, activities, deliverables, risks, milestones, roles],
  )

  const applyPlan = (nextPlan) => {
    setTemplateUi(nextPlan.ui || { custom_column_defs: [] })
    setPhases(nextPlan.phases || [])
    setActivities(nextPlan.activities || [])
    setDeliverables(nextPlan.deliverables || [])
    setRisks(nextPlan.risks || [])
    setMilestones(nextPlan.milestones || [])
    setRoles(nextPlan.roles || [])
  }

  const customDefs = normalizeCustomColumnDefs(templateUi?.custom_column_defs)
  const customColumnApi = {
    defs: customDefs,
    onAdd: ({ label, type }) => {
      const result = addIndustryPlanCustomColumn(planSnapshot, { label, type })
      if (result.ok) applyPlan(result.plan)
      return result
    },
    onUpdate: (colId, { label, type }) => {
      const result = updateIndustryPlanCustomColumn(planSnapshot, colId, { label, type })
      if (result.ok) applyPlan(result.plan)
      return result
    },
    onDelete: (colId) => {
      const result = deleteIndustryPlanCustomColumn(planSnapshot, colId)
      if (result.ok) applyPlan(result.plan)
      return result
    },
  }

  const setTabView = (tabId, view) => {
    setViewByTab((prev) => ({ ...prev, [tabId]: view }))
    saveView(tabId, view)
  }

  const save = async (publish = false) => {
    setSaving(true)
    try {
      const tags = header.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const withIds = ensureIndustryRowIds({
        phases,
        activities,
        deliverables,
        risks,
        milestones,
        roles,
      }).plan
      const payload = {
        industry_code: header.industry_code.trim(),
        industry_name: header.industry_name.trim(),
        description: header.description,
        typical_duration: header.typical_duration,
        icon: header.icon,
        tags,
        status: publish ? 'published' : header.status,
        ui: templateUi || { custom_column_defs: [] },
      }
      let templateId = id
      if (isEdit) {
        await updateTemplate(id, payload)
      } else {
        const created = await createTemplate(payload)
        templateId = created.id
      }
      await replaceTemplateChildren(templateId, withIds)
      toast.success(publish ? 'Template published' : 'Template saved')
      navigate(`/pmo/industry-templates/${templateId}`)
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const entityKey = ENTITY_STEPS[step]
  const entityView = entityKey ? viewByTab[entityKey] : 'card'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/pmo/industry-templates" className="text-sm text-blue-600 dark:text-blue-400">
        ← Back to list
      </Link>
      <h1 className="text-2xl font-bold mt-2 text-gray-900 dark:text-gray-100">
        {isEdit ? 'Edit' : 'New'} Industry Template
      </h1>

      <div className="mt-4">
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} detailsLabel="Edit" auditLabel="Audit details" />
      </div>

      {formTab === 'audit' && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {!templateRecord?.id ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this template is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this industry template, and how it is classified.">
              <AuditCard title="Identity" description="How this template is labelled and tracked.">
                <AuditField label="Industry code" value={header.industry_code || templateRecord.industry_code} />
                <AuditField label="Industry name" value={header.industry_name || templateRecord.industry_name} />
                <AuditField label="Status" value={humanizeAuditToken(header.status || templateRecord.status)} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this template sits.">
                <AuditField label="Typical duration" value={header.typical_duration || templateRecord.typical_duration} />
              </AuditCard>
              <AuditCard title="Record history" description="When this template was created and last changed.">
                <AuditField label="Created by" value={templateRecord.created_by ? auditUserLabels[templateRecord.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={templateRecord.created_at} />
                <AuditField label="Updated by" value={templateRecord.updated_by ? auditUserLabels[templateRecord.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={templateRecord.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      )}

      {formTab === 'wizard' && (
      <>
      <div className="mt-4 flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded px-2 py-1 text-xs ${
              step === i
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {step === 0 && (
          <div className="space-y-3">
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
              placeholder="Industry code (unique)"
              value={header.industry_code}
              onChange={(e) => setHeader({ ...header, industry_code: e.target.value })}
              disabled={isEdit}
            />
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
              placeholder="Industry name"
              value={header.industry_name}
              onChange={(e) => setHeader({ ...header, industry_name: e.target.value })}
            />
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
              rows={3}
              placeholder="Description"
              value={header.description}
              onChange={(e) => setHeader({ ...header, description: e.target.value })}
            />
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
              placeholder="Typical duration"
              value={header.typical_duration}
              onChange={(e) => setHeader({ ...header, typical_duration: e.target.value })}
            />
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
              value={header.status}
              onChange={(e) => setHeader({ ...header, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Phases"
              count={phases.length}
              view={entityView}
              onViewChange={(v) => setTabView('phases', v)}
              onAdd={() =>
                setPhases([
                  ...phases,
                  {
                    phase_number: phases.length + 1,
                    phase_name: '',
                    phase_description: '',
                    estimated_duration: '',
                    sort_order: phases.length + 1,
                  },
                ])
              }
              addLabel="Add phase"
            />
            {entityView === 'grid' ? (
              <IndustryPlanWbsGrid
                phases={phases}
                setPhases={setPhases}
                activities={activities}
                setActivities={setActivities}
                deliverables={deliverables}
                setDeliverables={setDeliverables}
                milestones={milestones}
                setMilestones={setMilestones}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
              />
            ) : (
              <PhaseEditor phases={phases} setPhases={setPhases} />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Activities"
              count={activities.length}
              view={entityView}
              onViewChange={(v) => setTabView('activities', v)}
              onAdd={() =>
                setActivities([
                  ...activities,
                  {
                    activity_name: '',
                    phase_number: phases[0]?.phase_number ?? 1,
                    activity_type: 'task',
                    sort_order: activities.length + 1,
                    required_skills: [],
                  },
                ])
              }
              addLabel="Add activity"
            />
            {entityView === 'grid' ? (
              <IndustryPlanFlatEntityGrid
                listKey="activities"
                rows={activities}
                setRows={setActivities}
                phases={phases}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
                indentNameKey="activity_name"
              />
            ) : (
              <ActivityEditor phases={phases} activities={activities} setActivities={setActivities} />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Deliverables"
              count={deliverables.length}
              view={entityView}
              onViewChange={(v) => setTabView('deliverables', v)}
              onAdd={() =>
                setDeliverables([
                  ...deliverables,
                  {
                    deliverable_name: '',
                    phase_number: phases[0]?.phase_number ?? 1,
                    deliverable_type: 'document',
                    is_mandatory: false,
                    sort_order: deliverables.length + 1,
                  },
                ])
              }
              addLabel="Add deliverable"
            />
            {entityView === 'grid' ? (
              <IndustryPlanFlatEntityGrid
                listKey="deliverables"
                rows={deliverables}
                setRows={setDeliverables}
                phases={phases}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
                indentNameKey="deliverable_name"
              />
            ) : (
              <DeliverableEditor phases={phases} deliverables={deliverables} setDeliverables={setDeliverables} />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Risks"
              count={risks.length}
              view={entityView}
              onViewChange={(v) => setTabView('risks', v)}
              onAdd={() =>
                setRisks([
                  ...risks,
                  { risk_title: '', risk_category: '', likelihood: '', impact: '', sort_order: risks.length + 1 },
                ])
              }
              addLabel="Add risk"
            />
            {entityView === 'grid' ? (
              <IndustryPlanFlatEntityGrid
                listKey="risks"
                rows={risks}
                setRows={setRisks}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
              />
            ) : (
              <RiskEditor risks={risks} setRisks={setRisks} />
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Milestones"
              count={milestones.length}
              view={entityView}
              onViewChange={(v) => setTabView('milestones', v)}
              onAdd={() =>
                setMilestones([
                  ...milestones,
                  {
                    milestone_name: '',
                    phase_number: phases[0]?.phase_number ?? 1,
                    sort_order: milestones.length + 1,
                  },
                ])
              }
              addLabel="Add milestone"
            />
            {entityView === 'grid' ? (
              <IndustryPlanFlatEntityGrid
                listKey="milestones"
                rows={milestones}
                setRows={setMilestones}
                phases={phases}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
                indentNameKey="milestone_name"
              />
            ) : (
              <MilestoneEditor phases={phases} milestones={milestones} setMilestones={setMilestones} />
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <IndustryPlanEntityToolbar
              title="Roles"
              count={roles.length}
              view={entityView}
              onViewChange={(v) => setTabView('roles', v)}
              onAdd={() =>
                setRoles([
                  ...roles,
                  { role_title: '', is_key_role: false, sort_order: roles.length + 1 },
                ])
              }
              addLabel="Add role"
            />
            {entityView === 'grid' ? (
              <IndustryPlanFlatEntityGrid
                listKey="roles"
                rows={roles}
                setRows={setRoles}
                customDefs={customDefs}
                customColumnApi={customColumnApi}
              />
            ) : (
              <RoleEditor roles={roles} setRoles={setRoles} />
            )}
          </div>
        )}

        {step === 7 && (
          <div className="text-sm space-y-2 text-gray-800 dark:text-gray-200">
            <p>
              <strong>{header.industry_name}</strong> ({header.industry_code}) — {phases.length} phases,{' '}
              {activities.length} activities, {deliverables.length} deliverables, {risks.length} risks
            </p>
            {customDefs.length > 0 && (
              <p className="text-xs text-gray-500">Custom columns: {customDefs.map((d) => d.label).join(', ')}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
            >
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
                className="rounded border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
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
      </>
      )}
    </div>
  )
}
