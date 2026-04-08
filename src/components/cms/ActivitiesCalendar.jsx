/**
 * Activities Calendar Component
 * Calendar view of scheduled communication activities
 */

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { getActivities, getUpcomingActivities } from '../../services/cmsScheduledActivitiesService'

export default function ActivitiesCalendar({ cmsId }) {
  const [activities, setActivities] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('month') // 'month', 'week', 'upcoming'

  useEffect(() => {
    if (cmsId) {
      loadActivities()
    }
  }, [cmsId])

  const loadActivities = async () => {
    try {
      setLoading(true)
      let data
      if (view === 'upcoming') {
        data = await getUpcomingActivities(cmsId)
      } else {
        data = await getActivities(cmsId)
      }
      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [view])

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatTime = (time) => {
    if (!time) return ''
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const getActivitiesForDate = (date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return activities.filter(activity => {
      if (!activity.scheduled_date) return false
      return activity.scheduled_date.split('T')[0] === dateStr
    })
  }

  const getMonthStart = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }

  const getDaysInMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = () => {
    return getMonthStart().getDay()
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth()
    const firstDay = getFirstDayOfMonth()
    const days = []
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayActivities = getActivitiesForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 dark:border-gray-700 p-2 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-16">
            {dayActivities.slice(0, 2).map((activity) => (
              <div
                key={activity.id}
                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1 py-0.5 rounded truncate"
                title={activity.activity_name}
              >
                {formatTime(activity.scheduled_time)} {activity.activity_name}
              </div>
            ))}
            {dayActivities.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{dayActivities.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {dayNames.map(day => (
            <div key={day} className="bg-gray-100 dark:bg-gray-700 p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    )
  }

  const renderUpcomingView = () => {
    const sortedActivities = [...activities]
      .filter(a => a.scheduled_date && new Date(a.scheduled_date) >= new Date())
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
      .slice(0, 10)

    if (sortedActivities.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No upcoming activities scheduled</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {sortedActivities.map((activity) => (
          <div
            key={activity.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {activity.activity_name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {activity.activity_description}
                </p>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{formatDate(activity.scheduled_date)}</span>
                  {activity.scheduled_time && (
                    <span>{formatTime(activity.scheduled_time)}</span>
                  )}
                  {activity.location && (
                    <span>{activity.location}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first to view activities calendar
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Activities Calendar
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View scheduled communication activities
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg text-sm ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm ${view === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {view === 'month' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date(currentDate.getFullYear(), currentDate.getMonth()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            renderMonthView()
          )}
        </div>
      )}

      {view === 'upcoming' && (
        <div>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            renderUpcomingView()
          )}
        </div>
      )}
    </div>
  )
}
