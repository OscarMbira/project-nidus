/**
 * Configuration Item List Component
 * List view of all Configuration Items for a project
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Search, Plus } from 'lucide-react'
import { getConfigurationItemsByProject } from '../../services/configurationItemRecordService'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import ExportListMenu from '../ui/ExportListMenu'
import { DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui'

const CI_COLUMNS = [
  { key: 'configuration_item_identifier', label: 'Identifier' },
  { key: 'item_name', label: 'Item Name' },
  { key: 'status_code', label: 'Status' }
]

export default function ConfigurationItemList({ projectId, routeKey, onCreate }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageTab, setPageTab] = useState('dashboard')
  const [statusGroupFilter, setStatusGroupFilter] = useState('') // '' | 'approved' | 'review' | 'wip' | 'baselined'

  useEffect(() => {
    if (projectId) {
      fetchItems()
    }
  }, [projectId, searchTerm])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const data = await getConfigurationItemsByProject(projectId)

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

  const stats = useMemo(() => {
    const code = (c) => items.filter((i) => String(i.current_status_code || '').toUpperCase() === c).length
    return {
      total: items.length,
      approved: code('APPROVED') + code('BASELINED'),
      review: code('UNDER_REVIEW') + code('REVIEW'),
      wip: code('WIP') + code('WORK_IN_PROGRESS'),
      baselined: items.filter((i) => i.is_in_baseline).length,
    }
  }, [items])

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => !['APPROVED', 'BASELINED'].includes(String(i.current_status_code || '').toUpperCase()))
        .slice(0, 5),
    [items]
  )

  const STATUS_GROUP_CODES = {
    approved: ['APPROVED', 'BASELINED'],
    review: ['UNDER_REVIEW', 'REVIEW'],
    wip: ['WIP', 'WORK_IN_PROGRESS'],
  }

  const registerItems = useMemo(() => {
    if (!statusGroupFilter) return items
    if (statusGroupFilter === 'baselined') return items.filter((i) => i.is_in_baseline)
    const codes = STATUS_GROUP_CODES[statusGroupFilter] || []
    return items.filter((i) => codes.includes(String(i.current_status_code || '').toUpperCase()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, statusGroupFilter])

  const showRegisterFiltered = (group) => {
    setStatusGroupFilter(group)
    setPageTab('register')
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configuration Item Register
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track all configuration items and their versions
            </p>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Configuration Item Register sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap justify-end gap-2">
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
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div className="space-y-6" role="tabpanel" aria-label="Configuration dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.total, className: 'text-gray-900 dark:text-white', onClick: () => showRegisterFiltered('') },
              { label: 'Approved / baselined', value: stats.approved, className: 'text-emerald-700 dark:text-emerald-300', onClick: () => showRegisterFiltered('approved') },
              { label: 'Under review', value: stats.review, className: 'text-amber-700 dark:text-amber-300', onClick: () => showRegisterFiltered('review') },
              { label: 'Work in progress', value: stats.wip, className: 'text-blue-700 dark:text-blue-300', onClick: () => showRegisterFiltered('wip') },
              { label: 'In a baseline', value: stats.baselined, className: 'text-sky-700 dark:text-sky-300', onClick: () => showRegisterFiltered('baselined') },
            ].map((card) => (
              <DashboardStatCard key={card.label} label={card.label} value={card.value} accentClassName={card.className} onClick={card.onClick} />
            ))}
          </div>
          <RegisterOpenItemsWidget
            title="Configuration Items Not Yet Baselined"
            icon={Package}
            rows={activeItems}
            totalCount={stats.total - stats.approved}
            columns={[
              { key: 'configuration_item_identifier', label: 'Identifier', className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
              { key: 'item_name', label: 'Item Name', className: 'font-medium text-gray-900 dark:text-white' },
              {
                key: 'current_status_code',
                label: 'Status',
                render: (i) => (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(i.current_status_code)}`}>
                    {i.current_status_code || 'unset'}
                  </span>
                ),
              },
              { key: 'current_version', label: 'Version', className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap' },
            ]}
            rowKey={(i) => i.id}
            searchFields={['item_name', 'configuration_item_identifier']}
            onRowClick={(item) => navigate(platformProjectPath(routeKey || projectId, 'configuration-items', item.configuration_item_identifier || item.id))}
            onViewAll={() => setPageTab('register')}
            viewAllLabel="Open full Configuration Item Register"
            emptyMessage="No open configuration items"
          />
        </div>
      )}

      {pageTab === 'register' && (
        <div role="tabpanel" aria-label="Configuration register" className="space-y-6">
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

          {statusGroupFilter && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
                {statusGroupFilter} only
              </span>
              <button type="button" onClick={() => setStatusGroupFilter('')} className="text-blue-600 dark:text-blue-400 hover:underline">
                Clear
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {registerItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {items.length === 0 ? 'No Configuration Items found' : 'No items match this filter'}
                </p>
                {onCreate && items.length === 0 && (
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
                {registerItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(platformProjectPath(routeKey || projectId, 'configuration-items', item.configuration_item_identifier || item.id))}
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
      )}
    </div>
  )
}
