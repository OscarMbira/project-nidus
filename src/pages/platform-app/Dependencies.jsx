/**
 * Dependencies Module
 * Inter-project dependencies management
 * Route: /platform/dependencies
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Search, Network, AlertTriangle, CheckCircle } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getInterProjectDependencies, getDependencyDashboardStats } from '../../services/dependencyService';

export default function Dependencies() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadDependencies();
    }
  }, [organizationId, searchTerm]);

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user's account
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        // Get account
        const { data: account } = await platformDb
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userRecord.id)
          .single();

        if (account) {
          setOrganizationId(account.id);
        } else {
          // Try through projects
          const { data: project } = await platformDb
            .from('projects')
            .select('account_id')
            .eq('owner_user_id', userRecord.id)
            .eq('is_deleted', false)
            .limit(1)
            .single();

          if (project?.account_id) {
            setOrganizationId(project.account_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      const filters = { search: searchTerm };
      const [depsData, statsData] = await Promise.all([
        getInterProjectDependencies(filters),
        getDependencyDashboardStats(filters)
      ]);
      setDependencies(depsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dependencies:', error);
      setDependencies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDependencies = dependencies.filter(dep =>
    dep.dependency_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.source_project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.target_project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dependencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Dependencies</h1>
            </div>
            <button
              onClick={() => navigate('/platform/dependencies/create')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Dependency
            </button>
          </div>
          <p className="text-gray-400">
            Manage inter-project dependencies and track their impacts
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Network className="h-6 w-6 text-purple-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.total_dependencies || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Total Dependencies</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.critical_dependencies || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Critical Dependencies</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.resolved_dependencies || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Resolved</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Link2 className="h-6 w-6 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.active_dependencies || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Active</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search dependencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Dependencies Display */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dependencies...</p>
          </div>
        ) : filteredDependencies.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Link2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Dependencies Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No dependencies match your search.' : 'Get started by creating your first dependency.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/platform/dependencies/create')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Dependency
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Source Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Target Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Criticality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredDependencies.map((dep) => (
                    <tr
                      key={dep.id}
                      onClick={() => navigate(`/platform/dependencies/${dep.id}`)}
                      className="hover:bg-gray-700/30 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                        {dep.source_project?.project_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                        {dep.target_project?.project_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded">
                          {dep.dependency_type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          dep.dependency_status === 'resolved' ? 'bg-green-900/30 text-green-300' :
                          dep.dependency_status === 'at-risk' ? 'bg-red-900/30 text-red-300' :
                          'bg-yellow-900/30 text-yellow-300'
                        }`}>
                          {dep.dependency_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          dep.dependency_criticality === 'critical' ? 'bg-red-900/30 text-red-300' :
                          dep.dependency_criticality === 'high' ? 'bg-orange-900/30 text-orange-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {dep.dependency_criticality || 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {dep.dependency_description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

