/**
 * Configuration Item List Component
 * List view of all Configuration Items for a project
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Search, Filter, Plus } from 'lucide-react'
import { getConfigurationItemsByProject } from '../../services/configurationItemRecordService'
import ExportListMenu from '../ui/ExportListMenu'

const CI_COLUMNS = [
  { key: 'configuration_item_identifier', label: 'Identifier' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'status_code', label: 'Status' }
]

export default function ConfigurationItemList({ projectId, onCreate }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (projectId) {
      fetchItems()
    }
  }, [projectId, searchTerm])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationItemsByProject(projectId)
      
      // Filter by search term if provided
      let filteredData = data
      if (searchTerm) {
        filteredData = data.filter(item => 
          item.configuration_item_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setItems(filteredData || [])
    } catch (error) {
      console.error('Error fetching Configuration Items:', error)
      alert('Error loading Configuration Items: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (statusCode) => {
    switch (statusCode?.toUpperCase()) {
      case 'APPROVED':
      case 'BASELINED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'UNDER_REVIEW':
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'WIP':
      case 'WORK_IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Configuration Items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuration Item Register
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track all configuration items and their versions
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={CI_COLUMNS} data={items} baseFilename="ConfigurationItems" disabled={!items.length} />
          {onCreate && (
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Configuration Item
          </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by identifier or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No Configuration Items found
            </p>
            {onCreate && (
              <button
                onClick={onCreate}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create First Configuration Item
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/platform/projects/${projectId}/configuration-items/${item.id}`)}
                className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.item_name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.configuration_item_identifier}
                      </span>
                      {item.current_status_code && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.current_status_code)}`}>
                          {item.current_status_code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Version: {item.current_version}</span>
                      {item.item_type && (
                        <span>Type: {item.item_type.item_type_name}</span>
                      )}
                      {item.is_in_baseline && (
                        <span className="text-blue-600 dark:text-blue-400">In Baseline</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
