import { useState, useEffect } from 'react';
import { Target, Plus, Filter, BarChart3 } from 'lucide-react';
import { getKPIDefinitions, getKPIStats } from '../../services/kpiService';
import KPITracker from '../../components/analytics/KPITracker';
import { supabase } from '../../services/supabaseClient';

export default function AnalyticsKPIs() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProjectId, selectedCategory]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedProjectId) filters.project_id = selectedProjectId;

      const data = await getKPIStats(filters);
      setStats(data);
    } catch (error) {
      console.error('Error fetching KPI stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'schedule',
    'cost',
    'quality',
    'resource',
    'risk',
    'scope',
    'benefit',
    'custom',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          KPI Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track and manage Key Performance Indicators
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total KPIs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalKPIs || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active KPIs</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.activeKPIs || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">System KPIs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.systemKPIs || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">On Target</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onTarget || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Below Target</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.belowTarget || 0}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Critical</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          <div className="flex-1 min-w-[200px]">
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
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Tracker */}
      <KPITracker
        projectId={selectedProjectId || null}
        category={selectedCategory || null}
      />
    </div>
  );
}

