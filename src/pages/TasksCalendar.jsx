import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import 'react-calendar/dist/Calendar.css'
import { supabase } from '../services/supabaseClient'

export default function TasksCalendar() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterProject, setFilterProject] = useState('all')
  const [viewMode, setViewMode] = useState('month') // 'month' or 'day'
  const [selectedDateTasks, setSelectedDateTasks] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [filterProject])

  useEffect(() => {
    updateSelectedDateTasks()
  }, [selectedDate, tasks])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch projects for filter
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (projectsError) throw projectsError

      // Fetch tasks
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (id, project_name, project_code),
          task_statuses:status_id (status_name, status_color),
          assigned_user:assigned_to_user_id (id, full_name, email)
        `)
        .eq('is_deleted', false)
        .not('due_date', 'is', null)

      if (filterProject !== 'all') {
        tasksQuery = tasksQuery.eq('project_id', filterProject)
      }

      const { data: tasksData, error: tasksError } = await tasksQuery

      if (tasksError) {
        if (tasksError.code === '42P01') {
          console.log('Tasks table not found - please run v06_task_management_tables.sql first')
          setTasks([])
        } else {
          throw tasksError
        }
      } else {
        setTasks(tasksData || [])
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
            <span className="text-xs text-gray-500 dark:text-gray-400">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Calendar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage tasks by date
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate('/tasks/create', { state: { dueDate: selectedDate } })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
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

        {/* Selected Date Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Tasks for {format(selectedDate, 'MMMM d, yyyy')}
            </h2>

            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No tasks scheduled for this date
                </p>
                <button
                  onClick={() => navigate('/tasks/create', { state: { dueDate: selectedDate } })}
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
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{
                      borderLeftColor: task.task_statuses?.status_color || '#6B7280'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {task.task_name}
                      </h3>
                      <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></span>
                    </div>
                    {task.task_description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        {task.task_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      {task.projects && (
                        <span>📁 {task.projects.project_name}</span>
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
                        <span className="text-xs text-gray-600 dark:text-gray-300">
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

      {/* Legend */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}

