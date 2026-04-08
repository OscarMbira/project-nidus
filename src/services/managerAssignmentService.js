/**
 * PMO Manager Assignment — projects, programmes, portfolios + concurrent limit (system_settings).
 * Platform (public schema); active count includes Simulator (sim) assignments when sim module loads.
 */

import { platformDb } from './supabase/supabaseClient'

const SETTING_KEY = 'pm_max_concurrent_assignments'

/** Entity listing: non-terminal lifecycle values (aligned with plan). */
const ACTIVE_PROGRAMME_STATUSES = ['planning', 'active', 'on-hold', 'on_hold']
const ACTIVE_PORTFOLIO_STATUSES = ['planning', 'active', 'on-hold', 'on_hold']

const MANAGER_ROLE_NAMES = ['pmo_admin', 'project_manager']

let _pmTemplateRoleId = null

async function getProjectManagerTemplateRoleId() {
  if (_pmTemplateRoleId) return _pmTemplateRoleId
  const { data, error } = await platformDb
    .from('project_roles')
    .select('id')
    .eq('role_name', 'project_manager')
    .eq('is_template', true)
    .is('project_id', null)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Project Manager role template not found in project_roles')
  _pmTemplateRoleId = data.id
  return _pmTemplateRoleId
}

async function getNonFinalProjectStatusIds() {
  const { data, error } = await platformDb
    .from('project_statuses')
    .select('id')
    .eq('is_final_status', false)
    .eq('is_deleted', false)
  if (error) throw error
  return (data || []).map((r) => r.id).filter(Boolean)
}

/**
 * @returns {Promise<number>}
 */
export async function getSystemAssignmentLimit() {
  const { data, error } = await platformDb
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', SETTING_KEY)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  const raw = data?.setting_value ?? '5'
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : 5
}

/**
 * @param {number|string} value
 */
export async function updateSystemAssignmentLimit(value) {
  const n = parseInt(String(value), 10)
  if (!Number.isFinite(n) || n < 1 || n > 999) {
    throw new Error('Limit must be between 1 and 999')
  }
  const { error } = await platformDb
    .from('system_settings')
    .update({ setting_value: String(n), updated_at: new Date().toISOString() })
    .eq('setting_key', SETTING_KEY)
  if (error) throw error
  return n
}

/**
 * Count active manager assignments for a user (non-terminal projects + non-completed programmes/portfolios).
 * @param {string} userId — public.users.id
 * @returns {Promise<number>}
 */
export async function getUserActiveAssignmentCount(userId) {
  if (!userId) return 0
  const statusIds = await getNonFinalProjectStatusIds()
  const [pRes, progRes, portRes] = await Promise.all([
    statusIds.length
      ? platformDb
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('project_manager_user_id', userId)
          .eq('is_deleted', false)
          .in('status_id', statusIds)
      : Promise.resolve({ count: 0 }),
    platformDb
      .from('programmes')
      .select('id', { count: 'exact', head: true })
      .eq('programme_manager_user_id', userId)
      .eq('is_deleted', false)
      .in('programme_status', ACTIVE_PROGRAMME_STATUSES),
    platformDb
      .from('portfolios')
      .select('id', { count: 'exact', head: true })
      .eq('portfolio_manager_user_id', userId)
      .eq('is_deleted', false)
      .in('portfolio_status', ACTIVE_PORTFOLIO_STATUSES),
  ])

  const pe = pRes.error
  const pge = progRes.error
  const poe = portRes.error
  if (pe) throw pe
  if (pge) throw pge
  if (poe) throw poe

  const base = (pRes.count || 0) + (progRes.count || 0) + (portRes.count || 0)
  let simExtra = 0
  try {
    const mod = await import('./sim/simManagerAssignmentService.js')
    if (typeof mod.getSimActiveAssignmentCountOnly === 'function') {
      simExtra = await mod.getSimActiveAssignmentCountOnly(userId)
    }
  } catch (e) {
    console.warn('Sim manager assignment count skipped:', e?.message || e)
  }
  return base + simExtra
}

/**
 * @param {string} userId
 * @returns {Promise<{ allowed: boolean, current: number, limit: number }>}
 */
export async function checkAssignmentLimit(userId) {
  const [current, limit] = await Promise.all([getUserActiveAssignmentCount(userId), getSystemAssignmentLimit()])
  return {
    allowed: current < limit,
    current,
    limit,
  }
}

/**
 * Users eligible to be assigned as managers (PMO Admin or Project Manager system roles).
 * @returns {Promise<Array<{ id: string, email: string, full_name: string | null }>>}
 */
export async function getEligibleManagers() {
  const { data: rolesRows, error: rErr } = await platformDb
    .from('roles')
    .select('id')
    .in('role_name', MANAGER_ROLE_NAMES)
    .eq('is_active', true)
    .eq('is_deleted', false)
  if (rErr) throw rErr
  const roleIds = (rolesRows || []).map((r) => r.id).filter(Boolean)
  if (roleIds.length === 0) return []

  const { data: ur, error: urErr } = await platformDb
    .from('user_roles')
    .select('user_id')
    .in('role_id', roleIds)
    .eq('is_active', true)
    .eq('is_deleted', false)
  if (urErr) throw urErr
  const userIds = [...new Set((ur || []).map((u) => u.user_id).filter(Boolean))]
  if (userIds.length === 0) return []

  const { data: users, error: uErr } = await platformDb
    .from('users')
    .select('id, email, full_name')
    .in('id', userIds)
    .eq('is_deleted', false)
    .order('full_name', { ascending: true })
  if (uErr) throw uErr
  return users || []
}

/**
 * @param {string[]} userIds
 * @returns {Promise<Record<string, number>>}
 */
