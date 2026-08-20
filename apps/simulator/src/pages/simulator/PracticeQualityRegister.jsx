/**
 * Practice Quality Register Page
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getPracticeQualityRegister } from '../../services/sim/practiceQualityService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import { DashboardRegisterTabBar } from '@nidus/ui'

const PRACTICE_QUALITY_COLUMNS = [
  { key: 'activity_name', label: 'Name' },
  { key: 'activity_type', label: 'Type' },
  { key: 'quality_status', label: 'Status' }
]

export default function PracticeQualityRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ quality_status: '', search: '' })
  const [pageTab, setPageTab] = useState('dashboard')

  useEffect(() => {
    if (projectId) loadItems()
  }, [projectId, filters])

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await getPracticeQualityRegister(projectId, filters)
      if (result.success) setItems(result.data || [])
    } catch (error) {
      console.error('Error loading quality items:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const match = (...vals) => items.filter((i) => vals.includes(String(i.quality_status || '').toLowerCase())).length
    return {
      total: items.length,
      passed: match('passed'),
      failed: match('failed'),
      inReview: match('in-review', 'pending'),
    }
  }, [items])

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Quality Register</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and manage practice quality activities</p>
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Practice Quality Register sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap justify-end gap-2">
            <ExportListMenu columns={PRACTICE_QUALITY_COLUMNS} data={items} baseFilename="PracticeQualityItems" disabled={!items.length} />
            <button onClick={() => navigate(`/simulator/practice-quality-register/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" /> Add Quality Item
            </button>
          </div>
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="tabpanel" aria-label="Quality dashboard">
          {[
            { label: 'Total', value: stats.total, className: 'text-gray-900 dark:text-white' },
            { label: 'Passed', value: stats.passed, className: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'In review / pending', value: stats.inReview, className: 'text-amber-700 dark:text-amber-300' },
            { label: 'Failed', value: stats.failed, className: 'text-red-700 dark:text-red-300' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`text-2xl font-bold ${card.className}`}>{loading ? '—' : card.value}</p>
            </div>
          ))}
        </div>
      )}

      {pageTab === 'register' && (
        <div role="tabpanel" aria-label="Quality register">
          <div className="mb-4 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search quality items..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <select value={filters.quality_status} onChange={(e) => setFilters({ ...filters, quality_status: e.target.value })} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-review">In Review</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {loading ? <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div> : items.length === 0 ? <div className="text-center py-12 text-gray-500 dark:text-gray-400">No quality items found</div> : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableRowNumberHeader className="!normal-case" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quality Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item, index) => (
                    <tr key={item.id} onClick={() => navigate(`/simulator/practice-quality-activity/${item.id}?projectId=${projectId}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.product_description?.substring(0, 60)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.product_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${item.quality_status === 'passed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : item.quality_status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : item.quality_status === 'in-review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {item.quality_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.quality_score || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
