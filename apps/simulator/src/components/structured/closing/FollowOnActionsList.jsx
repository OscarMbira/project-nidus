import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { deleteFollowOnAction } from '../../../services/closingProjectService';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';
import { RowActionButton } from '@nidus/ui';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import RowNumberBadge from '@nidus/ui/RowNumberBadge';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';

function actionFields(action) {
  return {
    title: action.action_title || '',
    status: action.status || action.action_status || '',
    category: action.action_category || action.action_type || '',
    due: action.recommended_completion_date || action.target_completion_date || '',
    assignee: action.assigned_to_user?.full_name || action.assigned_to_user?.email || '',
    priority: action.priority || '',
  };
}

function label(value) {
  return String(value || '').replace(/-/g, ' ');
}

const SORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'category', label: 'Type' },
  { key: 'assignee', label: 'Assigned to' },
  { key: 'due', label: 'Due' },
];

export default function FollowOnActionsList({ actions, onView, onEdit, onRefresh, onAdd }) {
  const [deleting, setDeleting] = useState(null);
  const [viewMode, setViewMode] = useViewMode('follow-on-actions', 'list');
  const [sort, setSort] = useState({ key: null, direction: null });
  const [query, setQuery] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this follow-on action?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteFollowOnAction(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting follow-on action:', error);
      alert('Error deleting follow-on action: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'operational-handover': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'support-required': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'benefits-measurement': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'benefits-realization': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'support': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'maintenance': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'enhancement': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'documentation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'training': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'warranty-support': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[type] || colors.other;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
      'urgent': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
      'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      'not-started': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'recommended': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'approved': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'on-hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors['not-started'];
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return CheckCircle2;
    if (status === 'cancelled') return AlertCircle;
    return ArrowRight;
  };

  const isOverdue = (targetDate, status) => {
    if (!targetDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(targetDate) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const visibleActions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (actions || []).filter((action) => {
      if (!needle) return true;
      const fields = actionFields(action);
      return [fields.title, fields.status, fields.category, fields.assignee, fields.priority, action.action_description]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    const column = sort.key || 'title';
    const direction = sort.direction || 'asc';
    return [...filtered].sort((a, b) => {
      const left = String(actionFields(a)[column] || '');
      const right = String(actionFields(b)[column] || '');
      const result = left.localeCompare(right, undefined, { sensitivity: 'base' });
      if (result !== 0) return direction === 'desc' ? -result : result;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }, [actions, query, sort]);

  const cycleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key || !prev.direction) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const renderActions = (action) => (
    <div className="flex items-center gap-2">
      {onView && <RowActionButton variant="view" label="View action" onClick={() => onView(action)} />}
      <RowActionButton variant="edit" label="Edit action" onClick={() => onEdit(action)} />
      <RowActionButton
        variant="delete"
        label="Delete action"
        onClick={() => handleDelete(action.id)}
        disabled={deleting === action.id}
      />
    </div>
  );

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <ArrowRight className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Follow-on Actions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Define post-project actions and handover responsibilities
        </p>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Follow-on Action
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Follow-on Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {actions.length} {actions.length === 1 ? 'action' : 'actions'} defined
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Follow-on actions layout" />
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Action
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search actions"
        aria-label="Search actions"
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      {viewMode === 'list' ? (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[26%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                {SORT_COLUMNS.map((column) => (
                  <TableHeaderCell
                    key={column.key}
                    sortable
                    sortDirection={sort.key === column.key ? sort.direction : null}
                    onSort={() => cycleSort(column.key)}
                    className="whitespace-normal"
                  >
                    {column.label}
                  </TableHeaderCell>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {visibleActions.map((action, index) => {
                const fields = actionFields(action);
                return (
                  <tr key={action.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-normal break-words">{fields.title}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200 capitalize whitespace-normal">{fields.priority}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200 capitalize whitespace-normal">{label(fields.status)}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200 capitalize whitespace-normal">{label(fields.category)}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200 whitespace-normal break-words">{fields.assignee || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200 whitespace-normal">{formatDate(fields.due)}</td>
                    <td className="px-4 py-4">{renderActions(action)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4">
        {visibleActions.map((action, index) => {
          const status = action.status || action.action_status || '';
          const category = action.action_category || action.action_type || '';
          const dueDate = action.recommended_completion_date || action.target_completion_date;
          const StatusIcon = getStatusIcon(status);
          const overdueFlag = isOverdue(dueDate, status);

          return (
            <div
              key={action.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2"><RowNumberBadge number={getDisplayRowNumber(index)} /></div>
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`p-3 rounded-lg ${getTypeColor(category)}`}>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {action.action_title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(action.priority)}`}>
                          {action.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          <span className="inline-flex items-center gap-1 capitalize">
                            <StatusIcon className="h-3 w-3" />
                            {String(status).replace(/-/g, ' ')}
                          </span>
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(category)} capitalize`}>
                          {String(category).replace(/-/g, ' ')}
                        </span>
                      </div>

                      <ul className="text-sm text-gray-700 dark:text-gray-300 mb-3 list-disc pl-5 space-y-1">
                        {(Array.isArray(action.action_description_items) && action.action_description_items.length
                          ? action.action_description_items.map((row) => {
                            const text = String(row?.description || '').trim();
                            const date = row?.target_date ? formatDate(row.target_date) : '';
                            return date ? `${text} — ${date}` : text;
                          })
                          : String(action.action_description || '').split(/\r?\n/).map((line) => line.trim())
                        ).filter(Boolean).map((line, index) => (
                          <li key={`${action.id}-${index}`}>{line}</li>
                        ))}
                      </ul>

                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        {action.assigned_to_user && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {action.assigned_to_user.full_name || action.assigned_to_user.email}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 ${overdueFlag ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(dueDate)}
                            {overdueFlag && ' (Overdue)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  {renderActions(action)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
