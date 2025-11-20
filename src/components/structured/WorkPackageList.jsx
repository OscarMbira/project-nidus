import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Package, Edit2, Trash2, CheckCircle, Clock, AlertCircle, User, Calendar, DollarSign, FileText } from 'lucide-react'

export default function WorkPackageList({ workPackages, onEdit, onRefresh, projectId, stageBoundaries }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (workPackageId) => {
    if (!confirm('Are you sure you want to delete this work package?')) return

    try {
      setDeletingId(workPackageId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('work_packages')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', workPackageId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting work package:', error)
      alert('Error deleting work package: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleAuthorize = async (workPackageId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('work_packages')
        .update({
          status: 'authorized',
          authorization_date: new Date().toISOString().split('T')[0],
          authorization_by: user.id,
          updated_by: user.id,
        })
        .eq('id', workPackageId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error authorizing work package:', error)
      alert('Error authorizing work package: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'authorized':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'accepted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'authorized':
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  if (workPackages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Work Packages yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first work package to start managing stage execution
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {workPackages.map((wp) => (
        <div
          key={wp.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {wp.work_package_name}
                </h3>
                {wp.work_package_code && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                    {wp.work_package_code}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(wp.status)}`}>
                  {getStatusIcon(wp.status)}
                  {wp.status.replace('_', ' ')}
                </span>
              </div>
              {wp.work_package_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {wp.work_package_description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {wp.status === 'draft' && (
                <button
                  onClick={() => handleAuthorize(wp.id)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  Authorize
                </button>
              )}
              <button
                onClick={() => onEdit(wp)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(wp.id)}
                disabled={deletingId === wp.id}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {wp.stage_boundary && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4" />
                <span>{wp.stage_boundary.gate_name}</span>
              </div>
            )}
            {wp.assigned_to && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>{wp.assigned_to.full_name || wp.assigned_to.email}</span>
              </div>
            )}
            {wp.planned_start_date && wp.planned_end_date && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(wp.planned_start_date), 'MMM dd')} - {format(new Date(wp.planned_end_date), 'MMM dd')}
                </span>
              </div>
            )}
            {wp.estimated_cost && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <DollarSign className="h-4 w-4" />
                <span>{parseFloat(wp.estimated_cost).toLocaleString()}</span>
              </div>
            )}
          </div>

          {wp.progress_percentage > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {wp.progress_percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${wp.progress_percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

