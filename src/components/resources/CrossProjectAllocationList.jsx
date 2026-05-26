import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Edit2, Trash2, AlertTriangle, FolderKanban, Target, TrendingUp } from 'lucide-react';
import { deleteCrossProjectAllocation } from '../../services/crossResourceService';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function CrossProjectAllocationList({ allocations, onRefresh }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (allocation) => {
    if (!window.confirm(`Are you sure you want to delete this resource allocation? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(allocation.id);
      await deleteCrossProjectAllocation(allocation.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting allocation:', error);
      alert('Error deleting allocation: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (allocations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Resource Allocations yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first cross-project resource allocation to start managing resources across multiple projects
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Allocation Context
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Allocation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {allocations.map((allocation, index) => (
                <tr key={allocation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {allocation.resource?.resource_name || 'Unknown Resource'}
                        </div>
                        {allocation.resource?.resource_code && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {allocation.resource.resource_code}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {allocation.project && (
                        <div className="flex items-center gap-1">
                          <FolderKanban className="h-4 w-4 text-blue-500" />
                          <span>{allocation.project.project_name}</span>
                        </div>
                      )}
                      {allocation.portfolio && (
                        <div className="flex items-center gap-1 mt-1">
                          <Target className="h-4 w-4 text-purple-500" />
                          <span>{allocation.portfolio.portfolio_name}</span>
                        </div>
                      )}
                      {allocation.programme && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>{allocation.programme.programme_name}</span>
                        </div>
                      )}
                      {!allocation.project && !allocation.portfolio && !allocation.programme && (
                        <span className="text-gray-400">No context</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div>
                      <div>{allocation.allocation_start_date ? new Date(allocation.allocation_start_date).toLocaleDateString() : 'N/A'}</div>
                      {allocation.allocation_end_date && (
                        <div className="text-xs">to {new Date(allocation.allocation_end_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{allocation.allocation_percentage || 0}%</div>
                      {allocation.allocated_hours_per_week && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {allocation.allocated_hours_per_week} hrs/week
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(allocation.allocation_status)}`}>
                      {allocation.allocation_status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {allocation.allocation_priority && (
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(allocation.allocation_priority)}`}>
                        {allocation.allocation_priority}
                      </span>
                    )}
                    {allocation.is_critical_resource && (
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (onEdit) {
                            onEdit(allocation);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(allocation)}
                        disabled={deleting === allocation.id}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Delete"
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
    </div>
  );
}

