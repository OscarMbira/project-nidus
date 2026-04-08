/**
 * Configuration Item View Component
 * Read-only view of Configuration Item with tabs
 */

import { useState, useEffect } from 'react'
import { 
  Package, 
  Edit2, 
  GitBranch, 
  BarChart3, 
  Layers,
  Link2,
  Shield,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react'
import { getConfigurationItemById } from '../../services/configurationItemRecordService'
import { getVersionsByItem, getCurrentVersion } from '../../services/configurationItemVersionService'
import { getStatusHistory } from '../../services/configurationItemStatusService'
import { getParentItems, getChildItems } from '../../services/configurationItemRelationshipService'
import VersionHistorySection from './VersionHistorySection'
import StatusHistorySection from './StatusHistorySection'
import BaselinesSection from './BaselinesSection'
import RelationshipsSection from './RelationshipsSection'

export default function ConfigurationItemView({ itemId, onEdit, readOnly = true }) {
  const [item, setItem] = useState(null)
  const [versions, setVersions] = useState([])
  const [currentVersion, setCurrentVersion] = useState(null)
  const [statusHistory, setStatusHistory] = useState([])
  const [relationships, setRelationships] = useState({ parentItems: [], childItems: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (itemId) {
      fetchData()
    }
  }, [itemId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [itemData, versionsData, currentVersionData, statusHistoryData, relationshipsData] = await Promise.all([
        getConfigurationItemById(itemId),
        getVersionsByItem(itemId),
        getCurrentVersion(itemId),
        getStatusHistory(itemId),
        getRelationshipsByItem(itemId)
      ])

      setItem(itemData)
      setVersions(versionsData || [])
      setCurrentVersion(currentVersionData)
      setStatusHistory(statusHistoryData || [])
      setRelationships(relationshipsData || { parentItems: [], childItems: [] })
    } catch (error) {
      console.error('Error fetching Configuration Item data:', error)
      alert('Error loading Configuration Item: ' + error.message)
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
      case 'SUPERSEDED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'versions', label: 'Versions', icon: GitBranch },
    { id: 'status', label: 'Status History', icon: BarChart3 },
    { id: 'relationships', label: 'Relationships', icon: Link2 },
    { id: 'baselines', label: 'Baselines', icon: Layers }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Configuration Item...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Configuration Item not found</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Identifier</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {item.configuration_item_identifier}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Version</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {item.current_version}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                {item.current_status_code && (
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(item.current_status_code)}`}>
                    {item.current_status_code}
                  </span>
                )}
              </div>
            </div>

            {item.item_description && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.item_description}</p>
              </div>
            )}

            {item.product && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Linked Product</h3>
                <p className="text-gray-900 dark:text-white">{item.product.product_name}</p>
              </div>
            )}
          </div>
        )

      case 'versions':
        return <VersionHistorySection itemId={itemId} />

      case 'status':
        return <StatusHistorySection itemId={itemId} />

      case 'baselines':
        return <BaselinesSection projectId={item.project_id} />

      case 'relationships':
        return <RelationshipsSection itemId={itemId} />

      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {tabs.find(t => t.id === activeTab)?.label} section details will be displayed here.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.item_name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {item.configuration_item_identifier} • Version {item.current_version}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {item.current_status_code && (
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.current_status_code)}`}>
                {item.current_status_code}
              </span>
            )}
            {!readOnly && onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 overflow-x-auto px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
