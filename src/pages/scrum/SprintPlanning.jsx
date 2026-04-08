import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format, addDays, differenceInDays } from 'date-fns'

export default function SprintPlanning() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [backlog, setBacklog] = useState(null)
  const [sprints, setSprints] = useState([])
  const [activeSprint, setActiveSprint] = useState(null)
  const [availableStories, setAvailableStories] = useState([])
  const [sprintStories, setSprintStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSprintForm, setShowSprintForm] = useState(false)
  const [editingSprint, setEditingSprint] = useState(null)
  const [activeTab, setActiveTab] = useState('planning') // 'planning' or 'sprints'

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          project_methodologies!inner (
            methodologies:methodology_id (methodology_name, methodology_code)
          )
        `)
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

      // Fetch product backlog
      const { data: backlogData, error: backlogError } = await supabase
        .from('product_backlogs')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (backlogError && backlogError.code !== 'PGRST116') {
        throw backlogError
      }

      if (backlogData) {
        setBacklog(backlogData)

        // Fetch available stories (not in active sprint)
        const { data: storiesData, error: storiesError } = await supabase
          .from('user_stories')
          .select(`
            *,
            epics:epic_id (id, epic_name)
          `)
          .eq('product_backlog_id', backlogData.id)
          .eq('is_deleted', false)
          .in('status', ['backlog', 'sprint_backlog'])
          .order('backlog_order', { ascending: true, nullsLast: true })

        if (storiesError) throw storiesError
        setAvailableStories(storiesData || [])
      }

      // Fetch sprints
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select(`
          *,
          scrum_master:scrum_master_user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('sprint_number', { ascending: false })

      if (sprintsError) throw sprintsError
      setSprints(sprintsData || [])

      // Set active sprint if exists
      const active = sprintsData?.find(s => s.status === 'active')
      if (active) {
        setActiveSprint(active)
        await fetchSprintStories(active.id)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSprintStories = async (sprintId) => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error
      setSprintStories(data || [])
    } catch (error) {
      console.error('Error fetching sprint stories:', error)
    }
  }

  const handleSaveSprint = async (sprintData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Calculate sprint number if new sprint
      let sprintNumber = sprintData.sprint_number
      if (!sprintNumber && !editingSprint) {
        const { data: lastSprint } = await supabase
          .from('sprints')
          .select('sprint_number')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .order('sprint_number', { ascending: false })
          .limit(1)
          .single()

        sprintNumber = lastSprint?.sprint_number ? lastSprint.sprint_number + 1 : 1
      }

      // Calculate duration
      const startDate = new Date(sprintData.sprint_start_date)
      const endDate = new Date(sprintData.sprint_end_date)
      const duration = differenceInDays(endDate, startDate) + 1

      const sprintPayload = {
        ...sprintData,
        project_id: projectId,
        product_backlog_id: backlog.id,
        sprint_number: sprintNumber,
        sprint_duration_days: duration,
        updated_by: user.id
      }

      if (editingSprint) {
        const { error } = await supabase
          .from('sprints')
          .update(sprintPayload)
          .eq('id', editingSprint.id)

        if (error) throw error
      } else {
        sprintPayload.created_by = user.id
        const { error } = await supabase
          .from('sprints')
          .insert(sprintPayload)
          .select()
          .single()

        if (error) throw error

        // Set as active sprint if status is 'active'
        if (sprintPayload.status === 'active') {
          setActiveSprint(sprintPayload)
        }
      }

      setShowSprintForm(false)
      setEditingSprint(null)
      fetchData()
    } catch (error) {
      console.error('Error saving sprint:', error)
      alert('Error saving sprint: ' + error.message)
    }
  }

  const handleAddStoryToSprint = async (storyId, sprintId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get max sprint_order
      const { data: maxOrder } = await supabase
        .from('sprint_backlogs')
        .select('sprint_order')
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)
        .order('sprint_order', { ascending: false })
        .limit(1)
        .single()

      const { error } = await supabase
        .from('sprint_backlogs')
        .insert({
          sprint_id: sprintId,
          user_story_id: storyId,
          sprint_order: maxOrder?.sprint_order ? maxOrder.sprint_order + 1 : 1,
          sprint_status: 'todo',
          created_by: user.id,
          updated_by: user.id
        })

      if (error) throw error

      // Update story status
      await supabase
        .from('user_stories')
        .update({ 
          status: 'sprint_backlog',
          assigned_sprint_id: sprintId,
          updated_by: user.id
        })
        .eq('id', storyId)

      // Refresh data
      fetchData()
      if (activeSprint) {
        await fetchSprintStories(activeSprint.id)
      }
    } catch (error) {
      console.error('Error adding story to sprint:', error)
      alert('Error adding story to sprint: ' + error.message)
    }
  }

  const handleRemoveStoryFromSprint = async (sprintBacklogId, storyId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Soft delete from sprint backlog
      const { error } = await supabase
        .from('sprint_backlogs')
        .update({ 
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', sprintBacklogId)

      if (error) throw error

      // Update story status back to backlog
      await supabase
        .from('user_stories')
        .update({ 
          status: 'backlog',
          assigned_sprint_id: null,
          updated_by: user.id
        })
        .eq('id', storyId)

      // Refresh data
      fetchData()
      if (activeSprint) {
        await fetchSprintStories(activeSprint.id)
      }
    } catch (error) {
      console.error('Error removing story from sprint:', error)
      alert('Error removing story from sprint: ' + error.message)
    }
  }

  const handleSelectSprint = async (sprint) => {
    setActiveSprint(sprint)
    await fetchSprintStories(sprint.id)
    setActiveTab('planning')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Sprint Planning...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sprint Planning
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {['planning', 'sprints'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'planning' && 'Sprint Planning'}
              {tab === 'sprints' && 'All Sprints'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'planning' && (
        <PlanningTab
          project={project}
          projectId={projectId}
          backlog={backlog}
          sprints={sprints}
          activeSprint={activeSprint}
          availableStories={availableStories}
          sprintStories={sprintStories}
          onSelectSprint={handleSelectSprint}
          onAddStoryToSprint={handleAddStoryToSprint}
          onRemoveStoryFromSprint={handleRemoveStoryFromSprint}
          onCreateSprint={() => {
            setEditingSprint(null)
            setShowSprintForm(true)
          }}
          onEditSprint={(sprint) => {
            setEditingSprint(sprint)
            setShowSprintForm(true)
          }}
          showSprintForm={showSprintForm}
          editingSprint={editingSprint}
          onSaveSprint={handleSaveSprint}
          onCloseForm={() => {
            setShowSprintForm(false)
            setEditingSprint(null)
          }}
        />
      )}

      {activeTab === 'sprints' && (
        <SprintsTab
          sprints={sprints}
          onCreateSprint={() => {
            setEditingSprint(null)
            setShowSprintForm(true)
            setActiveTab('planning')
          }}
          onEditSprint={(sprint) => {
            setEditingSprint(sprint)
            setShowSprintForm(true)
            setActiveTab('planning')
          }}
          onSelectSprint={handleSelectSprint}
        />
      )}

      {/* Sprint Form Modal */}
      {showSprintForm && (
        <SprintForm
          sprint={editingSprint}
          projectId={projectId}
          backlogId={backlog?.id}
          onSave={handleSaveSprint}
          onClose={() => {
            setShowSprintForm(false)
            setEditingSprint(null)
          }}
        />
      )}
    </div>
  )
}

// Planning Tab Component
function PlanningTab({
  project,
  projectId,
  backlog,
  sprints,
  activeSprint,
  availableStories,
  sprintStories,
  onSelectSprint,
  onAddStoryToSprint,
  onRemoveStoryFromSprint,
  onCreateSprint,
  onEditSprint,
  showSprintForm,
  editingSprint,
  onSaveSprint,
  onCloseForm
}) {
  const navigate = useNavigate()
  const [selectedStoryIds, setSelectedStoryIds] = useState([])

  const totalCommittedPoints = sprintStories.reduce((sum, sb) => {
    return sum + (sb.user_stories?.story_points || 0)
  }, 0)

  const handleToggleStory = (storyId) => {
    setSelectedStoryIds(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    )
  }

  const handleAddSelectedToSprint = () => {
    if (!activeSprint) {
      alert('Please select or create a sprint first')
      return
    }

    selectedStoryIds.forEach(storyId => {
      onAddStoryToSprint(storyId, activeSprint.id)
    })
    setSelectedStoryIds([])
  }

  return (
    <div className="space-y-6">
      {/* Sprint Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Sprint
          </h2>
            <div className="flex gap-2">
            {activeSprint && (
              <>
                <button
                  onClick={() => navigate(`/projects/${projectId}/scrum/sprint/${activeSprint.id}/board`)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  View Board
                </button>
                <button
                  onClick={() => onEditSprint(activeSprint)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Edit Sprint
                </button>
              </>
            )}
            <button
              onClick={onCreateSprint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {activeSprint ? '+ New Sprint' : '+ Create Sprint'}
            </button>
          </div>
        </div>

        {activeSprint ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sprint Name</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeSprint.sprint_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeSprint.sprint_duration_days} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  activeSprint.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  activeSprint.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  activeSprint.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {activeSprint.status}
                </span>
              </div>
            </div>

            {activeSprint.sprint_goal && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sprint Goal</p>
                <p className="text-gray-900 dark:text-white">{activeSprint.sprint_goal}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Capacity (Story Points)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeSprint.team_capacity_story_points || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Committed Points</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {totalCommittedPoints}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Capacity</p>
                <p className={`text-lg font-semibold ${
                  (activeSprint.team_capacity_story_points || 0) - totalCommittedPoints >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {(activeSprint.team_capacity_story_points || 0) - totalCommittedPoints}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Dates</p>
              <p className="text-gray-900 dark:text-white">
                {activeSprint.sprint_start_date && format(new Date(activeSprint.sprint_start_date), 'MMM dd, yyyy')} - {' '}
                {activeSprint.sprint_end_date && format(new Date(activeSprint.sprint_end_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No active sprint</p>
            <button
              onClick={onCreateSprint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Create Sprint
            </button>
          </div>
        )}
      </div>

      {activeSprint && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Stories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Stories ({availableStories.length})
              </h3>
              {selectedStoryIds.length > 0 && (
                <button
                  onClick={handleAddSelectedToSprint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Add Selected ({selectedStoryIds.length})
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {availableStories.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No available stories
                </p>
              ) : (
                availableStories.map((story) => (
                  <div
                    key={story.id}
                    className={`p-4 rounded-lg border ${
                      selectedStoryIds.includes(story.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } cursor-pointer transition-colors`}
                    onClick={() => handleToggleStory(story.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedStoryIds.includes(story.id)}
                            onChange={() => handleToggleStory(story.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                          />
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {story.story_title}
                          </h4>
                          {story.story_points && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                              {story.story_points} pts
                            </span>
                          )}
                        </div>
                        {story.story_description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {story.story_description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddStoryToSprint(story.id, activeSprint.id)
                        }}
                        className="ml-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sprint Backlog */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sprint Backlog ({sprintStories.length})
            </h3>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sprintStories.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No stories in sprint backlog
                </p>
              ) : (
                sprintStories.map((sprintBacklog) => {
                  const story = sprintBacklog.user_stories
                  if (!story) return null

                  return (
                    <div
                      key={sprintBacklog.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {story.story_title}
                            </h4>
                            {story.story_points && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                {story.story_points} pts
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              sprintBacklog.sprint_status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              sprintBacklog.sprint_status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {sprintBacklog.sprint_status}
                            </span>
                          </div>
                          {story.story_description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {story.story_description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveStoryFromSprint(sprintBacklog.id, story.id)}
                          className="ml-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sprints Tab Component
function SprintsTab({ sprints, onCreateSprint, onEditSprint, onSelectSprint }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          All Sprints ({sprints.length})
        </h2>
        <button
          onClick={onCreateSprint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          + Create Sprint
        </button>
      </div>

      {sprints.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No sprints yet</p>
          <button
            onClick={onCreateSprint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectSprint(sprint)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {sprint.sprint_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sprint #{sprint.sprint_number}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  sprint.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  sprint.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  sprint.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {sprint.status}
                </span>
              </div>

              {sprint.sprint_goal && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {sprint.sprint_goal}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {sprint.sprint_duration_days} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Committed:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {sprint.committed_story_points || 0} pts
                  </span>
                </div>
                {sprint.status === 'completed' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {sprint.completed_story_points || 0} pts
                    </span>
                  </div>
                )}
                {sprint.sprint_start_date && sprint.sprint_end_date && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(sprint.sprint_start_date), 'MMM dd')} - {format(new Date(sprint.sprint_end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectSprint(sprint)
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Open
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditSprint(sprint)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Sprint Form Component
function SprintForm({ sprint, projectId, backlogId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    sprint_name: '',
    sprint_goal: '',
    sprint_start_date: '',
    sprint_end_date: '',
    team_capacity_story_points: '',
    team_capacity_hours: '',
    scrum_master_user_id: '',
    status: 'planned'
  })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sprint) {
      setFormData({
        sprint_name: sprint.sprint_name || '',
        sprint_goal: sprint.sprint_goal || '',
        sprint_start_date: sprint.sprint_start_date ? format(new Date(sprint.sprint_start_date), 'yyyy-MM-dd') : '',
        sprint_end_date: sprint.sprint_end_date ? format(new Date(sprint.sprint_end_date), 'yyyy-MM-dd') : '',
        team_capacity_story_points: sprint.team_capacity_story_points || '',
        team_capacity_hours: sprint.team_capacity_hours || '',
        scrum_master_user_id: sprint.scrum_master_user_id || '',
        status: sprint.status || 'planned'
      })
    } else {
      // Set default dates (2 weeks from today)
      const startDate = new Date()
      const endDate = addDays(startDate, 13) // 14 days total (2 weeks)
      setFormData({
        sprint_name: '',
        sprint_goal: '',
        sprint_start_date: format(startDate, 'yyyy-MM-dd'),
        sprint_end_date: format(endDate, 'yyyy-MM-dd'),
        team_capacity_story_points: '',
        team_capacity_hours: '',
        scrum_master_user_id: '',
        status: 'planned'
      })
    }

    fetchUsers()
  }, [sprint])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave({
        ...formData,
        team_capacity_story_points: formData.team_capacity_story_points ? parseInt(formData.team_capacity_story_points) : null,
        team_capacity_hours: formData.team_capacity_hours ? parseFloat(formData.team_capacity_hours) : null,
        scrum_master_user_id: formData.scrum_master_user_id || null
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {sprint ? 'Edit Sprint' : 'Create Sprint'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Name *
            </label>
            <input
              type="text"
              name="sprint_name"
              value={formData.sprint_name}
              onChange={handleChange}
              placeholder="Sprint 1, Sprint 2, etc."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sprint Goal
            </label>
            <textarea
              name="sprint_goal"
              value={formData.sprint_goal}
              onChange={handleChange}
              rows={3}
              placeholder="What is the goal for this sprint?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="sprint_start_date"
                value={formData.sprint_start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                name="sprint_end_date"
                value={formData.sprint_end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Capacity (Story Points)
              </label>
              <input
                type="number"
                name="team_capacity_story_points"
                value={formData.team_capacity_story_points}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 40"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Capacity (Hours)
              </label>
              <input
                type="number"
                name="team_capacity_hours"
                value={formData.team_capacity_hours}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="e.g., 160"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scrum Master
            </label>
            <select
              name="scrum_master_user_id"
              value={formData.scrum_master_user_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select Scrum Master</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (sprint ? 'Update Sprint' : 'Create Sprint')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

