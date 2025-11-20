import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Filter, Search, Link2, Target, TrendingUp, FolderKanban } from 'lucide-react'
import { format } from 'date-fns'
import { getResourceConflicts } from '../services/crossResourceService'

export default function ResourceConflicts() {
  const navigate = useNavigate()
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(true)
  const [portfolios, setPortfolios] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [viewMode, setViewMode] = useState('all') // 'all', 'cross-project', 'single-project'
  const [filters, setFilters] = useState({
    resolution_status: 'open',
    conflict_severity: '',
    conflict_type: '',
    portfolio_id: '',
    programme_id: '',
    project_id: '',
    is_cross_project_conflict: '',
    search: '',
  })
  const [selectedConflict, setSelectedConflict] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    fetchLookupData()
    fetchConflicts()
  }, [filters, viewMode])

  const fetchLookupData = async () => {
    try {
      // Fetch portfolios
      const { data: portfoliosData } = await supabase
        .from('portfolios')
        .select('id, portfolio_name, portfolio_code')
        .eq('is_deleted', false)
        .order('portfolio_name', { ascending: true })

      if (portfoliosData) setPortfolios(portfoliosData)

      // Fetch programmes
      const { data: programmesData } = await supabase
        .from('programmes')
        .select('id, programme_name, programme_code')
        .eq('is_deleted', false)
        .order('programme_name', { ascending: true })

      if (programmesData) setProgrammes(programmesData)
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const fetchConflicts = async () => {
    try {
      setLoading(true)
      
      const filterParams = { ...filters }

      // Apply view mode filters
      if (viewMode === 'cross-project') {
        filterParams.is_cross_project_conflict = true
      } else if (viewMode === 'single-project') {
        filterParams.is_cross_project_conflict = false
      }

      const data = await getResourceConflicts(filterParams)
      setConflicts(data || [])
    } catch (error) {
      console.error('Error fetching conflicts:', error)
      alert('Error loading conflicts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (conflict, status) => {
    try {
      setResolving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        resolution_status: status,
        resolution_notes: resolutionNotes || null,
        resolved_at: status === 'resolved' || status === 'ignored' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' || status === 'ignored' ? user.id : null,
        updated_by: user.id,
      }

      const { error } = await supabase
        .from('resource_conflicts')
        .update(updateData)
        .eq('id', conflict.id)

      if (error) throw error

      setSelectedConflict(null)
      setResolutionNotes('')
      fetchConflicts()
    } catch (error) {
      console.error('Error resolving conflict:', error)
      alert('Error resolving conflict: ' + error.message)
    } finally {
      setResolving(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'ignored': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      over_allocation: 'Over-Allocation',
      skill_mismatch: 'Skill Mismatch',
      availability: 'Availability',
      scheduling: 'Scheduling',
    }
    return labels[type] || type
  }

  const stats = {
    total: conflicts.length,
    open: conflicts.filter(c => c.resolution_status === 'open').length,
    in_progress: conflicts.filter(c => c.resolution_status === 'in_progress').length,
    resolved: conflicts.filter(c => c.resolution_status === 'resolved').length,
    critical: conflicts.filter(c => c.conflict_severity === 'critical').length,
    crossProject: conflicts.filter(c => c.is_cross_project_conflict).length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/resources')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Resource Conflicts
          </h1>
          <button
            onClick={() => navigate('/resources/cross-project')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Link2 className="h-4 w-4" />
            Cross-Project Resources
          </button>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and resolve resource conflicts and over-allocations across projects, portfolios, and programmes
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Conflicts
            </button>
            <button
              onClick={() => setViewMode('cross-project')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'cross-project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Link2 className="h-4 w-4" />
              Cross-Project
            </button>
            <button
              onClick={() => setViewMode('single-project')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'single-project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FolderKanban className="h-4 w-4" />
              Single Project
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Conflicts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.in_progress}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cross-Project</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.crossProject}</p>
            </div>
            <Link2 className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conflicts..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={filters.resolution_status || ''}
              onChange={(e) => setFilters({ ...filters, resolution_status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
            <select
              value={filters.conflict_severity || ''}
              onChange={(e) => setFilters({ ...filters, conflict_severity: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.conflict_type || ''}
              onChange={(e) => setFilters({ ...filters, conflict_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="over_allocation">Over-Allocation</option>
              <option value="skill_mismatch">Skill Mismatch</option>
              <option value="availability">Availability</option>
              <option value="scheduling">Scheduling</option>
            </select>
          </div>
          <div className="flex items-center gap-4 flex-wrap border-t border-gray-200 dark:border-gray-700 pt-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cross-Project Filters:</span>
            <select
              value={filters.portfolio_id || ''}
              onChange={(e) => setFilters({ ...filters, portfolio_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Portfolios</option>
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                </option>
              ))}
            </select>
            <select
              value={filters.programme_id || ''}
              onChange={(e) => setFilters({ ...filters, programme_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Programmes</option>
              {programmes.map(programme => (
                <option key={programme.id} value={programme.id}>
                  {programme.programme_name} {programme.programme_code ? `(${programme.programme_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading conflicts...</p>
          </div>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Conflicts Found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">All resources are properly allocated</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {conflict.resource?.resource_name || 'Unknown Resource'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(conflict.conflict_severity)}`}>
                      {conflict.conflict_severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(conflict.resolution_status)}`}>
                      {conflict.resolution_status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {getTypeLabel(conflict.conflict_type)}
                    </span>
                    {conflict.is_cross_project_conflict && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Cross-Project
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {conflict.conflict_description}
                  </p>
                  
                  {/* Cross-Project Context */}
                  {(conflict.portfolio || conflict.programme || conflict.project) && (
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      {conflict.portfolio && (
                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">Portfolio:</span>
                          <span>{conflict.portfolio.portfolio_name}</span>
                        </div>
                      )}
                      {conflict.programme && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Programme:</span>
                          <span>{conflict.programme.programme_name}</span>
                        </div>
                      )}
                      {conflict.project && (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <FolderKanban className="h-4 w-4" />
                          <span className="font-medium">Project:</span>
                          <span>{conflict.project.project_name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {format(new Date(conflict.conflict_start_date), 'MMM d, yyyy')} - {format(new Date(conflict.conflict_end_date), 'MMM d, yyyy')}
                    </span>
                    {conflict.resolved_at && (
                      <span>
                        Resolved: {format(new Date(conflict.resolved_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  {conflict.resolution_notes && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400">
                      <strong>Resolution Notes:</strong> {conflict.resolution_notes}
                    </div>
                  )}
                </div>
                {conflict.resolution_status === 'open' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedConflict(conflict)
                        setResolutionNotes('')
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleResolve(conflict, 'ignored')}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Ignore
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Resolve Conflict
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {selectedConflict.conflict_description}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Describe how this conflict was resolved..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setSelectedConflict(null)
                    setResolutionNotes('')
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolve(selectedConflict, 'resolved')}
                  disabled={resolving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

