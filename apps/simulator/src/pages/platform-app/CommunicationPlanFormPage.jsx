/**
 * Full-page Add/Edit Communication Plan (not a modal).
 * Routes: /platform/stakeholders/communications/new
 *         /platform/stakeholders/communications/edit/:planId
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import CommunicationPlanForm from '../../components/stakeholders/CommunicationPlanForm'
import { getCommunicationPlans, getStakeholders, saveCommunicationPlan } from '../../services/stakeholderService'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import {
  communicationPlanHref,
  communicationPlanRecordKey,
  findStakeholderByRouteKey,
  stakeholderRecordKey,
} from '@nidus/shared/utils/communicationPlanRoute'

export default function CommunicationPlanFormPage() {
  const navigate = useNavigate()
  const { planId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const focusStakeholderId = searchParams.get('stakeholderId') || ''
  const readOnly = location.pathname.includes('/communications/view/')
  const { currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const projectId = location.state?.projectId || currentProjectId || ''
  const { showSuccess, modal: successModal } = useSuccessModal()
  const { requestNavigation } = useUnsavedChangesGuard(false)
  const [plan, setPlan] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(Boolean(planId))
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!planId) {
      if (projectCtxLoading && !location.state?.projectId) return undefined
      setLoading(false)
      return undefined
    }
    if (projectCtxLoading && !location.state?.projectId && !planId) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const peopleProjectId = projectId
        const [records, people] = await Promise.all([
          getCommunicationPlans({ id: planId }),
          peopleProjectId
            ? getStakeholders({ project_id: peopleProjectId, limit: 500 })
            : Promise.resolve(null),
        ])
        if (cancelled) return
        const loaded = records?.[0] || null
        setPlan(loaded)
        let audience = people
        if (!audience && loaded?.project_id) {
          audience = await getStakeholders({ project_id: loaded.project_id, limit: 500 })
        }
        if (!cancelled) setStakeholders(audience || [])
        if (!loaded) setLoadError('Communication plan was not found.')
        const planKey = communicationPlanRecordKey(loaded)
        const focused = findStakeholderByRouteKey(audience || [], focusStakeholderId)
        const action = location.pathname.includes('/communications/view/') ? 'view' : 'edit'
        const next = loaded ? communicationPlanHref(action, loaded, focused) : null
        const pathChanged = Boolean(loaded && planKey && planKey !== planId)
        const searchChanged = Boolean(focused && stakeholderRecordKey(focused) !== focusStakeholderId)
        if (next && (pathChanged || searchChanged)) {
          navigate({ pathname: next.pathname, search: next.search }, { replace: true, state: location.state })
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load communication plan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [planId, projectId, projectCtxLoading, location.state?.projectId])

  const listTarget = {
    pathname: '/platform/stakeholders/communications',
    state: { projectId: plan?.project_id || projectId },
  }

  const leaveToList = () => {
    navigate(listTarget)
  }

  const backToList = () => {
    requestNavigation(listTarget)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveCommunicationPlan(
        { ...formData, project_id: formData.project_id || projectId },
        plan?.id || null
      )
      showSuccess({
        recordId: saved?.plan_reference || saved?.plan_name || formData.plan_name || 'Communication plan',
        operation: plan?.id ? 'updated' : 'created',
        message: 'Communication plan saved.',
        onOk: leaveToList,
      })
    } catch (e) {
      setSaveError(e?.message || 'Failed to save communication plan')
      throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-4">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to communication plans
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden />
        </div>
      ) : loadError ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-700 dark:text-gray-200">{loadError}</p>
        </div>
      ) : (
        <>
          {saveError && (
            <p className="mb-4 text-sm text-red-700 dark:text-red-300">{saveError}</p>
          )}
          <CommunicationPlanForm
            plan={plan}
            projectId={plan?.project_id || projectId}
            stakeholders={stakeholders}
            focusStakeholderId={focusStakeholderId}
            readOnly={readOnly}
            onSave={saving ? async () => {} : handleSave}
            onCancel={backToList}
          />
        </>
      )}
      {successModal}
    </div>
  )
}
