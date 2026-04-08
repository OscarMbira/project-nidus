/**
 * Configuration Item Record View Page
 * View single Configuration Item Record
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2 } from 'lucide-react'
import ConfigurationItemView from '../components/ci/ConfigurationItemView'
import { getConfigurationItemById } from '../services/configurationItemRecordService'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const CI_VIEW_SECTIONS = [
  { title: 'Configuration Item', fields: [
    { key: 'configuration_item_identifier', label: 'Identifier' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'status_code', label: 'Status' }
  ]}
]

export default function ConfigurationItemRecordView() {
  const { itemId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (itemId) {
      fetchItem()
    }
  }, [itemId])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationItemById(itemId)
      setItem(data)
    } catch (error) {
      console.error('Error fetching Configuration Item:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(platformProjectPath(routeKey, 'configuration-items', '${itemId}', 'edit'))
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

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Configuration Item not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate(platformProjectPath(routeKey, 'configuration-items'))}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Configuration Item Register
        </button>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportWord={() => exportRecordToWord(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportExcel={() => exportRecordToExcel(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportCSV={() => exportRecordToCSV(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportXML={() => exportRecordToXML(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportJSON={() => exportRecordToJSON(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
          onExportPrint={() => exportRecordToPrint(CI_VIEW_SECTIONS, item, `ConfigurationItem_${item.configuration_item_identifier || item.id}`)}
        />
      </div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </button>
      </div>
      <ConfigurationItemView itemId={itemId} onEdit={handleEdit} />
    </div>
  )
}
