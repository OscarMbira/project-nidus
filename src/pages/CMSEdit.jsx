/**
 * CMS Edit Page
 * Edit existing Communication Management Strategy
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import CMSForm from '../components/cms/CMSForm'
import { getCMSByProject, updateCMS } from '../services/communicationManagementStrategyService'

export default function CMSEdit() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [cms, setCms] = useState(null)
  const [cmsData, setCmsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchCMS()
    }
  }, [projectId])

  const fetchCMS = async () => {
    try {
      setLoading(true)
      const cmsData = await getCMSByProject(projectId)
      setCms(cmsData)
      setCmsData({
        purpose: cmsData.purpose || '',
        objectives: cmsData.objectives || '',
        scope: cmsData.scope || '',
        strategy_responsibility: cmsData.strategy_responsibility || '',
        communication_planning_approach: cmsData.communication_planning_approach || '',
        communication_control_approach: cmsData.communication_control_approach || '',
        communication_assurance_approach: cmsData.communication_assurance_approach || '',
        corporate_communication_policy_reference: cmsData.corporate_communication_policy_reference || '',
        variance_from_corporate: cmsData.variance_from_corporate || '',
        variance_justification: cmsData.variance_justification || ''
      })
    } catch (error) {
      console.error('Error fetching CMS:', error)
      alert('Error loading CMS: ' + error.message)
      navigate(platformProjectPath(routeKey, 'cms'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!cms) return

    // Validate required fields
    const newErrors = {}
    if (!cmsData.purpose) newErrors.purpose = 'Purpose is required'
    if (!cmsData.objectives) newErrors.objectives = 'Objectives are required'
    if (!cmsData.scope) newErrors.scope = 'Scope is required'
    if (!cmsData.communication_planning_approach) {
      newErrors.communication_planning_approach = 'Planning approach is required'
    }
    if (!cmsData.communication_control_approach) {
      newErrors.communication_control_approach = 'Control approach is required'
    }
    if (!cmsData.communication_assurance_approach) {
      newErrors.communication_assurance_approach = 'Assurance approach is required'
    }
    if (cmsData.variance_from_corporate && !cmsData.variance_justification) {
      newErrors.variance_justification = 'Variance justification is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setSaving(true)
      await updateCMS(cms.id, cmsData)
      navigate(platformProjectPath(routeKey, 'cms'))
    } catch (error) {
      console.error('Error updating CMS:', error)
      alert('Error updating CMS: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'cms'))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading CMS...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cms || !cmsData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          CMS not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(platformProjectPath(routeKey, 'cms'))}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CMS
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Communication Management Strategy
        </h1>
      </div>

      {/* CMS Form */}
      <CMSForm
        cmsData={cmsData}
        onChange={setCmsData}
        errors={errors}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
