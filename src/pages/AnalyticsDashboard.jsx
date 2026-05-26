import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Plus, BarChart3, TrendingUp, Users, Calendar, AlertTriangle, Settings } from 'lucide-react'
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function AnalyticsDashboard() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState([])
  const [selectedDashboard, setSelectedDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [widgets, setWidgets] = useState([])

  useEffect(() => {
    fetchDashboards()
  }, [])

  useEffect(() => {
    if (selectedDashboard) {
      fetchWidgets()
    }
  }, [selectedDashboard])

  const fetchDashboards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('dashboard_name', { ascending: true })

      if (error) throw error
      setDashboards(data || [])
      
      // Auto-select first dashboard if available
      if (data && data.length > 0 && !selectedDashboard) {
        setSelectedDashboard(data[0])
      }
    } catch (error) {
      console.error('Error fetching dashboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWidgets = async () => {
    if (!selectedDashboard) return

    try {
      const { data, error } = await supabase
        .from('analytics_widgets')
        .select('*')
        .eq('dashboard_id', selectedDashboard.id)
        .eq('is_deleted', false)
        .eq('is_visible', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      
      // Parse widget configs
      const widgetsWithConfig = (data || []).map(widget => ({
        ...widget,
        config: typeof widget.widget_config === 'string' 
          ? JSON.parse(widget.widget_config) 
          : widget.widget_config
      }))
      setWidgets(widgetsWithConfig)
    } catch (error) {
      console.error('Error fetching widgets:', error)
    }
  }

  const renderWidget = (widget) => {
    switch (widget.widget_type) {
      case 'metric':
        return <MetricWidget widget={widget} />
      case 'chart':
        return <ChartWidget widget={widget} />
      case 'table':
        return <TableWidget widget={widget} />
      case 'kpi':
        return <KPIWidget widget={widget} />
      default:
        return <div className="p-4 text-gray-500">Unknown widget type: {widget.widget_type}</div>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/reports')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View analytics, KPIs, and insights
            </p>
          </div>
          <button
            onClick={() => navigate('/reports/dashboards/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Dashboard
          </button>
        </div>
      </div>

      {/* Dashboard Selector */}
      {dashboards.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dashboard:</span>
            {dashboards.map(dashboard => (
              <button
                key={dashboard.id}
                onClick={() => setSelectedDashboard(dashboard)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedDashboard?.id === dashboard.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {dashboard.dashboard_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      {selectedDashboard ? (
        widgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.map(widget => (
              <div
                key={widget.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                style={{
                  gridColumn: `span ${widget.width || 1}`,
                  gridRow: `span ${widget.height || 1}`,
                }}
              >
                {widget.widget_title && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {widget.widget_title}
                  </h3>
                )}
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Widgets</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Add widgets to this dashboard</p>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Dashboards Available</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Create your first analytics dashboard</p>
          <button
            onClick={() => navigate('/reports/dashboards/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

// Widget Components
function MetricWidget({ widget }) {
  const [value, setValue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetricValue()
  }, [widget])

  const fetchMetricValue = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would execute the data source query
      // For now, we'll use a placeholder
      const mockValue = Math.floor(Math.random() * 1000)
      setValue(mockValue)
    } catch (error) {
      console.error('Error fetching metric:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded" />
  }

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        {value?.toLocaleString() || '0'}
      </div>
      {widget.config?.unit && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {widget.config.unit}
        </div>
      )}
    </div>
  )
}

function ChartWidget({ widget }) {
  const config = widget.config || {}
  
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {config.chartType || 'Chart'} Widget
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Chart visualization coming soon
        </p>
      </div>
    </div>
  )
}

function TableWidget({ widget }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
                <TableRowNumberHeader className="!normal-case" />
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
              Column 1
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
              Column 2
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Data 1</td>
            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Data 2</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function KPIWidget({ widget }) {
  const [kpiValue, setKpiValue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKPIValue()
  }, [widget])

  const fetchKPIValue = async () => {
    try {
      setLoading(true)
      // Fetch KPI value from kpi_values table
      if (widget.data_source_name) {
        const { data, error } = await supabase
          .from('kpi_values')
          .select('kpi_value, measurement_date')
          .eq('kpi_id', widget.data_source_name) // Assuming data_source_name contains KPI ID
          .order('measurement_date', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          setKpiValue(data.kpi_value)
        }
      }
    } catch (error) {
      console.error('Error fetching KPI:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded" />
  }

  const config = widget.config || {}
  const displayValue = kpiValue !== null ? kpiValue.toFixed(config.decimal_places || 2) : 'N/A'

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        {displayValue}
      </div>
      {config.unit && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {config.unit}
        </div>
      )}
    </div>
  )
}

