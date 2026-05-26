import { useState, useEffect } from 'react';
import { Target, TrendingUp, Plus, Edit2, Trash2, CheckCircle, DollarSign, BarChart3 } from 'lucide-react';
import { getStrategicContributions, deleteStrategicContribution } from '../../services/strategicService';
import { supabase } from '../../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function StrategicContributionScorer({ projectId = null, objectiveId = null, onAdd, onEdit }) {
  const [contributions, setContributions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(objectiveId || '');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    if (selectedProjectId || selectedObjectiveId) {
      fetchContributions();
    }
  }, [selectedProjectId, selectedObjectiveId]);

  const fetchLookupData = async () => {
    try {
      const [projectsData, objectivesData] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, project_code, status_id, project_statuses(status_name, status_code)')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
        supabase
          .from('strategic_objectives')
          .select('id, objective_name, objective_code, objective_category')
          .eq('is_deleted', false)
          .eq('objective_status', 'active')
          .order('objective_name', { ascending: true }),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (objectivesData.data) setObjectives(objectivesData.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedProjectId) filters.project_id = selectedProjectId;
      if (selectedObjectiveId) filters.objective_id = selectedObjectiveId;

      const data = await getStrategicContributions(filters);
      setContributions(data || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contribution) => {
    if (!window.confirm(`Are you sure you want to delete this strategic contribution?`)) {
      return;
    }

    try {
      setDeleting(contribution.id);
      await deleteStrategicContribution(contribution.id);
      fetchContributions();
    } catch (error) {
      console.error('Error deleting contribution:', error);
      alert('Error deleting contribution: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'realized':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'partially_realized':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'planned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'not_realized':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getContributionTypeColor = (type) => {
    switch (type) {
      case 'direct':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'indirect':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'enabling':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'supporting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Calculate total contribution value
  const totalValue = contributions
    .filter(c => c.contribution_value && parseFloat(c.contribution_value) > 0)
    .reduce((sum, c) => sum + parseFloat(c.contribution_value || 0), 0);

  const realizedCount = contributions.filter(c => c.contribution_status === 'realized').length;
  const inProgressCount = contributions.filter(c => c.contribution_status === 'in_progress').length;

  return (
    <div className="space-y-4">
      {/* Filters and Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Objective
            </label>
            <select
              value={selectedObjectiveId}
              onChange={(e) => setSelectedObjectiveId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Objectives</option>
              {objectives.map(objective => (
                <option key={objective.id} value={objective.id}>
                  {objective.objective_name} {objective.objective_code ? `(${objective.objective_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {onAdd && (
              <button
                onClick={() => onAdd({ projectId: selectedProjectId, objectiveId: selectedObjectiveId })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Contribution
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{contributions.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Contributions</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{realizedCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Realized</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inProgressCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">In Progress</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Value</div>
          </div>
        </div>
      </div>

      {/* Contributions List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contributions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Strategic Contributions
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Track how projects contribute to strategic objectives
          </p>
          {onAdd && (
            <button
              onClick={() => onAdd({ projectId: selectedProjectId, objectiveId: selectedObjectiveId })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Contribution
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Objective
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contribution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contributions.map((contribution, index) => (
                  <tr key={contribution.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contribution.project?.project_name || 'N/A'}
                      </div>
                      {contribution.project?.project_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {contribution.project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {contribution.objective?.objective_name || 'N/A'}
                          </div>
                          {contribution.objective?.objective_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {contribution.objective.objective_code}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getContributionTypeColor(contribution.contribution_type)}`}>
                          {contribution.contribution_type?.replace('_', ' ')}
                        </span>
                        {contribution.contribution_description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                            {contribution.contribution_description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contribution.contribution_value ? (
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${parseFloat(contribution.contribution_value).toLocaleString()}
                          {contribution.contribution_unit && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              {contribution.contribution_unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No value</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(contribution.contribution_status)}`}>
                        {contribution.contribution_status?.replace('_', ' ')}
                      </span>
                      {contribution.contribution_confidence && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                          {contribution.contribution_confidence} confidence
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {contribution.contribution_period_start && contribution.contribution_period_end ? (
                        <div>
                          <div>{new Date(contribution.contribution_period_start).toLocaleDateString()}</div>
                          <div className="text-xs">to</div>
                          <div>{new Date(contribution.contribution_period_end).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="text-xs">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(contribution)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Contribution"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contribution)}
                          disabled={deleting === contribution.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete Contribution"
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
      )}
    </div>
  );
}

