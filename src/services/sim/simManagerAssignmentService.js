/**
 * Simulator (sim schema) — manager assignment for practice portfolios, programmes, projects.
 * Shares system_settings + combined assignment limit with Platform (managerAssignmentService).
 *
 * - sim.practice_projects.project_manager_user_id → public.users(id) (v386)
 * - sim.practice_programmes/programmes.*_manager_user_id → auth.users(id) (v239)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'
import {
  getSystemAssignmentLimit,
  updateSystemAssignmentLimit,
  getEligibleManagers,
  checkAssignmentLimit,
} from '../managerAssignmentService'

const ACTIVE_PROGRAMME_STATUSES = ['planning', 'active', 'on-hold', 'on_hold']
const ACTIVE_PORTFOLIO_STATUSES = ['planning', 'active', 'on-hold', 'on_hold']

const TERMINAL_PRACTICE_STATUS_CODES = ['SIM-completed', 'SIM-cancelled', 'SIM-closed']

async function resolveAuthUserId(publicUserId) {
  if (!publicUserId) return null
  const { data, error } = await platformDb.from('users').select('auth_user_id').eq('id', publicUserId).maybeSingle()
  if (error) throw error
  return data?.auth_user_id || null
}

async function getCurrentSimUserId() {
  const {
    data: { user: authUser },
  } = await simDb.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')
  const { data: row, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).maybeSingle()
  if (error) throw error
  if (!row?.id) throw new Error('Simulator user record not found')
  return row.id
}

async function getActivePracticeProjectStatusIds() {
  const { data, error } = await simDb.from('practice_project_statuses').select('id, status_code')
  if (error) throw error
  return (data || [])
    .filter((r) => r.status_code && !TERMINAL_PRACTICE_STATUS_CODES.includes(r.status_code))
    .map((r) => r.id)
    .filter(Boolean)
}

/**
 * Sim-only active assignment count. `publicUserId` is public.users.id (same as Platform pickers).
 */
export async function getSimActiveAssignmentCountOnly(publicUserId) {
  if (!publicUserId) return 0
  const authId = await resolveAuthUserId(publicUserId)
  const statusIds = await getActivePracticeProjectStatusIds()
  const [pRes, progRes, portRes] = await Promise.all([
    statusIds.length
      ? simDb
          .from('practice_projects')
          .select('id', { count: 'exact', head: true })
          .eq('project_manager_user_id', publicUserId)
          .eq('is_deleted', false)
          .in('status_id', statusIds)
      : Promise.resolve({ count: 0 }),
    authId
      ? simDb
          .from('practice_programmes')
          .select('id', { count: 'exact', head: true })
          .eq('programme_manager_user_id', authId)
          .eq('is_deleted', false)
          .in('programme_status', ACTIVE_PROGRAMME_STATUSES)
      : Promise.resolve({ count: 0 }),
    authId
      ? simDb
          .from('practice_portfolios')
          .select('id', { count: 'exact', head: true })
          .eq('portfolio_manager_user_id', authId)
          .eq('is_deleted', false)
          .in('portfolio_status', ACTIVE_PORTFOLIO_STATUSES)
      : Promise.resolve({ count: 0 }),
  ])
  if (pRes.error) throw pRes.error
  if (progRes.error) throw progRes.error
  if (portRes.error) throw portRes.error
  return (pRes.count || 0) + (progRes.count || 0) + (portRes.count || 0)
}

export { getSystemAssignmentLimit, updateSystemAssignmentLimit, getEligibleManagers, checkAssignmentLimit }

