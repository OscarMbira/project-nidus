import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Eye, Edit, FileText, Search } from 'lucide-react'
import { getAllMandates, getUnlinkedMandates } from '../../services/projectMandateService'
import ExportListMenu from '../../components/ui/ExportListMenu'

/** All mandate fields for list export; Word/PPT choose-fields modal shows these (user picks up to 10). */
const MANDATE_COLUMNS = [
  { key: 'mandate_reference', label: 'Reference' },
  { key: 'mandate_title', label: 'Title' },
  { key: 'document_status', label: 'Status' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'version_number', label: 'Version' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'authority_responsible', label: 'Authority Responsible' },
  { key: 'background', label: 'Background' },
  { key: 'project_objectives', label: 'Objectives' },
  { key: 'scope', label: 'In-Scope' },
  { key: 'scope_exclusions', label: 'Out-of-Scope Exclusions' },
  { key: 'interfaces', label: 'Interfaces' },
  { key: 'quality_expectations', label: 'Quality Expectations' },
  { key: 'outline_business_case', label: 'Outline Business Case' },
  { key: 'proposed_executive_name', label: 'Proposed Executive' },
  { key: 'proposed_pm_name', label: 'Proposed PM' },
  { key: 'project_created_date', label: 'Project Created Date' }
]

// Status color mapping - memoized outside component
const STATUS_COLORS = {
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  submitted: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  archived: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  default: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
}

function MandateList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })
  const [viewMode, setViewMode] = useState('all') // 'all' or 'unlinked'
  const [searchInput, setSearchInput] = useState('') // Separate state for input to enable debouncing

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch mandates when filters or viewMode changes; cancel previous fetch when deps change or unmount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const data =
          viewMode === 'unlinked'
            ? await getUnlinkedMandates()
            : await getAllMandates(null, filters)
        if (!cancelled) setMandates(data || [])
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching mandates:', err)
          setError(err.message || 'Failed to load mandates')
          setMandates([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [filters, viewMode])

  // Preload Create page chunk on hover only (avoids extra work on initial load)
  const preloadCreate = useCallback(() => {
    import('./ProjectMandateCreate').catch(() => {})
  }, [])

  // Memoized handlers
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value)
  }, [])

  const handleStatusChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, status: e.target.value }))
  }, [])

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode)
  }, [])

  const handleCreateClick = useCallback(() => {
    navigate(`${basePath}/create`)
  }, [navigate, basePath])

  const handleViewClick = useCallback((identifier) => {
    navigate(`${basePath}/${identifier}/view`)
  }, [navigate, basePath])

  const handleEditClick = useCallback((identifier) => {
    navigate(`${basePath}/${identifier}/edit`)
  }, [navigate, basePath])

  // Memoized filtered/processed data (status color inlined to keep deps minimal)
  const mandateItems = useMemo(() => {
    return mandates.map((mandate) => ({
      ...mandate,
      statusColor: STATUS_COLORS[mandate.document_status] || STATUS_COLORS.default,
      canEdit: mandate.document_status === 'draft',
      purposePreview: mandate.purpose
        ? (mandate.purpose.length > 200 ? `${mandate.purpose.substring(0, 200)}...` : mandate.purpose)
        : null
    }))
  }, [mandates])

  return (
    <>
      {/* Toolbar: Create + Export */}
      <div className="flex justify-end gap-2 mb-6">
        <ExportListMenu columns={MANDATE_COLUMNS} data={mandateItems} baseFilename="Mandates" disabled={mandateItems.length === 0} />
        <button
          onClick={handleCreateClick}
          onMouseEnter={preloadCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Mandate
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search mandates..."
                value={searchInput}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>

          <div className="flex space-x-2">
            <button
              onClick={() => handleViewModeChange('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Mandates
            </button>
            <button
              onClick={() => handleViewModeChange('unlinked')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'unlinked' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Unlinked (Ready for Project)
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Mandates List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mandates...</p>
          </div>
        </div>
      ) : mandateItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filters.search || filters.status 
              ? 'No mandates match your filters' 
              : 'No mandates found'}
          </p>
          <button
            onClick={handleCreateClick}
            onMouseEnter={preloadCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Mandate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mandateItems.map((mandate) => (
            <MandateCard
              key={mandate.id}
              mandate={mandate}
              onView={handleViewClick}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      )}
    </>
  )
}

// Memoized Mandate Card Component
const MandateCard = memo(function MandateCard({ mandate, onView, onEdit }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mandate.mandate_title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${mandate.statusColor}`}>
              {mandate.document_status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-medium">Reference:</span> {mandate.mandate_reference}
            {mandate.created_date && (
              <> | <span className="font-medium">Created:</span> {mandate.created_date}</>
            )}
            {mandate.project_id && (
              <> | <span className="font-medium">Linked to Project:</span> {mandate.project?.name || 'Yes'}</>
            )}
          </p>
          {mandate.purposePreview && (
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {mandate.purposePreview}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onView(mandate.mandate_reference || mandate.id)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View"
            aria-label="View mandate"
          >
            <Eye className="w-5 h-5" />
          </button>
          {mandate.canEdit && (
            <button
              onClick={() => onEdit(mandate.mandate_reference || mandate.id)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Edit"
              aria-label="Edit mandate"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default memo(MandateList)
