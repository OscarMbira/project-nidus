/**
 * Full-page Add/Edit Stakeholder Analysis (not a modal).
 * Routes: /platform/stakeholders/analysis/new
 *         /platform/stakeholders/analysis/edit/:analysisId
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import StakeholderAnalysisForm from '../../components/stakeholders/StakeholderAnalysisForm'
import { getStakeholders, getStakeholderAnalysis, saveStakeholderAnalysis } from '../../services/stakeholderService'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'

export default function StakeholderAnalysisFormPage() {
  const navigate = useNavigate()
  const { analysisId } = useParams()
  const location = useLocation()
  const { currentProjectId, loading: projectCtxLoading } = useCurrentProject()
  const projectId = location.state?.projectId || currentProjectId || ''
  const presetStakeholderId = location.state?.stakeholderId || ''
  const { showSuccess, modal: successModal } = useSuccessModal()
  const { requestNavigation } = useUnsavedChangesGuard(false)
  const [analysis, setAnalysis] = useState(null)
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (projectCtxLoading && !location.state?.projectId) return undefined
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const loads = []
        if (projectId) loads.push(getStakeholders({ project_id: projectId, limit: 500 }))
        else loads.push(Promise.resolve([]))
        if (analysisId) loads.push(getStakeholderAnalysis({ id: analysisId }))
        const [people, records] = await Promise.all(loads)
        if (cancelled) return
        setStakeholders(people || [])
        setAnalysis(analysisId ? (records?.[0] || null) : null)
        if (analysisId && !records?.[0]) setLoadError('Analysis record was not found.')
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load analysis')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [analysisId, projectId, projectCtxLoading, location.state?.projectId])

  const leaveToList = () => {
    navigate('/platform/stakeholders/analysis', { state: { projectId } })
  }

  const backToList = () => {
    requestNavigation({
      pathname: '/platform/stakeholders/analysis',
      state: { projectId },
    })
  }

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      const saved = await saveStakeholderAnalysis(
        { ...formData, project_id: formData.project_id || projectId },
        analysis?.id || null
      )
      const person = stakeholders.find((s) => s.id === (saved?.stakeholder_id || formData.stakeholder_id))
      showSuccess({
        recordId: person?.stakeholder_name || saved?.stakeholder?.stakeholder_name || 'Analysis',
        operation: analysis?.id ? 'updated' : 'created',
        message: 'Stakeholder analysis saved.',
        onOk: leaveToList,
      })
    } catch (e) {
      alert(e?.message || 'Failed to save analysis')
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
          Back to analysis
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
        <StakeholderAnalysisForm
          analysis={analysis}
          stakeholderId={analysis?.stakeholder_id || presetStakeholderId}
          projectId={analysis?.project_id || projectId}
          stakeholders={stakeholders}
          onSave={saving ? () => {} : handleSave}
          onCancel={backToList}
        />
      )}
      {successModal}
    </div>
  )
}
