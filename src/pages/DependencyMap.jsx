import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, Search, Filter } from 'lucide-react';
import { getInterProjectDependencies } from '../services/dependencyService';
import { platformDb } from '../services/supabase/supabaseClient';

export default function DependencyMap() {
  const navigate = useNavigate();
  const [dependencies, setDependencies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [depsData, projectsData] = await Promise.all([
        getInterProjectDependencies(filters),
        platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
      ]);
      setDependencies(depsData || []);
      if (projectsData.data) setProjects(projectsData.data);
    } catch (error) {
      console.error('Error fetching dependency map data:', error);
      alert('Error loading dependency map: ' + error.message);
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
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/platform/dependencies')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Network className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Dependency Map
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Visualize inter-project dependency network
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Dependency Map Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center py-16">
          <Network className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Dependency Map Visualization
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Interactive dependency network visualization will be displayed here
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            This feature will show a visual network graph of project dependencies using a graph visualization library.
            {dependencies.length > 0 && (
              <span className="block mt-2">
                Found {dependencies.length} dependencies to visualize
              </span>
            )}
          </p>
        </div>

        {/* Simple list view as placeholder */}
        {dependencies.length > 0 && (
          <div className="mt-8 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dependency Network Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dependencies.slice(0, 12).map((dep) => (
                <div
                  key={dep.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {dep.source_project?.project_name || 'Unknown'}
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {dep.target_project?.project_name || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {dep.dependency_type} • {dep.dependency_criticality}
                  </div>
                </div>
              ))}
            </div>
            {dependencies.length > 12 && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 12 of {dependencies.length} dependencies. View all in{' '}
                  <button
                    onClick={() => navigate('/platform/dependencies')}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Dependencies List
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

