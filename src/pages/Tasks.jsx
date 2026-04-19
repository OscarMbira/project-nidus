/**
 * Tasks Page
 * Optimized with memoization, parallel fetching, and debounced search
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus, Search, Filter, Calendar, LayoutGrid } from 'lucide-react';
import { platformDb } from '../services/supabase/supabaseClient';
import { getMyTasks, getAllTasks } from '../services/taskService';
import ExportListMenu from '../components/ui/ExportListMenu';
import { TableHeaderCell } from '../components/ui/Table';
import { useSortableTable } from '../hooks/useSortableTable';
import { useViewMode } from '../hooks/useViewMode';
import ViewToggle from '../components/ui/ViewToggle';

const TASK_COLUMNS = [
  { key: 'task_name', label: 'Task' },
  { key: 'task_status', label: 'Status' },
  { key: 'project_name', label: 'Project' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'priority', label: 'Priority' }
];

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [projects, setProjects] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [organizationId, setOrganizationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeView, setActiveView] = useState('my'); // 'my' or 'all'
  const [viewMode, setViewMode] = useViewMode('tasks', 'grid');

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-platform-tasks-table-sort',
    serverColumnMap: {},
  });

  const taskSortAccessors = useMemo(
    () => ({
      task_name: (r) => r.task_name ?? '',
      project: (r) => r.projects?.project_name ?? '',
      status: (r) => r.task_statuses?.status_name ?? '',
      priority: (r) => r.priority ?? '',
      due_date: (r) => r.due_date ?? '',
      progress: (r) => r.percentage_complete ?? -1,
      created_at: (r) => r.created_at ?? '',
    }),
    []
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoize loadUserAndOrganization with useCallback
  const loadUserAndOrganization = useCallback(async () => {
    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get user record
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userRecord) {
        setUserId(userRecord.id);

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
      console.error('Error loading user and organization:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadUserAndOrganization();
  }, [loadUserAndOrganization]);

  // Memoize loadProjects with useCallback
  const loadProjects = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data: projectsData } = await platformDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('account_id', organizationId)
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, [organizationId]);

  // Memoize loadTaskStatuses with useCallback (no dependencies - static data)
  const loadTaskStatuses = useCallback(async () => {
    try {
      const { data: statuses } = await platformDb
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_order', { ascending: true });

      setTaskStatuses(statuses || []);
    } catch (error) {
      console.error('Error loading task statuses:', error);
    }
  }, []);

  // Memoize loadTasks with useCallback
  const loadTasks = useCallback(async () => {
    if (!organizationId || !userId) return;

    try {
      setLoading(true);
      const filters = {
        search: debouncedSearchTerm,
        status_id: filterStatus !== 'all' ? filterStatus : null,
        project_id: filterProject !== 'all' ? filterProject : null
      };

      let result;
      if (activeView === 'my') {
        result = await getMyTasks(userId, filters);
      } else {
        result = await getAllTasks(organizationId, filters);
      }

      if (result.success) {
        setTasks(result.data || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, userId, activeView, filterStatus, filterProject, debouncedSearchTerm]);

  // Parallel load projects, statuses, and tasks when organizationId/userId changes
  useEffect(() => {
    if (organizationId && userId) {
      // Load projects and statuses in parallel (they don't depend on each other)
      Promise.all([
        loadProjects(),
        loadTaskStatuses()
      ]).then(() => {
        // Then load tasks
        loadTasks();
      });
    }
  }, [organizationId, userId, loadProjects, loadTaskStatuses, loadTasks]);

  // Memoize filtered tasks to avoid recalculation on every render
  const filteredTasks = useMemo(() => {
    if (!debouncedSearchTerm) return tasks;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return tasks.filter(task =>
      task.task_name?.toLowerCase().includes(searchLower) ||
      task.task_description?.toLowerCase().includes(searchLower)
    );
  }, [tasks, debouncedSearchTerm]);

  const displayTasks = useMemo(
    () => sortedData(filteredTasks, taskSortAccessors),
    [filteredTasks, sortedData, taskSortAccessors]
  );

  // Memoize getPriorityColor to avoid function recreation
  const getPriorityColor = useCallback((priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  }, []);

  if (loading && !organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tasks...</p>
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
              <ListChecks className="h-8 w-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-gray-100">Tasks</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/platform/tasks/board')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                <LayoutGrid className="h-5 w-5" />
                Board
              </button>
              <ExportListMenu columns={TASK_COLUMNS} data={displayTasks} baseFilename="Tasks" disabled={!displayTasks.length} />
              <button
                onClick={() => navigate('/platform/tasks/calendar')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                <Calendar className="h-5 w-5" />
                Calendar
              </button>
              <button
                onClick={() => navigate('/platform/tasks/create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Task
              </button>
            </div>
          </div>
          <p className="text-gray-400">
            Manage and track all your tasks
          </p>
        </div>

        {/* Tabs and Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveView('my')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeView === 'my'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  My Tasks
                </button>
                <button
                  onClick={() => setActiveView('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeView === 'all'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  All Tasks
                </button>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
              />
            </div>

            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Task list layout"
              className="!bg-gray-800 !border-gray-700"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              {taskStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.status_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks Display */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading tasks...</p>
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <ListChecks className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tasks Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No tasks match your search.' : 'Get started by creating your first task.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/platform/tasks/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/platform/tasks/${task.id}`)}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-100 flex-1">
                    {task.task_name}
                  </h3>
                  {task.priority && (
                    <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  )}
                </div>

                {task.task_description && (
                  <p className="text-gray-400 mb-4 line-clamp-2 text-sm">
                    {task.task_description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {task.task_statuses && (
                    <span
                      className="px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                    >
                      {task.task_statuses.status_name}
                    </span>
                  )}
                  {task.projects && (
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      {task.projects.project_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  {task.due_date && (
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                  {task.percentage_complete !== null && (
                    <span className="text-purple-400 font-medium">
                      {task.percentage_complete}% Complete
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('task_name')}
                      onSort={() => handleSort('task_name')}
                      className="!text-gray-300 !normal-case"
                    >
                      Task
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('project')}
                      onSort={() => handleSort('project')}
                      className="!text-gray-300 !normal-case"
                    >
                      Project
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('status')}
                      onSort={() => handleSort('status')}
                      className="!text-gray-300 !normal-case"
                    >
                      Status
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('priority')}
                      onSort={() => handleSort('priority')}
                      className="!text-gray-300 !normal-case"
                    >
                      Priority
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('due_date')}
                      onSort={() => handleSort('due_date')}
                      className="!text-gray-300 !normal-case"
                    >
                      Due Date
                    </TableHeaderCell>
                    <TableHeaderCell
                      sortable
                      sortDirection={getSortDirectionForColumn('progress')}
                      onSort={() => handleSort('progress')}
                      className="!text-gray-300 !normal-case"
                    >
                      Progress
                    </TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {displayTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/platform/tasks/${task.id}`)}
                      className="hover:bg-gray-700/30 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-gray-100 font-medium">{task.task_name}</div>
                          {task.task_description && (
                            <div className="text-sm text-gray-400 line-clamp-1">{task.task_description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {task.projects?.project_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {task.task_statuses && (
                          <span
                            className="px-2 py-1 text-xs rounded text-white"
                            style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                          >
                            {task.task_statuses.status_name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {task.priority && (
                          <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {task.percentage_complete !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${task.percentage_complete}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-400 w-12 text-right">{task.percentage_complete}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
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
