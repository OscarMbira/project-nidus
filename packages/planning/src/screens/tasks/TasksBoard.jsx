/**
 * v1239 Slice 4.1 — Task board (drag a card to change its status), shared by every shell (moved from apps/platform/src/pages).
 * Reads tasks from the shell's data set via useTaskSource(): Platform/Planner → public,
 * Simulator → sim (practice projects). Task statuses are a public read-only lookup.
 */
// Parallel load, cached statuses, memoised columns.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { useTaskSource } from '../../hooks/useTaskSource.js'
import SelectField from '@nidus/ui/SelectField'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { loadResolvedRegionalFormatSettings } from '@nidus/shared/services/regionalFormatSettingsService'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'
import {
  groupTasksByStatus,
  resolveDropStatusId,
  sortTasksForBoard,
} from '@nidus/shared/utils/taskBoardUtils'

const EMPTY_TASKS = []
const STATUS_CACHE_KEY = 'nidus:taskBoard:statuses:v1'

const taskColumns = (source) => [
  'id', 'task_name', 'task_code', 'task_description', 'priority', 'due_date',
  'percentage_complete', 'status_id', 'created_at', source.projectEmbed, source.assigneeEmbed,
].filter(Boolean).join(', ')

const PRIORITY_BORDER = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
}

