/**
 * CMS Create Page
 * Create new Communication Management Strategy
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import CMSForm from '../components/cms/CMSForm'
import { createCMSForProject } from '../services/communicationManagementStrategyService'

export default function CMSCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [cmsData, setCmsData] = useState({
    purpose: '',
    objectives: '',
    scope: '',
    strategy_responsibility: '',
    communication_planning_approach: '',
    communication_control_approach: '',
    communication_assurance_approach: '',
    corporate_communication_policy_reference: '',
    variance_from_corporate: '',
    variance_justification: ''
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
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
      const newCms = await createCMSForProject(projectId, cmsData)
      navigate(platformProjectPath(routeKey, 'cms'))
    } catch (error) {
      console.error('Error creating CMS:', error)
      alert('Error creating CMS: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'cms'))
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
          Create Communication Management Strategy
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
