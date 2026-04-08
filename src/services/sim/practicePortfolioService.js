/**
 * Practice Portfolio Service
 * CRUD operations for practice portfolios and programmes (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticePortfolios(filters = {}) {
  try {
    const userId = await getCurrentUserId()
    let query = simDb.from('practice_portfolios').select('*').eq('user_id', userId).eq('is_deleted', false)
    if (filters.status) query = query.eq('portfolio_status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Dashboard rollups – single slim query (millisecond-optimised). For Programme Dashboard overview.
 */
export async function getPracticeProgrammesForDashboard() {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb
      .from('practice_programmes')
      .select('id, programme_name, programme_code, total_projects_count, active_projects_count, overall_progress_percentage, overall_health_score, total_budget, allocated_budget')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting practice programme rollups for dashboard:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/** List view: slim columns for fast load (millisecond-optimised). */
export async function getPracticeProgrammesForList(portfolioId, filters = {}) {
  try {
    const userId = await getCurrentUserId()
    let query = simDb
      .from('practice_programmes')
      .select('id, programme_name, programme_code, programme_description, programme_status')
      .eq('user_id', userId)
      .eq('is_deleted', false)
    if (portfolioId) query = query.eq('practice_portfolio_id', portfolioId)
    if (filters.status) query = query.eq('programme_status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeProgrammes(portfolioId, filters = {}) {
  try {
    const userId = await getCurrentUserId()
    let query = simDb.from('practice_programmes').select('*').eq('user_id', userId).eq('is_deleted', false)
    if (portfolioId) query = query.eq('practice_portfolio_id', portfolioId)
    if (filters.status) query = query.eq('programme_status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeProgrammeById(programmeId) {
  try {
    const { data, error } = await simDb
      .from('practice_programmes')
      .select('*')
      .eq('id', programmeId)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get projects assigned to a practice programme (for Programme Projects page).
 */
export async function getPracticeProgrammeProjects(programmeId, filters = {}) {
  try {
    let query = simDb
      .from('practice_programme_projects')
      .select(`
        id,
        practice_programme_id,
        practice_project_id,
        assignment_status,
        programme_priority,
        priority_order,
        practice_project:practice_project_id (
          id,
          project_name,
          project_code,
          status_id,
          priority,
          health_status
        )
      `)
      .eq('practice_programme_id', programmeId)
    if (filters.status) query = query.eq('assignment_status', filters.status)
    if (filters.priority) query = query.eq('programme_priority', filters.priority)
    const { data, error } = await query.order('priority_order', { ascending: true })
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading practice programme projects:', error)
    return []
  }
}

/**
 * Get benefits for a practice programme (aggregated from practice_benefits_review_plans for projects in the programme).
 * Returns shape compatible with BenefitsRealizationChart/table: benefit_name, benefit_category, benefit_type, benefit_status.
 */
export async function getPracticeProgrammeBenefits(programmeId) {
  try {
    const { data: assignments } = await simDb
      .from('practice_programme_projects')
      .select('practice_project_id')
      .eq('practice_programme_id', programmeId)
    const programmeProjectIds = (assignments || []).map((a) => a.practice_project_id).filter(Boolean)
    if (programmeProjectIds.length === 0) return []

    const { data: rows, error } = await simDb
      .from('practice_benefits_review_plans')
      .select('id, practice_project_id, plan_title, status')
      .in('practice_project_id', programmeProjectIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    const statusMap = { approved: 'realized', archived: 'realized', draft: 'planned', pending_approval: 'in_progress' }
    return (rows || []).map((r) => ({
      id: r.id,
      benefit_name: r.plan_title || 'Unnamed benefit',
      benefit_category: 'Review Plan',
      benefit_type: 'Review Plan',
      benefit_status: statusMap[r.status] || r.status || 'planned',
    }))
  } catch (error) {
    console.error('Error loading practice programme benefits:', error)
    return []
  }
}

/**
 * Get programme + projects for timeline view (practice programme; no programme_milestones in sim).
 * Returns { programme, milestones: [], projects } for ProgrammeTimelineView.
 */
export async function getPracticeProgrammeTimelineData(programmeId) {
  try {
    const [progRes, projectsRows] = await Promise.all([
      getPracticeProgrammeById(programmeId),
      simDb
        .from('practice_programme_projects')
        .select(`
          practice_project:practice_project_id (
            id,
            project_name,
            project_code,
            planned_start_date,
            planned_end_date,
            actual_start_date,
            actual_end_date
          )
        `)
        .eq('practice_programme_id', programmeId)
        .order('priority_order', { ascending: true }),
    ])

    const programme = progRes.success ? progRes.data : null
    const projects = (projectsRows.data || [])
      .filter((r) => r.practice_project)
      .map((r) => {
        const p = r.practice_project
        return {
          project: {
            id: p.id,
            project_name: p.project_name,
            project_code: p.project_code,
            project_start_date: p.actual_start_date || p.planned_start_date,
            project_end_date: p.actual_end_date || p.planned_end_date,
          },
        }
      })

    return { programme, milestones: [], projects }
  } catch (error) {
    console.error('Error loading practice programme timeline:', error)
    return { programme: null, milestones: [], projects: [] }
  }
}

/**
 * Get dependencies for a practice programme (all dependencies where source project is in the programme).
 * Returns shape compatible with DependencyMapVisualization: source_project, target_project, dependency_criticality, dependency_status.
 */
export async function getPracticeProgrammeDependencies(programmeId) {
  try {
    const { data: assignments } = await simDb
      .from('practice_programme_projects')
      .select('practice_project_id')
      .eq('practice_programme_id', programmeId)
    const programmeProjectIds = (assignments || []).map((a) => a.practice_project_id).filter(Boolean)
    if (programmeProjectIds.length === 0) return []

    const { data: rows, error } = await simDb
      .from('practice_dependencies')
      .select('id, practice_project_id, target_type, target_id, target_name, dependency_category, is_critical, status, source_name')
      .in('practice_project_id', programmeProjectIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: sourceProjects } = await simDb
      .from('practice_projects')
      .select('id, project_name, project_code')
      .in('id', programmeProjectIds)
    const projectMap = new Map((sourceProjects || []).map((p) => [p.id, p]))

    const targetIds = (rows || [])
      .filter((r) => r.target_type === 'project' && r.target_id)
      .map((r) => r.target_id)
    let targetMap = new Map()
    if (targetIds.length > 0) {
      const { data: targetProjects } = await simDb
        .from('practice_projects')
        .select('id, project_name, project_code')
        .in('id', [...new Set(targetIds)])
      targetMap = new Map((targetProjects || []).map((p) => [p.id, p]))
    }

    return (rows || []).map((r) => {
      const source = projectMap.get(r.practice_project_id) || { id: r.practice_project_id, project_name: r.source_name || 'Unknown' }
      const target = r.target_type === 'project' && r.target_id
        ? (targetMap.get(r.target_id) || { id: r.target_id, project_name: r.target_name || 'Unknown' })
        : { id: r.target_id || r.id, project_name: r.target_name || 'External' }
      return {
        id: r.id,
        source_project: source,
        target_project: target,
        dependency_type: r.dependency_category || 'finish-to-start',
        dependency_criticality: r.is_critical ? 'critical' : 'medium',
        is_critical_path: r.is_critical || false,
        dependency_status: r.status || 'active',
      }
    })
  } catch (error) {
    console.error('Error loading practice programme dependencies:', error)
    return []
  }
}

export async function getPracticeDependencies(projectId) {
  try {
    const { data, error } = await simDb.from('practice_dependencies').select('*').eq('practice_project_id', projectId).eq('status', 'active').order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticePortfolio(portfolioData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_portfolios').insert({ ...portfolioData, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeProgramme(programmeData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_programmes').insert({ ...programmeData, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeDependency(projectId, dependencyData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_dependencies').insert({ ...dependencyData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticePortfolios, getPracticeProgrammes, getPracticeProgrammeById, getPracticeDependencies, createPracticePortfolio, createPracticeProgramme, createPracticeDependency }
