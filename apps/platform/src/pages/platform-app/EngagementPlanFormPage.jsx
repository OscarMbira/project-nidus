/**
 * Full-page Add/Edit Engagement Plan (not a modal).
 * Routes: /platform/stakeholders/engagement/new
 *         /platform/stakeholders/engagement/edit/:engagementId
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EngagementPlanForm from '../../components/stakeholders/EngagementPlanForm'
import { getStakeholders, getStakeholderEngagement, saveStakeholderEngagement } from '../../services/stakeholderService'
import { useCurrentProject } from '../../context/CurrentProjectContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { engagementPlanRecordKey } from '@nidus/shared/utils/engagementPlanRoute'

export default function EngagementPlanFormPage() {
  const navigate = useNavigate()
  const { engagementId } = useParams()
  const location = useLocation()
  const { currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const projectId = location.state?.projectId || currentProjectId || ''
  const presetStakeholderId = location.state?.stakeholderId || ''
  const readOnly = location.pathname.includes('/engagement/view/')
  const { showSuccess, modal: successModal } = useSuccessModal()
  const { requestNavigation } = useUnsavedChangesGuard(false)
  const [plan, setPlan] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const decodedId = decodeURIComponent(engagementId || '')
    if (!decodedId && projectCtxLoading && !location.state?.projectId && !projectId) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        if (decodedId) {
          const records = await getStakeholderEngagement({ id: decodedId })
          if (cancelled) return
          const loaded = records?.[0] || null
          setPlan(loaded)
          setStakeholders(loaded?.stakeholder?.id ? [loaded.stakeholder] : [])
          if (!loaded) setLoadError('Engagement plan was not found.')
          const planKey = engagementPlanRecordKey(loaded)
          const action = readOnly ? 'view' : 'edit'
          if (loaded && planKey && planKey !== decodedId) {
            navigate(
              { pathname: `/platform/stakeholders/engagement/${action}/${encodeURIComponent(planKey)}` },
              { replace: true, state: location.state },
            )
          }
          return
        }
        const draftProjectId = location.state?.projectId || projectId
        const people = draftProjectId
          ? await getStakeholders({ project_id: draftProjectId, limit: 500 })
          : []
        if (cancelled) return
        setStakeholders(people || [])
        setPlan(null)
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load engagement plan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [engagementId, projectId, projectCtxLoading, location.state, readOnly, navigate])

  const boardTarget = {
    pathname: '/platform/stakeholders/engagement',
    state: { projectId: plan?.project_id || projectId },
  }

  const leaveToBoard = () => {
    navigate(boardTarget)
  }

  const backToBoard = () => {
    requestNavigation(boardTarget)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveStakeholderEngagement(
        { ...formData, project_id: formData.project_id || projectId },
        plan?.id || null
      )
      const person = stakeholders.find((s) => s.id === (saved?.stakeholder_id || formData.stakeholder_id))
      showSuccess({
        recordId: saved?.engagement_reference || person?.stakeholder_name || plan?.stakeholder?.stakeholder_name || 'Engagement plan',
        operation: plan?.id ? 'updated' : 'created',
        message: 'Engagement plan saved.',
        onOk: leaveToBoard,
      })
    } catch (e) {
      setSaveError(e?.message || 'Failed to save engagement plan')
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
          onClick={backToBoard}
          className="inline-flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to engagement planning
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden />
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">Loading engagement plan…</p>
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
          <EngagementPlanForm
            plan={plan}
            stakeholderId={plan?.stakeholder_id || presetStakeholderId}
            projectId={plan?.project_id || projectId}
            stakeholders={stakeholders}
            onSave={saving ? async () => {} : handleSave}
            onCancel={backToBoard}
            readOnly={readOnly}
          />
        </>
      )}
      {successModal}
    </div>
  )
}
