import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Bell, Check, CheckCheck, Settings, Filter, Search, X } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [filteredNotifications, setFilteredNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all') // all, unread, read
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterNotifications()
  }, [notifications, filter, searchQuery])

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterNotifications = () => {
    let filtered = [...notifications]

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read)
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.is_read)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n => 
        (n.title || '').toLowerCase().includes(query) ||
        (n.message || '').toLowerCase().includes(query) ||
        (n.notification_type || '').toLowerCase().includes(query)
      )
    }

    setFilteredNotifications(filtered)
  }

  const handleMarkAsRead = async (notificationId, markAll = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (markAll) {
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('is_deleted', false)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      alert('Error updating notification: ' + error.message)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
      alert('Error deleting notification: ' + error.message)
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }

    if (notification.action_url) {
      navigate(notification.action_url)
    } else if (notification.related_entity_type && notification.related_entity_id) {
      // Navigate to entity based on type
      const entityMap = {
        'task': `/projects/${notification.project_id}/tasks/${notification.related_entity_id}`,
        'project': `/projects/${notification.related_entity_id}`,
        'issue': `/projects/${notification.project_id}/issues/${notification.related_entity_id}`,
        'comment': `/projects/${notification.project_id}`,
      }
      const url = entityMap[notification.related_entity_type]
      if (url) navigate(url)
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      mention: '💬',
      task_assigned: '📋',
      task_updated: '✏️',
      task_completed: '✅',
      comment_added: '💭',
      file_uploaded: '📎',
      status_change: '🔄',
      project_created: '🚀',
    }
    return icons[type] || '🔔'
  }

  const getNotificationColor = (type) => {
    const colors = {
      mention: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      task_assigned: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      task_completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      comment_added: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-1 text-sm font-medium rounded-full bg-red-500 text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Stay updated with project activities and mentions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => handleMarkAsRead(null, true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Notifications</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {searchQuery ? 'No notifications match your search' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getNotificationIcon(notification.notification_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-semibold ${
                            !notification.is_read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title || notification.notification_type}
                          </h3>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getNotificationColor(notification.notification_type)}`}>
                            {notification.notification_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {notification.sender_name && (
                            <span>from {notification.sender_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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