function readCachedStatuses() {
  try {
    const raw = sessionStorage.getItem(STATUS_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedStatuses(statuses) {
  try {
    sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(statuses))
  } catch {
    // Cache is a paint optimisation; a full sessionStorage is not a board failure.
  }
}

const SortableTaskCard = memo(function SortableTaskCard({ task, onTaskClick, dateSettings }) {
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

  const progress = Number(task.percentage_complete) || 0
  const dueLabel = task.due_date ? formatRegionalDate(task.due_date, dateSettings) : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task.id)}
      className={`bg-white dark:bg-gray-800 rounded-lg border-y border-r border-gray-200 dark:border-gray-700 border-l-4 p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${PRIORITY_BORDER[task.priority] || 'border-l-gray-300 dark:border-l-gray-500'}`}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
          {task.task_name}
        </h4>
        {task.task_code && (
          <span className="text-xs text-gray-700 dark:text-gray-200 shrink-0">
            {task.task_code}
          </span>
        )}
      </div>
      {task.task_description && (
        <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 line-clamp-2">
          {task.task_description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs gap-2">
        {task.projects?.project_name && (
          <span className="text-gray-700 dark:text-gray-200 truncate">
            {task.projects.project_name}
          </span>
        )}
        {dueLabel && (
          <span className="text-gray-700 dark:text-gray-200 shrink-0">
            {dueLabel}
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
          <span className="text-xs text-gray-700 dark:text-gray-200 truncate">
            {task.assigned_user.full_name || task.assigned_user.email}
          </span>
        </div>
      )}
      {progress > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
})

const DroppableStatusColumn = memo(function DroppableStatusColumn({
  status,
  tasks,
  tasksLoading,
  onTaskClick,
  dateSettings,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  const itemIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] rounded-lg border p-4 transition-colors ${
        isOver
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
          : 'bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: status.status_color || '#6B7280' }}
          />
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {status.status_name}
          </h3>
        </div>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              dateSettings={dateSettings}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              {tasksLoading ? 'Loading…' : 'Drop tasks here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
})

export default function TasksBoard() {
  const navigate = useNavigate()
  const source = useTaskSource()
  const { projectId: contextProjectId, loading: projectContextLoading } = useScheduleProjectId()
  const [tasks, setTasks] = useState([])
  const [taskStatuses, setTaskStatuses] = useState(readCachedStatuses)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTask, setActiveTask] = useState(null)
  // null until current-project context resolves — then that project (or 'all' if none)
  const [filterProject, setFilterProject] = useState(null)
  const [dateSettings, setDateSettings] = useState(null)
  const referenceLoaded = useRef(false)
  const hasPaintedBoard = useRef(false)
  const userChangedFilter = useRef(false)
  const tasksRef = useRef(tasks)
  const statusesRef = useRef(taskStatuses)
  const lastMoveRef = useRef(null)
  const undoToastIdRef = useRef(null)
  tasksRef.current = tasks
  statusesRef.current = taskStatuses

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (userChangedFilter.current || projectContextLoading) return
    setFilterProject(contextProjectId || 'all')
  }, [contextProjectId, projectContextLoading])

  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId().then(async (accountId) => {
      if (!accountId || cancelled) return
      const result = await loadResolvedRegionalFormatSettings(accountId)
      if (!cancelled && result?.settings) setDateSettings(result.settings)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (filterProject == null) return

    let cancelled = false

    async function load() {
      if (!hasPaintedBoard.current) setLoading(true)
      setTasksLoading(true)
      setLoadError('')

      try {
        let taskQuery = source.db
          .from('tasks')
          .select(taskColumns(source))
          .eq('is_deleted', false)
          .order('task_name', { ascending: true })
          .order('created_at', { ascending: true })

        if (filterProject !== 'all') {
          taskQuery = taskQuery.eq(source.fk, filterProject)
        }

        const requests = [taskQuery]
        if (!referenceLoaded.current) {
          requests.push(
            source.lookupDb
              .from('task_statuses')
              .select('id, status_name, status_color, status_order')
              .eq('is_active', true)
              .eq('is_deleted', false)
              .order('status_order', { ascending: true }),
            source.db
              .from(source.projectsTable)
              .select('id, project_name')
              .eq('is_deleted', false)
              .order('project_name', { ascending: true }),
          )
        }

        const results = await Promise.all(requests)
        if (cancelled) return

        const tasksResult = results[0]
        if (tasksResult.error) {
          if (tasksResult.error.code === '42P01') {
            setTasks([])
          } else {
            throw tasksResult.error
          }
        } else {
          setTasks(sortTasksForBoard(tasksResult.data || []))
        }

        if (!referenceLoaded.current) {
          const statusesResult = results[1]
          const projectsResult = results[2]
          if (statusesResult?.error) throw statusesResult.error
          if (projectsResult?.error) throw projectsResult.error
          const statuses = statusesResult?.data || []
          setTaskStatuses(statuses)
          setProjects(projectsResult?.data || [])
          writeCachedStatuses(statuses)
          referenceLoaded.current = true
        }
      } catch (error) {
        console.error('Error fetching task board:', error)
        if (!cancelled) setLoadError('Could not load the task board.')
      } finally {
        if (!cancelled) {
          hasPaintedBoard.current = true
          setLoading(false)
          setTasksLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [filterProject, source])

  const tasksByStatus = useMemo(
    () => groupTasksByStatus(tasks, taskStatuses),
    [tasks, taskStatuses],
  )

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.project_name })),
    [projects],
  )

  const openTask = useCallback((taskId) => {
    const task = tasksRef.current.find((t) => t.id === taskId) || { id: taskId }
    navigate(source.taskPath(task))
  }, [navigate, source])

  const onProjectFilterChange = useCallback((value) => {
    userChangedFilter.current = true
    setFilterProject(value || 'all')
  }, [])

  const handleDragStart = useCallback((event) => {
    setActiveTask(tasks.find((task) => task.id === event.active.id) || null)
  }, [tasks])

  const saveTaskStatus = useCallback(async (taskId, statusId) => {
    const actorId = await getCurrentUserInternalUserId()
    const { error } = await source.db
      .from('tasks')
      .update({
        status_id: statusId,
        updated_by: actorId,
      })
      .eq('id', taskId)
    if (error) throw error
  }, [])

  const undoLastMove = useCallback(async () => {
    const move = lastMoveRef.current
    if (!move) return

    const current = tasksRef.current.find((item) => item.id === move.taskId)
    if (!current || current.status_id !== move.toStatusId) {
      lastMoveRef.current = null
      if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current)
      toast.error('That move can no longer be undone.')
      return
    }

    const fromName = statusesRef.current.find((status) => status.id === move.fromStatusId)?.status_name || 'the previous column'
    lastMoveRef.current = null
    if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current)
    setTasks((prev) => prev.map((item) => (
      item.id === move.taskId ? { ...item, status_id: move.fromStatusId } : item
    )))

    try {
      await saveTaskStatus(move.taskId, move.fromStatusId)
      toast.success(`Moved back to ${fromName}`)
    } catch (error) {
      console.error('Error undoing task move:', error)
      setTasks((prev) => prev.map((item) => (
        item.id === move.taskId && item.status_id === move.fromStatusId
          ? { ...item, status_id: move.toStatusId }
          : item
      )))
      lastMoveRef.current = move
      toast.error('Could not undo that move.')
    }
  }, [saveTaskStatus])

  const undoLastMoveRef = useRef(undoLastMove)
  undoLastMoveRef.current = undoLastMove

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key?.toLowerCase()
      if (!(event.ctrlKey || event.metaKey) || key !== 'z' || event.shiftKey || event.altKey) return
      const target = event.target
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (!lastMoveRef.current) return
      event.preventDefault()
      undoLastMoveRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const showMoveToast = useCallback((statusName) => {
    if (undoToastIdRef.current) toast.dismiss(undoToastIdRef.current)
    undoToastIdRef.current = toast.custom((t) => (
      <div
        className={`${t.visible ? 'opacity-100' : 'opacity-0'} flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-lg transition-opacity dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100`}
      >
        <span>Moved to {statusName}</span>
        <button
          type="button"
          className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => undoLastMoveRef.current()}
        >
          Undo
        </button>
      </div>
    ), { duration: 8000 })
  }, [])

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const newStatusId = resolveDropStatusId(over.id, taskStatuses, tasks)
    if (!newStatusId) return

    const task = tasks.find((item) => item.id === active.id)
    if (!task || task.status_id === newStatusId) return

    const taskId = task.id
    const previousStatusId = task.status_id
    const statusName = taskStatuses.find((status) => status.id === newStatusId)?.status_name || 'the new column'
    setTasks((prev) => prev.map((item) => (
      item.id === taskId ? { ...item, status_id: newStatusId } : item
    )))

    try {
      await saveTaskStatus(taskId, newStatusId)
      lastMoveRef.current = {
        taskId,
        fromStatusId: previousStatusId,
        toStatusId: newStatusId,
      }
      showMoveToast(statusName)
    } catch (error) {
      console.error('Error updating task status:', error)
      setTasks((prev) => prev.map((item) => (
        item.id === taskId && item.status_id === newStatusId
          ? { ...item, status_id: previousStatusId }
          : item
      )))
      toast.error('Could not move that task. It has been put back.')
    }
  }, [taskStatuses, tasks, saveTaskStatus, showMoveToast])

  if (loading || filterProject == null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-700 dark:text-gray-200">Loading task board...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Board
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Drag and drop tasks to change their status
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="min-w-[220px]">
            <SelectField
              options={projectOptions}
              value={filterProject === 'all' || filterProject == null ? '' : filterProject}
              onChange={onProjectFilterChange}
              placeholder="All projects"
              searchPlaceholder="Search projects"
              aria-label="Filter by project"
              disabled={filterProject == null}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate(source.createPath(), {
              state: filterProject && filterProject !== 'all'
                ? { projectId: filterProject }
                : undefined,
            })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex gap-4 overflow-x-auto pb-4 ${tasksLoading ? 'opacity-70' : ''}`}>
          {taskStatuses.map((status) => (
            <DroppableStatusColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus.get(status.id) || EMPTY_TASKS}
              tasksLoading={tasksLoading}
              onTaskClick={openTask}
              dateSettings={dateSettings}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 p-4 shadow-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {activeTask.task_name}
              </h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {taskStatuses.length === 0 && !loadError && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-200">
            No task statuses found. Please run v06_task_management_tables.sql first.
          </p>
        </div>
      )}
    </div>
  )
}
