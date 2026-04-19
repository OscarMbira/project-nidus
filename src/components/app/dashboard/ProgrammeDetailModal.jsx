/**
 * Programme Detail Modal Component
 * 
 * Shows detailed programme information including:
 * - Programme info
 * - Roll-up metrics (from programme_rollup_view)
 * - List of assigned projects
 * - Benefits roll-up display
 * - Actions: Assign Project, Remove Project
 */

import { useState, useEffect, memo } from 'react';
import { X, Plus, Trash2, FolderKanban, DollarSign, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  getProgrammeProjects, 
  addProjectToProgramme, 
  removeProjectFromProgramme,
  getProgrammeRollups 
} from '../../../services/programmeService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { logAction } from '../../../services/pmoAuditService';

const ProgrammeDetailModal = memo(function ProgrammeDetailModal({ 
  programme, 
  rollup, 
  onClose, 
  onRefresh 
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (programme?.id) {
      loadProjects();
    }
  }, [programme?.id]);

  const loadProjects = async () => {
    if (!programme?.id) return;

    setLoading(true);
    try {
      const projectsData = await getProgrammeProjects(programme.id);
      // Extract project data from nested structure
      const extractedProjects = (projectsData || []).map(pp => ({
        id: pp.project?.id || pp.project_id,
        project_name: pp.project?.project_name,
        project_code: pp.project?.project_code,
        project_status: pp.project?.project_status,
        project_statuses: pp.project?.project_statuses
      })).filter(p => p.id);
      setProjects(extractedProjects);
    } catch (error) {
      console.error('Error loading programme projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProjects = async () => {
    try {
      // Get user's account_id
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userRecord) return;

      // Get account_id from projects
      const { data: accountProjects } = await platformDb
        .from('projects')
        .select('id, project_name, project_code, account_id')
        .eq('is_deleted', false)
        .limit(100);

      if (!accountProjects) return;

      // Filter out projects already in this programme
      const programmeProjectIds = projects.map(p => p.id);
      const available = accountProjects.filter(
        p => !programmeProjectIds.includes(p.id)
      );

      setAvailableProjects(available);
    } catch (error) {
      console.error('Error loading available projects:', error);
    }
  };

  const handleAssignProject = async () => {
    if (!selectedProjectId || !programme?.id) return;

    setAssigning(true);
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      await addProjectToProgramme(programme.id, selectedProjectId);
      
      // Log audit action
      if (userRecord) {
        await logAction(
          userRecord.id,
          'ASSIGN_PROJECT_TO_PROGRAMME',
          'PROGRAMME',
          programme.id,
          `Assigned project ${selectedProjectId} to programme ${programme.programme_name}`,
          { project_id: selectedProjectId, programme_id: programme.id }
        );
      }

      setSelectedProjectId('');
      setShowAssignProject(false);
      await loadProjects();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error assigning project:', error);
      alert('Failed to assign project: ' + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveProject = async (projectId) => {
    if (!confirm('Are you sure you want to remove this project from the programme?')) {
      return;
    }

    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      await removeProjectFromProgramme(programme.id, projectId);
      
      // Log audit action
      if (userRecord) {
        await logAction(
          userRecord.id,
          'REMOVE_PROJECT_FROM_PROGRAMME',
          'PROGRAMME',
          programme.id,
          `Removed project ${projectId} from programme ${programme.programme_name}`,
          { project_id: projectId, programme_id: programme.id }
        );
      }

      await loadProjects();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error removing project:', error);
      alert('Failed to remove project: ' + error.message);
    }
  };

  const getRAGColor = (ragStatus) => {
    const status = ragStatus?.toLowerCase() || 'green';
    if (status === 'red') return 'bg-red-500';
    if (status === 'amber' || status === 'yellow') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-blue-400" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {programme.programme_name}
              </h3>
              {programme.programme_code && (
                <p className="text-sm text-gray-400">{programme.programme_code}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Programme Info */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {programme.programme_status || 'Unknown'}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">RAG Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getRAGColor(rollup?.programme_rag_status || programme.rag_status)}`} />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {(rollup?.programme_rag_status || programme.rag_status || 'green').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Projects</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {rollup?.total_projects || projects.length || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Roll-up Metrics */}
          {rollup && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Roll-up Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Projects</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Active: {rollup.active_projects || 0} | 
                    Completed: {rollup.completed_projects || 0} | 
                    On Hold: {rollup.onhold_projects || 0}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400">
                      Green: {rollup.green_projects || 0}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-400">
                      Amber: {rollup.amber_projects || 0}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400">
                      Red: {rollup.red_projects || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Budget</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Total: ${(rollup.total_budget || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300">
                    Spent: ${(rollup.total_spent || 0).toLocaleString()} 
                    ({rollup.budget_utilization_percentage || 0}%)
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Benefits</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Planned: ${(rollup.total_planned_benefits || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300">
                    Realised: ${(rollup.total_realised_benefits || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Risks & Exceptions</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Active Risks: {rollup.active_risks_count || 0}
                  </div>
                  <div className="text-sm text-gray-300">
                    Active Exceptions: {rollup.active_exceptions_count || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assigned Projects</h4>
              <button
                onClick={() => {
                  setShowAssignProject(true);
                  loadAvailableProjects();
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Assign Project
              </button>
            </div>

            {showAssignProject && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 mb-3"
                >
                  <option value="">Select a project...</option>
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAssignProject}
                    disabled={!selectedProjectId || assigning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignProject(false);
                      setSelectedProjectId('');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No projects assigned</div>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{project.project_name}</div>
                      {project.project_code && (
                        <div className="text-sm text-gray-400">{project.project_code}</div>
                      )}
                      {project.project_statuses && (
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {project.project_statuses.status_name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProject(project.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      title="Remove from programme"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProgrammeDetailModal;
