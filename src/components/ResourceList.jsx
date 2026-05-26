import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, Calendar, User, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { TableRowNumberHeader, TableRowNumberCell } from './ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function ResourceList({ resources, onEdit, onRefresh }) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (resource) => {
    if (!window.confirm(`Are you sure you want to delete "${resource.resource_name}"? This action cannot be undone.`)) return

    try {
      setDeleting(resource.id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('resources')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', resource.id)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Error deleting resource: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const getResourceTypeColor = (type) => {
    switch (type) {
      case 'human': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'equipment': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'facility': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (resources.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Resources yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first resource to get started</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
                <TableRowNumberHeader className="!normal-case" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Linked To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {resources.map((resource, index) => (
              <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.resource_name}
                    </div>
                    {resource.resource_code && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {resource.resource_code}
                      </div>
                    )}
                    {resource.resource_category && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {resource.resource_category}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(resource.resource_type)}`}>
                    {resource.resource_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {resource.default_capacity_hours_per_day}h/day
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {resource.default_capacity_percentage}% capacity
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {resource.user ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {resource.user.full_name || resource.user.email}
                      </span>
                    </div>
                  ) : resource.team ? (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {resource.team.team_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not linked</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {resource.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                    {resource.is_available ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                        Unavailable
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/resources/${resource.id}`)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View Details"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource)}
                      disabled={deleting === resource.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      title="Delete Resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

