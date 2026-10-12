import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Repeat } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { supabase } from '../services/supabaseClient'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { RowActionButton } from '@nidus/ui'

function formatReasons(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export default function ResourceCalendarPage() {
  const { id: resourceId } = useParams()
  const navigate = useNavigate()
  const [resourceName, setResourceName] = useState('')
  const [calendarEntries, setCalendarEntries] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    supabase.from('resources').select('resource_name').eq('id', resourceId).maybeSingle()
      .then(({ data }) => setResourceName(data?.resource_name || ''))
  }, [resourceId])

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('resource_calendar')
          .select('*')
          .eq('resource_id', resourceId)
          .gte('calendar_date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
          .lte('calendar_date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
          .eq('is_deleted', false)
          .order('calendar_date', { ascending: true })
        if (error) throw error
        setCalendarEntries(data || [])
      } catch (error) {
        console.error('Error fetching calendar entries:', error)
        alert('Error loading calendar: ' + error.message)
      }
    }
    fetchEntries()
  }, [resourceId, currentMonth])

  const reloadEntries = async () => {
    const { data } = await supabase
      .from('resource_calendar')
      .select('*')
      .eq('resource_id', resourceId)
      .gte('calendar_date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
      .lte('calendar_date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
      .eq('is_deleted', false)
      .order('calendar_date', { ascending: true })
    setCalendarEntries(data || [])
  }

  const handleDayClick = (date) => {
    const existing = calendarEntries.find((e) => isSameDay(new Date(e.calendar_date), date))
    if (existing) navigate(`entry/${existing.id}`)
    else navigate(`entry/new?date=${format(date, 'yyyy-MM-dd')}`)
  }

  const handleDelete = async (entry) => {
    if (!window.confirm('Delete this calendar entry?')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      const internalUserId = await getCurrentUserInternalUserId()
      if (!internalUserId) throw new Error('User record not found')
      const { error } = await supabase
        .from('resource_calendar')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: internalUserId })
        .eq('id', entry.id)
      if (error) throw error
      reloadEntries()
    } catch (error) {
      console.error('Error deleting calendar entry:', error)
      alert('Error deleting entry: ' + error.message)
    }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })

  const getEntry = (date) => calendarEntries.find((e) => isSameDay(new Date(e.calendar_date), date))

  const getDayClass = (date) => {
    const entry = getEntry(date)
    if (!entry) return 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
    switch (entry.availability_type) {
      case 'unavailable':
        return 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
      default:
        return 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        Resource Calendar
      </h1>
      {resourceName && <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{resourceName}</p>}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ← Previous
        </button>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Next →
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const entry = getEntry(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-left min-h-[60px] ${getDayClass(day)}`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">{format(day, 'd')}</div>
              {entry && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {entry.availability_type === 'partial' && entry.available_hours && <div>{entry.available_hours}h</div>}
                  {entry.unavailability_reason && (
                    <div className="truncate" title={formatReasons(entry.unavailability_reason).join(', ')}>
                      {formatReasons(entry.unavailability_reason).join(', ')}
                    </div>
                  )}
                  {entry.is_recurring && <Repeat className="h-3 w-3 inline" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {calendarEntries.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Calendar Entries</h4>
          <div className="space-y-2">
            {calendarEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(new Date(entry.calendar_date), 'MMM d, yyyy')}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      entry.availability_type === 'unavailable'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : entry.availability_type === 'partial'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {entry.availability_type}
                    </span>
                    {entry.is_recurring && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {entry.recurrence_pattern}
                      </span>
                    )}
                  </div>
                  {entry.unavailability_reason && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                      {formatReasons(entry.unavailability_reason).join('\n')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RowActionButton
                    variant="edit"
                    label="Edit calendar entry"
                    onClick={() => navigate(`entry/${entry.id}`)}
                  />
                  <RowActionButton variant="delete" label="Delete calendar entry" onClick={() => handleDelete(entry)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
