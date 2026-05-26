import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Star, Filter, Download, Search, Clock } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'

export default function FeedbackAnalysis() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30') // days
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
    byStatus: {},
    averageRating: 0,
    ratingsDistribution: {},
    recentCount: 0,
    resolvedCount: 0
  })
  const toast = useToastContext()

  useEffect(() => {
    loadFeedback()
  }, [typeFilter, statusFilter, dateRange])

  useEffect(() => {
    if (searchQuery) {
      searchFeedback()
    } else {
      loadFeedback()
    }
  }, [searchQuery])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const dateLimit = new Date()
      dateLimit.setDate(dateLimit.getDate() - parseInt(dateRange))

      let query = supabase
        .from('user_feedback')
        .select(`
          *,
          user:user_id (id, full_name, email)
        `)
        .eq('is_deleted', false)
        .gte('created_at', dateLimit.toISOString())

      if (typeFilter !== 'all') {
        query = query.eq('feedback_type', typeFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setFeedback(data || [])

      // Calculate statistics
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading feedback:', error)
      if (toast) {
        toast.error('Failed to load feedback')
      }
    } finally {
      setLoading(false)
    }
  }

  const searchFeedback = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          *,
          user:user_id (id, full_name, email)
        `)
        .eq('is_deleted', false)
        .or(`feedback_text.ilike.%${searchQuery}%,page_url.ilike.%${searchQuery}%`)

      if (error) throw error

      setFeedback(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error searching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const total = data.length
    const byType = {}
    const byStatus = {}
    const ratings = []
    const ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let resolvedCount = 0

    data.forEach(item => {
      // Count by type
      byType[item.feedback_type] = (byType[item.feedback_type] || 0) + 1

      // Count by status
      byStatus[item.status] = (byStatus[item.status] || 0) + 1

      // Count ratings
      if (item.rating) {
        ratings.push(item.rating)
        ratingsDistribution[item.rating] = (ratingsDistribution[item.rating] || 0) + 1
      }

      // Count resolved
      if (item.status === 'resolved' || item.status === 'closed') {
        resolvedCount++
      }
    })

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0

    const recentCount = data.filter(item => {
      const daysAgo = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= 7
    }).length

    setStats({
      total,
      byType,
      byStatus,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingsDistribution,
      recentCount,
      resolvedCount
    })
  }

  const handleUpdateStatus = async (feedbackId, newStatus) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId)

      if (error) throw error

      if (toast) {
        toast.success('Feedback status updated')
      }
      loadFeedback()
    } catch (error) {
      console.error('Error updating feedback:', error)
      if (toast) {
        toast.error('Failed to update feedback')
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const exportFeedback = () => {
    // Simple CSV export
    const headers = ['Date', 'Type', 'Status', 'Rating', 'User', 'Feedback', 'Page URL']
    const rows = feedback.map(item => [
      formatDate(item.created_at),
      item.feedback_type,
      item.status,
      item.rating || 'N/A',
      item.user?.email || 'Unknown',
      item.feedback_text.replace(/,/g, ';'),
      item.page_url || 'N/A'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    if (toast) {
      toast.success('Feedback exported successfully')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Feedback Analysis
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Analyze user feedback and satisfaction metrics
              </p>
            </div>
            <Button onClick={exportFeedback} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Feedback</span>
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.recentCount} in last 7 days
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Rating</span>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on {Object.values(stats.ratingsDistribution).reduce((a, b) => a + b, 0)} ratings
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Resolved</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.resolvedCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.total > 0 ? Math.round((stats.resolvedCount / stats.total) * 100) : 0}% resolution rate
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total - stats.resolvedCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Awaiting review
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="bug_report">Bug Report</option>
            <option value="feature_request">Feature Request</option>
            <option value="usability">Usability</option>
            <option value="performance">Performance</option>
            <option value="compliment">Compliment</option>
          </Select>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select
            label="Date Range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-40"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </Select>
        </div>

        {/* Feedback Distribution Charts */}
        {(Object.keys(stats.byType).length > 0 || Object.keys(stats.ratingsDistribution).length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Feedback by Type */}
            {Object.keys(stats.byType).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Feedback by Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {type.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Ratings Distribution */}
            {Object.values(stats.ratingsDistribution).some(count => count > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Ratings Distribution
                </h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating, index) => (
                    <div key={rating}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          {[...Array(rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                          {[...Array(5 - rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {stats.ratingsDistribution[rating] || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              ((stats.ratingsDistribution[rating] || 0) /
                                Object.values(stats.ratingsDistribution).reduce((a, b) => a + b, 0)) *
                              100
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback List */}
        {loading ? (
          <Loading text="Loading feedback..." />
        ) : feedback.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No feedback found"
            description={searchQuery ? `No feedback matches "${searchQuery}"` : 'No feedback available for the selected filters'}
          />
        ) : (
          <div className="space-y-4">
            {feedback.map((item, index) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        item.feedback_type === 'bug_report' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                        item.feedback_type === 'feature_request' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                        item.feedback_type === 'compliment' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.feedback_type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        item.status === 'resolved' || item.status === 'closed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                        item.status === 'reviewing' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.status}
                      </span>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          {[...Array(item.rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">
                      {item.feedback_text}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {item.user && (
                        <span>By: {item.user.full_name || item.user.email}</span>
                      )}
                      <span>{formatDate(item.created_at)}</span>
                      {item.page_url && (
                        <a
                          href={item.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View page
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Select
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                      className="w-40"
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

