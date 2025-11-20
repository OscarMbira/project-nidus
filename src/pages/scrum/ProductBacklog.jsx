import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../services/supabaseClient'

export default function ProductBacklog() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [backlog, setBacklog] = useState(null)
  const [stories, setStories] = useState([])
  const [epics, setEpics] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('backlog')
  const [showStoryForm, setShowStoryForm] = useState(false)
  const [showEpicForm, setShowEpicForm] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [editingEpic, setEditingEpic] = useState(null)
  const [activeStory, setActiveStory] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, project_methodologies!inner (methodologies:methodology_id (methodology_name, methodology_code))')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError

      // Check if project uses Scrum methodology
      const methodology = projectData.project_methodologies?.[0]?.methodologies
      if (methodology?.methodology_code !== 'scrum') {
        throw new Error('This project does not use Scrum methodology')
      }

      setProject(projectData)

      // Fetch or create product backlog
      let { data: backlogData, error: backlogError } = await supabase
        .from('product_backlogs')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (backlogError && backlogError.code === 'PGRST116') {
        // Backlog doesn't exist, create it
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: newBacklog, error: createError } = await supabase
          .from('product_backlogs')
          .insert({
            project_id: projectId,
            backlog_name: 'Product Backlog',
            created_by: user.id,
            updated_by: user.id
          })
          .select()
          .single()

        if (createError) throw createError
        backlogData = newBacklog
      } else if (backlogError) {
        throw backlogError
      }

      setBacklog(backlogData)

      // Fetch user stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('user_stories')
        .select('*, epics:epic_id (id, epic_name), users:assigned_to_user_id (id, email, full_name)')
        .eq('product_backlog_id', backlogData.id)
        .eq('is_deleted', false)
        .order('backlog_order', { ascending: true, nullsLast: true })
        .order('priority', { ascending: false })

      if (storiesError) throw storiesError
      setStories(storiesData || [])

      // Fetch epics
      const { data: epicsData, error: epicsError } = await supabase
        .from('epics')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('priority', { ascending: false })

      if (epicsError) throw epicsError
      setEpics(epicsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStory = async (storyData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get max backlog_order if not provided
      if (!storyData.backlog_order && !editingStory) {
        const { data: maxOrder } = await supabase
          .from('user_stories')
          .select('backlog_order')
          .eq('product_backlog_id', backlog.id)
          .eq('is_deleted', false)
          .order('backlog_order', { ascending: false })
          .limit(1)
          .single()

        storyData.backlog_order = maxOrder?.backlog_order ? maxOrder.backlog_order + 1 : 1
      }

      const storyPayload = {
        ...storyData,
        project_id: projectId,
        product_backlog_id: backlog.id,
        updated_by: user.id
      }

      if (editingStory) {
        const { error } = await supabase
          .from('user_stories')
          .update(storyPayload)
          .eq('id', editingStory.id)

        if (error) throw error
      } else {
        storyPayload.created_by = user.id
        const { error } = await supabase
          .from('user_stories')
          .insert(storyPayload)

        if (error) throw error
      }

      setShowStoryForm(false)
      setEditingStory(null)
      fetchData()
    } catch (error) {
      console.error('Error saving story:', error)
      alert('Error saving story: ' + error.message)
    }
  }

  const handleSaveEpic = async (epicData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const epicPayload = {
        ...epicData,
        project_id: projectId,
        product_backlog_id: backlog.id,
        updated_by: user.id
      }

      if (editingEpic) {
        const { error } = await supabase
          .from('epics')
          .update(epicPayload)
          .eq('id', editingEpic.id)

        if (error) throw error
      } else {
        epicPayload.created_by = user.id
        const { error } = await supabase
          .from('epics')
          .insert(epicPayload)

        if (error) throw error
      }

      setShowEpicForm(false)
      setEditingEpic(null)
      fetchData()
    } catch (error) {
      console.error('Error saving epic:', error)
      alert('Error saving epic: ' + error.message)
    }
  }

  const handleDragStart = (event) => {
    const { active } = event
    const story = stories.find(s => s.id === active.id)
    setActiveStory(story)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveStory(null)

    if (!over || active.id === over.id) return

    const oldIndex = stories.findIndex(s => s.id === active.id)
    const newIndex = stories.findIndex(s => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update local state
    const reorderedStories = arrayMove(stories, oldIndex, newIndex)
    setStories(reorderedStories)
    setIsReordering(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Update backlog_order for all affected stories
      // Only update stories that actually changed position
      const updates = reorderedStories
        .map((story, index) => ({
          id: story.id,
          newOrder: index + 1,
          oldOrder: story.backlog_order
        }))
        .filter(update => update.newOrder !== update.oldOrder)

      // Batch update stories that changed position
      if (updates.length > 0) {
        // Use Promise.all for parallel updates
        const results = await Promise.all(
          updates.map(update =>
            supabase
              .from('user_stories')
              .update({ 
                backlog_order: update.newOrder,
                updated_by: user.id
              })
              .eq('id', update.id)
          )
        )

        // Check for any errors
        const errors = results.filter(r => r.error)
        if (errors.length > 0) {
          throw errors[0].error
        }
      }
    } catch (error) {
      console.error('Error reordering stories:', error)
      alert('Error reordering stories: ' + error.message)
      // Revert by refetching
      fetchData()
    } finally {
      setIsReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Product Backlog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects/' + projectId)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Product Backlog
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {['backlog', 'epics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={'py-4 px-1 border-b-2 font-medium text-sm ' + (
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {tab === 'backlog' && 'User Stories'}
              {tab === 'epics' && 'Epics'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'backlog' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <BacklogTab
            stories={stories}
            epics={epics}
            isReordering={isReordering}
            onAddStory={() => {
              setEditingStory(null)
              setShowStoryForm(true)
            }}
            onEditStory={(story) => {
              setEditingStory(story)
              setShowStoryForm(true)
            }}
            showStoryForm={showStoryForm}
            editingStory={editingStory}
            onSaveStory={handleSaveStory}
            onCloseForm={() => {
              setShowStoryForm(false)
              setEditingStory(null)
            }}
          />
          <DragOverlay>
            {activeStory ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-lg opacity-90">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeStory.story_title}
                  </h3>
                  {activeStory.story_points && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm font-medium">
                      {activeStory.story_points} pts
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {activeTab === 'epics' && (
        <EpicsTab
          epics={epics}
          onAddEpic={() => {
            setEditingEpic(null)
            setShowEpicForm(true)
          }}
          onEditEpic={(epic) => {
            setEditingEpic(epic)
            setShowEpicForm(true)
          }}
          showEpicForm={showEpicForm}
          editingEpic={editingEpic}
          onSaveEpic={handleSaveEpic}
          onCloseForm={() => {
            setShowEpicForm(false)
            setEditingEpic(null)
          }}
        />
      )}
    </div>
  )
}

// Sortable Story Card Component
function SortableStoryCard({ story, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id })

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
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div
              {...listeners}
              className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
              title="Drag to reorder"
            >
              ⋮⋮
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {story.story_title}
            </h3>
            {story.story_points && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm font-medium">
                {story.story_points} pts
              </span>
            )}
            {story.epics && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-sm">
                {story.epics.epic_name}
              </span>
            )}
          </div>

          {(story.story_as_a || story.story_i_want || story.story_so_that) && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {story.story_as_a && <p><strong>As a:</strong> {story.story_as_a}</p>}
              {story.story_i_want && <p><strong>I want:</strong> {story.story_i_want}</p>}
              {story.story_so_that && <p><strong>So that:</strong> {story.story_so_that}</p>}
            </div>
          )}

          {story.story_description && (
            <p className="text-gray-600 dark:text-gray-400 mb-3">{story.story_description}</p>
          )}

          {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acceptance Criteria:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {story.acceptance_criteria.map((criteria, idx) => (
                  <li key={idx}>{criteria}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Status: <strong className="text-gray-700 dark:text-gray-300">{story.status}</strong></span>
            {story.users && (
              <span>Assigned to: <strong className="text-gray-700 dark:text-gray-300">{story.users.full_name || story.users.email}</strong></span>
            )}
            {story.backlog_order && (
              <span>Order: <strong className="text-gray-700 dark:text-gray-300">#{story.backlog_order}</strong></span>
            )}
          </div>
        </div>

        <button
          onClick={() => onEdit(story)}
          className="ml-4 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

// Backlog Tab Component
function BacklogTab({ stories, epics, isReordering, onAddStory, onEditStory, showStoryForm, editingStory, onSaveStory, onCloseForm }) {
  const [formData, setFormData] = useState({
    story_title: '',
    story_description: '',
    story_as_a: '',
    story_i_want: '',
    story_so_that: '',
    story_points: '',
    priority: 0,
    epic_id: '',
    acceptance_criteria: [],
    tags: []
  })
  const [newCriteria, setNewCriteria] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (editingStory) {
      setFormData({
        story_title: editingStory.story_title || '',
        story_description: editingStory.story_description || '',
        story_as_a: editingStory.story_as_a || '',
        story_i_want: editingStory.story_i_want || '',
        story_so_that: editingStory.story_so_that || '',
        story_points: editingStory.story_points || '',
        priority: editingStory.priority || 0,
        epic_id: editingStory.epic_id || '',
        acceptance_criteria: editingStory.acceptance_criteria || [],
        tags: editingStory.tags || []
      })
    } else {
      setFormData({
        story_title: '',
        story_description: '',
        story_as_a: '',
        story_i_want: '',
        story_so_that: '',
        story_points: '',
        priority: 0,
        epic_id: '',
        acceptance_criteria: [],
        tags: []
      })
    }
  }, [editingStory, showStoryForm])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddCriteria = () => {
    if (newCriteria.trim()) {
      setFormData(prev => ({
        ...prev,
        acceptance_criteria: [...prev.acceptance_criteria, newCriteria.trim()]
      }))
      setNewCriteria('')
    }
  }

  const handleRemoveCriteria = (index) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria.filter((_, i) => i !== index)
    }))
  }

  const handleAddTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveStory({
      ...formData,
      story_points: formData.story_points ? parseInt(formData.story_points) : null,
      priority: parseInt(formData.priority),
      epic_id: formData.epic_id || null
    })
  }

  if (showStoryForm) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {editingStory ? 'Edit User Story' : 'Create User Story'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Story Title *
            </label>
            <input
              type="text"
              name="story_title"
              value={formData.story_title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              As a...
            </label>
            <input
              type="text"
              name="story_as_a"
              value={formData.story_as_a}
              onChange={handleChange}
              placeholder="As a [user type]"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              I want...
            </label>
            <input
              type="text"
              name="story_i_want"
              value={formData.story_i_want}
              onChange={handleChange}
              placeholder="I want [functionality]"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              So that...
            </label>
            <input
              type="text"
              name="story_so_that"
              value={formData.story_so_that}
              onChange={handleChange}
              placeholder="So that [benefit]"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="story_description"
              value={formData.story_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Story Points
              </label>
              <input
                type="number"
                name="story_points"
                value={formData.story_points}
                onChange={handleChange}
                min="1"
                placeholder="1, 2, 3, 5, 8, 13..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Epic
            </label>
            <select
              name="epic_id"
              value={formData.epic_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">No Epic</option>
              {epics.map(epic => (
                <option key={epic.id} value={epic.id}>{epic.epic_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acceptance Criteria
            </label>
            <div className="space-y-2 mb-2">
              {formData.acceptance_criteria.map((criteria, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    {criteria}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriteria(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCriteria())}
                placeholder="Add acceptance criteria"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCriteria}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCloseForm}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {editingStory ? 'Update Story' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          User Stories ({stories.length})
        </h2>
        <button
          onClick={onAddStory}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Add User Story
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No user stories yet</p>
          <button
            onClick={onAddStory}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create First User Story
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isReordering && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
              Updating backlog order...
            </div>
          )}
          <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {stories.map((story) => (
              <SortableStoryCard
                key={story.id}
                story={story}
                onEdit={onEditStory}
              />
            ))}
          </SortableContext>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            💡 <strong>Tip:</strong> Drag stories by the ⋮⋮ icon to reorder and prioritize your backlog
          </div>
        </div>
      )}
    </div>
  )
}

// Epics Tab Component
function EpicsTab({ epics, onAddEpic, onEditEpic, showEpicForm, editingEpic, onSaveEpic, onCloseForm }) {
  const [formData, setFormData] = useState({
    epic_name: '',
    epic_description: '',
    epic_goal: '',
    priority: 0
  })

  useEffect(() => {
    if (editingEpic) {
      setFormData({
        epic_name: editingEpic.epic_name || '',
        epic_description: editingEpic.epic_description || '',
        epic_goal: editingEpic.epic_goal || '',
        priority: editingEpic.priority || 0
      })
    } else {
      setFormData({
        epic_name: '',
        epic_description: '',
        epic_goal: '',
        priority: 0
      })
    }
  }, [editingEpic, showEpicForm])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveEpic({
      ...formData,
      priority: parseInt(formData.priority)
    })
  }

  if (showEpicForm) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {editingEpic ? 'Edit Epic' : 'Create Epic'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Epic Name *
            </label>
            <input
              type="text"
              name="epic_name"
              value={formData.epic_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Epic Goal
            </label>
            <textarea
              name="epic_goal"
              value={formData.epic_goal}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="epic_description"
              value={formData.epic_description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <input
              type="number"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCloseForm}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {editingEpic ? 'Update Epic' : 'Create Epic'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Epics ({epics.length})
        </h2>
        <button
          onClick={onAddEpic}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Add Epic
        </button>
      </div>

      {epics.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No epics yet</p>
          <button
            onClick={onAddEpic}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create First Epic
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {epics.map((epic) => (
            <div
              key={epic.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {epic.epic_name}
                </h3>
                <button
                  onClick={() => onEditEpic(epic)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  Edit
                </button>
              </div>

              {epic.epic_goal && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goal: {epic.epic_goal}
                </p>
              )}

              {epic.epic_description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
                  {epic.epic_description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Status: <strong className="text-gray-700 dark:text-gray-300">{epic.status}</strong></span>
                <span>Priority: <strong className="text-gray-700 dark:text-gray-300">{epic.priority}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

