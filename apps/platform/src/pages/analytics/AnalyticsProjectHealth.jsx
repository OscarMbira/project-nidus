import { useState, useEffect } from 'react';
import { Heart, Filter } from 'lucide-react';
import ProjectHealthDashboard from '../../components/analytics/ProjectHealthDashboard';
import { supabase } from '../../services/supabaseClient';

export default function AnalyticsProjectHealth() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code, project_status')
        .eq('is_deleted', false)
        .in('project_status', ['planning', 'in-progress', 'on-hold'])
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="h-8 w-8 text-red-600 dark:text-red-400" />
          Project Health Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor project health metrics and performance indicators
        </p>
      </div>

      {/* Project Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Project:
            </label>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Health Dashboard */}
      {selectedProjectId ? (
        <ProjectHealthDashboard projectId={selectedProjectId} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a Project
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a project from the dropdown above to view health analytics
          </p>
        </div>
      )}
    </div>
  );
}

