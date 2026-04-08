/**
 * Practice Tasks Page
 * Task list view for practice projects
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { getPracticeTasks } from '../../services/sim/practiceTaskService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableHeaderCell } from '../../components/ui/Table'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'

const PRACTICE_TASK_COLUMNS = [
  { key: 'task_name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' }
]

export default function PracticeTasks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [taskViewMode, setTaskViewMode] = useViewMode('simulator-practice-tasks', 'grid')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-simulator-practice-tasks-sort',
  })
  const taskAccessors = useMemo(
    () => ({
      task_name: (r) => r.task_name ?? '',
      status: (r) => r.status ?? '',
      priority: (r) => r.priority ?? '',
      due_date: (r) => r.due_date ?? '',
      progress: (r) => r.percentage_complete ?? -1,
      created_at: (r) => r.created_at ?? '',
    }),
    []
  )
  const displayTasks = useMemo(
    () => sortedData(tasks, taskAccessors),
    [tasks, sortedData, taskAccessors]
  )

  useEffect(() => {
    if (projectId) loadTasks()
  }, [projectId, filters])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const result = await getPracticeTasks(projectId, filters)
      if (result.success) {
        setTasks(result.data || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Tasks</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_TASK_COLUMNS} data={displayTasks} baseFilename="PracticeTasks" disabled={!displayTasks.length} />
          <button
            onClick={() => navigate(`/simulator/practice-tasks/create?projectId=${projectId}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Task
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <ViewToggle value={taskViewMode} onChange={setTaskViewMode} ariaLabel="Practice tasks layout" />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tasks found</div>
      ) : taskViewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('task_name')}
                  onSort={() => handleSort('task_name')}
                  className="!normal-case"
                >
                  Task
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('status')}
                  onSort={() => handleSort('status')}
                  className="!normal-case"
                >
                  Status
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('priority')}
                  onSort={() => handleSort('priority')}
                  className="!normal-case"
                >
                  Priority
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('due_date')}
                  onSort={() => handleSort('due_date')}
                  className="!normal-case"
                >
                  Due Date
                </TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={getSortDirectionForColumn('progress')}
                  onSort={() => handleSort('progress')}
                  className="!normal-case"
                >
                  Progress
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayTasks.map((task) => (
                <tr key={task.id} onClick={() => navigate(`/simulator/practice-tasks/${task.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{task.task_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{task.task_description?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{task.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{task.due_date || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{task.percentage_complete || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(`/simulator/practice-tasks/${task.id}`)}
              className="text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow min-h-[160px]"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{task.task_name}</h3>
              {task.task_description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{task.task_description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className={`px-2 py-1 text-xs rounded ${task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {task.status}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{task.priority}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
