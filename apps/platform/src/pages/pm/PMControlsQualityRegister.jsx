/**
 * PM Controls - Quality Register (Write)
 */

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle } from 'lucide-react'
import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import { DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui'
import { getQualityRegister } from '../../services/qualityManagementService'
import QualityRegister from '../../components/quality/QualityRegister'

const QUALITY_STATUS_COLOR = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  passed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'in-review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  conditional: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function PMControlsQualityRegister() {
  const { projectId } = usePlatformProjectId()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useViewMode('pm-quality-register', 'list')
  const [pageTab, setPageTab] = useState('dashboard')
  const [statusGroupFilter, setStatusGroupFilter] = useState('') // '' | 'approved' | 'in-review' | 'failed'

  const fetchItems = async () => {
    if (!projectId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getQualityRegister({ project_id: projectId })
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching quality register:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const stats = useMemo(() => {
    const match = (...vals) => items.filter((i) => vals.includes(String(i.quality_status || '').toLowerCase())).length
    return {
      total: items.length,
      approved: match('approved', 'passed'),
      inReview: match('in-review', 'pending', 'conditional'),
      failed: match('failed', 'rejected'),
    }
  }, [items])

  const openItems = useMemo(
    () =>
      items
        .filter((i) => !['approved', 'passed'].includes(String(i.quality_status || '').toLowerCase()))
        .sort((a, b) => new Date(b.quality_review_planned_date || 0) - new Date(a.quality_review_planned_date || 0))
        .slice(0, 5),
    [items]
  )

  const STATUS_GROUPS = {
    approved: ['approved', 'passed'],
    'in-review': ['in-review', 'pending', 'conditional'],
    failed: ['failed', 'rejected'],
  }

  const registerItems = useMemo(() => {
    if (!statusGroupFilter) return items
    const vals = STATUS_GROUPS[statusGroupFilter] || []
    return items.filter((i) => vals.includes(String(i.quality_status || '').toLowerCase()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, statusGroupFilter])

  const showRegisterFiltered = (group) => {
    setStatusGroupFilter(group)
    setPageTab('register')
  }

  const initialQueryFilter = useInitialFilterFromQuery(['filter'])
  useEffect(() => {
    if (initialQueryFilter.filter) showRegisterFiltered(initialQueryFilter.filter === 'all' ? '' : initialQueryFilter.filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryFilter.filter])

  return (
    <DocumentGovernanceProvider>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quality Register
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage project quality register
              </p>
            </div>
            <DashboardRegisterTabBar
              value={pageTab}
              onChange={setPageTab}
              registerLabel="Register"
              ariaLabel="Quality Register sections"
            />
          </div>
          {pageTab === 'register' && (
            <div className="flex justify-end">
              <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Quality register layout" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : pageTab === 'dashboard' ? (
          <div className="space-y-6" role="tabpanel" aria-label="Quality dashboard">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total items', value: stats.total, className: 'text-gray-900 dark:text-white', onClick: () => showRegisterFiltered('') },
                { label: 'Approved / passed', value: stats.approved, className: 'text-emerald-700 dark:text-emerald-300', onClick: () => showRegisterFiltered('approved') },
                { label: 'In review / pending', value: stats.inReview, className: 'text-amber-700 dark:text-amber-300', onClick: () => showRegisterFiltered('in-review') },
                { label: 'Failed / rejected', value: stats.failed, className: 'text-red-700 dark:text-red-300', onClick: () => showRegisterFiltered('failed') },
              ].map((card) => (
                <DashboardStatCard key={card.label} label={card.label} value={card.value} accentClassName={card.className} onClick={card.onClick} />
              ))}
            </div>
            <RegisterOpenItemsWidget
              title="Open Quality Items"
              icon={CheckCircle}
              rows={openItems}
              totalCount={items.length - stats.approved}
              columns={[
                { key: 'product_reference', label: 'Reference', className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
                { key: 'product_name', label: 'Product', className: 'font-medium text-gray-900 dark:text-white' },
                {
                  key: 'quality_status',
                  label: 'Status',
                  render: (i) => (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${QUALITY_STATUS_COLOR[String(i.quality_status || '').toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {(i.quality_status || 'unset').replace('-', ' ')}
                    </span>
                  ),
                },
                {
                  key: 'quality_review_planned_date',
                  label: 'Review Date',
                  render: (i) => {
                    const d = i.quality_review_actual_date || i.quality_review_planned_date
                    return d ? new Date(d).toLocaleDateString() : '—'
                  },
                  className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap',
                },
              ]}
              rowKey={(i) => i.id}
              searchFields={['product_name', 'product_reference']}
              onRowClick={() => setPageTab('register')}
              onViewAll={() => setPageTab('register')}
              viewAllLabel="Open full Quality Register"
              emptyMessage="No open quality items"
            />
          </div>
        ) : (
          <div role="tabpanel" aria-label="Quality register">
            {statusGroupFilter && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
                  {statusGroupFilter.replace('-', ' ')} only
                </span>
                <button type="button" onClick={() => setStatusGroupFilter('')} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Clear
                </button>
              </div>
            )}
            <QualityRegister
              items={registerItems}
              onRefresh={fetchItems}
              projectId={projectId}
              registerViewMode={viewMode}
            />
          </div>
        )}
      </div>
    </DocumentGovernanceProvider>
  )
}
