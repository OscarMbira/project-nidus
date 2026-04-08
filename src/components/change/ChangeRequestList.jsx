import { useState, useMemo } from 'react';
import { FileEdit, Edit2, Trash2, Plus, Calendar, User, ArrowRight, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { deleteChangeRequest } from '../../services/changeManagementService';
import SortToolbar from '../ui/SortToolbar';
import { useSortableTable } from '../../hooks/useSortableTable';
import { TableHeaderCell } from '../ui/Table';
import ViewToggle from '../ui/ViewToggle';

export default function ChangeRequestList({ requests, onEdit, onRefresh, onAdd, onSelect, viewMode = 'grid', onViewModeChange }) {
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'submission_date', direction: 'desc' },
    storageKey: 'nidus-change-requests-sort',
  });

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this change request?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteChangeRequest(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting change request:', error);
      alert('Error deleting change request: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'submitted': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'under-assessment': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'pending-approval': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'deferred': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'implemented': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors.submitted;
  };

  const getStatusIcon = (status) => {
    const icons = {
      'submitted': Clock,
      'under-assessment': AlertCircle,
      'pending-approval': AlertCircle,
      'approved': CheckCircle,
      'rejected': XCircle,
      'deferred': Clock,
      'implemented': CheckCircle,
      'cancelled': XCircle
    };
    return icons[status] || Clock;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      'urgent': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
      'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'scope': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'schedule': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'budget': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'quality': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'resource': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'risk': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'technical': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[category] || colors.other;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    if (filter !== 'all' && request.status !== filter) return false;
    if (categoryFilter !== 'all' && request.change_category !== categoryFilter) return false;
    return true;
  });

  const crAccessors = useMemo(
    () => ({
      change_title: (r) => r.change_title ?? '',
      status: (r) => r.status ?? '',
      priority: (r) => r.priority ?? '',
      submission_date: (r) => r.submission_date ?? '',
    }),
    []
  );
  const displayRequests = useMemo(
    () => sortedData(filteredRequests, crAccessors),
    [filteredRequests, sortedData, crAccessors]
  );

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileEdit className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Change Requests Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Submit a change request to track project changes
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Submit Change Request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Change Requests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {displayRequests.length} of {requests.length} requests
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {onViewModeChange && (
            <ViewToggle value={viewMode} onChange={onViewModeChange} ariaLabel="Change requests layout" />
          )}
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Status
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under-assessment">Under Assessment</option>
            <option value="pending-approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="implemented">Implemented</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="scope">Scope</option>
            <option value="schedule">Schedule</option>
            <option value="budget">Budget</option>
            <option value="quality">Quality</option>
            <option value="resource">Resource</option>
            <option value="technical">Technical</option>
          </select>
        </div>
      </div>

      <SortToolbar
        columns={[
          { key: 'change_title', label: 'Title' },
          { key: 'status', label: 'Status' },
          { key: 'priority', label: 'Priority' },
          { key: 'submission_date', label: 'Date' },
        ]}
        getSortDirection={getSortDirectionForColumn}
        onSort={handleSort}
      />

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableHeaderCell sortable={false} className="!normal-case">Title</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Category</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Priority</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Date</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                    Actions
                  </TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{request.change_title}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs capitalize ${getCategoryColor(request.change_category)}`}>
                        {request.change_category || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(request.priority)}`}>{request.priority}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>{request.status?.replace('-', ' ')}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(request.submission_date)}</td>
                    <td
                      className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button type="button" onClick={() => onEdit(request)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded mr-1" aria-label="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(request.id)}
                        disabled={deleting === request.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4">
        {displayRequests.map((request) => {
          const StatusIcon = getStatusIcon(request.status);
          return (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelect && onSelect(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-lg ${getStatusColor(request.status)}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {request.change_title}
                        </h3>
                        {request.change_reference && (
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            {request.change_reference}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.replace('-', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(request.change_category)} capitalize`}>
                          {request.change_category}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                        {request.change_description}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        {request.submitted_by_user && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              {request.submitted_by_user.full_name || request.submitted_by_user.email}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(request.submission_date)}</span>
                        </div>

                        {request.change_type && (
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            <span className="capitalize">{request.change_type.replace('-', ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(request);
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Edit request"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(request.id);
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    disabled={deleting === request.id}
                    title="Delete request"
                  >
                    {deleting === request.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {viewMode === 'grid' && displayRequests.length === 0 && requests.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No requests match the selected filters
          </p>
        </div>
      )}
    </div>
  );
}
