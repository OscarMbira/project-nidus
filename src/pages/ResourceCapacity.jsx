import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Calendar, TrendingUp, AlertTriangle, Users, BarChart3, PieChart, Download, FileText, Target, Link2, Plus } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import {
  exportCapacityToCSV,
  downloadCSV,
  exportCapacityToJSON,
  downloadJSON,
  generateCapacitySummaryReport,
  downloadTextReport,
} from '../utils/capacityReportExport'
import { getResourceCapacityPlans, getCrossProjectAllocations } from '../services/crossResourceService'
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function ResourceCapacity() {
  const navigate = useNavigate()
  const [resources, setResources] = useState([])
  const [capacityData, setCapacityData] = useState([])
  const [capacityPlans, setCapacityPlans] = useState([])
  const [crossProjectAllocations, setCrossProjectAllocations] = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [viewType, setViewType] = useState('week') // week, month
  const [scope, setScope] = useState('all') // 'all', 'portfolio', 'programme'
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    show_cross_project: true,
  })

  useEffect(() => {
    fetchResources()
    fetchLookupData()
  }, [])

  useEffect(() => {
    if (resources.length > 0) {
      fetchCapacityData()
      if (filters.show_cross_project) {
        fetchCrossProjectData()
      }
    }
  }, [selectedWeek, viewType, resources, filters])

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

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, resource_name, resource_code, default_capacity_hours_per_day, default_capacity_percentage')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('resource_name', { ascending: true })

      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
    }
  }

  const fetchCrossProjectData = async () => {
    try {
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

      const filterParams = {
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
      }

      if (filters.portfolio_id) {
        filterParams.portfolio_id = filters.portfolio_id
      }

      if (filters.programme_id) {
        filterParams.programme_id = filters.programme_id
      }

      const [plansData, allocationsData] = await Promise.all([
        getResourceCapacityPlans(filterParams),
        getCrossProjectAllocations(filterParams),
      ])

      setCapacityPlans(plansData || [])
      setCrossProjectAllocations(allocationsData || [])
    } catch (error) {
      console.error('Error fetching cross-project data:', error)
    }
  }

  const fetchCapacityData = async () => {
    try {
      setLoading(true)
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

      // For each resource, calculate capacity
      const capacityPromises = resources.map(async (resource) => {
        const { data, error } = await supabase.rpc('calculate_resource_capacity', {
          p_resource_id: resource.id,
          p_start_date: format(weekStart, 'yyyy-MM-dd'),
          p_end_date: format(weekEnd, 'yyyy-MM-dd'),
        })

        if (error) {
          console.error(`Error calculating capacity for ${resource.resource_name}:`, error)
          return {
            resource_id: resource.id,
            resource_name: resource.resource_name,
            total_capacity_hours: 0,
            allocated_hours: 0,
            available_hours: 0,
            utilization_percentage: 0,
            is_over_allocated: false,
          }
        }

        return {
          resource_id: resource.id,
          resource_name: resource.resource_name,
          resource_code: resource.resource_code,
          ...(data && data[0] ? data[0] : {
            total_capacity_hours: 0,
            allocated_hours: 0,
            available_hours: 0,
            utilization_percentage: 0,
            is_over_allocated: false,
          }),
        }
      })

      const results = await Promise.all(capacityPromises)
      setCapacityData(results)
    } catch (error) {
      console.error('Error fetching capacity data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1))
  }

  const handleNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1))
  }

  const handleToday = () => {
    setSelectedWeek(new Date())
  }

  const handleExportCSV = () => {
    const csv = exportCapacityToCSV(capacityData, {
      dateRange: {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
      },
    })
    const filename = `capacity-report-${format(weekStart, 'yyyy-MM-dd')}-to-${format(weekEnd, 'yyyy-MM-dd')}.csv`
    downloadCSV(csv, filename)
  }

  const handleExportJSON = () => {
    const json = exportCapacityToJSON(capacityData, summaryStats, {
      dateRange: {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
      },
      includeSummary: true,
    })
    const filename = `capacity-report-${format(weekStart, 'yyyy-MM-dd')}-to-${format(weekEnd, 'yyyy-MM-dd')}.json`
    downloadJSON(json, filename)
  }

  const handleExportText = () => {
    const report = generateCapacitySummaryReport(capacityData, summaryStats, {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
    })
    const filename = `capacity-report-${format(weekStart, 'yyyy-MM-dd')}-to-${format(weekEnd, 'yyyy-MM-dd')}.txt`
    downloadTextReport(report, filename)
  }

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

  const getUtilizationColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Calculate summary statistics
  const summaryStats = capacityData.reduce((acc, item) => {
    acc.totalCapacity += item.total_capacity_hours || 0
    acc.totalAllocated += item.allocated_hours || 0
    acc.totalAvailable += item.available_hours || 0
    acc.overAllocatedCount += item.is_over_allocated ? 1 : 0
    acc.highUtilizationCount += (item.utilization_percentage || 0) >= 80 ? 1 : 0
    return acc
  }, {
    totalCapacity: 0,
    totalAllocated: 0,
    totalAvailable: 0,
    overAllocatedCount: 0,
    highUtilizationCount: 0,
  })

  const overallUtilization = summaryStats.totalCapacity > 0
    ? (summaryStats.totalAllocated / summaryStats.totalCapacity * 100)
    : 0

  // Sort resources by utilization for chart
  const sortedForChart = [...capacityData].sort((a, b) => 
    (b.utilization_percentage || 0) - (a.utilization_percentage || 0)
  ).slice(0, 10) // Top 10 resources

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Resource Capacity Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/resources/cross-project')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Link2 className="h-4 w-4" />
              Cross-Project Resources
            </button>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View resource capacity, allocation, and utilization across projects, portfolios, and programmes
        </p>
      </div>

      {/* Scope & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Scope:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setScope('all')
                  setFilters({ ...filters, portfolio_id: '', programme_id: '' })
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Resources
              </button>
              <button
                onClick={() => setScope('portfolio')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  scope === 'portfolio'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Target className="h-4 w-4" />
                Portfolio
              </button>
              <button
                onClick={() => setScope('programme')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  scope === 'programme'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Programme
              </button>
            </div>
          </div>
          {(scope === 'portfolio' || scope === 'programme') && (
            <div className="flex items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              {scope === 'portfolio' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Portfolio:</label>
                  <select
                    value={filters.portfolio_id || ''}
                    onChange={(e) => setFilters({ ...filters, portfolio_id: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select Portfolio</option>
                    {portfolios.map(portfolio => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {scope === 'programme' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Programme:</label>
                  <select
                    value={filters.programme_id || ''}
                    onChange={(e) => setFilters({ ...filters, programme_id: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select Programme</option>
                    {programmes.map(programme => (
                      <option key={programme.id} value={programme.id}>
                        {programme.programme_name} {programme.programme_code ? `(${programme.programme_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show_cross_project"
                  checked={filters.show_cross_project}
                  onChange={(e) => setFilters({ ...filters, show_cross_project: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_cross_project" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Cross-Project Allocations
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryStats.totalCapacity.toFixed(1)}h
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryStats.totalAllocated.toFixed(1)}h
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overall Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallUtilization.toFixed(1)}%
              </p>
            </div>
            <PieChart className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Over-Allocated</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summaryStats.overAllocatedCount}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        {filters.show_cross_project && crossProjectAllocations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cross-Project Allocations</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {crossProjectAllocations.length}
                </p>
              </div>
              <Link2 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        )}
      </div>

      {/* Cross-Project Capacity Plans */}
      {filters.show_cross_project && capacityPlans.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Capacity Plans
            </h3>
            <button
              onClick={() => navigate('/resources/cross-project')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capacityPlans.slice(0, 6).map((plan, index) => (
              <div
                key={plan.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {plan.resource?.resource_name || 'Unknown Resource'}
                  </div>
                  {plan.is_over_capacity && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    Capacity: {plan.planned_capacity_hours?.toFixed(1) || 0}h
                  </div>
                  <div>
                    Allocated: {plan.planned_allocation_hours?.toFixed(1) || 0}h
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          plan.capacity_utilization_percentage > 100
                            ? 'bg-red-600'
                            : plan.capacity_utilization_percentage >= 80
                            ? 'bg-orange-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(100, plan.capacity_utilization_percentage || 0)}%` }}
                      />
                    </div>
                    <span className="text-xs">{Math.round(plan.capacity_utilization_percentage || 0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {capacityPlans.length > 6 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/resources/cross-project')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all {capacityPlans.length} capacity plans
              </button>
            </div>
          )}
        </div>
      )}

      {/* Utilization Chart */}
      {sortedForChart.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Resources by Utilization
          </h3>
          <div className="space-y-3">
            {sortedForChart.map((item) => {
              const utilization = item.utilization_percentage || 0
              return (
                <div key={item.resource_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.resource_name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getUtilizationColor(utilization)}`}
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousWeek}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={handleNextWeek}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next →
            </button>
          </div>
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Today
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Export Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={capacityData.length === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={capacityData.length === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
            <button
              onClick={handleExportText}
              disabled={capacityData.length === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Text
            </button>
          </div>
        </div>
      </div>

      {/* Capacity Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading capacity data...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {capacityData.map((item, index) => (
                  <tr key={item.resource_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.resource_name}
                      </div>
                      {item.resource_code && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.resource_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {item.total_capacity_hours?.toFixed(1) || 0}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {item.allocated_hours?.toFixed(1) || 0}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        (item.available_hours || 0) < 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.available_hours?.toFixed(1) || 0}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getUtilizationColor(item.utilization_percentage || 0)}`}
                            style={{ width: `${Math.min(100, item.utilization_percentage || 0)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white w-12 text-right">
                          {item.utilization_percentage?.toFixed(1) || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.is_over_allocated ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Over-allocated
                        </span>
                      ) : (item.utilization_percentage || 0) >= 80 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                          High
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {capacityData.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Resources Found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Create resources to view capacity data</p>
        </div>
      )}
    </div>
  )
}

