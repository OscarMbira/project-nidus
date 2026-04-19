import { platformDb } from './supabase/supabaseClient'
import { platformPublicSelect } from './supabase/platformRestSelect'

/**
 * Portfolio Service - API functions for Portfolio Management module
 */

/**
 * Get all portfolios
 */
export async function getPortfolios(filters = {}) {
  let query = platformDb
    .from('portfolios')
    .select(`
      *,
      portfolio_owner:portfolio_owner_user_id (id, email, full_name),
      portfolio_manager:portfolio_manager_user_id (id, email, full_name),
      parent_portfolio:parent_portfolio_id (id, portfolio_name, portfolio_code)
    `)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('portfolio_status', filters.status)
  }

  if (filters.type) {
    query = query.eq('portfolio_type', filters.type)
  }

  if (filters.owner_id) {
    query = query.eq('portfolio_owner_user_id', filters.owner_id)
  }

  if (filters.search) {
    query = query.or(`portfolio_name.ilike.%${filters.search}%,portfolio_code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single portfolio by ID
 */
export async function getPortfolio(portfolioId) {
  const { data, error } = await platformDb
    .from('portfolios')
    .select(`
      *,
      portfolio_owner:portfolio_owner_user_id (id, email, full_name),
      portfolio_manager:portfolio_manager_user_id (id, email, full_name),
      parent_portfolio:parent_portfolio_id (id, portfolio_name, portfolio_code)
    `)
    .eq('id', portfolioId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/** Known columns on portfolios table (public schema) — only these are sent to avoid payload errors */
const PORTFOLIO_COLUMNS = [
  'portfolio_code', 'portfolio_name', 'portfolio_description', 'portfolio_vision', 'portfolio_mission',
  'portfolio_type', 'portfolio_category', 'portfolio_owner_user_id', 'portfolio_manager_user_id',
  'portfolio_start_date', 'portfolio_end_date', 'portfolio_status', 'parent_portfolio_id',
  'portfolio_goals', 'governance_model', 'review_frequency', 'total_budget', 'budget_currency',
  'tags', 'custom_fields', 'notes',
]

/** Cache app user id by auth user id so save does only 1 round trip after first time */
let _appUserIdCache = { authId: null, appUserId: null }

/**
 * Resolve auth user id to app user id (public.users.id). Cached per session for fast subsequent saves.
 */
async function getAppUserId(authUserId) {
  if (!authUserId) return null
  if (_appUserIdCache.authId === authUserId) return _appUserIdCache.appUserId
  const { data: row } = await platformDb.from('users').select('id').eq('auth_user_id', authUserId).eq('is_deleted', false).maybeSingle()
  const appUserId = row?.id ?? null
  _appUserIdCache = { authId: authUserId, appUserId }
  return appUserId
}

/**
 * Build payload for portfolios table (only known columns).
 */
function buildPortfolioPayload(portfolioData, appUserId, isCreate) {
  const payload = {}
  for (const key of PORTFOLIO_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(portfolioData, key)) {
      const val = portfolioData[key]
      if (val !== undefined) payload[key] = val
    }
  }
  if (appUserId) {
    payload.updated_by = appUserId
    if (isCreate) payload.created_by = appUserId
  }
  return payload
}

/**
 * Create or update a portfolio. Optimized: single auth check, cached app user id, one write.
 */
export async function savePortfolio(portfolioData, portfolioId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const appUserId = await getAppUserId(user.id)
  const payload = buildPortfolioPayload(portfolioData, appUserId, !portfolioId)

  if (portfolioId) {
    const { data, error } = await platformDb
      .from('portfolios')
      .update(payload)
      .eq('id', portfolioId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await platformDb
    .from('portfolios')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a portfolio (soft delete)
 */
export async function deletePortfolio(portfolioId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolios')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', portfolioId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get projects in a portfolio
 */
export async function getPortfolioProjects(portfolioId, filters = {}) {
  let query = platformDb
    .from('portfolio_projects')
    .select(`
      *,
      project:project_id (
        id,
        account_id,
        project_name,
        project_code,
        status_id,
        project_statuses:status_id (status_name, status_color),
        planned_start_date,
        planned_end_date,
        project_manager_user_id,
        delivery_methodology
      )
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('assignment_status', filters.status)
  }

  if (filters.priority) {
    query = query.eq('portfolio_priority', filters.priority)
  }

  const { data, error } = await query.order('priority_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Add a project to a portfolio
 */
export async function addProjectToPortfolio(portfolioId, projectId, assignmentData = {}) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const assignment = {
    portfolio_id: portfolioId,
    project_id: projectId,
    assignment_date: new Date().toISOString().split('T')[0],
    assignment_status: 'active',
    ...assignmentData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await platformDb
    .from('portfolio_projects')
    .insert(assignment)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a project from a portfolio
 */
export async function removeProjectFromPortfolio(portfolioId, projectId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_projects')
    .update({
      assignment_status: 'removed',
      updated_by: user.id,
    })
    .eq('portfolio_id', portfolioId)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get portfolio objectives
 */
export async function getPortfolioObjectives(portfolioId) {
  const { data, error } = await platformDb
    .from('portfolio_objectives')
    .select(`
      *,
      objective_owner:objective_owner_user_id (id, email, full_name),
      parent_objective:parent_objective_id (id, objective_name, objective_code)
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .order('objective_level', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a portfolio objective
 */
export async function savePortfolioObjective(objectiveData, objectiveId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...objectiveData,
    updated_by: user.id,
  }

  if (objectiveId) {
    // Update
    const { data, error } = await platformDb
      .from('portfolio_objectives')
      .update(updateData)
      .eq('id', objectiveId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('portfolio_objectives')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get portfolio members
 */
export async function getPortfolioMembers(portfolioId) {
  const { data, error } = await platformDb
    .from('portfolio_members')
    .select(`
      *,
      user:user_id (id, email, full_name, avatar_url)
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Add a member to a portfolio
 */
export async function addPortfolioMember(portfolioId, userId, memberData = {}) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const member = {
    portfolio_id: portfolioId,
    user_id: userId,
    assignment_status: 'active',
    ...memberData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await platformDb
    .from('portfolio_members')
    .insert(member)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a member from a portfolio
 */
export async function removePortfolioMember(portfolioId, userId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_members')
    .update({
      assignment_status: 'inactive',
      updated_by: user.id,
    })
    .eq('portfolio_id', portfolioId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get portfolio governance
 */
export async function getPortfolioGovernance(portfolioId) {
  const { data, error } = await platformDb
    .from('portfolio_governance')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data
}

/**
 * Create or update portfolio governance
 */
export async function savePortfolioGovernance(portfolioId, governanceData) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if governance record exists
  const { data: existing } = await platformDb
    .from('portfolio_governance')
    .select('id')
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .single()

  const updateData = {
    ...governanceData,
    portfolio_id: portfolioId,
    updated_by: user.id,
  }

  if (existing) {
    // Update
    const { data, error } = await platformDb
      .from('portfolio_governance')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('portfolio_governance')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get portfolio metrics
 */
export async function getPortfolioMetrics(portfolioId, filters = {}) {
  let query = platformDb
    .from('portfolio_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)

  if (filters.start_date) {
    query = query.gte('metric_period_end_date', filters.start_date)
  }

  if (filters.end_date) {
    query = query.lte('metric_period_start_date', filters.end_date)
  }

  if (filters.period_type) {
    query = query.eq('metric_period_type', filters.period_type)
  }

  const { data, error } = await query
    .order('metric_period_start_date', { ascending: false })
    .order('calculated_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get latest portfolio metrics
 */
export async function getLatestPortfolioMetrics(portfolioId) {
  const { data, error } = await platformDb
    .from('portfolio_metrics')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Get portfolio risks
 */
export async function getPortfolioRisks(portfolioId, filters = {}) {
  let query = platformDb
    .from('portfolio_risks')
    .select(`
      *,
      source_project:source_project_id (id, project_name, project_code),
      response_owner:response_owner_user_id (id, email, full_name)
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)

  if (filters.rating) {
    query = query.eq('risk_rating', filters.rating)
  }

  if (filters.status) {
    query = query.eq('risk_status', filters.status)
  }

  if (filters.category) {
    query = query.eq('risk_category', filters.category)
  }

  const { data, error } = await query.order('risk_score', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a portfolio risk
 */
export async function savePortfolioRisk(riskData, riskId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...riskData,
    updated_by: user.id,
  }

  if (riskId) {
    // Update
    const { data, error } = await platformDb
      .from('portfolio_risks')
      .update(updateData)
      .eq('id', riskId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('portfolio_risks')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get portfolio budgets
 */
export async function getPortfolioBudgets(portfolioId, filters = {}) {
  let query = platformDb
    .from('portfolio_budgets')
    .select(`
      *,
      budget_owner:budget_owner_user_id (id, email, full_name),
      approved_by:approved_by_user_id (id, email, full_name)
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)

  if (filters.status) {
    query = query.eq('budget_status', filters.status)
  }

  if (filters.year) {
    query = query.eq('budget_year', filters.year)
  }

  if (filters.quarter) {
    query = query.eq('budget_quarter', filters.quarter)
  }

  const { data, error } = await query
    .order('budget_year', { ascending: false })
    .order('budget_quarter', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a portfolio budget
 */
export async function savePortfolioBudget(budgetData, budgetId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...budgetData,
    updated_by: user.id,
  }

  if (budgetId) {
    // Update
    const { data, error } = await platformDb
      .from('portfolio_budgets')
      .update(updateData)
      .eq('id', budgetId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('portfolio_budgets')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get portfolio reports
 */
export async function getPortfolioReports(portfolioId, filters = {}) {
  let query = platformDb
    .from('portfolio_reports')
    .select(`
      *,
      generated_by:generated_by_user_id (id, email, full_name),
      distributed_by:distributed_by_user_id (id, email, full_name)
    `)
    .eq('portfolio_id', portfolioId)
    .eq('is_deleted', false)

  if (filters.report_type) {
    query = query.eq('report_type', filters.report_type)
  }

  if (filters.generation_status) {
    query = query.eq('generation_status', filters.generation_status)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create a portfolio report
 */
export async function createPortfolioReport(portfolioId, reportData) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const report = {
    portfolio_id: portfolioId,
    report_date: new Date().toISOString().split('T')[0],
    generation_status: 'pending',
    ...reportData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await platformDb
    .from('portfolio_reports')
    .insert(report)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Hard limit for dropdown list network wait (native fetch + AbortSignal). */
const PORTFOLIO_LIST_FETCH_MS = 28000

/**
 * Get a lightweight list of portfolios for dropdowns
 * Returns only id, portfolio_code, portfolio_name
 *
 * Uses direct PostgREST fetch — avoids supabase-js builder stalls seen as endless "Loading…".
 */
export async function getPortfolioList() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PORTFOLIO_LIST_FETCH_MS)
  const query =
    'select=id,portfolio_code,portfolio_name&is_deleted=eq.false&order=portfolio_name.asc'
  try {
    const rows = await platformPublicSelect('portfolios', query, { signal: controller.signal })
    clearTimeout(timeoutId)
    return rows
  } catch (e) {
    clearTimeout(timeoutId)
    if (e?.name === 'AbortError' || (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError')) {
      throw new Error(
        'Could not load portfolios in time. Check your network, VPN, firewall, or Supabase status, then try again.'
      )
    }
    throw e
  }
}

/**
 * Get the portfolio(s) a project is currently assigned to
 * @param {string} projectId - The project ID
 */
export async function getProjectPortfolio(projectId) {
  const { data, error } = await platformDb
    .from('portfolio_projects')
    .select('portfolio_id, portfolios:portfolio_id (id, portfolio_code, portfolio_name)')
    .eq('project_id', projectId)
    .eq('assignment_status', 'active')
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) throw error
  return data
}

// =============================================================================
// GLOBAL QUERY HELPERS — all portfolios, no portfolio_id filter
// =============================================================================

/**
 * All projects across every portfolio (for Portfolio Projects sub-page)
 */
export async function getAllPortfolioProjects(filters = {}) {
  let query = platformDb
    .from('portfolio_projects')
    .select(`
      *,
      project:project_id (
        id, project_name, project_code, status_id, project_statuses:status_id(status_name, status_color), planned_start_date, planned_end_date, delivery_methodology
      ),
      portfolio:portfolio_id (id, portfolio_code, portfolio_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) query = query.eq('portfolio_id', filters.portfolio_id)
  if (filters.status)       query = query.eq('assignment_status', filters.status)
  if (filters.search) {
    query = query.or(`project.project_name.ilike.%${filters.search}%,project.project_code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * All members across every portfolio (for Portfolio Resources sub-page)
 */
export async function getAllPortfolioMembers(filters = {}) {
  let query = platformDb
    .from('portfolio_members')
    .select(`
      *,
      user:user_id (id, email, full_name, avatar_url),
      portfolio:portfolio_id (id, portfolio_code, portfolio_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id)   query = query.eq('portfolio_id', filters.portfolio_id)
  if (filters.role)           query = query.eq('member_role', filters.role)
  if (filters.status)         query = query.eq('assignment_status', filters.status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * All budgets across every portfolio (for Portfolio Financial sub-page)
 */
export async function getAllPortfolioBudgets(filters = {}) {
  let query = platformDb
    .from('portfolio_budgets')
    .select(`
      *,
      portfolio:portfolio_id (id, portfolio_code, portfolio_name),
      budget_owner:budget_owner_user_id (id, email, full_name),
      approved_by:approved_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id)  query = query.eq('portfolio_id', filters.portfolio_id)
  if (filters.budget_type)   query = query.eq('budget_type', filters.budget_type)
  if (filters.status)        query = query.eq('budget_status', filters.status)
  if (filters.currency)      query = query.eq('budget_currency', filters.currency)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * All reports across every portfolio (for Portfolio Reports sub-page)
 */
export async function getAllPortfolioReports(filters = {}) {
  let query = platformDb
    .from('portfolio_reports')
    .select(`
      *,
      portfolio:portfolio_id (id, portfolio_code, portfolio_name),
      generated_by:generated_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id)    query = query.eq('portfolio_id', filters.portfolio_id)
  if (filters.report_type)     query = query.eq('report_type', filters.report_type)
  if (filters.status)          query = query.eq('generation_status', filters.status)
  if (filters.date_from)       query = query.gte('report_date', filters.date_from)
  if (filters.date_to)         query = query.lte('report_date', filters.date_to)

  const { data, error } = await query.order('report_date', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * All governance records across every portfolio (for Portfolio Governance sub-page)
 */
export async function getAllPortfolioGovernance(filters = {}) {
  let query = platformDb
    .from('portfolio_governance')
    .select(`
      *,
      portfolio:portfolio_id (id, portfolio_code, portfolio_name, portfolio_status)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id)     query = query.eq('portfolio_id', filters.portfolio_id)
  if (filters.governance_model) query = query.eq('governance_model', filters.governance_model)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Soft-delete a portfolio budget record
 */
export async function deletePortfolioBudget(budgetId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_budgets')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', budgetId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Soft-delete a portfolio report record
 */
export async function deletePortfolioReport(reportId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_reports')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a portfolio member (role, dates, status)
 */
export async function updatePortfolioMember(memberId, memberData) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_members')
    .update({ ...memberData, updated_by: user.id })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a portfolio report
 */
export async function updatePortfolioReport(reportId, reportData) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('portfolio_reports')
    .update({ ...reportData, updated_by: user.id })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Lightweight list of all non-deleted projects (for dropdowns in portfolio pages)
 */
export async function getProjectsList() {
  const { data, error } = await platformDb
    .from('projects')
    .select('id, project_code, project_name, status_id, project_statuses:status_id(status_name, status_color)')
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Update portfolio health score (helper function for calculating health)
 */
export async function updatePortfolioHealthScore(portfolioId) {
  // This would typically call a database function or edge function
  // For now, we'll calculate it in the frontend or via a scheduled job
  // This is a placeholder for future implementation
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get latest metrics
  const metrics = await getLatestPortfolioMetrics(portfolioId)
  
  if (!metrics) {
    return null
  }

  // Calculate health score (simple average for now)
  const healthScore = (
    (metrics.overall_health_score || 0) +
    (metrics.budget_utilization_percentage || 0) +
    (metrics.schedule_adherence_percentage || 0)
  ) / 3

  // Update portfolio
  const { data, error } = await platformDb
    .from('portfolios')
    .update({
      overall_health_score: healthScore,
      updated_by: user.id,
    })
    .eq('id', portfolioId)
    .select()
    .single()

  if (error) throw error
  return data
}

