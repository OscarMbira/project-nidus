import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { Activity, Filter, Search, Calendar, User, FolderKanban } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export default function ActivityFeed() {
  const navigate = useNavigate()
  const { projectId, routeKey } = usePlatformProjectId()
  const [activities, setActivities] = useState([])
  const [filteredActivities, setFilteredActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    activity_type: '',
    entity_type: '',
    date_range: 'all', // all, today, week, month
    search: '',
  })

  useEffect(() => {
    fetchActivities()
  }, [projectId])

  useEffect(() => {
    filterActivities()
  }, [activities, filters])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(200)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      alert('Error loading activity feed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    // Filter by activity type
    if (filters.activity_type) {
      filtered = filtered.filter(a => a.activity_type === filters.activity_type)
    }

    // Filter by entity type
    if (filters.entity_type) {
      filtered = filtered.filter(a => a.entity_type === filters.entity_type)
    }

    // Filter by date range
    const now = new Date()
    if (filters.date_range === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = filtered.filter(a => new Date(a.created_at) >= today)
    } else if (filters.date_range === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo)
    } else if (filters.date_range === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(a => new Date(a.created_at) >= monthAgo)
    }

    // Filter by search
    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(a =>
        (a.activity_description || '').toLowerCase().includes(query) ||
        (a.entity_name || '').toLowerCase().includes(query) ||
        (a.user_name || '').toLowerCase().includes(query)
      )
    }

    setFilteredActivities(filtered)
  }

  const getActivityIcon = (type) => {
    const icons = {
      created: '➕',
      updated: '✏️',
      deleted: '🗑️',
      commented: '💬',
      assigned: '👤',
      completed: '✅',
      started: '🚀',
      archived: '📦',
    }
    return icons[type] || '📝'
  }

  const getActivityColor = (type) => {
    const colors = {
      created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const handleActivityClick = (activity) => {
    if (activity.entity_type && activity.entity_id) {
      const entityMap = {
        'task': `/projects/${activity.project_id}/tasks/${activity.entity_id}`,
        'project': `/projects/${activity.entity_id}`,
        'issue': `/projects/${activity.project_id}/issues/${activity.entity_id}`,
        'risk': `/projects/${activity.project_id}/risks/${activity.entity_id}`,
      }
      const url = entityMap[activity.entity_type]
      if (url) navigate(url)
    }
  }

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {})

  const activityTypes = [...new Set(activities.map(a => a.activity_type))].sort()
  const entityTypes = [...new Set(activities.map(a => a.entity_type))].sort()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Activity Feed
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {projectId ? 'Project activity timeline' : 'All project activities'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filters.activity_type}
              onChange={(e) => setFilters({ ...filters, activity_type: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Activity Types</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-gray-400" />
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Entity Types</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={filters.date_range}
              onChange={(e) => setFilters({ ...filters, date_range: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading activities...</p>
            </div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Activities</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {filters.search ? 'No activities match your filters' : 'No activities found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="space-y-4">
                  {dateActivities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {activity.user_name || 'System'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActivityColor(activity.activity_type)}`}>
                            {activity.activity_type}
                          </span>
                          {activity.entity_name && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {activity.entity_name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {activity.activity_description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {format(new Date(activity.created_at), 'h:mm a')}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                          {activity.activity_category && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {activity.activity_category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

