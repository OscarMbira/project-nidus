import { useState, useMemo } from 'react';
import { Link2, Edit2, Trash2, AlertTriangle, FolderKanban, Target, TrendingUp, ArrowRight } from 'lucide-react';
import { deleteInterProjectDependency } from '../../services/dependencyService';
import { TableHeaderCell } from '../ui/Table';
import { useSortableTable } from '../../hooks/useSortableTable';

export default function DependencyList({ dependencies, onEdit, onRefresh, viewMode = 'grid' }) {
  const [deleting, setDeleting] = useState(null);

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'dependency_name', direction: 'asc' },
    storageKey: 'nidus-dependency-list-sort',
  });
  const depAccessors = useMemo(
    () => ({
      dependency_name: (d) => d.dependency_name ?? '',
      source_target: (d) =>
        `${d.source_project?.project_name ?? ''} ${d.target_project?.project_name ?? ''}`,
      dependency_type: (d) => d.dependency_type ?? '',
      dependency_status: (d) => d.dependency_status ?? '',
      dependency_criticality: (d) => d.dependency_criticality ?? '',
    }),
    []
  );
  const displayDeps = useMemo(
    () => sortedData(dependencies || [], depAccessors),
    [dependencies, sortedData, depAccessors]
  );

  const handleDelete = async (dependency) => {
    if (!window.confirm(`Are you sure you want to delete dependency "${dependency.dependency_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(dependency.id);
      await deleteInterProjectDependency(dependency.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting dependency:', error);
      alert('Error deleting dependency: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'at_risk':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'resolved':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'identified':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
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

  const getTypeLabel = (type) => {
    const labels = {
      'finish-to-start': 'Finish-to-Start (FS)',
      'start-to-start': 'Start-to-Start (SS)',
      'finish-to-finish': 'Finish-to-Finish (FF)',
      'start-to-finish': 'Start-to-Finish (SF)',
      'logical': 'Logical',
      'resource': 'Resource',
      'benefit': 'Benefit',
      'deliverable': 'Deliverable',
    };
    return labels[type] || type;
  };

  if (!dependencies?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Link2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Inter-Project Dependencies yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first inter-project dependency to start tracking relationships between projects
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayDeps.map((dependency) => (
          <div
            key={dependency.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 min-h-[200px] flex flex-col hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              className="text-left flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              onClick={() => onEdit?.(dependency)}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{dependency.dependency_name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3 flex-wrap">
                <span className="truncate max-w-[45%]">{dependency.source_project?.project_name || '?'}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[45%]">{dependency.target_project?.project_name || '?'}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {getTypeLabel(dependency.dependency_type)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dependency.dependency_status)}`}>
                  {dependency.dependency_status?.replace('_', ' ') || '—'}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getCriticalityColor(dependency.dependency_criticality)}`}>
                  {dependency.dependency_criticality || '—'}
                </span>
              </div>
            </button>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => onEdit?.(dependency)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" aria-label="Edit">
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(dependency)}
                disabled={deleting === dependency.id}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
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
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('dependency_name')}
                  onSort={() => handleSort('dependency_name')}
                  className="!normal-case"
                >
                  Dependency
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('source_target')}
                  onSort={() => handleSort('source_target')}
                  className="!normal-case"
                >
                  Source → Target
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('dependency_type')}
                  onSort={() => handleSort('dependency_type')}
                  className="!normal-case"
                >
                  Type
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('dependency_status')}
                  onSort={() => handleSort('dependency_status')}
                  className="!normal-case"
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('dependency_criticality')}
                  onSort={() => handleSort('dependency_criticality')}
                  className="!normal-case"
                >
                  Criticality
                </TableHeaderCell>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Context
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayDeps.map((dependency) => (
                <tr key={dependency.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dependency.dependency_name}
                      </div>
                      {dependency.dependency_code && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {dependency.dependency_code}
                        </div>
                      )}
                      {dependency.is_critical_path && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Critical Path</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {dependency.source_project?.project_name || 'Unknown'}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {dependency.target_project?.project_name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    {dependency.lag_days !== 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Lag: {dependency.lag_days} days
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {getTypeLabel(dependency.dependency_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(dependency.dependency_status)}`}>
                      {dependency.dependency_status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCriticalityColor(dependency.dependency_criticality)}`}>
                      {dependency.dependency_criticality || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {dependency.portfolio && (
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-purple-500" />
                          <span className="text-xs">{dependency.portfolio.portfolio_name}</span>
                        </div>
                      )}
                      {dependency.programme && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{dependency.programme.programme_name}</span>
                        </div>
                      )}
                      {!dependency.portfolio && !dependency.programme && (
                        <span className="text-xs text-gray-400">No context</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (onEdit) {
                            onEdit(dependency);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dependency)}
                        disabled={deleting === dependency.id}
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

