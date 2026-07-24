import { simDb } from './supabase/supabaseClient'

/**
 * Simulator Portfolio Service
 * All queries use simDb (sim schema) and are scoped to the current user's practice data.
 */

// ---------------------------------------------------------------------------
// Portfolios (practice_portfolios)
// ---------------------------------------------------------------------------

export async function getSimPortfolios(filters = {}) {
  let query = simDb
    .from('practice_portfolios')
    .select('*')
    .eq('is_deleted', false)

  if (filters.status) query = query.eq('portfolio_status', filters.status)
  if (filters.search) {
    query = query.or(`portfolio_name.ilike.%${filters.search}%,portfolio_code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getSimPortfolioList() {
  const { data, error } = await simDb
    .from('practice_portfolios')
    .select('id, portfolio_code, portfolio_name')
    .eq('is_deleted', false)
    .order('portfolio_name', { ascending: true })
  if (error) throw error
  return data || []
}

// ---------------------------------------------------------------------------
// Portfolio Projects (practice_portfolio_projects)
// ---------------------------------------------------------------------------

export async function getAllSimPortfolioProjects(filters = {}) {
  let query = simDb
    .from('practice_portfolio_projects')
    .select(`
      *,
      portfolio:practice_portfolio_id (id, portfolio_code, portfolio_name),
      project:practice_project_id (id, project_name, project_code, project_status, start_date, end_date, methodology)
    `)

  if (filters.portfolio_id) query = query.eq('practice_portfolio_id', filters.portfolio_id)
  if (filters.status)       query = query.eq('assignment_status', filters.status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addSimProjectToPortfolio(portfolioId, projectId) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await simDb
    .from('practice_portfolio_projects')
    .insert({
      practice_portfolio_id: portfolioId,
      practice_project_id:   projectId,
      assignment_date:       new Date().toISOString().split('T')[0],
      assignment_status:     'active',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeSimProjectFromPortfolio(portfolioId, projectId) {
  const { data, error } = await simDb
    .from('practice_portfolio_projects')
    .update({ assignment_status: 'removed' })
    .eq('practice_portfolio_id', portfolioId)
    .eq('practice_project_id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSimProjectsList() {
  const { data, error } = await simDb
    .from('practice_projects')
    .select('id, project_code, project_name, project_status')
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

// ---------------------------------------------------------------------------
// Portfolio Members (practice_portfolio_members)
// ---------------------------------------------------------------------------

export async function getAllSimPortfolioMembers(filters = {}) {
  let query = simDb
    .from('practice_portfolio_members')
    .select(`
      *,
      portfolio:practice_portfolio_id (id, portfolio_code, portfolio_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) query = query.eq('practice_portfolio_id', filters.portfolio_id)
  if (filters.status)       query = query.eq('assignment_status', filters.status)
  if (filters.role)         query = query.eq('member_role', filters.role)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addSimPortfolioMember(portfolioId, memberData) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await simDb
    .from('practice_portfolio_members')
    .insert({ ...memberData, practice_portfolio_id: portfolioId, assignment_status: 'active', user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSimPortfolioMember(memberId, memberData) {
  const { data, error } = await simDb
    .from('practice_portfolio_members')
    .update({ ...memberData, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeSimPortfolioMember(memberId) {
  const { data, error } = await simDb
    .from('practice_portfolio_members')
    .update({ assignment_status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Portfolio Budgets (practice_portfolio_budgets)
// ---------------------------------------------------------------------------

export async function getAllSimPortfolioBudgets(filters = {}) {
  let query = simDb
    .from('practice_portfolio_budgets')
    .select(`
      *,
      portfolio:practice_portfolio_id (id, portfolio_code, portfolio_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) query = query.eq('practice_portfolio_id', filters.portfolio_id)
  if (filters.budget_type)  query = query.eq('budget_type', filters.budget_type)
  if (filters.status)       query = query.eq('budget_status', filters.status)
  if (filters.currency)     query = query.eq('budget_currency', filters.currency)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveSimPortfolioBudget(budgetData, budgetId = null) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  if (budgetId) {
    const { data, error } = await simDb
      .from('practice_portfolio_budgets')
      .update({ ...budgetData, updated_at: new Date().toISOString() })
      .eq('id', budgetId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await simDb
      .from('practice_portfolio_budgets')
      .insert({ ...budgetData, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteSimPortfolioBudget(budgetId) {
  const { data, error } = await simDb
    .from('practice_portfolio_budgets')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', budgetId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Portfolio Reports (practice_portfolio_reports)
// ---------------------------------------------------------------------------

export async function getAllSimPortfolioReports(filters = {}) {
  let query = simDb
    .from('practice_portfolio_reports')
    .select(`
      *,
      portfolio:practice_portfolio_id (id, portfolio_code, portfolio_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) query = query.eq('practice_portfolio_id', filters.portfolio_id)
  if (filters.report_type)  query = query.eq('report_type', filters.report_type)
  if (filters.status)       query = query.eq('generation_status', filters.status)
  if (filters.date_from)    query = query.gte('report_date', filters.date_from)
  if (filters.date_to)      query = query.lte('report_date', filters.date_to)

  const { data, error } = await query.order('report_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveSimPortfolioReport(reportData, reportId = null) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  if (reportId) {
    const { data, error } = await simDb
      .from('practice_portfolio_reports')
      .update({ ...reportData, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await simDb
      .from('practice_portfolio_reports')
      .insert({
        ...reportData,
        report_date: reportData.report_date || new Date().toISOString().split('T')[0],
        generation_status: reportData.generation_status || 'pending',
        user_id: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteSimPortfolioReport(reportId) {
  const { data, error } = await simDb
    .from('practice_portfolio_reports')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Portfolio Governance (practice_portfolio_governance)
// ---------------------------------------------------------------------------

export async function getAllSimPortfolioGovernance(filters = {}) {
  let query = simDb
    .from('practice_portfolio_governance')
    .select(`
      *,
      portfolio:practice_portfolio_id (id, portfolio_code, portfolio_name, portfolio_status)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id)     query = query.eq('practice_portfolio_id', filters.portfolio_id)
  if (filters.governance_model) query = query.eq('governance_model', filters.governance_model)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function saveSimPortfolioGovernance(portfolioId, governanceData) {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if record exists
  const { data: existing } = await simDb
    .from('practice_portfolio_governance')
    .select('id')
    .eq('practice_portfolio_id', portfolioId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (existing) {
    const { data, error } = await simDb
      .from('practice_portfolio_governance')
      .update({ ...governanceData, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await simDb
      .from('practice_portfolio_governance')
      .insert({ ...governanceData, practice_portfolio_id: portfolioId, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}
