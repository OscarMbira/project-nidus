/**
 * Practice Stakeholders Page
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getPracticeStakeholders } from '../../services/sim/practiceStakeholderService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'

const STAKEHOLDER_EXPORT_COLUMNS = [
  { key: 'stakeholder_name', label: 'Name' },
  { key: 'stakeholder_organization', label: 'Organization' },
  { key: 'stakeholder_type', label: 'Type' },
  { key: 'stakeholder_status', label: 'Status' }
]

export default function PracticeStakeholders() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('simulator-practice-stakeholders', 'grid')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    if (projectId) {
      loadStakeholders()
    }
  }, [projectId])

  const loadStakeholders = async () => {
    try {
      setLoading(true)
      const result = await getPracticeStakeholders(projectId)
      if (result.success) setStakeholders(result.data || [])
    } catch (error) {
      console.error('Error loading stakeholders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStakeholders = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return stakeholders
    return stakeholders.filter((s) => {
      const name = s.stakeholder_name?.toLowerCase() ?? ''
      const org = s.stakeholder_organization?.toLowerCase() ?? ''
      const type = s.stakeholder_type?.toLowerCase() ?? ''
      const status = s.stakeholder_status?.toLowerCase() ?? ''
      return name.includes(q) || org.includes(q) || type.includes(q) || status.includes(q)
    })
  }, [stakeholders, debouncedSearch])

  const goTo = (id) => navigate(`/simulator/practice-stakeholders/${id}?projectId=${projectId}`)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Stakeholders</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportListMenu
            columns={STAKEHOLDER_EXPORT_COLUMNS}
            data={filteredStakeholders}
            baseFilename="PracticeStakeholders"
            disabled={!filteredStakeholders.length}
          />
          <button
            onClick={() => navigate(`/simulator/practice-stakeholders/create?projectId=${projectId}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Stakeholder
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[44px]"
            aria-label="Search stakeholders"
          />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Practice stakeholders layout" />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredStakeholders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No stakeholders found</div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStakeholders.map((stakeholder) => (
                <tr
                  key={stakeholder.id}
                  onClick={() => goTo(stakeholder.id)}
                  className="cursor-pointer hover:bg-gray-700/50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{stakeholder.stakeholder_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{stakeholder.stakeholder_organization || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{stakeholder.stakeholder_type || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{stakeholder.stakeholder_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStakeholders.map((stakeholder) => (
            <button
              key={stakeholder.id}
              type="button"
              onClick={() => goTo(stakeholder.id)}
              className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow min-h-[160px] min-w-0"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{stakeholder.stakeholder_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{stakeholder.stakeholder_organization || '—'}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs rounded bg-blue-900/40 text-blue-200 border border-blue-700/50">
                  {stakeholder.stakeholder_type || 'Type N/A'}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200">{stakeholder.stakeholder_status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
