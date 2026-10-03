/**
 * Dependencies Module
 * Inter-project dependencies management
 * Route: /platform/dependencies
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Search, Network, AlertTriangle, CheckCircle } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { getInterProjectDependencies, getDependencyDashboardStats, deleteInterProjectDependency } from '../../services/dependencyService';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

function dependencyRecordKey(dep) {
  const code = String(dep?.dependency_code || '').trim()
  return code || dep?.id || ''
}

function dependencyPartyLabel(project, externalDependency) {
  if (project?.project_name) return project.project_name
  const external = String(externalDependency || '').trim()
  return external || '—'
}

export default function Dependencies() {
  const navigate = useNavigate();
  const { showSuccess, modal } = useSuccessModal();
  const [loading, setLoading] = useState(true);
  const [dependencies, setDependencies] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }
      if (!cancelled) loadDependencies();
    })();
    return () => {
      cancelled = true;
    };
  }, [searchTerm, navigate]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      setLoadError(null);
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
      setStats(null);
      setLoadError(error?.message || 'Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  };

  const openDependency = (dep, suffix = '') => {
    const key = dependencyRecordKey(dep)
    if (!key) return
    navigate(`/platform/dependencies/${encodeURIComponent(key)}${suffix}`)
  }

  const handleDelete = async (dep) => {
    const label = dep.dependency_name || dependencyRecordKey(dep) || 'this dependency'
    if (!window.confirm(`Delete "${label}"?`)) return
    try {
      await deleteInterProjectDependency(dep.id)
      showSuccess({
        recordId: dependencyRecordKey(dep),
        operation: 'deleted',
        message: `Deleted dependency ${label}.`,
        okLabel: 'Back to Dependency Register',
      })
      loadDependencies()
    } catch (error) {
      console.error('Error deleting dependency:', error)
      window.alert(error?.message || 'Failed to delete dependency')
    }
  }

  const filteredDependencies = dependencies.filter(dep =>
    dep.dependency_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.external_dependency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.source_project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dep.target_project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && dependencies.length === 0 && !loadError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dependencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                <span className="text-2xl font-bold text-gray-100">{stats.total || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Total Dependencies</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.critical || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Critical Dependencies</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.resolved || 0}</span>
              </div>
              <p className="text-sm text-gray-400">Resolved</p>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Link2 className="h-6 w-6 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-100">{stats.active || 0}</span>
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
        ) : loadError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Could not load dependencies</h3>
            <p className="text-gray-700 dark:text-gray-200">{loadError}</p>
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
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[22%]" />
                  <col className="w-[28%]" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-28" />
                </colgroup>
                <thead className="bg-gray-700/50">
                  <tr>
                <TableRowNumberHeader className="!normal-case !px-2" />
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase">Source Project</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase">Target Project</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase">Criticality</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredDependencies.map((dep, index) => (
                    <tr
                      key={dep.id}
                      onClick={() => openDependency(dep)}
                      className="hover:bg-gray-700/30 cursor-pointer"
                    >
                      <TableRowNumberCell number={getDisplayRowNumber(index)} className="!px-2" />
                      <td className="px-2 py-2 text-sm text-gray-100 break-words">
                        {dependencyPartyLabel(dep.source_project, dep.external_dependency)}
                      </td>
                      <td className="px-2 py-2 text-sm text-gray-100 break-words">
                        {dependencyPartyLabel(dep.target_project, dep.external_dependency)}
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-block px-1.5 py-0.5 text-xs bg-purple-900/30 text-purple-300 rounded break-words">
                          {dep.dependency_type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded break-words ${
                          dep.dependency_status === 'resolved' ? 'bg-green-900/30 text-green-300' :
                          dep.dependency_status === 'at-risk' ? 'bg-red-900/30 text-red-300' :
                          'bg-yellow-900/30 text-yellow-300'
                        }`}>
                          {dep.dependency_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded break-words ${
                          dep.dependency_criticality === 'critical' ? 'bg-red-900/30 text-red-300' :
                          dep.dependency_criticality === 'high' ? 'bg-orange-900/30 text-orange-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {dep.dependency_criticality || 'Normal'}
                        </span>
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <RowActionButton variant="view" label="View dependency" onClick={() => openDependency(dep)} />
                          <RowActionButton variant="edit" label="Edit dependency" onClick={() => openDependency(dep, '/edit')} />
                          <RowActionButton variant="delete" label="Delete dependency" onClick={() => handleDelete(dep)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </div>
      {modal}
    </div>
  );
}

