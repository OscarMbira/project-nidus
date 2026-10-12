/**
 * v1239 Slice 4.1 — Task calendar (tasks by due date), shared by every shell (moved from
 * apps/platform/src/pages). Reads tasks via useTaskSource(): Platform/Planner → public,
 * Simulator → sim (practice projects).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import { format, isSameDay } from 'date-fns'
import 'react-calendar/dist/Calendar.css'
import { useTaskSource } from '../../hooks/useTaskSource.js'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'

// sim.tasks cannot embed the public task_statuses lookup: attach it from a second read.
export async function withStatuses(source, rows) {
  if (!source.isSim || !rows.length) return rows
  const { data } = await source.lookupDb.from('task_statuses').select('id, status_name, status_color')
  const byId = new Map((data || []).map((st) => [st.id, st]))
  return rows.map((t) => ({ ...t, task_statuses: byId.get(t.status_id) || null }))
}

export default function TasksCalendar() {
  const navigate = useNavigate()
  const source = useTaskSource()
  const { projectId: contextProjectId, loading: projectContextLoading } = useScheduleProjectId()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterProject, setFilterProject] = useState(null)
  const [selectedDateTasks, setSelectedDateTasks] = useState([])
  const userChangedFilter = useRef(false)

  useEffect(() => {
    if (userChangedFilter.current || projectContextLoading) return
    setFilterProject(contextProjectId || 'all')
  }, [contextProjectId, projectContextLoading])

  useEffect(() => {
    if (filterProject == null) return
    fetchData()
  }, [filterProject])

  useEffect(() => {
    updateSelectedDateTasks()
  }, [selectedDate, tasks])

  const goToCreateTask = useCallback(() => {
    navigate(source.createPath(), {
      state: {
        dueDate: selectedDate,
        ...(filterProject && filterProject !== 'all' ? { projectId: filterProject } : {}),
      },
    })
  }, [navigate, selectedDate, filterProject, source])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: projectsData, error: projectsError } = await source.db
        .from(source.projectsTable)
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (projectsError) throw projectsError

      let tasksQuery = source.db
        .from('tasks')
        .select(['id', 'task_name', 'task_code', 'task_description', 'priority', 'due_date', 'status_id', source.projectEmbed, source.statusEmbed, source.assigneeEmbed].filter(Boolean).join(', '))
        .eq('is_deleted', false)
        .not('due_date', 'is', null)

      if (filterProject !== 'all') {
        tasksQuery = tasksQuery.eq(source.fk, filterProject)
      }

      const { data: tasksData, error: tasksError } = await tasksQuery

      if (tasksError) {
        if (tasksError.code === '42P01') {
          setTasks([])
        } else {
          throw tasksError
        }
      } else {
        setTasks(await withStatuses(source, tasksData || []))
      }

      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSelectedDateTasks = () => {
    const tasksForDate = tasks.filter(task => {
      if (!task.due_date) return false
      return isSameDay(new Date(task.due_date), selectedDate)
    })
    setSelectedDateTasks(tasksForDate)
  }

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false
      return isSameDay(new Date(task.due_date), date)
    })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-400'
    }
  }

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date)
      if (dayTasks.length === 0) return null

      return (
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {dayTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
              title={task.task_name}
            />
          ))}
          {dayTasks.length > 3 && (
            <span className="text-xs text-gray-700 dark:text-gray-200">
              +{dayTasks.length - 3}
            </span>
          )}
        </div>
      )
    }
    return null
  }

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date)
      if (dayTasks.length > 0) {
        return 'has-tasks'
      }
    }
    return null
  }

  if (loading || filterProject == null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-700 dark:text-gray-200">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Calendar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            View and manage tasks by date
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterProject}
            onChange={(e) => {
              userChangedFilter.current = true
              setFilterProject(e.target.value)
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={goToCreateTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Tasks for {format(selectedDate, 'MMMM d, yyyy')}
            </h2>

            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-700 dark:text-gray-200 mb-4">
                  No tasks scheduled for this date
                </p>
                <button
                  type="button"
                  onClick={goToCreateTask}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Create Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(source.taskPath(task))}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{
                      borderLeftColor: task.task_statuses?.status_color || '#6B7280'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {task.task_name}
                      </h3>
                      <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                    </div>
                    {task.task_description && (
                      <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 line-clamp-2">
                        {task.task_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200">
                      {task.projects && (
                        <span>{task.projects.project_name}</span>
                      )}
                      {task.task_statuses && (
                        <span
                          className="px-2 py-1 rounded text-white text-xs"
                          style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                        >
                          {task.task_statuses.status_name}
                        </span>
                      )}
                    </div>
                    {task.assigned_user && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                            {task.assigned_user.full_name?.charAt(0) || task.assigned_user.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-200">
                          {task.assigned_user.full_name || task.assigned_user.email}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-700 dark:text-gray-200">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-700 dark:text-gray-200">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-700 dark:text-gray-200">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700 dark:text-gray-200">Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
