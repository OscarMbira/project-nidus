/**
 * Practice Risk Register Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getPracticeRisks } from '../../services/sim/practiceRiskService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'

const PRACTICE_RISK_COLUMNS = [
  { key: 'risk_title', label: 'Title' },
  { key: 'risk_level', label: 'Level' },
  { key: 'risk_score', label: 'Score' }
]

export default function PracticeRiskRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', risk_level: '' })
  const [riskViewMode, setRiskViewMode] = useViewMode('simulator-practice-risk-register', 'grid')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (projectId) loadRisks()
  }, [projectId, filters, debouncedSearch])

  const loadRisks = async () => {
    try {
      setLoading(true)
      const result = await getPracticeRisks(projectId, { ...filters, search: debouncedSearch })
      if (result.success) setRisks(result.data || [])
    } catch (error) {
      console.error('Error loading risks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Risk Register</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_RISK_COLUMNS} data={risks} baseFilename="PracticeRisks" disabled={!risks.length} />
          <button onClick={() => navigate(`/simulator/practice-risk-register/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Add Risk
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search risks..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[44px]"
            aria-label="Search risks"
          />
        </div>
        <select
          value={filters.risk_level}
          onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[44px]"
        >
          <option value="">All Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <ViewToggle value={riskViewMode} onChange={setRiskViewMode} ariaLabel="Practice risks layout" />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : risks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No risks found</div>
      ) : riskViewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {risks.map((risk) => (
                <tr
                  key={risk.id}
                  onClick={() => navigate(`/simulator/practice-risk-register/${risk.id}?projectId=${projectId}`)}
                  className="cursor-pointer hover:bg-gray-700/50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{risk.risk_title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{risk.risk_description?.substring(0, 60)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{risk.risk_category || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        risk.risk_level === 'critical'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                          : risk.risk_level === 'high'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                            : risk.risk_level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      }`}
                    >
                      {risk.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{risk.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{risk.risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {risks.map((risk) => (
            <button
              key={risk.id}
              type="button"
              onClick={() => navigate(`/simulator/practice-risk-register/${risk.id}?projectId=${projectId}`)}
              className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow min-h-[160px] min-w-0"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{risk.risk_title}</h3>
              {risk.risk_description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{risk.risk_description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200">{risk.risk_category || 'Category'}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    risk.risk_level === 'critical'
                      ? 'bg-red-900/40 text-red-200'
                      : risk.risk_level === 'high'
                        ? 'bg-orange-900/40 text-orange-200'
                        : risk.risk_level === 'medium'
                          ? 'bg-yellow-900/40 text-yellow-200'
                          : 'bg-green-900/40 text-green-200'
                  }`}
                >
                  {risk.risk_level}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-blue-900/40 text-blue-200">{risk.status}</span>
                <span className="text-gray-500 dark:text-gray-400">Score: {risk.risk_score ?? '—'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
