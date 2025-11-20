import { useState, useEffect } from 'react';
import { Target, Link, Plus, Edit2, Trash2, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { getProjectObjectiveMappings, deleteProjectObjectiveMapping, calculateProjectAlignmentScore } from '../../services/strategicService';
import { supabase } from '../../services/supabaseClient';

export default function ProjectObjectiveMapper({ projectId, onAddMapping, onEdit }) {
  const [mappings, setMappings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [alignmentScore, setAlignmentScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMappings();
      fetchAlignmentScore();
    }
  }, [selectedProjectId]);

  const fetchLookupData = async () => {
    try {
      const [projectsData, objectivesData] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, project_code, project_status')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
        supabase
          .from('strategic_objectives')
          .select('id, objective_name, objective_code, objective_category, strategic_importance')
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

  const fetchMappings = async () => {
    if (!selectedProjectId) return;
    
    try {
      setLoading(true);
      const data = await getProjectObjectiveMappings({ project_id: selectedProjectId });
      setMappings(data || []);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlignmentScore = async () => {
    if (!selectedProjectId) return;

    try {
      const score = await calculateProjectAlignmentScore(selectedProjectId);
      setAlignmentScore(score);
    } catch (error) {
      console.error('Error calculating alignment score:', error);
    }
  };

  const handleDelete = async (mapping) => {
    if (!window.confirm(`Are you sure you want to remove the mapping between "${mapping.project?.project_name}" and "${mapping.objective?.objective_name}"?`)) {
      return;
    }

    try {
      setDeleting(mapping.id);
      await deleteProjectObjectiveMapping(mapping.id);
      fetchMappings();
      fetchAlignmentScore();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      alert('Error deleting mapping: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-4">
      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedProject && (
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Alignment Score</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {alignmentScore !== null ? Math.round(alignmentScore) : '--'}
              </div>
            </div>
          )}
          {onAddMapping && selectedProjectId && (
            <button
              onClick={() => onAddMapping(selectedProjectId)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Map Objective
            </button>
          )}
        </div>
      </div>

      {/* Mappings List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : selectedProjectId && mappings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Link className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Objective Mappings
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Map this project to strategic objectives to track alignment
          </p>
          {onAddMapping && (
            <button
              onClick={() => onAddMapping(selectedProjectId)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Mapping
            </button>
          )}
        </div>
      ) : selectedProjectId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Strategic Objective
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Mapping Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contribution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Alignment Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {mapping.objective?.objective_name}
                          </div>
                          {mapping.objective?.objective_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {mapping.objective.objective_code}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {mapping.objective?.objective_category} • {mapping.objective?.strategic_importance}% importance
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                        {mapping.mapping_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {Math.round(mapping.contribution_percentage || 0)}%
                      </div>
                      {mapping.contribution_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                          {mapping.contribution_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mapping.alignment_score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-semibold ${
                            mapping.alignment_score >= 80 ? 'text-green-600 dark:text-green-400' :
                            mapping.alignment_score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {Math.round(mapping.alignment_score)}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            mapping.alignment_confidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            mapping.alignment_confidence === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {mapping.alignment_confidence || 'medium'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not calculated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                        mapping.contribution_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        mapping.contribution_status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        mapping.contribution_status === 'on_hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {mapping.contribution_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(mapping)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Mapping"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(mapping)}
                          disabled={deleting === mapping.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete Mapping"
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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a Project
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a project from the dropdown above to view objective mappings
          </p>
        </div>
      )}
    </div>
  );
}