export async function getActiveAssignmentCountsForUsers(userIds = []) {
  const unique = [...new Set(userIds.filter(Boolean))]
  const out = {}
  await Promise.all(
    unique.map(async (uid) => {
      out[uid] = await getUserActiveAssignmentCount(uid)
    })
  )
  return out
}

export async function listActiveProjectsForAssignment() {
  const statusIds = await getNonFinalProjectStatusIds()
  if (!statusIds.length) return []
  const { data, error } = await platformDb
    .from('projects')
    .select(
      `
      id,
      project_code,
      project_name,
      project_manager_user_id,
      status_id,
      project_statuses:status_id (status_code, status_name),
      manager:project_manager_user_id (id, full_name, email)
    `
    )
    .eq('is_deleted', false)
    .in('status_id', statusIds)
    .order('project_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listActiveProgrammesForAssignment() {
  const { data, error } = await platformDb
    .from('programmes')
    .select(
      `
      id,
      programme_code,
      programme_name,
      programme_status,
      programme_manager_user_id,
      manager:programme_manager_user_id (id, full_name, email)
    `
    )
    .eq('is_deleted', false)
    .in('programme_status', ACTIVE_PROGRAMME_STATUSES)
    .order('programme_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listActivePortfoliosForAssignment() {
  const { data, error } = await platformDb
    .from('portfolios')
    .select(
      `
      id,
      portfolio_code,
      portfolio_name,
      portfolio_status,
      portfolio_manager_user_id,
      manager:portfolio_manager_user_id (id, full_name, email)
    `
    )
    .eq('is_deleted', false)
    .in('portfolio_status', ACTIVE_PORTFOLIO_STATUSES)
    .order('portfolio_name', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * @returns {Promise<{ projects: object[], programmes: object[], portfolios: object[] }>}
 */
export async function getAllAssignmentsSummary() {
  const [projects, programmes, portfolios] = await Promise.all([
    listActiveProjectsForAssignment(),
    listActiveProgrammesForAssignment(),
    listActivePortfoliosForAssignment(),
  ])
  return { projects, programmes, portfolios }
}

/**
 * @param {string} projectId
 * @param {string} userId — public.users.id
 */
export async function assignProjectManager(projectId, userId) {
  const { data: project, error: pe } = await platformDb
    .from('projects')
    .select('id, project_manager_user_id')
    .eq('id', projectId)
    .eq('is_deleted', false)
    .single()
  if (pe) throw pe
  if (!project) throw new Error('Project not found')

  const previousId = project.project_manager_user_id
  if (previousId !== userId) {
    const { allowed, limit } = await checkAssignmentLimit(userId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const pmRoleId = await getProjectManagerTemplateRoleId()

  const { error: ue } = await platformDb
    .from('projects')
    .update({ project_manager_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', projectId)
  if (ue) throw ue

  if (previousId && previousId !== userId) {
    const { data: prevRow } = await platformDb
      .from('project_memberships')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', previousId)
      .eq('project_role_id', pmRoleId)
      .eq('is_active', true)
      .maybeSingle()
    if (prevRow?.id) {
      await platformDb.from('project_memberships').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', prevRow.id)
    }
  }

  const { data: existingNew } = await platformDb
    .from('project_memberships')
    .select('id, project_role_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingNew?.id) {
    const { error: me } = await platformDb
      .from('project_memberships')
      .update({
        project_role_id: pmRoleId,
        invitation_status: 'accepted',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingNew.id)
    if (me) throw me
  } else {
    const { error: ie } = await platformDb.from('project_memberships').insert({
      project_id: projectId,
      user_id: userId,
      project_role_id: pmRoleId,
      invitation_status: 'accepted',
      is_active: true,
    })
    if (ie) throw ie
  }
}

export async function removeProjectManager(projectId) {
  const { data: project, error: pe } = await platformDb
    .from('projects')
    .select('id, project_manager_user_id')
    .eq('id', projectId)
    .single()
  if (pe) throw pe
  const uid = project?.project_manager_user_id
  const pmRoleId = await getProjectManagerTemplateRoleId()

  await platformDb
    .from('projects')
    .update({ project_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (uid) {
    const { data: row } = await platformDb
      .from('project_memberships')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', uid)
      .eq('project_role_id', pmRoleId)
      .eq('is_active', true)
      .maybeSingle()
    if (row?.id) {
      await platformDb.from('project_memberships').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', row.id)
    }
  }
}

export async function assignProgrammeManager(programmeId, userId) {
  const { data: row, error } = await platformDb
    .from('programmes')
    .select('id, programme_manager_user_id')
    .eq('id', programmeId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  if (!row) throw new Error('Programme not found')

  if (row.programme_manager_user_id !== userId) {
    const { allowed, limit } = await checkAssignmentLimit(userId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const { error: ue } = await platformDb
    .from('programmes')
    .update({ programme_manager_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
  if (ue) throw ue
}

export async function removeProgrammeManager(programmeId) {
  const { error } = await platformDb
    .from('programmes')
    .update({ programme_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
  if (error) throw error
}

export async function assignPortfolioManager(portfolioId, userId) {
  const { data: row, error } = await platformDb
    .from('portfolios')
    .select('id, portfolio_manager_user_id')
    .eq('id', portfolioId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  if (!row) throw new Error('Portfolio not found')

  if (row.portfolio_manager_user_id !== userId) {
    const { allowed, limit } = await checkAssignmentLimit(userId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const { error: ue } = await platformDb
    .from('portfolios')
    .update({ portfolio_manager_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)
  if (ue) throw ue
}

export async function removePortfolioManager(portfolioId) {
  const { error } = await platformDb
    .from('portfolios')
    .update({ portfolio_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)
  if (error) throw error
}
