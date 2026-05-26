import { useState, useCallback, memo } from 'react'
import { Search, FileText, ExternalLink, Target, Package, AlertTriangle, Shield, Network, Award } from 'lucide-react'
import {
  searchMandateObjectives,
  searchMandateScope,
  searchMandateConstraints,
  searchMandateAuthorities,
  searchMandateInterfaces,
  searchMandateQualityExpectations
} from '../../services/projectMandateService'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Unified Mandate Search Page
 * Allows PMO to search for objectives, scope items, and constraints across all mandate records
 */
function MandateSearch() {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('objectives') // 'objectives', 'scope', 'constraints', 'authorities', 'interfaces', 'quality'
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    scopeType: 'in-scope', // For scope searches
  })

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      let data = []

      switch (searchType) {
        case 'objectives':
          data = await searchMandateObjectives(searchTerm.trim(), filters)
          break
        case 'scope':
          data = await searchMandateScope(searchTerm.trim(), filters.scopeType, filters)
          break
        case 'constraints':
          data = await searchMandateConstraints(searchTerm.trim(), filters)
          break
        case 'authorities':
          data = await searchMandateAuthorities(searchTerm.trim(), filters)
          break
        case 'interfaces':
          data = await searchMandateInterfaces(searchTerm.trim(), filters)
          break
        case 'quality':
          data = await searchMandateQualityExpectations(searchTerm.trim(), filters)
          break
        default:
          data = []
      }

      setResults(data)
    } catch (err) {
      console.error('Error searching mandates:', err)
      setError(err.message || 'Failed to search mandates')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, searchType, filters])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const handleViewMandate = useCallback((mandateId) => {
    navigate(`${basePath}/${mandateId}/view`)
  }, [navigate, basePath])

  const getSearchIcon = () => {
    switch (searchType) {
      case 'objectives': return <Target className="w-5 h-5" />
      case 'scope': return <Package className="w-5 h-5" />
      case 'constraints': return <AlertTriangle className="w-5 h-5" />
      case 'authorities': return <Shield className="w-5 h-5" />
      case 'interfaces': return <Network className="w-5 h-5" />
      case 'quality': return <Award className="w-5 h-5" />
      default: return <Search className="w-5 h-5" />
    }
  }

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case 'objectives':
        return "Search objectives (e.g., 'reduce costs', 'improve efficiency')..."
      case 'scope':
        return `Search ${filters.scopeType === 'out-of-scope' ? 'exclusions' : 'deliverables'} (e.g., 'mobile app', 'API integration')...`
      case 'constraints':
        return "Search constraints (e.g., 'budget limit', 'deadline', 'compliance')..."
      case 'authorities':
        return "Search authorities (e.g., 'Board of Directors', 'CEO', 'Finance Department')..."
      case 'interfaces':
        return "Search interfaces (e.g., 'CRM integration', 'HR dependency', 'API connection')..."
      case 'quality':
        return "Search quality expectations (e.g., 'ISO compliance', '99.9% uptime', 'security standards')..."
      default:
        return "Search..."
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search Mandate Records</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Search for specific objectives, scope items, or constraints across all project mandates to find similar projects or reuse content.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              onClick={() => setSearchType('objectives')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'objectives'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Target className="w-4 h-4" />
              Objectives
            </button>
            <button
              onClick={() => setSearchType('scope')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'scope'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Package className="w-4 h-4" />
              Scope
            </button>
            <button
              onClick={() => setSearchType('constraints')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'constraints'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Constraints
            </button>
            <button
              onClick={() => setSearchType('authorities')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'authorities'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              Authorities
            </button>
            <button
              onClick={() => setSearchType('interfaces')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'interfaces'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Network className="w-4 h-4" />
              Interfaces
            </button>
            <button
              onClick={() => setSearchType('quality')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                searchType === 'quality'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Award className="w-4 h-4" />
              Quality
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {getSearchIcon()}
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={getSearchPlaceholder()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Scope Type Selector (only for scope searches) */}
            {searchType === 'scope' && (
              <select
                value={filters.scopeType}
                onChange={(e) => setFilters(prev => ({ ...prev, scopeType: e.target.value }))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="in-scope">In-Scope</option>
                <option value="out-of-scope">Out-of-Scope</option>
              </select>
            )}

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
              Found {results.length} mandate{results.length !== 1 ? 's' : ''} with matching {searchType}
            </h2>
          </div>

          <div className="space-y-4">
            {results.map((mandate, index) => (
              <MandateResultCard
                key={mandate.id}
                mandate={mandate}
                searchTerm={searchTerm}
                searchType={searchType}
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
            No mandates found with {searchType} matching "{searchTerm}"
          </p>
        </div>
      )}

      {!searchTerm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Enter a search term above to find mandates with matching {searchType}
          </p>
        </div>
      )}
    </div>
  )
}

// Memoized Result Card Component
const MandateResultCard = memo(function MandateResultCard({ mandate, searchTerm, searchType, onView }) {
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

  const getMatchingItems = () => {
    switch (searchType) {
      case 'objectives':
        return mandate.matchingObjectives || []
      case 'scope':
        return mandate.matchingItems || []
      case 'constraints':
        return mandate.matchingConstraints || []
      case 'authorities':
        return mandate.matchingAuthorities || []
      case 'interfaces':
        return mandate.matchingInterfaces || []
      case 'quality':
        return mandate.matchingExpectations || []
      default:
        return []
    }
  }

  const getItemLabel = () => {
    switch (searchType) {
      case 'objectives':
        return 'Matching Objectives'
      case 'scope':
        return `Matching ${mandate.scopeType === 'out-of-scope' ? 'Exclusions' : 'Deliverables'}`
      case 'constraints':
        return 'Matching Constraints'
      case 'authorities':
        return 'Matching Authorities'
      case 'interfaces':
        return 'Matching Interfaces'
      case 'quality':
        return 'Matching Quality Expectations'
      default:
        return 'Matching Items'
    }
  }

  const matchingItems = getMatchingItems()

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
          {getItemLabel()} ({mandate.matchCount}):
        </p>
        <div className="space-y-1">
          {matchingItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-2 rounded border ${
                searchType === 'scope' && mandate.scopeType === 'out-of-scope'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : searchType === 'constraints'
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : searchType === 'authorities'
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                  : searchType === 'interfaces'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                  : searchType === 'quality'
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >              <p className="text-sm text-gray-900 dark:text-white">
                {highlightText(item, searchTerm)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default memo(MandateSearch)
