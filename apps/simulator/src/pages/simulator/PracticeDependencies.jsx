/**
 * Practice Dependencies Page
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getPracticeDependencies } from '../../services/sim/practicePortfolioService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const DEP_COLUMNS = [
  { key: 'source_name', label: 'Source' },
  { key: 'target_name', label: 'Target' },
  { key: 'dependency_category', label: 'Type' },
  { key: 'status', label: 'Status' }
]

export default function PracticeDependencies() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('simulator-practice-dependencies', 'grid')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    if (projectId) {
      loadDependencies()
    }
  }, [projectId])

  const loadDependencies = async () => {
    try {
      setLoading(true)
      const result = await getPracticeDependencies(projectId)
      if (result.success) setDependencies(result.data || [])
    } catch (error) {
      console.error('Error loading dependencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDependencies = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return dependencies
    return dependencies.filter((dep) => {
      const source = `${dep.source_name ?? ''} ${dep.source_type ?? ''}`.toLowerCase()
      const target = `${dep.target_name ?? ''} ${dep.target_type ?? ''}`.toLowerCase()
      const cat = dep.dependency_category?.toLowerCase() ?? ''
      const status = dep.status?.toLowerCase() ?? ''
      return source.includes(q) || target.includes(q) || cat.includes(q) || status.includes(q)
    })
  }, [dependencies, debouncedSearch])

  const exportRows = useMemo(
    () =>
      filteredDependencies.map((dep, index) => ({
        ...dep,
        source_name: dep.source_name || dep.source_type || '',
        target_name: dep.target_name || dep.target_type || ''
      })),
    [filteredDependencies]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Dependencies</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportListMenu columns={DEP_COLUMNS} data={exportRows} baseFilename="PracticeDependencies" disabled={!exportRows.length} />
          <button
            onClick={() => navigate(`/simulator/practice-dependencies/create?projectId=${projectId}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Dependency
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search dependencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[44px]"
            aria-label="Search dependencies"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Practice dependencies layout" />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredDependencies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No dependencies found</div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDependencies.map((dep, index) => (
                <tr key={dep.id} className="hover:bg-gray-700/50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{dep.source_name || dep.source_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{dep.target_name || dep.target_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{dep.dependency_category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{dep.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDependencies.map((dep, index) => (
            <article
              key={dep.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 min-h-[160px] min-w-0"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Source → Target</div>
              <p className="font-medium text-gray-900 dark:text-white mb-3 line-clamp-2">
                {(dep.source_name || dep.source_type || '—') + ' → ' + (dep.target_name || dep.target_type || '—')}
              </p>
              <div className="flex flex-wrap gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <span className="px-2 py-1 text-xs rounded bg-blue-900/40 text-blue-200 border border-blue-700/50">{dep.dependency_category}</span>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200">{dep.status}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
