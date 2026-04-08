/**
 * Configuration Item Record Edit Page
 * Edit existing Configuration Item
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ConfigurationItemForm from '../components/ci/ConfigurationItemForm'
import { getConfigurationItemById, updateConfigurationItem } from '../services/configurationItemRecordService'
import toast from 'react-hot-toast'

export default function ConfigurationItemRecordEdit() {
  const { itemId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [itemData, setItemData] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (itemId) {
      fetchItem()
    }
  }, [itemId])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationItemById(itemId)
      setItemData(data)
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      await updateConfigurationItem(itemId, itemData)
      toast.success('Configuration Item updated successfully')
      navigate(platformProjectPath(routeKey, 'configuration-items', '${itemId}'))
    } catch (error) {
      console.error('Error updating Configuration Item:', error)
      toast.error('Error updating Configuration Item: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'configuration-items', '${itemId}'))
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
        onChange={setItemData}
        errors={errors}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />
    </div>
  )
}
