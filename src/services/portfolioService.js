import { supabase } from './supabaseClient'

/**
 * Portfolio Service - API functions for Portfolio Management module
 */

/**
 * Get all portfolios
 */
export async function getPortfolios(filters = {}) {
  let query = supabase
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
  const { data, error } = await supabase
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

/**
 * Create or update a portfolio
 */
export async function savePortfolio(portfolioData, portfolioId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...portfolioData,
    updated_by: user.id,
  }

  if (portfolioId) {
    // Update
    const { data, error } = await supabase
      .from('portfolios')
      .update(updateData)
      .eq('id', portfolioId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create
    updateData.created_by = user.id
    const { data, error } = await supabase
      .from('portfolios')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a portfolio (soft delete)
 */
export async function deletePortfolio(portfolioId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
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
  let query = supabase
    .from('portfolio_projects')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code,
        project_status,
        start_date,
        end_date,
        project_manager_user_id,
        methodology
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
  const { data: { user } } = await supabase.auth.getUser()
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

  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...objectiveData,
    updated_by: user.id,
  }

  if (objectiveId) {
    // Update
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const member = {
    portfolio_id: portfolioId,
    user_id: userId,
    assignment_status: 'active',
    ...memberData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if governance record exists
  const { data: existing } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
  let query = supabase
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
  const { data, error } = await supabase
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
  let query = supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...riskData,
    updated_by: user.id,
  }

  if (riskId) {
    // Update
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
  let query = supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...budgetData,
    updated_by: user.id,
  }

  if (budgetId) {
    // Update
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
  let query = supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const report = {
    portfolio_id: portfolioId,
    report_date: new Date().toISOString().split('T')[0],
    generation_status: 'pending',
    ...reportData,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('portfolio_reports')
    .insert(report)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update portfolio health score (helper function for calculating health)
 */
export async function updatePortfolioHealthScore(portfolioId) {
  // This would typically call a database function or edge function
  // For now, we'll calculate it in the frontend or via a scheduled job
  // This is a placeholder for future implementation
  const { data: { user } } = await supabase.auth.getUser()
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
  const { data, error } = await supabase
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

