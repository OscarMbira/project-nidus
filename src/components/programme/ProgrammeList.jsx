import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Edit2, Trash2, TrendingUp, AlertTriangle, DollarSign, Users, Eye } from 'lucide-react';
import { TableHeaderCell } from '../ui/Table';
import { deleteProgramme } from '../../services/programmeService';
import SortToolbar from '../ui/SortToolbar';
import { useSortableTable } from '../../hooks/useSortableTable';

export default function ProgrammeList({ programmes, onRefresh, viewMode = 'grid' }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'programme_name', direction: 'asc' },
    storageKey: 'nidus-programme-list-sort',
  });

  const handleDelete = async (programme) => {
    if (!window.confirm(`Are you sure you want to delete "${programme.programme_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(programme.id);
      await deleteProgramme(programme.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting programme:', error);
      alert('Error deleting programme: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'business_transformation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'technology':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'infrastructure':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'product':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'regulatory':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredProgrammes = programmes.filter((programme) => {
    const matchesSearch = 
      programme.programme_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      programme.programme_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      programme.programme_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || programme.programme_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pgAccessors = useMemo(
    () => ({
      programme_name: (p) => p.programme_name ?? '',
      programme_status: (p) => p.programme_status ?? '',
      start: (p) => p.start_date ?? p.planned_start_date ?? '',
      end: (p) => p.end_date ?? p.planned_end_date ?? '',
    }),
    []
  );
  const displayProgrammes = useMemo(
    () => sortedData(filteredProgrammes, pgAccessors),
    [filteredProgrammes, sortedData, pgAccessors]
  );

  if (programmes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Programmes yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first programme to coordinate related projects and deliver strategic benefits
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search programmes by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <SortToolbar
        columns={[
          { key: 'programme_name', label: 'Name' },
          { key: 'programme_status', label: 'Status' },
          { key: 'start', label: 'Start date' },
          { key: 'end', label: 'End date' },
        ]}
        getSortDirection={getSortDirectionForColumn}
        onSort={handleSort}
        className="mb-2"
      />

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableHeaderCell sortable={false} className="!normal-case">Name</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Projects</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Start</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">End</TableHeaderCell>
                  <TableHeaderCell
                    sortable={false}
                    className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700 z-[1] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                  >
                    Actions
                  </TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayProgrammes.map((programme) => {
                  const start = programme.start_date || programme.planned_start_date;
                  const end = programme.end_date || programme.planned_end_date;
                  return (
                    <tr
                      key={programme.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
                      onClick={() => navigate(`/programme/${programme.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{programme.programme_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(programme.programme_status)}`}>
                          {programme.programme_status?.replace('-', ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{programme.total_projects_count ?? 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {start ? new Date(start).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {end ? new Date(end).toLocaleDateString() : '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`/programme/${programme.id}`)}
                            className="p-2 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            aria-label="View programme"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/programme/${programme.id}/edit`)}
                            className="p-2 rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Edit programme"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(programme)}
                            disabled={deleting === programme.id}
                            className="p-2 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            aria-label="Delete programme"
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
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayProgrammes.map((programme) => (
          <div
            key={programme.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/programme/${programme.id}`)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {programme.programme_name}
                  </h3>
                </div>
                {programme.programme_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {programme.programme_code}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/programme/${programme.id}/edit`);
                  }}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(programme);
                  }}
                  disabled={deleting === programme.id}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            {programme.programme_description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {programme.programme_description}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(programme.programme_status)}`}>
                {programme.programme_status || 'Unknown'}
              </span>
              {programme.programme_type && (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getTypeColor(programme.programme_type)}`}>
                  {programme.programme_type.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Projects</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {programme.total_projects_count || 0}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Progress</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.round(programme.overall_progress_percentage || 0)}%
                </p>
              </div>
              {programme.overall_health_score !== null && programme.overall_health_score !== undefined && (
                <div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Health</span>
                  </div>
                  <p className={`text-lg font-semibold ${
                    programme.overall_health_score >= 80 
                      ? 'text-green-600 dark:text-green-400' 
                      : programme.overall_health_score >= 60 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.round(programme.overall_health_score)}%
                  </p>
                </div>
              )}
              {programme.benefits_realization_percentage !== null && programme.benefits_realization_percentage !== undefined && (
                <div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">Benefits</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Math.round(programme.benefits_realization_percentage)}%
                  </p>
                </div>
              )}
            </div>

            {/* Owner/Manager */}
            {(programme.programme_owner || programme.programme_manager) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>
                    {programme.programme_owner?.full_name || programme.programme_manager?.full_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {viewMode === 'grid' && displayProgrammes.length === 0 && programmes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No programmes match your search criteria
          </p>
        </div>
      )}
    </div>
  );
}

