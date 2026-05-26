import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { platformIssuePath, platformRiskPath, platformProjectPath } from '../utils/projectRouteParam'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, FileText, Link2, Filter, Search, BarChart3, Download } from 'lucide-react'
import SortToolbar from '../components/ui/SortToolbar'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
import RowNumberBadge from '../components/ui/RowNumberBadge'
import { useSortableTable } from '../hooks/useSortableTable'
import { useViewMode } from '../hooks/useViewMode'
import ViewToggle from '../components/ui/ViewToggle'

export default function RAIDLog() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [raidItems, setRaidItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    raid_type: '', // 'risk', 'assumption', 'issue', 'dependency'
    status: '',
    search: '',
  })

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-raid-log-sort',
  })
  const raidAccessors = useMemo(
    () => ({
      code: (r) => r.code ?? '',
      raid_type: (r) => r.raid_type ?? '',
      title: (r) => r.title ?? '',
      status: (r) => r.status ?? '',
      priority_level: (r) => r.priority_level ?? '',
      created_at: (r) => r.created_at ?? '',
    }),
    []
  )
  const displayRaidItems = useMemo(
    () => sortedData(raidItems, raidAccessors),
    [raidItems, sortedData, raidAccessors]
  )

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchRAIDItems()
    }
  }, [projectId, filters])

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

  const fetchRAIDItems = async () => {
    try {
      // Fetch from raid_log view
      let query = supabase
        .from('raid_log')
        .select('*')
        .eq('project_id', projectId)

      // Apply filters
      if (filters.raid_type) {
        query = query.eq('raid_type', filters.raid_type)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setRaidItems(data || [])
    } catch (error) {
      console.error('Error fetching RAID items:', error)
      // Fallback: fetch from individual tables if view doesn't exist
      fetchRAIDItemsFallback()
    }
  }

  const fetchRAIDItemsFallback = async () => {
    try {
      const items = []

      // Fetch risks
      if (!filters.raid_type || filters.raid_type === 'risk') {
        const { data: risks } = await supabase
          .from('risks')
          .select('id, project_id, risk_code as code, risk_title as title, risk_description as description, risk_category as category, status, risk_level as priority_level, risk_owner_user_id as owner_user_id, identified_date, next_review_date, created_at, updated_at')
          .eq('project_id', projectId)
          .eq('is_deleted', false)

        if (risks) {
          items.push(...risks.map(r => ({ ...r, raid_type: 'risk' })))
        }
      }

      // Fetch assumptions
      if (!filters.raid_type || filters.raid_type === 'assumption') {
        const { data: assumptions } = await supabase
          .from('assumptions')
          .select('id, project_id, assumption_code as code, assumption_title as title, assumption_description as description, assumption_category as category, status, impact_severity as priority_level, owner_user_id, identified_date, next_review_date, created_at, updated_at')
          .eq('project_id', projectId)
          .eq('is_deleted', false)

        if (assumptions) {
          items.push(...assumptions.map(a => ({ ...a, raid_type: 'assumption' })))
        }
      }

      // Fetch issues
      if (!filters.raid_type || filters.raid_type === 'issue') {
        const { data: issues } = await supabase
          .from('issues')
          .select('id, project_id, issue_code as code, issue_title as title, issue_description as description, issue_category as category, status, priority as priority_level, assigned_to_user_id as owner_user_id, created_at::date as identified_date, created_at, updated_at')
          .eq('project_id', projectId)
          .eq('is_deleted', false)

        if (issues) {
          items.push(...issues.map(i => ({ ...i, raid_type: 'issue', next_review_date: null })))
        }
      }

      // Fetch dependencies
      if (!filters.raid_type || filters.raid_type === 'dependency') {
        const { data: dependencies } = await supabase
          .from('dependencies_register')
          .select('id, project_id, dependency_code as code, dependency_title as title, dependency_description as description, dependency_type as category, status, criticality as priority_level, owner_user_id, identified_date, next_review_date, created_at, updated_at')
          .eq('project_id', projectId)
          .eq('is_deleted', false)

        if (dependencies) {
          items.push(...dependencies.map(d => ({ ...d, raid_type: 'dependency' })))
        }
      }

      // Apply status filter
      let filtered = items
      if (filters.status) {
        filtered = filtered.filter(item => item.status === filters.status)
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(item =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        )
      }

      setRaidItems(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (error) {
      console.error('Error fetching RAID items (fallback):', error)
    }
  }

  const handleExport = () => {
    const csvRows = [['Type', 'Code', 'Title', 'Status', 'Priority', 'Identified Date', 'Next Review']]
    
    displayRaidItems.forEach(item => {
      csvRows.push([
        item.raid_type,
        item.code || '',
        item.title || '',
        item.status || '',
        item.priority_level || '',
        item.identified_date ? format(new Date(item.identified_date), 'yyyy-MM-dd') : '',
        item.next_review_date ? format(new Date(item.next_review_date), 'yyyy-MM-dd') : '',
      ])
    })

    const csvString = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `raid_log_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading RAID Log...</p>
        </div>
      </div>
    )
  }

  const stats = {
    risks: raidItems.filter(i => i.raid_type === 'risk').length,
    assumptions: raidItems.filter(i => i.raid_type === 'assumption').length,
    issues: raidItems.filter(i => i.raid_type === 'issue').length,
    dependencies: raidItems.filter(i => i.raid_type === 'dependency').length,
    total: raidItems.length,
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'assumption':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'issue':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'dependency':
        return <Link2 className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'risk':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'assumption':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'issue':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'dependency':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
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
          RAID Log
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name} - Risks, Assumptions, Issues, and Dependencies
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Risks</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.risks}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Assumptions</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.assumptions}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Issues</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.issues}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dependencies</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.dependencies}</p>
            </div>
            <Link2 className="h-8 w-8 text-purple-500" />
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
              placeholder="Search RAID items..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.raid_type}
            onChange={(e) => setFilters({ ...filters, raid_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="risk">Risks</option>
            <option value="assumption">Assumptions</option>
            <option value="issue">Issues</option>
            <option value="dependency">Dependencies</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="identified">Identified</option>
            <option value="assessed">Assessed</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <ViewToggle value={raidViewMode} onChange={setRaidViewMode} ariaLabel="RAID log layout" />
        </div>
      </div>

      {raidItems.length > 0 && (
        <div className="mb-4">
          <SortToolbar
            columns={[
              { key: 'code', label: 'ID / Code' },
              { key: 'raid_type', label: 'Type' },
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'priority_level', label: 'Priority' },
            ]}
            getSortDirection={getSortDirectionForColumn}
            onSort={handleSort}
          />
        </div>
      )}

      {/* RAID Items List */}
      <div className="space-y-4">
        {raidItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No RAID Items yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Create risks, assumptions, issues, or dependencies to populate the RAID log
            </p>
          </div>
        ) : raidViewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableRowNumberHeader className="!normal-case whitespace-nowrap" />
                    <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">ID / Code</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case">Type</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case">Title</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case">Priority</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayRaidItems.map((item, index) => (
                    <tr key={`${item.raid_type}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{item.code || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded text-xs capitalize ${getTypeColor(item.raid_type)}`}>{item.raid_type}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white max-w-md">
                        <div className="font-medium truncate">{item.title}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(item.priority_level)}`}>{item.priority_level || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{item.status || '—'}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.raid_type === 'risk') {
                              navigate(platformRiskPath(routeKey || projectId, item.code || item.id))
                            } else if (item.raid_type === 'issue') {
                              navigate(platformIssuePath(routeKey || projectId, item.code || item.id))
                            } else {
                              navigate(platformProjectPath(routeKey || projectId || '', 'risks'))
                            }
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          displayRaidItems.map((item, index) => (
            <div
              key={`${item.raid_type}-${item.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    {getTypeIcon(item.raid_type)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.code && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                        {item.code}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getTypeColor(item.raid_type)}`}>
                      {item.raid_type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority_level)}`}>
                      {item.priority_level || 'N/A'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {item.status || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {item.identified_date && (
                      <span>Identified: {format(new Date(item.identified_date), 'MMM dd, yyyy')}</span>
                    )}
                    {item.next_review_date && (
                      <span>Review: {format(new Date(item.next_review_date), 'MMM dd, yyyy')}</span>
                    )}
                    {item.category && (
                      <span className="capitalize">Category: {item.category}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (item.raid_type === 'risk') {
                      navigate(platformRiskPath(routeKey || projectId, item.code || item.id))
                    } else if (item.raid_type === 'issue') {
                      navigate(platformIssuePath(routeKey || projectId, item.code || item.id))
                    } else {
                      navigate(platformProjectPath(routeKey || projectId || '', 'risks'))
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

