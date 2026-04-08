/**
 * Full-page Add/Edit Stakeholder form (not modal).
 * Routes: /platform/stakeholders/register/new, /platform/stakeholders/register/edit/:stakeholderId
 */

import { lazy, Suspense, useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getStakeholder } from '../../services/stakeholderService'
const StakeholderForm = lazy(() => import('../../components/stakeholders/StakeholderForm'))

export default function StakeholderFormPage() {
  const navigate = useNavigate()
  const { stakeholderId } = useParams()
  const location = useLocation()
  const projectId = location.state?.projectId || ''
  const viewOnly = location.state?.viewOnly === true
  const isResumingDraft = location.state?.isResumingDraft === true
  const draftFormData = location.state?.formData || null
  const draftId = location.state?.draftId || null
  const [stakeholder, setStakeholder] = useState(null)
  const [loading, setLoading] = useState(!!stakeholderId)
  const [loadError, setLoadError] = useState(null)

  // Edit route with no ID: redirect to register list
  useEffect(() => {
    if (location.pathname.includes('/edit') && !stakeholderId) {
      navigate('/platform/stakeholders/register', { replace: true, state: { projectId } })
      return
    }
  }, [location.pathname, stakeholderId, navigate, projectId])

  useEffect(() => {
    if (!stakeholderId) {
      setLoading(false)
      setLoadError(null)
      return
    }
    let cancelled = false
    setLoadError(null)
    getStakeholder(stakeholderId)
      .then((data) => { if (!cancelled) setStakeholder(data) })
      .catch((e) => {
        if (!cancelled) {
          console.error(e)
          setLoadError(e?.message || 'Failed to load stakeholder')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stakeholderId])

  const handleSave = (saved) => {
    const isMultiple = Array.isArray(saved)
    const message = stakeholder
      ? `Stakeholder updated. Record ID: ${saved.id}`
      : isMultiple
        ? `Stakeholder created and assigned to ${saved.length} project(s). Record IDs: ${saved.map((s) => s.id).join(', ')}`
        : `Stakeholder created. Record ID: ${saved.id}`
    navigate('/platform/stakeholders/register', { replace: true, state: { toast: { type: 'success', message } } })
  }

  const handleCancel = () => {
    navigate('/platform/stakeholders/register', { replace: true, state: { projectId } })
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="w-full px-4 py-12 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Could not load stakeholder</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{loadError}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/platform/stakeholders/register', { state: { projectId } })}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Register
            </button>
            <button
              type="button"
              onClick={() => { setLoadError(null); setLoading(true); getStakeholder(stakeholderId).then(setStakeholder).catch((e) => setLoadError(e?.message || 'Failed to load')).finally(() => setLoading(false)) }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="w-full px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden />
        </div>
      }
    >
      <StakeholderForm
        stakeholder={stakeholder}
        projectId={projectId || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
        embedded={false}
        readOnly={viewOnly}
        initialDraftData={isResumingDraft ? draftFormData : undefined}
        draftId={draftId}
        formRoute="/platform/stakeholders/register/new"
      />
    </Suspense>
  )
}
