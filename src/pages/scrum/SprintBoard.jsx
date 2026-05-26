import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
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
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import BurndownChart from '../../components/charts/BurndownChart'
import BurnupChart from '../../components/charts/BurnupChart'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
// Sortable Story Card Component
function SortableStoryCard({ story, sprintBacklog, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sprintBacklog.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
          {story.story_title}
        </h4>
        {story.story_points && (
          <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
            {story.story_points} pts
          </span>
        )}
      </div>
      {story.story_description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
          {story.story_description}
        </p>
      )}
      {story.epics && (
        <div className="mb-2">
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {story.epics.epic_name}
          </span>
        </div>
      )}
      {story.assigned_to && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
              {story.assigned_to.full_name?.charAt(0) || story.assigned_to.email?.charAt(0) || 'U'}
            </span>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {story.assigned_to.full_name || story.assigned_to.email}
          </span>
        </div>
      )}
      {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {story.acceptance_criteria.length} acceptance criteria
        </div>
      )}
    </div>
  )
}

// Droppable Status Column Component
function DroppableStatusColumn({ status, stories, sprintBacklogs, onStoryClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const statusConfig = {
    todo: { label: 'To Do', color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300' },
    in_review: { label: 'In Review', color: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-700 dark:text-yellow-300' },
    done: { label: 'Done', color: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-300' },
  }

  const config = statusConfig[status] || statusConfig.todo
  const statusStories = sprintBacklogs.filter(sb => sb.sprint_status === status)

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
          <h3 className={`font-semibold ${config.textColor}`}>
            {config.label}
          </h3>
        </div>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-full">
          {statusStories.length}
        </span>
      </div>
      <SortableContext items={statusStories.map(sb => sb.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {statusStories.map((sprintBacklog) => {
            const story = sprintBacklog.user_stories
            if (!story) return null
            return (
              <SortableStoryCard
                key={sprintBacklog.id}
                story={story}
                sprintBacklog={sprintBacklog}
                onClick={() => onStoryClick(story.id)}
              />
            )
          })}
          {statusStories.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              Drop stories here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function SprintBoard() {
  const { sprintId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState(null)
  const [sprintBacklogs, setSprintBacklogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState(null)
  const [project, setProject] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (projectId && sprintId) {
      fetchData()
    }
  }, [projectId, sprintId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch sprint
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .select(`
          *,
          scrum_master:scrum_master_user_id (id, email, full_name)
        `)
        .eq('id', sprintId)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (sprintError) throw sprintError
      setSprint(sprintData)

      // Fetch sprint backlog with stories
      const { data: backlogData, error: backlogError } = await supabase
        .from('sprint_backlogs')
        .select(`
          *,
          user_stories:user_story_id (
            *,
            epics:epic_id (id, epic_name),
            assigned_to:assigned_to_user_id (id, email, full_name)
          )
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)
        .order('sprint_order', { ascending: true, nullsLast: true })

      if (backlogError) throw backlogError
      setSprintBacklogs(backlogData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event) => {
    const { active } = event
    const sprintBacklog = sprintBacklogs.find(sb => sb.id === active.id)
    if (sprintBacklog?.user_stories) {
      setActiveStory(sprintBacklog.user_stories)
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveStory(null)

    if (!over) return

    const sprintBacklogId = active.id
    const newStatus = over.id

    // Check if dropping on a valid status column
    const validStatuses = ['todo', 'in_progress', 'in_review', 'done']
    if (!validStatuses.includes(newStatus)) {
      return
    }

    // Find the sprint backlog item
    const sprintBacklog = sprintBacklogs.find(sb => sb.id === sprintBacklogId)
    if (!sprintBacklog || sprintBacklog.sprint_status === newStatus) {
      return
    }

    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser()

      // Update sprint backlog status
      const { error } = await supabase
        .from('sprint_backlogs')
        .update({ 
          sprint_status: newStatus,
          updated_by: user?.id || null
        })
        .eq('id', sprintBacklogId)

      if (error) throw error

      // Update local state optimistically
      setSprintBacklogs(prevBacklogs =>
        prevBacklogs.map(sb =>
          sb.id === sprintBacklogId ? { ...sb, sprint_status: newStatus } : sb
        )
      )
    } catch (error) {
      console.error('Error updating story status:', error)
      alert('Error updating story status: ' + error.message)
      // Revert optimistic update by refetching
      fetchData()
    }
  }

  const statuses = ['todo', 'in_progress', 'in_review', 'done']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Sprint Board...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Sprint not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/scrum/sprint-planning`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Sprint Planning
          </button>
        </div>
      </div>
    )
  }

  const totalStoryPoints = sprintBacklogs.reduce((sum, sb) => {
    return sum + (sb.user_stories?.story_points || 0)
  }, 0)

  const completedStoryPoints = sprintBacklogs
    .filter(sb => sb.sprint_status === 'done')
    .reduce((sum, sb) => sum + (sb.user_stories?.story_points || 0), 0)

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {sprint.sprint_name}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} • Sprint #{sprint.sprint_number}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}/scrum/sprint-planning`)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Sprint Planning
          </button>
        </div>
      </div>

      {/* Sprint Info + Burndown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
              sprint.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
              sprint.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
              sprint.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}>
              {sprint.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {sprint.sprint_duration_days} days
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Story Points</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {totalStoryPoints}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed Points</p>
            <p className={`mt-1 text-lg font-semibold ${
              completedStoryPoints === totalStoryPoints && totalStoryPoints > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-white'
            }`}>
              {completedStoryPoints} / {totalStoryPoints}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Sprint Burndown
            </h3>
            <BurndownChart
              sprint={sprint}
              totalStoryPoints={totalStoryPoints}
              completedStoryPoints={completedStoryPoints}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Sprint Burnup
            </h3>
            <BurnupChart
              sprint={sprint}
              totalStoryPoints={totalStoryPoints}
              completedStoryPoints={completedStoryPoints}
            />
          </div>
        </div>
        {sprint.sprint_goal && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sprint Goal</p>
            <p className="text-gray-900 dark:text-white">{sprint.sprint_goal}</p>
          </div>
        )}
        {sprint.sprint_start_date && sprint.sprint_end_date && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(sprint.sprint_start_date), 'MMM dd, yyyy')} - {format(new Date(sprint.sprint_end_date), 'MMM dd, yyyy')}
            </p>
          </div>
        )}
      </div>

      {/* Sprint Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status, index) => (
            <DroppableStatusColumn
              key={status}
              status={status}
              stories={[]}
              sprintBacklogs={sprintBacklogs}
              onStoryClick={(storyId) => {
                // Navigate to story detail or open modal
                navigate(`/projects/${projectId}/scrum/product-backlog?story=${storyId}`)
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeStory ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-500 p-4 shadow-lg opacity-90 max-w-xs">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {activeStory.story_title}
              </h4>
              {activeStory.story_points && (
                <span className="mt-2 inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                  {activeStory.story_points} pts
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {sprintBacklogs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No stories in this sprint. Add stories from Sprint Planning.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId}/scrum/sprint-planning`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Sprint Planning
          </button>
        </div>
      )}
    </div>
  )
}

