/**
 * PBS node — create/edit form (v1101). Routed page per rule 65 (replaces the former modal
 * launched from PBSBuilder.jsx). Success modal (rule 16), unsaved-changes guard (rule 52),
 * multi-line Acceptance criteria (rule 67). Same dual-app (Platform/Simulator) pathname
 * detection as PBSBuilder.jsx, since this codebase's PBS pages are duplicated per app.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { platformDb, simDb } from '@nidus/supabase'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planPBSService'
import * as simApi from '../../../services/sim/simPlanPBSService'

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white'

const EMPTY_FORM = {
  name: '',
  description: '',
  product_type: 'product',
  acceptance_criteria: '',
  quality_criteria: '',
  status: 'not_started',
  parent_id: null,
}

export default function PBSNodeForm() {
  const { pathname } = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isSim = pathname.includes('/simulator/')
  const platformProject = usePlatformProjectId()
  const planningProjectId = usePlanningProjectId()
  const projectId = isSim ? (params.projectId || planningProjectId) : platformProject.projectId
  const { canEdit: platformCanEdit } = useProjectRole(isSim ? null : projectId)
  const canEdit = isSim ? true : platformCanEdit
  const { showSuccess, modal } = useSuccessModal()

  const id = params.id
  const isEdit = !!id
  const parentIdFromQuery = searchParams.get('parent') || null

  const pbsApi = isSim ? simApi : api
  const authClient = isSim ? simDb : platformDb

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [parentName, setParentName] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM, parent_id: parentIdFromQuery })
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  const usesFlatPmPlanningRoute = isSim && pathname.includes('/pm/planning/')
  const backPath = isSim
    ? (usesFlatPmPlanningRoute ? '/simulator/pm/planning/pbs' : `/simulator/practice-projects/${projectId}/scope/pbs`)
    : '/platform/scope/pbs'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isEdit) {
        setLoading(true)
        const node = await pbsApi.getPBSNode(id)
        if (cancelled) return
        const next = {
          name: node?.name || '',
          description: node?.description || '',
          product_type: node?.product_type || 'product',
          acceptance_criteria: node?.acceptance_criteria || '',
          quality_criteria: node?.quality_criteria || '',
          status: node?.status || 'not_started',
          parent_id: node?.parent_id || null,
        }
        setForm(next)
        setInitialSnapshot(JSON.stringify(next))
        setLoading(false)
      } else {
        setInitialSnapshot(JSON.stringify({ ...EMPTY_FORM, parent_id: parentIdFromQuery }))
      }
    })()
    return () => { cancelled = true }
  }, [id, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!form.parent_id) { setParentName(''); return }
      const parent = await pbsApi.getPBSNode(form.parent_id)
      if (!cancelled) setParentName(parent?.name || '')
    })()
    return () => { cancelled = true }
  }, [form.parent_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify(form) !== initialSnapshot
  }, [form, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this PBS node.'
  )

  const handleBack = () => {
    if (isDirty) confirmDiscard(() => navigate(backPath))
    else requestNavigation(backPath)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!projectId || !canEdit || !form.name.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await authClient.auth.getUser()
      if (isEdit) {
        await pbsApi.updatePBSNode(id, {
          name: form.name.trim(),
          description: form.description || null,
          product_type: form.product_type,
          acceptance_criteria: form.acceptance_criteria || null,
          quality_criteria: form.quality_criteria || null,
          status: form.status,
          parent_id: form.parent_id,
        })
        showSuccess({ recordId: form.name, operation: 'updated', message: 'PBS node updated.', onOk: () => navigate(backPath) })
      } else {
        const payload = isSim
          ? {
              practice_project_id: projectId,
              parent_id: form.parent_id,
              name: form.name.trim(),
              description: form.description || null,
              product_type: form.product_type,
              acceptance_criteria: form.acceptance_criteria || null,
              quality_criteria: form.quality_criteria || null,
              status: form.status,
              created_by: user?.id,
            }
          : {
              project_id: projectId,
              parent_id: form.parent_id,
              name: form.name.trim(),
              description: form.description || null,
              product_type: form.product_type,
              acceptance_criteria: form.acceptance_criteria || null,
              quality_criteria: form.quality_criteria || null,
              status: form.status,
              created_by: user?.id,
            }
        const created = await pbsApi.createPBSNode(payload)
        showSuccess({
          recordId: created?.node_code || created?.name,
          operation: 'created',
          message: 'PBS node created.',
          onOk: () => navigate(backPath),
        })
      }
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Product Breakdown Structure
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {isEdit ? 'Edit PBS node' : 'New PBS node'}
      </h1>
      {parentName && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Parent: {parentName}</p>
      )}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!canEdit}
            className={`mt-1 ${inputClass}`}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Type
          <select
            value={form.product_type}
            onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value }))}
            disabled={!canEdit}
            className={`mt-1 ${inputClass}`}
          >
            <option value="product">product</option>
            <option value="sub-product">sub-product</option>
            <option value="component">component</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={!canEdit}
            rows={3}
            className={`mt-1 ${inputClass}`}
          />
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acceptance criteria</label>
          <MultiLineListInput
            viewModeId="pbs-node-acceptance-criteria"
            id="pbs_node_acceptance_criteria"
            value={form.acceptance_criteria}
            onChange={(v) => setForm((f) => ({ ...f, acceptance_criteria: v }))}
            placeholder="e.g. All P1 defects resolved before sign-off"
            ariaLabelPrefix="acceptance criterion"
            itemColumnLabel="Acceptance criterion"
            disabled={!canEdit}
          />
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            disabled={!canEdit}
            className={`mt-1 ${inputClass}`}
          >
            <option value="not_started">not_started</option>
            <option value="in_progress">in_progress</option>
            <option value="under_review">under_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </label>

        {canEdit && (
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleBack} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </form>
      {modal}
    </div>
  )
}
