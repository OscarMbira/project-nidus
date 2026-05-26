import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { StatCard, ProgressCard, TaskListWidget, ProjectListWidget } from '../components/DashboardWidgets'

export default function MethodologyDashboard() {
  const { methodologyCode } = useParams()
  const [methodology, setMethodology] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (methodologyCode) {
      fetchMethodologyData()
    }
  }, [methodologyCode])

  const fetchMethodologyData = async () => {
    try {
      setLoading(true)

      // Fetch methodology details
      const { data: methodologyData, error: methodologyError } = await supabase
        .from('methodologies')
        .select('*')
        .eq('methodology_code', methodologyCode)
        .eq('is_active', true)
        .single()

      if (methodologyError) throw methodologyError
      setMethodology(methodologyData)

      // Fetch projects with this methodology
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_methodologies')
        .select(`
          project_id,
          projects:project_id (
            id,
            project_name,
            percentage_complete,
            project_statuses:status_id (status_name, status_color)
          )
        `)
        .eq('methodology_id', methodologyData.id)
        .eq('is_deleted', false)

      if (projectsError && projectsError.code !== '42P01') throw projectsError

      const projectList = projectsData?.map(pm => pm.projects).filter(Boolean) || []
      setProjects(projectList)

      // Fetch tasks for these projects
      if (projectList.length > 0) {
        const projectIds = projectList.map(p => p.id)
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            id,
            task_name,
            due_date,
            percentage_complete,
            projects:project_id (id, project_name),
            task_statuses:status_id (status_name, status_color)
          `)
          .in('project_id', projectIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20)

        if (tasksError && tasksError.code !== '42P01') throw tasksError
        setTasks(tasksData || [])
      }

      // Calculate statistics
      const activeProjects = projectList.filter(p =>
        p.project_statuses?.status_name !== 'Completed' &&
        p.project_statuses?.status_name !== 'Cancelled' &&
        p.project_statuses?.status_name !== 'Closed'
      )

      const completedTasks = tasks?.filter(t =>
        t.task_statuses?.status_name === 'Completed'
      ) || []

      const avgProgress = projectList.length > 0
        ? Math.round(projectList.reduce((sum, p) => sum + (p.percentage_complete || 0), 0) / projectList.length)
        : 0

      setStats({
        totalProjects: projectList.length,
        activeProjects: activeProjects.length,
        totalTasks: tasks?.length || 0,
        completedTasks: completedTasks.length,
        avgProgress,
      })
    } catch (error) {
      console.error('Error fetching methodology data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!methodology) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Methodology not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Methodology-specific widgets based on methodology type
  const renderMethodologySpecificWidgets = () => {
    const methodologyCode = methodology.methodology_code

    if (methodologyCode === 'scrum') {
      return <ScrumDashboardWidgets projectIds={projects.map(p => p.id)} />
    }

    if (methodologyCode === 'kanban') {
      return <KanbanDashboardWidgets projectIds={projects.map(p => p.id)} />
    }

    if (methodologyCode === 'structured_pm' || methodologyCode === 'prince2') {
      // Note: 'prince2' is kept for database compatibility but displayed as 'Structured PM'
      return <StructuredPMDashboardWidgets projectIds={projects.map(p => p.id)} />
    }

    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl"
            style={{ backgroundColor: methodology.methodology_color || '#3B82F6' }}
          >
            {methodology.methodology_icon || '📊'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {methodology.methodology_name} Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {methodology.methodology_description}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          subtitle={`${stats.activeProjects} active`}
          icon="📁"
          color="blue"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          subtitle={`${stats.completedTasks} completed`}
          icon="✓"
          color="green"
        />
        <StatCard
          title="Average Progress"
          value={`${stats.avgProgress}%`}
          subtitle="Across all projects"
          icon="📈"
          color="purple"
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle="In progress"
          icon="🚀"
          color="indigo"
        />
      </div>

      {/* Methodology-Specific Widgets */}
      {renderMethodologySpecificWidgets()}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressCard
          title="Overall Project Progress"
          percentage={stats.avgProgress}
          color="blue"
        />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Status Distribution
          </h3>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No projects yet
            </p>
          ) : (
            <div className="space-y-2">
              {['Active', 'Planning', 'On Hold', 'Completed'].map((status) => {
                const count = projects.filter(p => 
                  p.project_statuses?.status_name === status
                ).length
                const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{status}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectListWidget
          title={`${methodology.methodology_name} Projects`}
          projects={projects}
          onProjectClick={(projectId) => navigate(`/projects/${projectId}`)}
        />
        <TaskListWidget
          title="Recent Tasks"
          tasks={tasks}
          onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
        />
      </div>
    </div>
  )
}

// Scrum Dashboard Widgets Component
function ScrumDashboardWidgets({ projectIds }) {
  const [scrumMetrics, setScrumMetrics] = useState({
    activeSprints: 0,
    totalSprints: 0,
    totalStories: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    averageVelocity: 0,
    activeSprint: null,
    recentSprints: []
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchScrumMetrics()
    } else {
      setLoading(false)
    }
  }, [projectIds])

  const fetchScrumMetrics = async () => {
    try {
      setLoading(true)

      // Fetch sprints for these projects
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select(`
          *,
          project_id
        `)
        .in('project_id', projectIds)
        .eq('is_deleted', false)
        .order('sprint_number', { ascending: false })

      if (sprintsError && sprintsError.code !== '42P01') throw sprintsError

      const sprints = sprintsData || []
      const activeSprint = sprints.find(s => s.status === 'active')
      const completedSprints = sprints.filter(s => s.status === 'completed')

      // Calculate average velocity from completed sprints
      const velocities = completedSprints
        .filter(s => s.velocity && s.velocity > 0)
        .map(s => s.velocity)
      const avgVelocity = velocities.length > 0
        ? Math.round(velocities.reduce((sum, v) => sum + v, 0) / velocities.length)
        : 0

      // Fetch product backlogs and stories
      const { data: backlogsData, error: backlogsError } = await supabase
        .from('product_backlogs')
        .select('id')
        .in('project_id', projectIds)
        .eq('is_deleted', false)

      if (backlogsError && backlogsError.code !== '42P01') throw backlogsError

      let totalStories = 0
      let totalStoryPoints = 0
      let completedStoryPoints = 0

      if (backlogsData && backlogsData.length > 0) {
        const backlogIds = backlogsData.map(b => b.id)
        const { data: storiesData, error: storiesError } = await supabase
          .from('user_stories')
          .select('story_points, status')
          .in('product_backlog_id', backlogIds)
          .eq('is_deleted', false)

        if (storiesError && storiesError.code !== '42P01') throw storiesError

        totalStories = storiesData?.length || 0
        totalStoryPoints = storiesData?.reduce((sum, s) => sum + (s.story_points || 0), 0) || 0
        completedStoryPoints = storiesData
          ?.filter(s => s.status === 'done')
          .reduce((sum, s) => sum + (s.story_points || 0), 0) || 0
      }

      setScrumMetrics({
        activeSprints: sprints.filter(s => s.status === 'active').length,
        totalSprints: sprints.length,
        totalStories,
        totalStoryPoints,
        completedStoryPoints,
        averageVelocity: avgVelocity,
        activeSprint,
        recentSprints: sprints.slice(0, 5)
      })
    } catch (error) {
      console.error('Error fetching Scrum metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Sprint Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sprint Overview
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Sprints</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {scrumMetrics.activeSprints}
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Sprints</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {scrumMetrics.totalSprints}
              </span>
            </div>
          </div>
          {scrumMetrics.activeSprint && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Sprint</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {scrumMetrics.activeSprint.sprint_name}
              </p>
              {scrumMetrics.activeSprint.committed_story_points > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>
                      {scrumMetrics.activeSprint.completed_story_points || 0} / {scrumMetrics.activeSprint.committed_story_points} pts
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((scrumMetrics.activeSprint.completed_story_points || 0) / scrumMetrics.activeSprint.committed_story_points) * 100,
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Velocity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Team Velocity
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {scrumMetrics.averageVelocity}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Average story points per sprint
            </p>
          </div>
          {scrumMetrics.recentSprints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent Sprints</p>
              <div className="space-y-2">
                {scrumMetrics.recentSprints.slice(0, 3).map((sprint, index) => (
                  <div key={sprint.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                      {sprint.sprint_name}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium ml-2">
                      {sprint.velocity || sprint.completed_story_points || 0} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Backlog */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Product Backlog
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Stories</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {scrumMetrics.totalStories}
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Story Points</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {scrumMetrics.totalStoryPoints}
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed Points</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {scrumMetrics.completedStoryPoints}
              </span>
            </div>
          </div>
          {scrumMetrics.totalStoryPoints > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Backlog Progress</span>
                <span>
                  {Math.round((scrumMetrics.completedStoryPoints / scrumMetrics.totalStoryPoints) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (scrumMetrics.completedStoryPoints / scrumMetrics.totalStoryPoints) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Kanban Dashboard Widgets Component
function KanbanDashboardWidgets({ projectIds }) {
  const [kanbanMetrics, setKanbanMetrics] = useState({
    totalBoards: 0,
    totalCards: 0,
    cardsInProgress: 0,
    cardsBlocked: 0,
    averageLeadTime: 0,
    wipViolations: 0
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchKanbanMetrics()
    } else {
      setLoading(false)
    }
  }, [projectIds])

  const fetchKanbanMetrics = async () => {
    try {
      setLoading(true)

      // Fetch Kanban boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('kanban_boards')
        .select('id')
        .in('project_id', projectIds)
        .eq('is_deleted', false)

      if (boardsError && boardsError.code !== '42P01') throw boardsError

      const boards = boardsData || []
      const boardIds = boards.map(b => b.id)

      // Fetch cards
      let totalCards = 0
      let cardsInProgress = 0
      let cardsBlocked = 0
      let totalLeadTime = 0
      let leadTimeCount = 0
      let wipViolations = 0

      if (boardIds.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
          .from('kanban_cards')
          .select('column_id, is_blocked, started_at, completed_at')
          .in('board_id', boardIds)
          .eq('is_deleted', false)

        if (cardsError && cardsError.code !== '42P01') throw cardsError

        const cards = cardsData || []
        totalCards = cards.length
        cardsBlocked = cards.filter(c => c.is_blocked).length

        // Fetch columns to check WIP limits
        const { data: columnsData, error: columnsError } = await supabase
          .from('kanban_columns')
          .select('id, wip_limit, wip_limit_type')
          .in('board_id', boardIds)
          .eq('is_deleted', false)

        if (columnsError && columnsError.code !== '42P01') throw columnsError

        // Count cards per column and check WIP violations
        columnsData?.forEach(column => {
          const cardsInColumn = cards.filter(c => c.column_id === column.id)
          cardsInProgress += cardsInColumn.length

          if (column.wip_limit && cardsInColumn.length > column.wip_limit) {
            wipViolations++
          }
        })

        // Calculate average lead time (from started to completed)
        cards.forEach(card => {
          if (card.started_at && card.completed_at) {
            const start = new Date(card.started_at)
            const completed = new Date(card.completed_at)
            const days = Math.ceil((completed - start) / (1000 * 60 * 60 * 24))
            totalLeadTime += days
            leadTimeCount++
          }
        })
      }

      setKanbanMetrics({
        totalBoards: boards.length,
        totalCards,
        cardsInProgress,
        cardsBlocked,
        averageLeadTime: leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0,
        wipViolations
      })
    } catch (error) {
      console.error('Error fetching Kanban metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Boards Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kanban Boards
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {kanbanMetrics.totalBoards}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total boards
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Cards</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kanbanMetrics.totalCards}
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {kanbanMetrics.cardsInProgress}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Blocked</span>
              <span className={`text-sm font-medium ${
                kanbanMetrics.cardsBlocked > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
              }`}>
                {kanbanMetrics.cardsBlocked}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Flow Metrics
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {kanbanMetrics.averageLeadTime}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Average lead time (days)
            </p>
          </div>
          {kanbanMetrics.averageLeadTime === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Complete cards to calculate lead time
            </p>
          )}
        </div>
      </div>

      {/* WIP Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          WIP Status
        </h3>
        <div className="space-y-3">
          <div>
            <p className={`text-3xl font-bold ${
              kanbanMetrics.wipViolations > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {kanbanMetrics.wipViolations}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              WIP limit violations
            </p>
          </div>
          {kanbanMetrics.wipViolations > 0 && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              Some columns exceed their WIP limits
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Structured PM Dashboard Widgets Component
function StructuredPMDashboardWidgets({ projectIds }) {
  const [structuredMetrics, setStructuredMetrics] = useState({
    projectsInSU: 0,
    projectsInIP: 0,
    totalProcesses: 0,
    completedProcesses: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchStructuredMetrics()
    } else {
      setLoading(false)
    }
  }, [projectIds])

  const fetchStructuredMetrics = async () => {
    try {
      setLoading(true)

      // Fetch structured process steps
      const { data: processesData, error: processesError } = await supabase
        .from('structured_process_steps')
        .select('project_id, process_code, step_code, is_completed')
        .in('project_id', projectIds)
        .eq('is_deleted', false)

      if (processesError && processesError.code !== '42P01') throw processesError

      const processes = processesData || []
      const projectsInSU = new Set(
        processes.filter(p => p.process_code === 'SU' && !p.is_completed).map(p => p.project_id)
      ).size
      const projectsInIP = new Set(
        processes.filter(p => p.process_code === 'IP' && !p.is_completed).map(p => p.project_id)
      ).size

      const totalProcesses = processes.length
      const completedProcesses = processes.filter(p => p.is_completed).length

      setStructuredMetrics({
        projectsInSU,
        projectsInIP,
        totalProcesses,
        completedProcesses,
        pendingApprovals: 0 // Will be implemented with stage gates
      })
    } catch (error) {
      console.error('Error fetching Structured PM metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Process Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Process Status
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Starting Up (SU)</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {structuredMetrics.projectsInSU} projects
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Initiating (IP)</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {structuredMetrics.projectsInIP} projects
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Process Completion */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Process Completion
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {structuredMetrics.totalProcesses > 0
                ? Math.round((structuredMetrics.completedProcesses / structuredMetrics.totalProcesses) * 100)
                : 0}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {structuredMetrics.completedProcesses} of {structuredMetrics.totalProcesses} completed
            </p>
          </div>
          {structuredMetrics.totalProcesses > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (structuredMetrics.completedProcesses / structuredMetrics.totalProcesses) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage Gates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Stage Gates
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {structuredMetrics.pendingApprovals}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Pending approvals
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Stage gate approvals will be available in Phase 3
          </p>
        </div>
      </div>
    </div>
  )
}

