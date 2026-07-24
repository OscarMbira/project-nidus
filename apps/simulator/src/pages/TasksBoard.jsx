import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../services/supabaseClient'

// Sortable Task Card Component
function SortableTaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
          {task.task_name}
        </h4>
        {task.task_code && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {task.task_code}
          </span>
        )}
      </div>
      {task.task_description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
          {task.task_description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs">
        {task.projects && (
          <span className="text-gray-500 dark:text-gray-400">
            📁 {task.projects.project_name}
          </span>
        )}
        {task.due_date && (
          <span className="text-gray-500 dark:text-gray-400">
            📅 {new Date(task.due_date).toLocaleDateString()}
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
      {task.percentage_complete > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${task.percentage_complete}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Droppable Status Column Component
function DroppableStatusColumn({ status, tasks, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.status_color || '#6B7280' }}
          ></div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {status.status_name}
          </h3>
        </div>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function TasksBoard() {
  const [tasks, setTasks] = useState([])
  const [taskStatuses, setTaskStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)
  const [filterProject, setFilterProject] = useState('all')
  const [projects, setProjects] = useState([])
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [filterProject])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch task statuses
      const { data: statuses, error: statusesError } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_order', { ascending: true })

      if (statusesError) throw statusesError

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
          task_statuses:status_id (id, status_name, status_color, status_order),
          assigned_user:assigned_to_user_id (id, full_name, email)
        `)
        .eq('is_deleted', false)

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

      setTaskStatuses(statuses || [])
      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTasksByStatus = (statusId) => {
    return tasks.filter(task => task.status_id === statusId)
  }

  const handleDragStart = (event) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id
    const overId = over.id

    // Check if dropping on a status column
    const statusExists = taskStatuses.find(s => s.id === overId)
    if (!statusExists) {
      // Not dropping on a status column, might be reordering within same column
      return
    }

    const newStatusId = overId

    // Check if task is being moved to a different status
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status_id === newStatusId) return

    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser()

      // Update task status
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status_id: newStatusId,
          updated_by: user?.id || null
        })
        .eq('id', taskId)

      if (error) throw error

      // Update local state optimistically
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, status_id: newStatusId } : t
        )
      )
    } catch (error) {
      console.error('Error updating task status:', error)
      // Revert optimistic update by refetching
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading task board...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Board
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Drag and drop tasks to change their status
          </p>
        </div>
        <div className="flex gap-4">
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
            onClick={() => navigate('/tasks/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {taskStatuses.map((status) => {
            const statusTasks = getTasksByStatus(status.id)
            return (
              <DroppableStatusColumn
                key={status.id}
                status={status}
                tasks={statusTasks}
                onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 p-4 shadow-lg opacity-90">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {activeTask.task_name}
              </h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {taskStatuses.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No task statuses found. Please run v06_task_management_tables.sql first.
          </p>
        </div>
      )}
    </div>
  )
}

