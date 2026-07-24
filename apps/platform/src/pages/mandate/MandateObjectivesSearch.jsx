import { useState, useCallback, memo } from 'react'
import { Search, FileText, ExternalLink } from 'lucide-react'
import { searchMandateObjectives } from '../../services/projectMandateService'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Mandate Objectives Search Page
 * Allows PMO to search for specific objectives across all mandate records
 */
function MandateObjectivesSearch() {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
  })

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await searchMandateObjectives(searchTerm.trim(), filters)
      setResults(data)
    } catch (err) {
      console.error('Error searching objectives:', err)
      setError(err.message || 'Failed to search objectives')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filters])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const handleViewMandate = useCallback((mandateId) => {
    navigate(`${basePath}/${mandateId}/view`)
  }, [navigate, basePath])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search Mandate Objectives</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Search for specific objectives across all project mandates to find similar projects or reuse objectives.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search objectives (e.g., 'reduce costs', 'improve efficiency', 'increase revenue')..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Found {results.length} mandate{results.length !== 1 ? 's' : ''} with matching objectives
            </h2>
          </div>

          <div className="space-y-4">
            {results.map((mandate) => (
              <MandateResultCard
                key={mandate.id}
                mandate={mandate}
                searchTerm={searchTerm}
                onView={handleViewMandate}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && searchTerm && results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No mandates found with objectives matching "{searchTerm}"
          </p>
        </div>
      )}

      {!searchTerm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Enter a search term above to find mandates with matching objectives
          </p>
        </div>
      )}
    </div>
  )
}

// Memoized Result Card Component
const MandateResultCard = memo(function MandateResultCard({ mandate, searchTerm, onView }) {
  const highlightText = useCallback((text, term) => {
    if (!term) return text
    const regex = new RegExp(`(${term})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }, [])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'submitted': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'rejected': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'archived': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      default: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
    }
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mandate.mandate_title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(mandate.document_status)}`}>
              {mandate.document_status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Reference:</span> {mandate.mandate_reference}
            {mandate.created_date && (
              <> | <span className="font-medium">Created:</span> {new Date(mandate.created_date).toLocaleDateString()}</>
            )}
            {mandate.project && (
              <> | <span className="font-medium">Project:</span> {mandate.project.project_name || mandate.project.project_code}</>
            )}
          </p>
        </div>
        <button
          onClick={() => onView(mandate.mandate_reference || mandate.id)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Mandate
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Matching Objectives ({mandate.matchCount}):
        </p>
        <div className="space-y-1">
          {mandate.matchingObjectives.map((objective, idx) => (
            <div
              key={idx}
              className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
            >
              <p className="text-sm text-gray-900 dark:text-white">
                {highlightText(objective, searchTerm)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default memo(MandateObjectivesSearch)
