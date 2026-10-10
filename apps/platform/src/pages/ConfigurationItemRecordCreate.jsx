/**
 * Configuration Item Record Create Page
 * Create new Configuration Item
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ConfigurationItemForm from '../components/ci/ConfigurationItemForm'
import { createConfigurationItem, updateConfigurationItem, configurationItemWritePayload } from '../services/configurationItemRecordService'
import { getConfigurationMSByProject } from '../services/configurationManagementStrategyService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import toast from 'react-hot-toast'

export default function ConfigurationItemRecordCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [itemData, setItemData] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [cfgMsId, setCfgMsId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingPath, setPendingPath] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const isDirty = !pendingPath && Boolean(itemData.item_name || itemData.item_description || itemData.item_type_id || itemData.product_id_list || itemData.storage_location || itemData.repository_url)
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (pendingPath) navigate(pendingPath)
  }, [pendingPath, navigate])

  useEffect(() => {
    if (projectId) {
      fetchStrategy()
    }
  }, [projectId])

  const fetchStrategy = async () => {
    try {
      const cfgMs = await getConfigurationMSByProject(projectId)
      if (cfgMs) {
        setCfgMsId(cfgMs.id)
      } else {
        toast.error('No approved Configuration Management Strategy found. Please create one first.')
        navigate(platformProjectPath(routeKey, 'configuration-ms'))
      }
    } catch (error) {
      console.error('Error fetching Configuration Management Strategy:', error)
      toast.error('Error loading Configuration Management Strategy: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validate required fields
    const newErrors = {}
    if (!itemData.item_name || itemData.item_name.length < 3) {
      newErrors.item_name = 'Item name must be at least 3 characters'
    }
    if (!itemData.item_type_id) {
      newErrors.item_type_id = 'Item type is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      const created = await createConfigurationItem(projectId, itemData.item_name)
      const updated = await updateConfigurationItem(created.id, configurationItemWritePayload(itemData))
      const recordId = updated.configuration_item_identifier || created.configuration_item_identifier || created.id
      showSuccess({
        recordId,
        operation: 'created',
        message: 'Configuration item was created.',
        onOk: () => setPendingPath(platformProjectPath(routeKey, 'configuration-items', recordId)),
      })
    } catch (error) {
      console.error('Error creating Configuration Item:', error)
      toast.error('Error creating Configuration Item: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const nextPath = platformProjectPath(routeKey, 'configuration-items')
    confirmDiscard(() => setPendingPath(nextPath))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cfgMsId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No approved Configuration Management Strategy found. Please create one first.
          </p>
          <button
            onClick={() => navigate(platformProjectPath(routeKey, 'configuration-ms'))}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Configuration Management Strategy
          </button>
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
        Back to Configuration Item Register
      </button>
      <ConfigurationItemForm
        itemData={itemData}
        cfgMsId={cfgMsId}
        projectId={projectId}
        onChange={setItemData}
        errors={errors}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
      {successModal}
    </div>
  )
}
