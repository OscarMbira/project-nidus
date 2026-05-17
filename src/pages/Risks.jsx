import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { platformProjectPath } from '../utils/projectRouteParam'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, AlertTriangle, TrendingUp, Filter, Search, BarChart3 } from 'lucide-react'
import RiskForm from '../components/RiskForm'
import RiskHeatMap from '../components/RiskHeatMap'
import RiskList from '../components/RiskList'
import Pagination from '../components/Pagination'
import SortToolbar from '../components/ui/SortToolbar'
import { useSortableTable } from '../hooks/useSortableTable'

export default function Risks() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRiskForm, setShowRiskForm] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    risk_level: '',
    risk_category: '',
    risk_type: '',
    search: '',
  })
  const [activeView, setActiveView] = useState('list') // 'list', 'heatmap'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  const { handleSort, getSortDirectionForColumn, supabaseOrder } = useSortableTable({
    defaultSort: { column: 'risk_score', direction: 'desc' },
    storageKey: 'nidus-risks-sort',
    serverColumnMap: {
      risk_score: 'risk_score',
      status: 'status',
      risk_level: 'risk_level',
      created_at: 'created_at',
    },
  })

  const sortFetchKey = useMemo(
    () => `${supabaseOrder.column}:${supabaseOrder.ascending ? '1' : '0'}`,
    [supabaseOrder]
  )

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchRisks()
    }
  }, [projectId, filters, currentPage, sortFetchKey])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRisks = async () => {
    try {
      setLoading(true)
      
      // Build count query
      let countQuery = supabase
        .from('risks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      // Build data query
      let query = supabase
        .from('risks')
        .select(`
          *,
          identified_by:identified_by_user_id (id, email, full_name),
          risk_owner:risk_owner_user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
        countQuery = countQuery.eq('status', filters.status)
      }
      if (filters.risk_level) {
        query = query.eq('risk_level', filters.risk_level)
        countQuery = countQuery.eq('risk_level', filters.risk_level)
      }
      if (filters.risk_category) {
        query = query.eq('risk_category', filters.risk_category)
        countQuery = countQuery.eq('risk_category', filters.risk_category)
      }
      if (filters.risk_type) {
        query = query.eq('risk_type', filters.risk_type)
        countQuery = countQuery.eq('risk_type', filters.risk_type)
      }
      if (filters.search) {
        query = query.or(`risk_title.ilike.%${filters.search}%,risk_description.ilike.%${filters.search}%`)
        countQuery = countQuery.or(`risk_title.ilike.%${filters.search}%,risk_description.ilike.%${filters.search}%`)
      }

      // Get total count
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data, error } = await query
        .order(supabaseOrder.column, { ascending: supabaseOrder.ascending })
        .range(from, to)

      if (error) throw error
      setRisks(data || [])
    } catch (error) {
      console.error('Error fetching risks:', error)
      alert('Error loading risks: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRisk = () => {
    setSelectedRisk(null)
    setShowRiskForm(true)
  }

  const handleEditRisk = (risk) => {
    setSelectedRisk(risk)
    setShowRiskForm(true)
  }

  const handleRiskSaved = () => {
    setShowRiskForm(false)
    setSelectedRisk(null)
    fetchRisks()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Risks...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.risk_level === 'critical').length,
    high: risks.filter(r => r.risk_level === 'high').length,
    medium: risks.filter(r => r.risk_level === 'medium').length,
    low: risks.filter(r => r.risk_level === 'low').length,
    threats: risks.filter(r => r.risk_type === 'threat').length,
    opportunities: risks.filter(r => r.risk_type === 'opportunity').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(platformProjectPath(routeKey || projectId))}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Risk Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name} - Risk Register and Management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Risks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-blue-500" />
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">High</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.high}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Medium</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.medium}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.low}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Threats</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.threats}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Opportunities</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.opportunities}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search risks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="identified">Identified</option>
            <option value="assessed">Assessed</option>
            <option value="mitigated">Mitigated</option>
            <option value="monitored">Monitored</option>
            <option value="closed">Closed</option>
            <option value="realized">Realized</option>
          </select>
          <select
            value={filters.risk_level}
            onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.risk_type}
            onChange={(e) => setFilters({ ...filters, risk_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="threat">Threat</option>
            <option value="opportunity">Opportunity</option>
          </select>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveView('heatmap')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeView === 'heatmap'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Heat Map
          </button>
        </div>
        <button
          onClick={handleCreateRisk}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Risk
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading risks...</p>
          </div>
        </div>
      ) : activeView === 'list' ? (
        <>
          <div className="mb-4">
            <SortToolbar
              columns={[
                { key: 'risk_score', label: 'Risk score' },
                { key: 'status', label: 'Status' },
                { key: 'risk_level', label: 'Level' },
                { key: 'created_at', label: 'Created' },
              ]}
              getSortDirection={getSortDirectionForColumn}
              onSort={handleSort}
            />
          </div>
          <RiskList
            risks={risks}
            onEdit={handleEditRisk}
            onRefresh={fetchRisks}
            projectId={projectId}
            routeProjectKey={routeKey || projectId}
          />
          {totalCount > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalCount}
            />
          )}
        </>
      ) : (
        <RiskHeatMap risks={risks} />
      )}

      {/* Risk Form Modal */}
      {showRiskForm && (
        <RiskForm
          risk={selectedRisk}
          projectId={projectId}
          onSave={handleRiskSaved}
          onCancel={() => {
            setShowRiskForm(false)
            setSelectedRisk(null)
          }}
        />
      )}
    </div>
  )
}