async function fetchUsersByIds(publicIds = []) {
  const ids = [...new Set(publicIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const { data, error } = await platformDb.from('users').select('id, full_name, email').in('id', ids)
  if (error) throw error
  return new Map((data || []).map((u) => [u.id, u]))
}

async function enrichManagerDisplay(rows, idField) {
  const ids = rows.map((r) => r[idField]).filter(Boolean)
  const unique = [...new Set(ids)]
  if (!unique.length) return rows.map((r) => ({ ...r, manager: null, manager_public_user_id: null }))
  const { data, error } = await platformDb
    .from('users')
    .select('id, auth_user_id, full_name, email')
    .in('auth_user_id', unique)
  if (error) throw error
  const byAuth = new Map((data || []).map((u) => [u.auth_user_id, { id: u.id, full_name: u.full_name, email: u.email }]))
  return rows.map((r) => {
    const aid = r[idField]
    const m = aid ? byAuth.get(aid) : null
    return { ...r, manager: m, manager_public_user_id: m?.id || null }
  })
}

async function listOwnedPracticeProjects(ownerUserId) {
  const statusIds = await getActivePracticeProjectStatusIds()
  if (!statusIds.length) return []
  const { data, error } = await simDb
    .from('practice_projects')
    .select(
      `
      id,
      project_code,
      project_name,
      project_manager_user_id,
      status_id,
      practice_project_statuses:status_id (status_code, status_name)
    `
    )
    .eq('user_id', ownerUserId)
    .eq('is_deleted', false)
    .in('status_id', statusIds)
    .order('project_name', { ascending: true })
  if (error) throw error
  const rows = data || []
  const pmap = await fetchUsersByIds(rows.map((r) => r.project_manager_user_id).filter(Boolean))
  return rows.map((r) => ({
    ...r,
    manager: r.project_manager_user_id ? pmap.get(r.project_manager_user_id) || null : null,
    manager_public_user_id: r.project_manager_user_id || null,
  }))
}

async function listOwnedProgrammes(ownerUserId) {
  const { data, error } = await simDb
    .from('practice_programmes')
    .select(
      `
      id,
      programme_code,
      programme_name,
      programme_status,
      programme_manager_user_id
    `
    )
    .eq('user_id', ownerUserId)
    .eq('is_deleted', false)
    .in('programme_status', ACTIVE_PROGRAMME_STATUSES)
    .order('programme_name', { ascending: true })
  if (error) throw error
  return enrichManagerDisplay(data || [], 'programme_manager_user_id')
}

async function listOwnedPortfolios(ownerUserId) {
  const { data, error } = await simDb
    .from('practice_portfolios')
    .select(
      `
      id,
      portfolio_code,
      portfolio_name,
      portfolio_status,
      portfolio_manager_user_id
    `
    )
    .eq('user_id', ownerUserId)
    .eq('is_deleted', false)
    .in('portfolio_status', ACTIVE_PORTFOLIO_STATUSES)
    .order('portfolio_name', { ascending: true })
  if (error) throw error
  return enrichManagerDisplay(data || [], 'portfolio_manager_user_id')
}

export async function getSimAssignmentsSummaryForCurrentUser() {
  const ownerId = await getCurrentSimUserId()
  const [projects, programmes, portfolios] = await Promise.all([
    listOwnedPracticeProjects(ownerId),
    listOwnedProgrammes(ownerId),
    listOwnedPortfolios(ownerId),
  ])
  return { projects, programmes, portfolios }
}

export async function assignPracticeProjectManager(projectId, managerPublicUserId) {
  const ownerId = await getCurrentSimUserId()
  const { data: row, error } = await simDb
    .from('practice_projects')
    .select('id, user_id, project_manager_user_id')
    .eq('id', projectId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  if (!row || row.user_id !== ownerId) throw new Error('Not allowed to update this practice project')

  const previousId = row.project_manager_user_id
  if (previousId !== managerPublicUserId) {
    const { allowed, limit } = await checkAssignmentLimit(managerPublicUserId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const { error: ue } = await simDb
    .from('practice_projects')
    .update({ project_manager_user_id: managerPublicUserId, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', ownerId)
  if (ue) throw ue
}

export async function removePracticeProjectManager(projectId) {
  const ownerId = await getCurrentSimUserId()
  const { error } = await simDb
    .from('practice_projects')
    .update({ project_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', ownerId)
  if (error) throw error
}

export async function assignPracticeProgrammeManager(programmeId, managerPublicUserId) {
  const ownerId = await getCurrentSimUserId()
  const authId = await resolveAuthUserId(managerPublicUserId)
  if (!authId) throw new Error('User cannot be assigned (no auth account)')

  const { data: row, error } = await simDb
    .from('practice_programmes')
    .select('id, user_id, programme_manager_user_id')
    .eq('id', programmeId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  if (!row || row.user_id !== ownerId) throw new Error('Not allowed to update this practice programme')

  if (row.programme_manager_user_id !== authId) {
    const { allowed, limit } = await checkAssignmentLimit(managerPublicUserId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const { error: ue } = await simDb
    .from('practice_programmes')
    .update({ programme_manager_user_id: authId, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
    .eq('user_id', ownerId)
  if (ue) throw ue
}

export async function removePracticeProgrammeManager(programmeId) {
  const ownerId = await getCurrentSimUserId()
  const { error } = await simDb
    .from('practice_programmes')
    .update({ programme_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
    .eq('user_id', ownerId)
  if (error) throw error
}

export async function assignPracticePortfolioManager(portfolioId, managerPublicUserId) {
  const ownerId = await getCurrentSimUserId()
  const authId = await resolveAuthUserId(managerPublicUserId)
  if (!authId) throw new Error('User cannot be assigned (no auth account)')

  const { data: row, error } = await simDb
    .from('practice_portfolios')
    .select('id, user_id, portfolio_manager_user_id')
    .eq('id', portfolioId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  if (!row || row.user_id !== ownerId) throw new Error('Not allowed to update this practice portfolio')

  if (row.portfolio_manager_user_id !== authId) {
    const { allowed, limit } = await checkAssignmentLimit(managerPublicUserId)
    if (!allowed) {
      throw new Error(`Manager has reached the maximum of ${limit} concurrent active assignments`)
    }
  }

  const { error: ue } = await simDb
    .from('practice_portfolios')
    .update({ portfolio_manager_user_id: authId, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)
    .eq('user_id', ownerId)
  if (ue) throw ue
}

export async function removePracticePortfolioManager(portfolioId) {
  const ownerId = await getCurrentSimUserId()
  const { error } = await simDb
    .from('practice_portfolios')
    .update({ portfolio_manager_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', portfolioId)
    .eq('user_id', ownerId)
  if (error) throw error
}
