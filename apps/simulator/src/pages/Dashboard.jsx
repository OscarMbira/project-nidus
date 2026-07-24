import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { StatCard, ProgressCard, TaskListWidget, ProjectListWidget } from '../components/DashboardWidgets'
import { isPmoAdmin as checkIsPmoAdmin, getOrganisationUsers } from '../services/organisationRoleService'
import { Briefcase, UserPlus, Shield, Building2, ArrowRight } from 'lucide-react'
import AIInsightsPanel from '../components/ai/AIInsightsPanel'

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [organisationUsers, setOrganisationUsers] = useState([])
  const [organisation, setOrganisation] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      // Single auth call shared by all queries
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Fire all independent queries in parallel
      const [projectsRes, tasksRes, methodologyRes, adminFlag] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, percentage_complete, project_statuses:status_id (status_name, status_color)')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('tasks')
          .select('id, task_name, due_date, projects:project_id (id, project_name), task_statuses:status_id (status_name, status_color)')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('project_methodologies')
          .select('methodology_id, methodologies:methodology_id (methodology_name, methodology_color)')
          .eq('is_deleted', false),
        checkIsPmoAdmin(user.id),
      ])

      const projects = projectsRes.data || []
      const tasks = (tasksRes.error?.code !== '42P01' ? tasksRes.data : null) || []
      const methodologyData = (methodologyRes.error?.code !== '42P01' ? methodologyRes.data : null) || []

      // Compute stats — today computed once for overdues
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const activeProjects = projects.filter(p =>
        p.project_statuses?.status_name !== 'Completed' &&
        p.project_statuses?.status_name !== 'Cancelled' &&
        p.project_statuses?.status_name !== 'Closed'
      )
      const completedTasks = tasks.filter(t => t.task_statuses?.status_name === 'Completed')
      const overdueTasks = tasks.filter(t =>
        t.due_date && new Date(t.due_date) < today && t.task_statuses?.status_name !== 'Completed'
      )

      // Methodology distribution
      const methodologyCounts = {}
      methodologyData.forEach(pm => {
        const name = pm.methodologies?.methodology_name || 'Unknown'
        methodologyCounts[name] = (methodologyCounts[name] || 0) + 1
      })
      const methodologyStatsArray = Object.entries(methodologyCounts).map(([name, count]) => ({
        name,
        count,
        color: methodologyData.find(pm => pm.methodologies?.methodology_name === name)
          ?.methodologies?.methodology_color || '#3B82F6',
      }))

      setStats({
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        myTasks: 0,
      })
      setRecentProjects(projects)
      setRecentTasks(tasks)
      setMethodologyStats(methodologyStatsArray)
      setIsAdmin(adminFlag)

      // Admin-only data: org users + user record in parallel, then accounts
      if (adminFlag) {
        const [usersResult, userRecordRes] = await Promise.all([
          getOrganisationUsers(user.id, true), // skip redundant admin re-check
          supabase.from('users').select('id').eq('auth_user_id', user.id).single(),
        ])

        if (usersResult.success) setOrganisationUsers(usersResult.data)

        if (userRecordRes.data) {
          const { data: org } = await supabase
            .from('accounts')
            .select('id, account_name, account_code')
            .eq('owner_user_id', userRecordRes.data.id)
            .single()
          if (org) setOrganisation(org)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? 'PMO Admin Dashboard' : 'Dashboard'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {isAdmin
                ? organisation
                  ? `Overview of ${organisation.account_name}`
                  : 'Organisation overview and management'
                : 'Overview of your projects and tasks'
              }
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">PMO Admin</span>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/platform/projects/create')}
            className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left"
          >
            <Briefcase className="h-6 w-6" />
            <div>
              <div className="font-semibold">Create Project</div>
              <div className="text-sm text-blue-100">Start a new project</div>
            </div>
            <ArrowRight className="h-5 w-5 ml-auto" />
          </button>
          <button
            onClick={() => navigate('/platform/admin/role-assignment')}
            className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left"
          >
            <UserPlus className="h-6 w-6" />
            <div>
              <div className="font-semibold">Assign Roles</div>
              <div className="text-sm text-purple-100">Manage team roles</div>
            </div>
            <ArrowRight className="h-5 w-5 ml-auto" />
          </button>
          <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Building2 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {organisationUsers.length} Team Member{organisationUsers.length !== 1 ? 's' : ''}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In organisation</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Panel */}
      <div className="mb-8">
        <AIInsightsPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Projects" value={stats.totalProjects} subtitle={`${stats.activeProjects} active`} icon="📁" color="blue" />
        <StatCard title="Total Tasks" value={stats.totalTasks} subtitle={`${stats.completedTasks} completed`} icon="✓" color="green" />
        <StatCard title="Overdue Tasks" value={stats.overdueTasks} subtitle="Requires attention" icon="⚠️" color={stats.overdueTasks > 0 ? 'red' : 'yellow'} />
        <StatCard title="My Tasks" value={stats.myTasks} subtitle="Assigned to me" icon="👤" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProgressCard title="Overall Task Completion" percentage={overallProgress} color="blue" />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Methodology Distribution</h3>
          {methodologyStats.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No projects with methodologies yet</p>
          ) : (
            <div className="space-y-3">
              {methodologyStats.map((methodology, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{methodology.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {methodology.count} {methodology.count === 1 ? 'project' : 'projects'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(methodology.count / stats.totalProjects) * 100}%`,
                        backgroundColor: methodology.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
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
