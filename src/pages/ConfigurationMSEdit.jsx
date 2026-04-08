/**
 * Configuration MS Edit Page
 * Edit existing Configuration Management Strategy
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ConfigurationMSForm from '../components/cfg/ConfigurationMSForm'
import { getConfigurationMSById, updateConfigurationMS } from '../services/configurationManagementStrategyService'
import toast from 'react-hot-toast'

export default function ConfigurationMSEdit() {
  const { cfgMsId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [cfgMsData, setCfgMsData] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cfgMsId) {
      fetchCfgMs()
    }
  }, [cfgMsId])

  const fetchCfgMs = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationMSById(cfgMsId)
      setCfgMsData(data)
    } catch (error) {
      console.error('Error fetching Configuration MS:', error)
      toast.error('Error loading Configuration MS: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      await updateConfigurationMS(cfgMsId, cfgMsData)
      toast.success('Configuration Management Strategy updated successfully')
      navigate(platformProjectPath(routeKey, 'configuration-ms'))
    } catch (error) {
      console.error('Error updating Configuration MS:', error)
      toast.error('Error updating Configuration MS: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'configuration-ms'))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading Configuration MS...</p>
          </div>
        </div>
      </div>
    )
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
