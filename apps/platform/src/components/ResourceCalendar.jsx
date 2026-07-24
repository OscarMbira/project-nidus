import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Save, Calendar, AlertCircle, Repeat } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays } from 'date-fns'

export default function ResourceCalendar({ resourceId, onClose, onSave }) {
  const [calendarEntries, setCalendarEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [formData, setFormData] = useState({
    calendar_date: '',
    availability_type: 'unavailable',
    available_hours: '',
    capacity_percentage: 100,
    unavailability_reason: '',
    notes: '',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (resourceId) {
      fetchCalendarEntries()
    }
  }, [resourceId, currentMonth])

  const fetchCalendarEntries = async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      const { data, error } = await supabase
        .from('resource_calendar')
        .select('*')
        .eq('resource_id', resourceId)
        .gte('calendar_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('calendar_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('is_deleted', false)
        .order('calendar_date', { ascending: true })

      if (error) throw error
      setCalendarEntries(data || [])
    } catch (error) {
      console.error('Error fetching calendar entries:', error)
      alert('Error loading calendar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = calendarEntries.find(e => isSameDay(new Date(e.calendar_date), date))

    if (existing) {
      setFormData({
        calendar_date: existing.calendar_date,
        availability_type: existing.availability_type,
        available_hours: existing.available_hours || '',
        capacity_percentage: existing.capacity_percentage || 100,
        unavailability_reason: existing.unavailability_reason || '',
        notes: existing.notes || '',
        is_recurring: existing.is_recurring || false,
        recurrence_pattern: existing.recurrence_pattern || '',
        recurrence_end_date: existing.recurrence_end_date || '',
      })
      setSelectedDate(existing)
    } else {
      setFormData({
        calendar_date: dateStr,
        availability_type: 'unavailable',
        available_hours: '',
        capacity_percentage: 100,
        unavailability_reason: '',
        notes: '',
        is_recurring: false,
        recurrence_pattern: '',
        recurrence_end_date: '',
      })
      setSelectedDate(null)
    }
    setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : '') : value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        resource_id: resourceId,
        calendar_date: formData.calendar_date,
        availability_type: formData.availability_type,
        available_hours: formData.available_hours ? parseFloat(formData.available_hours) : null,
        capacity_percentage: formData.capacity_percentage,
        unavailability_reason: formData.unavailability_reason || null,
        notes: formData.notes || null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern || null,
        recurrence_end_date: formData.recurrence_end_date || null,
        updated_by: user.id,
      }

      if (selectedDate) {
        // Update
        const { error } = await supabase
          .from('resource_calendar')
          .update(submitData)
          .eq('id', selectedDate.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('resource_calendar')
          .insert(submitData)

        if (error) throw error
      }

      setShowForm(false)
      setSelectedDate(null)
      fetchCalendarEntries()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error saving calendar entry:', error)
      alert('Error saving calendar entry: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry) => {
    if (!window.confirm('Delete this calendar entry?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('resource_calendar')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', entry.id)

      if (error) throw error
      fetchCalendarEntries()
      if (onSave) onSave()
    } catch (error) {
      console.error('Error deleting calendar entry:', error)
      alert('Error deleting entry: ' + error.message)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const entry = calendarEntries.find(e => isSameDay(new Date(e.calendar_date), date))
    return entry
  }

  const getDayClass = (date) => {
    const entry = getDayStatus(date)
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

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Resource Calendar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Previous
            </button>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={nextMonth}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next →
            </button>
          </div>

          {/* Legend */}
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const entry = getDayStatus(day)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-left min-h-[60px] ${getDayClass(day)}`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(day, 'd')}
                  </div>
                  {entry && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {entry.availability_type === 'partial' && entry.available_hours && (
                        <div>{entry.available_hours}h</div>
                      )}
                      {entry.unavailability_reason && (
                        <div className="truncate" title={entry.unavailability_reason}>
                          {entry.unavailability_reason}
                        </div>
                      )}
                      {entry.is_recurring && (
                        <Repeat className="h-3 w-3 inline" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Calendar Entries List */}
          {calendarEntries.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Calendar Entries
              </h4>
              <div className="space-y-2">
                {calendarEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
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
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {entry.unavailability_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDateClick(new Date(entry.calendar_date))}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Entry Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedDate ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setSelectedDate(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="calendar_date"
                    value={formData.calendar_date}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Availability Type *
                  </label>
                  <select
                    name="availability_type"
                    value={formData.availability_type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="available">Available</option>
                    <option value="partial">Partial</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                {formData.availability_type === 'partial' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Available Hours
                      </label>
                      <input
                        type="number"
                        name="available_hours"
                        value={formData.available_hours}
                        onChange={handleChange}
                        min="0"
                        max="24"
                        step="0.5"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Capacity Percentage (%)
                      </label>
                      <input
                        type="number"
                        name="capacity_percentage"
                        value={formData.capacity_percentage}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {(formData.availability_type === 'unavailable' || formData.availability_type === 'partial') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason
                    </label>
                    <input
                      type="text"
                      name="unavailability_reason"
                      value={formData.unavailability_reason}
                      onChange={handleChange}
                      placeholder="e.g., Vacation, Sick, Training"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recurring Pattern
                  </label>
                </div>

                {formData.is_recurring && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recurrence Pattern
                      </label>
                      <select
                        name="recurrence_pattern"
                        value={formData.recurrence_pattern}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select pattern</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="recurrence_end_date"
                        value={formData.recurrence_end_date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setSelectedDate(null)
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

