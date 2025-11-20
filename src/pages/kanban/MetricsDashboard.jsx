import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import CumulativeFlowDiagram from '../../components/kanban/CumulativeFlowDiagram'
import ControlChart from '../../components/kanban/ControlChart'
import { calculateFlowMetrics, calculatePercentiles } from '../../utils/flowMetricsCalculator'
import { formatISO, subDays, format, startOfDay, endOfDay } from 'date-fns'
import { Download, AlertTriangle, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'

export default function MetricsDashboard() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState(null)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [columns, setColumns] = useState([])
  
  // Date range state
  const [dateRange, setDateRange] = useState('30') // '7', '30', '60', '90', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    fetchBoards()
  }, [projectId])

  useEffect(() => {
    if (selectedBoardId) {
      fetchCards(selectedBoardId)
      fetchColumns()
    }
  }, [selectedBoardId, dateRange, customStartDate, customEndDate])

  const fetchBoards = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('kanban_boards')
        .select('id, board_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      setBoards(data || [])
      if (data && data.length > 0) {
        setSelectedBoardId(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching boards:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchColumns = async () => {
    if (!selectedBoardId) return
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('id, column_name, column_order')
        .eq('board_id', selectedBoardId)
        .eq('is_deleted', false)
        .order('column_order', { ascending: true })

      if (!error) {
        setColumns(data || [])
      } else {
        console.error('Error fetching columns:', error)
      }
    } catch (err) {
      console.error('Error fetching columns:', err)
    }
  }

  const getDateRange = () => {
    let fromDate
    if (dateRange === 'custom') {
      if (!customStartDate) return null
      fromDate = startOfDay(new Date(customStartDate))
    } else {
      const days = parseInt(dateRange, 10)
      fromDate = subDays(new Date(), days)
    }
    return fromDate
  }

  const fetchCards = async (boardId) => {
    try {
      setLoading(true)
      setError(null)

      const fromDate = getDateRange()
      if (!fromDate) {
        setCards([])
        setLoading(false)
        return
      }

      let query = supabase
        .from('kanban_cards')
        .select('id, column_id, created_at, started_at, completed_at')
        .eq('board_id', boardId)
        .eq('is_deleted', false)
        .gte('created_at', formatISO(fromDate))
        .order('created_at', { ascending: true })

      if (dateRange === 'custom' && customEndDate) {
        const endDate = endOfDay(new Date(customEndDate))
        query = query.lte('created_at', formatISO(endDate))
      }

      const { data, error } = await query

      if (error) throw error

      setCards(data || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const metrics = calculateFlowMetrics(cards)

  // Calculate percentiles for cycle time
  const cycleTimeValues = cards
    .filter(c => c.started_at && c.completed_at)
    .map(c => {
      const start = new Date(c.started_at)
      const end = new Date(c.completed_at)
      return Math.max((end - start) / (1000 * 60 * 60 * 24), 0)
    })
  const cycleTimePercentiles = calculatePercentiles(cycleTimeValues)

  // Build CFD points with improved historical tracking
  const cfdPoints = (() => {
    if (!cards || cards.length === 0) return { points: [], columnOrder: [] }
    if (!columns || columns.length === 0) return { points: [], columnOrder: [] }

    const fromDate = getDateRange()
    if (!fromDate) return { points: [], columnOrder: [] }

    const days = []
    const cursor = new Date(fromDate)
    const today = dateRange === 'custom' && customEndDate 
      ? endOfDay(new Date(customEndDate))
      : new Date()

    while (cursor <= today) {
      days.push(formatISO(cursor, { representation: 'date' }))
      cursor.setDate(cursor.getDate() + 1)
    }

    const columnOrder = columns.map((c) => c.column_name)
    const columnMap = new Map(columns.map(c => [c.id, c.column_name]))

    // For each day, calculate card positions based on their state at that time
    const byDay = days.map((date) => {
      const columnsCount = {}
      columnOrder.forEach((name) => { columnsCount[name] = 0 })

      cards.forEach((card) => {
        const cardCreated = card.created_at ? formatISO(new Date(card.created_at), { representation: 'date' }) : null
        const cardStarted = card.started_at ? formatISO(new Date(card.started_at), { representation: 'date' }) : null
        const cardCompleted = card.completed_at ? formatISO(new Date(card.completed_at), { representation: 'date' }) : null

        if (!cardCreated || cardCreated > date) return

        // Determine which column the card was in on this date
        let columnName = null
        if (cardCompleted && cardCompleted <= date) {
          // Card was completed - find the done column
          const doneColumn = columns.find(c => c.is_done_column)
          columnName = doneColumn?.column_name || columnMap.get(card.column_id)
        } else if (cardStarted && cardStarted <= date) {
          // Card was in progress
          columnName = columnMap.get(card.column_id) || 'In Progress'
        } else {
          // Card was in backlog
          const backlogColumn = columns.find(c => c.is_backlog_column)
          columnName = backlogColumn?.column_name || columnMap.get(card.column_id) || 'Backlog'
        }

        if (columnName && columnsCount.hasOwnProperty(columnName)) {
          columnsCount[columnName] = (columnsCount[columnName] || 0) + 1
        }
      })

      return { date, columns: columnsCount }
    })

    return { points: byDay, columnOrder }
  })()

  // Build control chart points from completed cards (cycle time)
  const controlPoints = (() => {
    if (!cards || cards.length === 0) return []
    return cards
      .filter(c => c.started_at && c.completed_at)
      .map(c => ({
        date: formatISO(new Date(c.completed_at), { representation: 'date' }),
        value: Math.max(
          (new Date(c.completed_at) - new Date(c.started_at)) / (1000 * 60 * 60 * 24),
          0
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

  // Check for alerts/thresholds
  const alerts = []
  if (metrics.cycleTimeDays > 14) {
    alerts.push({
      type: 'warning',
      message: `Average cycle time (${metrics.cycleTimeDays} days) exceeds 14 days. Consider reviewing bottlenecks.`,
    })
  }
  if (metrics.leadTimeDays > 30) {
    alerts.push({
      type: 'warning',
      message: `Average lead time (${metrics.leadTimeDays} days) exceeds 30 days. Work may be piling up.`,
    })
  }
  if (metrics.averageAgeDays > 7) {
    alerts.push({
      type: 'warning',
      message: `Average WIP age (${metrics.averageAgeDays} days) exceeds 7 days. Cards may be stuck.`,
    })
  }
  if (metrics.throughputPerWeek === 0 && cards.length > 0) {
    alerts.push({
      type: 'info',
      message: 'No cards completed in the last 7 days. Check if work is progressing.',
    })
  }

  const handleExportCSV = () => {
    if (!cards || cards.length === 0) return

    const headers = ['Card ID', 'Created At', 'Started At', 'Completed At', 'Cycle Time (days)', 'Lead Time (days)']
    const rows = cards
      .filter(c => c.created_at)
      .map(c => {
        const cycleTime = c.started_at && c.completed_at
          ? ((new Date(c.completed_at) - new Date(c.started_at)) / (1000 * 60 * 60 * 24)).toFixed(1)
          : ''
        const leadTime = c.created_at && c.completed_at
          ? ((new Date(c.completed_at) - new Date(c.created_at)) / (1000 * 60 * 60 * 24)).toFixed(1)
          : ''
        return [
          c.id,
          c.created_at ? format(new Date(c.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
          c.started_at ? format(new Date(c.started_at), 'yyyy-MM-dd HH:mm:ss') : '',
          c.completed_at ? format(new Date(c.completed_at), 'yyyy-MM-dd HH:mm:ss') : '',
          cycleTime,
          leadTime,
        ]
      })

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanban-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && boards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Kanban metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/kanban`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Kanban Boards
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Kanban Metrics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Flow metrics and Cumulative Flow Diagram for your Kanban boards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {boards.length > 0 && (
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={selectedBoardId || ''}
              onChange={(e) => setSelectedBoardId(e.target.value)}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.board_name}
                </option>
              ))}
            </select>
          )}
          {cards.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            {['7', '30', '60', '90'].map((days) => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-3 py-1 rounded text-sm ${
                  dateRange === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last {days} days
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 rounded text-sm ${
                dateRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Custom
            </button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border flex items-start gap-2 ${
                alert.type === 'warning'
                  ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
                  : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-blue-800 dark:text-blue-300'
              }`}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No card data available yet for this board. Start moving cards through your workflow to see metrics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* High level metrics with trend indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricTile
              label="Avg Cycle Time"
              value={`${metrics.cycleTimeDays} days`}
              sampleSize={metrics.sampleSizes.cycleTime}
              alert={metrics.cycleTimeDays > 14}
            />
            <MetricTile
              label="Avg Lead Time"
              value={`${metrics.leadTimeDays} days`}
              sampleSize={metrics.sampleSizes.leadTime}
              alert={metrics.leadTimeDays > 30}
            />
            <MetricTile
              label="Throughput (7 days)"
              value={`${metrics.throughputPerWeek} cards`}
              sampleSize={metrics.sampleSizes.throughput}
            />
            <MetricTile
              label="Avg WIP Age"
              value={`${metrics.averageAgeDays} days`}
              sampleSize={metrics.sampleSizes.age}
              alert={metrics.averageAgeDays > 7}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cfdPoints.points && cfdPoints.points.length > 0 ? (
              <CumulativeFlowDiagram
                points={cfdPoints.points}
                columnOrder={cfdPoints.columnOrder}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                Not enough data yet to generate a Cumulative Flow Diagram.
              </div>
            )}

            <ControlChart
              points={controlPoints}
              title="Cycle Time Control Chart"
              unitLabel="days"
              percentiles={cycleTimePercentiles}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MetricTile({ label, value, sampleSize, alert }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
        alert
          ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {alert && (
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
        )}
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      {sampleSize !== undefined && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Based on {sampleSize} {sampleSize === 1 ? 'card' : 'cards'}
        </p>
      )}
    </div>
  )
}
