import { useState } from 'react';
import { Target, Plus, Edit2, Trash2, CheckCircle, AlertTriangle, TrendingUp, FolderKanban } from 'lucide-react';
import { deleteStrategicObjective } from '../../services/strategicService';

export default function StrategicObjectivesManager({ objectives = [], onEdit, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (objective) => {
    if (!window.confirm(`Are you sure you want to delete objective "${objective.objective_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(objective.id);
      await deleteStrategicObjective(objective.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting objective:', error);
      alert('Error deleting objective: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'active':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'missed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'strategic':
        return Target;
      case 'financial':
        return TrendingUp;
      default:
        return FolderKanban;
    }
  };

  if (objectives.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Strategic Objectives
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first strategic objective to start aligning projects with strategy
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Objective
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Context
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {objectives.map((objective) => {
                const CategoryIcon = getCategoryIcon(objective.objective_category);
                const progress = objective.target_value && objective.target_value > 0
                  ? ((objective.current_value || 0) / objective.target_value) * 100
                  : 0;

                return (
                  <tr key={objective.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {objective.objective_name}
                        </div>
                        {objective.objective_code && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {objective.objective_code}
                          </div>
                        )}
                        {objective.parent_objective && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Parent: {objective.parent_objective.objective_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {objective.objective_category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        {objective.objective_level} • {objective.objective_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {objective.portfolio && (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3 text-purple-500" />
                            <span className="text-xs">{objective.portfolio.portfolio_name}</span>
                          </div>
                        )}
                        {!objective.portfolio && (
                          <span className="text-xs text-gray-400">Organizational</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getPriorityColor(objective.priority)}`}>
                        {objective.priority}
                      </span>
                      {objective.strategic_importance && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Math.round(objective.strategic_importance)}% important
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor(objective.objective_status)}`}>
                        {objective.objective_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progress >= 100
                                ? 'bg-green-500'
                                : progress >= 75
                                ? 'bg-blue-500'
                                : progress >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem]">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      {objective.target_value && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {objective.current_value || 0} / {objective.target_value} {objective.measurement_unit || ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            if (onEdit) {
                              onEdit(objective);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(objective)}
                          disabled={deleting === objective.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

