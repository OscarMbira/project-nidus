import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Plus, Calendar, Play, Pause, Edit2, Trash2, Mail, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function ScheduledReports() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select(`
          *,
          report_template:report_template_id (id, template_name, template_description)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSchedules(data || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
      alert('Error loading schedules: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (schedule) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('scheduled_reports')
        .update({
          is_active: !schedule.is_active,
          updated_by: user.id,
        })
        .eq('id', schedule.id)

      if (error) throw error
      fetchSchedules()
    } catch (error) {
      console.error('Error toggling schedule:', error)
      alert('Error updating schedule: ' + error.message)
    }
  }

  const handleDelete = async (schedule) => {
    if (!window.confirm(`Delete scheduled report "${schedule.schedule_name}"?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('scheduled_reports')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', schedule.id)

      if (error) throw error
      fetchSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error deleting schedule: ' + error.message)
    }
  }

  const handleRunNow = async (schedule) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create a manual execution
      const { error } = await supabase
        .from('report_executions')
        .insert({
          report_template_id: schedule.report_template_id,
          scheduled_report_id: schedule.id,
          execution_type: 'manual',
          execution_status: 'pending',
          created_by: user.id,
        })

      if (error) throw error
      alert('Report execution started!')
    } catch (error) {
      console.error('Error running report:', error)
      alert('Error running report: ' + error.message)
    }
  }

  const getFrequencyLabel = (schedule) => {
    switch (schedule.frequency_type) {
      case 'daily':
        return `Every ${schedule.frequency_value || 1} day(s)`
      case 'weekly':
        return `Every ${schedule.frequency_value || 1} week(s)`
      case 'monthly':
        return `Every ${schedule.frequency_value || 1} month(s)`
      case 'quarterly':
        return 'Quarterly'
      case 'yearly':
        return 'Yearly'
      case 'custom':
        return schedule.cron_expression || 'Custom'
      default:
        return schedule.frequency_type
    }
  }

  const getStatusColor = (schedule) => {
    if (!schedule.is_active) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    if (schedule.error_count > 0) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
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
              Scheduled Reports
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage automated report schedules and deliveries
            </p>
          </div>
          <button
            onClick={() => navigate('/reports/scheduled/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Schedules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{schedules.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {schedules.filter(s => s.is_active).length}
              </p>
            </div>
            <Play className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {schedules.filter(s => !s.is_active).length}
              </p>
            </div>
            <Pause className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">With Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {schedules.filter(s => s.error_count > 0).length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading schedules...</p>
          </div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Scheduled Reports</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Create your first scheduled report</p>
          <button
            onClick={() => navigate('/reports/scheduled/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule, index) => (
            <div
              key={schedule.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {schedule.schedule_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(schedule)}`}>
                      {schedule.is_active ? 'Active' : 'Paused'}
                    </span>
                    {schedule.error_count > 0 && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {schedule.error_count} error(s)
                      </span>
                    )}
                  </div>
                  {schedule.schedule_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {schedule.schedule_description}
                    </p>
                  )}
                  {schedule.report_template && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Report: <span className="font-medium">{schedule.report_template.template_name}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunNow(schedule)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
                    title="Run Now"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(schedule)}
                    className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 ${
                      schedule.is_active
                        ? 'bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-900/50'
                        : 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-900/50'
                    }`}
                    title={schedule.is_active ? 'Pause' : 'Activate'}
                  >
                    {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => navigate(`/reports/scheduled/${schedule.id}/edit`)}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule)}
                    className="px-3 py-2 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-300 dark:hover:bg-red-900/50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getFrequencyLabel(schedule)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Delivery</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {schedule.delivery_method} ({schedule.export_format})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Next Run</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {schedule.next_run_at
                        ? format(new Date(schedule.next_run_at), 'MMM d, yyyy HH:mm')
                        : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </div>

              {schedule.last_error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>Last Error:</strong> {schedule.last_error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

