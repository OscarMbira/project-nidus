/**
 * Configuration MS Create Page
 * Create new Configuration Management Strategy
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ConfigurationMSForm from '../components/cfg/ConfigurationMSForm'
import { createConfigurationMS } from '../services/configurationManagementStrategyService'
import toast from 'react-hot-toast'

export default function ConfigurationMSCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [cfgMsData, setCfgMsData] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    // Validate required fields
    const newErrors = {}
    if (!cfgMsData.purpose || cfgMsData.purpose.length < 50) {
      newErrors.purpose = 'Purpose must be at least 50 characters'
    }
    if (!cfgMsData.objectives || cfgMsData.objectives.length < 30) {
      newErrors.objectives = 'Objectives must be at least 30 characters'
    }
    if (!cfgMsData.scope || cfgMsData.scope.length < 30) {
      newErrors.scope = 'Scope must be at least 30 characters'
    }
    if (!cfgMsData.configuration_planning_approach || cfgMsData.configuration_planning_approach.length < 50) {
      newErrors.configuration_planning_approach = 'Configuration planning approach must be at least 50 characters'
    }
    if (!cfgMsData.configuration_control_approach || cfgMsData.configuration_control_approach.length < 50) {
      newErrors.configuration_control_approach = 'Configuration control approach must be at least 50 characters'
    }
    if (!cfgMsData.configuration_assurance_approach || cfgMsData.configuration_assurance_approach.length < 50) {
      newErrors.configuration_assurance_approach = 'Configuration assurance approach must be at least 50 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      const newCfgMs = await createConfigurationMS(projectId, cfgMsData)
      toast.success('Configuration Management Strategy created successfully')
      navigate(platformProjectPath(routeKey, 'configuration-ms'))
    } catch (error) {
      console.error('Error creating Configuration MS:', error)
      toast.error('Error creating Configuration MS: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'configuration-ms'))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={handleCancel}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Configuration MS
      </button>
      <ConfigurationMSForm
        cfgMsData={cfgMsData}
        onChange={setCfgMsData}
        errors={errors}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
