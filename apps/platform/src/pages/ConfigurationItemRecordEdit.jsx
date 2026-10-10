/**
 * Configuration Item Record Edit Page
 * Edit existing Configuration Item
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ConfigurationItemForm from '../components/ci/ConfigurationItemForm'
import { getConfigurationItemById, updateConfigurationItem, configurationItemWritePayload } from '../services/configurationItemRecordService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import toast from 'react-hot-toast'

export default function ConfigurationItemRecordEdit() {
  const { itemId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [itemData, setItemData] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseline, setBaseline] = useState('')
  const [pendingPath, setPendingPath] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const isDirty = !pendingPath && baseline !== '' && JSON.stringify(itemData) !== baseline
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (pendingPath) navigate(pendingPath)
  }, [pendingPath, navigate])

  useEffect(() => {
    if (itemId && projectId) {
      fetchItem()
    }
  }, [itemId, projectId])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationItemById(itemId, projectId)
      setItemData(data || {})
      setBaseline(JSON.stringify(data || {}))
    } catch (error) {
      console.error('Error fetching Configuration Item:', error)
      toast.error('Error loading Configuration Item: ' + error.message)
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
      const updated = await updateConfigurationItem(itemData.id, configurationItemWritePayload(itemData))
      const recordId = updated.configuration_item_identifier || itemData.configuration_item_identifier || itemId
      setBaseline(JSON.stringify(itemData))
      showSuccess({
        recordId,
        operation: 'updated',
        message: 'Configuration item was updated.',
        onOk: () => setPendingPath(platformProjectPath(routeKey, 'configuration-items', recordId)),
      })
    } catch (error) {
      console.error('Error updating Configuration Item:', error)
      toast.error('Error updating Configuration Item: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const nextPath = platformProjectPath(routeKey, 'configuration-items', itemData.configuration_item_identifier || itemId)
    confirmDiscard(() => {
      setBaseline(JSON.stringify(itemData))
      setPendingPath(nextPath)
    })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading Configuration Item...</p>
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
        Back to Configuration Item
      </button>
      <ConfigurationItemForm
        itemData={itemData}
        cfgMsId={itemData.cfg_ms_id}
        projectId={projectId}
        itemId={itemData.id}
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
