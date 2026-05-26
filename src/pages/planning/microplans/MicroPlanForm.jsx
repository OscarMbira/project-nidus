import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Save, ArrowLeft, FileText } from 'lucide-react'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/microPlanService'
import * as simApi from '../../../services/sim/simMicroPlanService'
import { platformDb, simDb } from '../../../services/supabase/supabaseClient'

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
const RAG_OPTIONS = ['green', 'amber', 'red']
const FREQUENCY_OPTIONS = ['daily', 'weekly', 'fortnightly', 'monthly']
const STATUS_OPTIONS = ['draft', 'active', 'on_hold', 'completed', 'cancelled']

const EMPTY = {
  plan_name: '',
  description: '',
  objectives: '',
  scope_in: '',
  scope_out: '',
  assumptions: '',
  constraints: '',
  responsible_team: '',
  review_frequency: 'weekly',
  next_review_date: '',
  overall_rag: 'green',
  status: 'draft',
}

function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none'
const textareaCls = `${inputCls} resize-y min-h-[80px]`

export default function MicroPlanForm() {
  const { id } = useParams()
  const isEdit = !!id
  const isSim = useLocation().pathname.includes('/simulator/')
  const navigate = useNavigate()
  const projectId = usePlanningProjectId()

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const backPath = isSim ? '/simulator/tm/plans/my-plans' : '/platform/plans/my-plans'
  const db = isSim ? simDb : platformDb

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      try {
        const data = isSim ? await simApi.getMicroPlan(id) : await api.getMicroPlan(id)
        if (data) {
          setForm({
            plan_name: data.plan_name || '',
            description: data.description || '',
            objectives: data.objectives || '',
            scope_in: data.scope_in || '',
            scope_out: data.scope_out || '',
            assumptions: data.assumptions || '',
            constraints: data.constraints || '',
            responsible_team: data.responsible_team || '',
            review_frequency: data.review_frequency || 'weekly',
            next_review_date: data.next_review_date ? data.next_review_date.slice(0, 10) : '',
            overall_rag: data.overall_rag || 'green',
            status: data.status || 'draft',
          })
        }
      } catch (e) {
        toast.error(e?.message || 'Failed to load plan')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit, isSim])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async (asDraft = false) => {
    if (!form.plan_name.trim()) {
      toast.error('Plan name is required')
      return
    }
    if (!projectId) {
      toast.error('Please select a project first')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const patch = {
          ...form,
          next_review_date: form.next_review_date || null,
          is_draft: asDraft,
        }
        const updated = isSim ? await simApi.updateMicroPlan(id, patch) : await api.updateMicroPlan(id, patch)
        toast.success(`Plan updated — ${updated.plan_reference || updated.id}`)
        navigate(`${isSim ? '/simulator/pm/planning' : '/pm/planning'}/microplans/${updated.id}`)
      } else {
        const { data: { user } } = await db.auth.getUser()
        if (!user?.id) throw new Error('Not signed in')

        let payload
        if (isSim) {
          payload = {
            practice_project_id: projectId,
            owner_id: user.id,
            created_by: user.id,
            plan_type: 'individual',
            is_draft: asDraft,
            status: asDraft ? 'draft' : form.status,
            ...form,
            next_review_date: form.next_review_date || null,
          }
        } else {
          const { data: proj } = await platformDb.from('projects').select('organisation_id').eq('id', projectId).maybeSingle()
          payload = {
            project_id: projectId,
            organisation_id: proj?.organisation_id ?? null,
            owner_id: user.id,
            created_by: user.id,
            plan_type: 'individual',
            is_draft: asDraft,
            status: asDraft ? 'draft' : form.status,
            ...form,
            next_review_date: form.next_review_date || null,
          }
        }
        const created = isSim ? await simApi.createMicroPlan(payload) : await api.createMicroPlan(payload)
        toast.success(`Plan created — ${created.plan_reference || created.id}`)
        navigate(backPath + (projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''))
      }
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-400 flex items-center justify-center text-sm">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="text-gray-400 hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <FileText className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">
            {isEdit ? 'Edit Plan' : 'Create New Plan'}
          </h1>
        </div>

        <PlanningProjectBar isSim={isSim} />

        <div className="mt-6 grid gap-5">
          {/* Plan Name */}
          <Field label="Plan Name" required>
            <input
              className={inputCls}
              value={form.plan_name}
              onChange={set('plan_name')}
              placeholder="e.g. Sprint 3 Delivery Plan"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              className={textareaCls}
              value={form.description}
              onChange={set('description')}
              placeholder="Brief overview of this plan…"
            />
          </Field>

          {/* Objectives */}
          <Field label="Objectives">
            <textarea
              className={textareaCls}
              value={form.objectives}
              onChange={set('objectives')}
              placeholder="What this plan aims to achieve…"
            />
          </Field>

          {/* Scope In / Out */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Scope In">
              <textarea
                className={textareaCls}
                value={form.scope_in}
                onChange={set('scope_in')}
                placeholder="What is in scope…"
              />
            </Field>
            <Field label="Scope Out">
              <textarea
                className={textareaCls}
                value={form.scope_out}
                onChange={set('scope_out')}
                placeholder="What is out of scope…"
              />
            </Field>
          </div>

          {/* Assumptions / Constraints */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Assumptions">
              <textarea
                className={textareaCls}
                value={form.assumptions}
                onChange={set('assumptions')}
                placeholder="Key assumptions…"
              />
            </Field>
            <Field label="Constraints">
              <textarea
                className={textareaCls}
                value={form.constraints}
                onChange={set('constraints')}
                placeholder="Known constraints…"
              />
            </Field>
          </div>

          {/* Responsible Team */}
          <Field label="Responsible Team">
            <input
              className={inputCls}
              value={form.responsible_team}
              onChange={set('responsible_team')}
              placeholder="e.g. Backend Team"
            />
          </Field>

          {/* Review Frequency / Next Review Date / Status / RAG */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Review Frequency">
              <select className={inputCls} value={form.review_frequency} onChange={set('review_frequency')}>
                {FREQUENCY_OPTIONS.map((f, index) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Next Review Date">
              <input
                type="date"
                className={inputCls}
                value={form.next_review_date}
                onChange={set('next_review_date')}
              />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </Field>
            <Field label="RAG Status">
              <select className={inputCls} value={form.overall_rag} onChange={set('overall_rag')}>
                {RAG_OPTIONS.map((r, index) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-60"
            >
              Save as Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
