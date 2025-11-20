import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { StatCard, ProgressCard, TaskListWidget, ProjectListWidget } from '../components/DashboardWidgets'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    myTasks: 0,
  })
  const [recentTasks, setRecentTasks] = useState([])
  const [recentProjects, setRecentProjects] = useState([])
  const [methodologyStats, setMethodologyStats] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          percentage_complete,
          project_statuses:status_id (status_name, status_color)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (projectsError) throw projectsError

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          task_name,
          due_date,
          projects:project_id (id, project_name),
          task_statuses:status_id (status_name, status_color)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (tasksError && tasksError.code !== '42P01') throw tasksError

      // Fetch methodology distribution
      const { data: methodologyData, error: methodologyError } = await supabase
        .from('project_methodologies')
        .select(`
          methodology_id,
          methodologies:methodology_id (methodology_name, methodology_color)
        `)
        .eq('is_deleted', false)

      if (methodologyError && methodologyError.code !== '42P01') throw methodologyError

      // Calculate statistics
      const activeProjects = projects?.filter(p => 
        p.project_statuses?.status_name !== 'Completed' && 
        p.project_statuses?.status_name !== 'Cancelled' &&
        p.project_statuses?.status_name !== 'Closed'
      ) || []

      const completedTasks = tasks?.filter(t => 
        t.task_statuses?.status_name === 'Completed'
      ) || []

      const overdueTasks = tasks?.filter(t => {
        if (!t.due_date) return false
        const dueDate = new Date(t.due_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return dueDate < today && t.task_statuses?.status_name !== 'Completed'
      }) || []

      const myTasks = tasks?.filter(t => {
        // This would need to check if task is assigned to current user
        // For now, we'll use a placeholder
        return false
      }) || []

      // Calculate methodology distribution
      const methodologyCounts = {}
      methodologyData?.forEach((pm) => {
        const methodologyName = pm.methodologies?.methodology_name || 'Unknown'
        methodologyCounts[methodologyName] = (methodologyCounts[methodologyName] || 0) + 1
      })

      const methodologyStatsArray = Object.entries(methodologyCounts).map(([name, count]) => ({
        name,
        count,
        color: methodologyData?.find(pm => pm.methodologies?.methodology_name === name)?.methodologies?.methodology_color || '#3B82F6'
      }))

      setStats({
        totalProjects: projects?.length || 0,
        activeProjects: activeProjects.length,
        totalTasks: tasks?.length || 0,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        myTasks: myTasks.length,
      })

      setRecentTasks(tasks || [])
      setRecentProjects(projects || [])
      setMethodologyStats(methodologyStatsArray)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const overallProgress = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of your projects and tasks
        </p>
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
          title="Overdue Tasks"
          value={stats.overdueTasks}
          subtitle="Requires attention"
          icon="⚠️"
          color={stats.overdueTasks > 0 ? "red" : "yellow"}
        />
        <StatCard
          title="My Tasks"
          value={stats.myTasks}
          subtitle="Assigned to me"
          icon="👤"
          color="purple"
        />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressCard
          title="Overall Task Completion"
          percentage={overallProgress}
          color="blue"
        />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Methodology Distribution
          </h3>
          {methodologyStats.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No projects with methodologies yet
            </p>
          ) : (
            <div className="space-y-3">
              {methodologyStats.map((methodology, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {methodology.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {methodology.count} {methodology.count === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(methodology.count / stats.totalProjects) * 100}%`,
                        backgroundColor: methodology.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectListWidget
          title="Recent Projects"
          projects={recentProjects}
          onProjectClick={(projectId) => navigate(`/projects/${projectId}`)}
        />
        <TaskListWidget
          title="Recent Tasks"
          tasks={recentTasks}
          onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/methodology-selection')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Create New Project
          </button>
          <button
            onClick={() => navigate('/tasks/create')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Create New Task
          </button>
          <button
            onClick={() => navigate('/tasks/board')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
          >
            View Task Board
          </button>
          <button
            onClick={() => navigate('/tasks/calendar')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
          >
            View Calendar
          </button>
        </div>
      </div>
    </div>
  )
}
