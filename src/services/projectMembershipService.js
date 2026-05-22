/**
 * Project Membership Service
 * Handles project invitations and user memberships for Platform
 *
 * IMPORTANT: Platform specific - uses appDb (public schema)
 * Manages invitations and role assignments to projects
 */

import { appDb } from './supabase/supabaseClient'
import { isPmoAdmin } from './organisationRoleService'
import { hasPermission } from '../utils/permissionChecker'
import {
  clampInvitationExpiryDays,
  INVITE_EXPIRY_FALLBACK_DAYS,
} from './invitationExpiryService'
import {
  buildInvitationRpcPayload,
  isInvitationRpcMissingOrUnreachable,
  parseInvitationRpcPayload,
  isValidInvitationRow,
} from './inviteRpcUtils'
import {
  runWithHardTimeout,
  raceWithTimeout,
  postInviteRpc,
  postInviteTableRow,
  formatInvitationInviteError,
  INVITE_PREP_MS,
  INVITE_HARD_LIMIT_MS,
} from './inviteTransport'

/** Maps project_roles.role_name (templates) → roles.role_name used by project_invitations.role_id FK */
export const PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE = {
  team_manager: 'pm_team_manager',
  team_member: 'pm_team_member',
  project_assurance: 'pm_project_assurance',
  quality_assurance: 'pm_quality_assurance',
  change_authority: 'pm_change_authority',
}

/**
 * Role names to try when resolving invitation role_id (legacy pm_* first, then template name).
 * @param {string} projectRoleName
 * @returns {string[]}
 */
export function invitationRoleLookupNames(projectRoleName) {
  const legacy = PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE[projectRoleName]
  if (!legacy) return [projectRoleName]
  if (legacy === projectRoleName) return [legacy]
  return [legacy, projectRoleName]
}

const invitationRoleIdCache = new Map()

const INVITE_SEAT_CHECK_MS = 1_500

async function lookupFirstActiveRoleIdByNames(roleNames) {
  const names = [...new Set(roleNames.filter(Boolean))]
  if (!names.length) return null
  const { data, error } = await appDb
    .from('roles')
    .select('id, role_name')
    .in('role_name', names)
    .eq('is_active', true)
    .eq('is_deleted', false)
  if (error) throw error
  for (const name of names) {
    const row = (data || []).find((r) => r.role_name === name)
    if (row?.id) return row.id
  }
  return null
}

/**
 * Whether to fall back to direct project_invitations INSERT after RPC failure.
 * @param {object|null|undefined} rpcError
 * @param {boolean} rpcNotDeployed
 */
export function shouldTryLegacyInvitationInsert(rpcError, rpcNotDeployed) {
  if (rpcNotDeployed) return true
  if (!rpcError) return false
  // RPC timed out (often v586 without v597 statement_timeout) — try sender RLS insert.
  if (rpcError.code === 'CLIENT_TIMEOUT' || rpcError.status === 408 || rpcError.code === '408') {
    return true
  }
  const msg = String(rpcError.message || '')
  if (rpcError.code === '42501' || rpcError.status === 403 || rpcError.statusCode === 403) {
    if (/not authenticated/i.test(msg)) return false
    if (/inviter user profile not found/i.test(msg)) return false
    if (/not a pmo admin|pmo suite admin|project invite access|forbidden/i.test(msg)) return true
    return true
  }
  if (/not a pmo admin|caller is not a pmo admin/i.test(msg)) return true
  return false
}

async function getAuthUserForInvite() {
  const { data: { session }, error } = await appDb.auth.getSession()
  if (error) throw error
  if (session?.user?.id) return session.user
  throw new Error('Not authenticated. Please sign in again.')
}

/**
 * Resolve a selected project role (project_roles.id or legacy roles.id) to roles.id for invitations.
 * @param {string} selectedRoleId
 * @returns {Promise<{success: boolean, invitationRoleId?: string, error?: string|null}>}
 */
export async function resolveInvitationRoleIdForInsert(selectedRoleId) {
  if (!selectedRoleId) {
    return { success: false, error: 'Invalid role selection' }
  }
  const cached = invitationRoleIdCache.get(selectedRoleId)
  if (cached) {
    return { success: true, invitationRoleId: cached, error: null }
  }

  try {
    const { data: pr, error: prErr } = await appDb
      .from('project_roles')
      .select('id, role_name')
      .eq('id', selectedRoleId)
      .maybeSingle()

    if (prErr) throw prErr

    if (pr?.role_name) {
      const candidates = invitationRoleLookupNames(pr.role_name)
      const roleId = await lookupFirstActiveRoleIdByNames(candidates)
      if (roleId) {
        invitationRoleIdCache.set(selectedRoleId, roleId)
        return { success: true, invitationRoleId: roleId, error: null }
      }

      const primaryLegacy = PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE[pr.role_name]
      if (primaryLegacy) {
        return {
          success: false,
          error: `System role "${primaryLegacy}" is missing. Run SQL/v580_ensure_pm_invitation_roles.sql in Supabase (or v86_default_project_roles_seed.sql).`,
        }
      }

      return {
        success: false,
        error: `No invitation role is configured for "${pr.role_name}". Ask an admin to run migration v511_project_invitation_template_roles.sql.`,
      }
    }

    const { data: legacy, error: legErr } = await appDb
      .from('roles')
      .select('id')
      .eq('id', selectedRoleId)
      .maybeSingle()

    if (legErr) throw legErr
    if (legacy?.id) {
      invitationRoleIdCache.set(selectedRoleId, legacy.id)
      return { success: true, invitationRoleId: legacy.id, error: null }
    }

    return { success: false, error: 'Invalid role selection' }
  } catch (error) {
    console.error('resolveInvitationRoleIdForInsert:', error)
    return { success: false, error: error.message || 'Failed to resolve invitation role' }
  }
}

/** project_roles / roles names that count as “assigned PM” for member-management project picker */
const PM_MEMBER_MANAGEMENT_ROLE_NAMES = new Set([
  'project_manager',
  'programme_manager',
  'pm_project_manager',
])

/** Permission codes on project_roles.permissions that allow inviting members */
export const PROJECT_INVITE_PERMISSION_CODES = ['user.invite', 'project.manage_users']

/** Roles that may invite when assigned via project_memberships (matches SQL v579) */
export const PROJECT_INVITE_CAPABLE_ROLE_NAMES = new Set([
  'project_manager',
  'programme_manager',
  'project_board_member',
  'project_sponsor',
  'pm_project_manager',
  'pm_programme_manager',
  'pm_project_board',
])

/**
 * Pure helper: whether a project role grants invite (used by canInviteToProject).
 * @param {string|null|undefined} roleName
 * @param {string[]|null|undefined} permissions - from project_roles.permissions JSONB
 */
export function projectRoleGrantsInvite(roleName, permissions) {
  if (Array.isArray(permissions)) {
    if (PROJECT_INVITE_PERMISSION_CODES.some((code) => permissions.includes(code))) {
      return true
    }
  }
  return !!(roleName && PROJECT_INVITE_CAPABLE_ROLE_NAMES.has(roleName))
}

/**
 * Whether the user may invite members to a project (UI + aligns with v579 RPC).
 * @param {string} authUserId - auth.users.id
 * @param {string} internalUserId - public.users.id
 * @param {string} projectId - project UUID
 */
export async function canInviteToProject(authUserId, internalUserId, projectId) {
  if (!authUserId || !projectId) return false

  try {
    if (await isPmoAdmin(authUserId)) return true

    if (await hasPermission(authUserId, projectId, 'user.invite')) return true
    if (await hasPermission(authUserId, projectId, 'project.manage_users')) return true

    if (internalUserId) {
      const { data: proj } = await appDb
        .from('projects')
        .select('project_manager_user_id')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()

      if (proj?.project_manager_user_id === internalUserId) return true

      const { data: memberships, error: memErr } = await appDb
        .from('project_memberships')
        .select('invitation_status, role:project_roles(role_name, permissions)')
        .eq('user_id', internalUserId)
        .eq('project_id', projectId)
        .eq('is_active', true)

      if (!memErr && memberships?.length) {
        for (const m of memberships) {
          const status = m.invitation_status ?? 'accepted'
          if (status !== 'accepted' && status !== 'pending') continue
          const role = m.role
          if (projectRoleGrantsInvite(role?.role_name, role?.permissions)) return true
        }
      }

      const { data: userRoles, error: urErr } = await appDb
        .from('user_roles')
        .select('roles:roles!user_roles_role_id_fkey(role_name)')
        .eq('user_id', internalUserId)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (!urErr && userRoles?.length) {
        for (const ur of userRoles) {
          if (PROJECT_INVITE_CAPABLE_ROLE_NAMES.has(ur.roles?.role_name)) return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('canInviteToProject:', error)
    return false
  }
}

function projectPickerRow(p) {
  if (!p?.id) return null
  return {
    id: p.id,
    project_name: p.project_name,
    project_code: p.project_code,
  }
}

function addProjectPickerRow(map, p) {
  const row = projectPickerRow(p)
  if (row) map.set(row.id, row)
}

const MEMBER_MGMT_PROJECTS_CACHE_PREFIX = 'nidus-pm-member-mgmt-projects'
const MEMBER_MGMT_PROJECTS_CACHE_TTL_MS = 2 * 60 * 1000

/** @returns {Array<{id: string, project_name: string, project_code?: string}>|null} */
export function readMemberManagementProjectsCache(internalUserId) {
  if (!internalUserId || typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${MEMBER_MGMT_PROJECTS_CACHE_PREFIX}:${internalUserId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.ts || !Array.isArray(parsed.data)) return null
    if (Date.now() - parsed.ts > MEMBER_MGMT_PROJECTS_CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function writeMemberManagementProjectsCache(internalUserId, data) {
  if (!internalUserId || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      `${MEMBER_MGMT_PROJECTS_CACHE_PREFIX}:${internalUserId}`,
      JSON.stringify({ ts: Date.now(), data }),
    )
  } catch {
    /* quota / private mode */
  }
}

/**
 * Lightweight project picker row by id (for instant label while list loads).
 * @param {string} projectId
 */
export async function fetchProjectPickerRowById(projectId) {
  if (!projectId) return { success: false, data: null, error: 'missing' }
  try {
    const { data, error } = await appDb
      .from('projects')
      .select('id, project_name, project_code')
      .eq('id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (error) throw error
    const row = projectPickerRow(data)
    return row ? { success: true, data: row, error: null } : { success: false, data: null, error: 'not_found' }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to load project' }
  }
}

/**
 * Projects where the user is assigned as PM (not merely a team member).
 * Parallel queries + minimal columns (avoids heavy getMyProjects embed).
 * @param {string} internalUserId - public.users.id
 */
async function listPmProjectsForMemberManagement(internalUserId) {
  const byId = new Map()

  const [
    userProjectsRes,
    directManagedRes,
    membershipsRes,
    userRolesRes,
  ] = await Promise.all([
    appDb
      .from('user_projects')
      .select('project_id')
      .eq('user_id', internalUserId)
      .eq('is_deleted', false),
    appDb
      .from('projects')
      .select('id, project_name, project_code')
      .eq('project_manager_user_id', internalUserId)
      .eq('is_deleted', false),
    appDb
      .from('project_memberships')
      .select(`
        project_id,
        project:projects(id, project_name, project_code, is_deleted),
        role:project_roles(role_name)
      `)
      .eq('user_id', internalUserId)
      .eq('is_active', true)
      .or('invitation_status.eq.accepted,invitation_status.is.null'),
    appDb
      .from('user_roles')
      .select(`
        project_id,
        roles:roles!user_roles_role_id_fkey(role_name)
      `)
      .eq('user_id', internalUserId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .not('project_id', 'is', null),
  ])

  if (directManagedRes.error) throw directManagedRes.error
  for (const p of directManagedRes.data || []) addProjectPickerRow(byId, p)

  if (membershipsRes.error) {
    console.warn('listPmProjectsForMemberManagement: project_memberships', membershipsRes.error.message)
  } else {
    for (const m of membershipsRes.data || []) {
      const roleName = m.role?.role_name
      if (roleName && PM_MEMBER_MANAGEMENT_ROLE_NAMES.has(roleName)) {
        const proj = m.project
        if (proj && proj.is_deleted !== true) addProjectPickerRow(byId, proj)
      }
    }
  }

  const missingFromUserRoles = []
  if (userRolesRes.error) {
    console.warn('listPmProjectsForMemberManagement: user_roles', userRolesRes.error.message)
  } else {
    for (const ur of userRolesRes.data || []) {
      const roleName = ur.roles?.role_name
      if (!roleName || !PM_MEMBER_MANAGEMENT_ROLE_NAMES.has(roleName)) continue
      const pid = ur.project_id
      if (pid && !byId.has(pid)) missingFromUserRoles.push(pid)
    }
  }

  const userProjectIds = [
    ...new Set((userProjectsRes.data || []).map((r) => r.project_id).filter(Boolean)),
  ].filter((id) => !byId.has(id))

  const batchIds = [...new Set([...missingFromUserRoles, ...userProjectIds])]
  if (batchIds.length > 0) {
    const { data: projRows, error: pErr } = await appDb
      .from('projects')
      .select('id, project_name, project_code')
      .in('id', batchIds)
      .eq('is_deleted', false)

    if (pErr) {
      console.warn('listPmProjectsForMemberManagement: projects batch', pErr.message)
    } else {
      for (const p of projRows || []) addProjectPickerRow(byId, p)
    }
  }

  const data = [...byId.values()].sort((a, b) =>
    String(a.project_name || '').localeCompare(String(b.project_name || ''), undefined, {
      sensitivity: 'base',
    }),
  )

  return { success: true, data, error: null }
}

/**
 * Projects the current user may manage members for: all active (PMO admin) or my projects (PM).
 * @param {string} internalUserId - public.users.id
 * @param {string} authUserId - auth.users.id
 * @param {{ isPmoAdmin?: boolean }} [options] - pass when already resolved to skip duplicate RPC
 */
export async function listProjectsForMemberManagement(internalUserId, authUserId, options = {}) {
  try {
    const admin =
      typeof options.isPmoAdmin === 'boolean' ? options.isPmoAdmin : await isPmoAdmin(authUserId)
    if (admin) {
      // Keep this lightweight and RLS-friendly; avoid complex embeds from assignment pages.
      const { data: rows, error } = await appDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (error) throw error
      const data = (rows || []).map((p) => ({
        id: p.id,
        project_name: p.project_name,
        project_code: p.project_code,
      }))
      writeMemberManagementProjectsCache(internalUserId, data)
      return {
        success: true,
        data,
        error: null,
      }
    }

    const pmRes = await listPmProjectsForMemberManagement(internalUserId)
    if (pmRes.success && pmRes.data?.length) {
      writeMemberManagementProjectsCache(internalUserId, pmRes.data)
    }
    return pmRes
  } catch (error) {
    console.error('listProjectsForMemberManagement:', error)
    return { success: false, data: [], error: error.message || 'Failed to list projects' }
  }
}

/**
 * Persist invitee name columns when RPC succeeded but DB overload omitted name params.
 */
async function syncInviteeNamesOnInvitationRow(invitationId, invitationData) {
  const first = invitationData?.inviteeFirstName?.trim() || null
  const last = invitationData?.inviteeLastName?.trim() || null
  if (!invitationId || (!first && !last)) return
  try {
    await appDb
      .from('project_invitations')
      .update({
        invited_first_name: first,
        invited_last_name: last,
      })
      .eq('id', invitationId)
  } catch (e) {
    console.warn('[syncInviteeNamesOnInvitationRow]', e?.message)
  }
}

/**
 * Invite user to project
 * @param {string} projectId - Project UUID
 * @param {object} invitationData - Invitation details
 * @param {{ skipSeatCheck?: boolean, invitationRoleId?: string, inviterUserId?: string, isPmoAdmin?: boolean }} [options]
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
async function inviteUserToProjectCore(projectId, invitationData, options = {}) {
  const user = await getAuthUserForInvite()
  if (!user?.id) throw new Error('Not authenticated')

  const emailTrimmed = String(invitationData?.email ?? '').trim()
  if (!projectId || !emailTrimmed) {
    return { success: false, data: null, error: 'Invalid invitation details' }
  }

  let invitationRoleId = options.invitationRoleId || null
  let inviterUserId = options.inviterUserId || null

  const prep = await raceWithTimeout(
    Promise.all([
      invitationRoleId
        ? Promise.resolve({ success: true, invitationRoleId })
        : resolveInvitationRoleIdForInsert(invitationData.roleId),
      inviterUserId
        ? Promise.resolve({ data: { id: inviterUserId }, error: null })
        : appDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle(),
      appDb.from('users').select('id').eq('email', emailTrimmed).maybeSingle(),
    ]),
    INVITE_PREP_MS,
    'Invitation setup',
  )

  if (prep?.timedOut) {
    return { success: false, data: null, error: prep.error || 'Invitation setup timed out' }
  }

  const [resolved, inviterRes, existingUserRes] = prep

  if (!resolved.success) {
    return { success: false, data: null, error: resolved.error || 'Invalid role' }
  }
  invitationRoleId = resolved.invitationRoleId
  if (!invitationRoleId) {
    return { success: false, data: null, error: 'Invalid role' }
  }

  if (inviterRes.error) throw inviterRes.error
  inviterUserId = inviterRes.data?.id
  if (!inviterUserId) {
    return { success: false, data: null, error: 'Inviter user profile not found' }
  }

  if (!options.skipSeatCheck) {
    try {
      const seatRpc = appDb.rpc('check_seat_availability', { p_project_id: projectId })
      const seatFallback = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'seat_check_timeout' } }), INVITE_SEAT_CHECK_MS),
      )
      const { data: seatCheck, error: seatError } = await Promise.race([seatRpc, seatFallback])
      if (!seatError && seatCheck?.length > 0 && !seatCheck[0].has_available_seats) {
        return {
          success: false,
          data: null,
          error: 'No available seats. Please purchase additional seats.',
          code: 'SEAT_LIMIT_EXCEEDED',
          seatInfo: seatCheck[0],
        }
      }
    } catch {
      /* non-blocking */
    }
  }

  const expiryDays =
    invitationData.expiryDays != null && invitationData.expiryDays !== ''
      ? clampInvitationExpiryDays(invitationData.expiryDays)
      : INVITE_EXPIRY_FALLBACK_DAYS

  const invitationExpiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const selectCols =
    'id, invitation_token, invitation_expires_at, invitation_status, project_id, invited_email, role_id, created_at'

  const rpcPayload = buildInvitationRpcPayload(
    projectId,
    invitationRoleId,
    { ...invitationData, email: emailTrimmed },
    invitationExpiresAt,
  )

  const rpcRes = await postInviteRpc(rpcPayload)

  if (rpcRes.ok) {
    const row = parseInvitationRpcPayload(rpcRes.data)
    if (isValidInvitationRow(row)) {
      await syncInviteeNamesOnInvitationRow(row.id, invitationData)
      return { success: true, data: row, error: null }
    }
    return {
      success: false,
      data: null,
      error: 'Invitation saved but the server returned an unexpected response.',
    }
  }

  const rpcError = {
    message: rpcRes.error,
    code: rpcRes.status === 403 ? '42501' : String(rpcRes.status),
    status: rpcRes.status,
  }
  const rpcNotDeployed = isInvitationRpcMissingOrUnreachable(rpcError, rpcRes.status)

  if (!shouldTryLegacyInvitationInsert(rpcError, rpcNotDeployed)) {
    return {
      success: false,
      data: null,
      error: formatInvitationInviteError(rpcRes.error || 'Failed to send invitation', {
        requiresDbSetup: rpcRes.status === 403,
      }),
    }
  }

  const tableRes = await postInviteTableRow(
    {
      project_id: projectId,
      entity_type: 'project',
      invited_email: emailTrimmed,
      invited_user_id: existingUserRes.data?.id || null,
      role_id: invitationRoleId,
      invited_by_user_id: inviterUserId,
      invitation_message: invitationData.message || null,
      invitation_expires_at: invitationExpiresAt,
      invited_first_name: invitationData.inviteeFirstName?.trim() || null,
      invited_last_name: invitationData.inviteeLastName?.trim() || null,
    },
    selectCols,
  )

  if (tableRes.ok && isValidInvitationRow(tableRes.data)) {
    await syncInviteeNamesOnInvitationRow(tableRes.data.id, invitationData)
    return { success: true, data: tableRes.data, error: null }
  }

  const requiresDbSetup = tableRes.status === 403 || rpcRes.status === 403
  return {
    success: false,
    data: null,
    error: formatInvitationInviteError(
      tableRes.error || rpcRes.error || 'Failed to send invitation',
      { requiresDbSetup },
    ),
    requiresDbSetup,
  }
}

export async function inviteUserToProject(projectId, invitationData, options = {}) {
  try {
    return await runWithHardTimeout(
      () => inviteUserToProjectCore(projectId, invitationData, options),
      INVITE_HARD_LIMIT_MS,
    )
  } catch (error) {
    console.error('Error inviting user:', error)
    return {
      success: false,
      data: null,
      error: formatInvitationInviteError(error.message || 'Failed to send invitation'),
    }
  }
}

/**
 * Get project invitations (sent)
 * @param {string} projectId - Project UUID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectInvitations(projectId, status = null) {
  try {
    let query = appDb
      .from('project_invitations')
      .select(`
        *,
        invited_by:users!project_invitations_invited_by_user_id_fkey(full_name, email),
        role:roles(role_display_name, role_name)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('invitation_status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch invitations',
    }
  }
}

/**
 * Invitations + seat row via RPC (bypasses table RLS; see SQL v399).
 * @param {string} projectId
 * @param {string|null} invitationStatus e.g. 'pending', or null for all non-deleted
 * @returns {Promise<{success: boolean, data: {invitations: array, seat_allocation: object|null}|null, error: string|null, useTableFallback?: boolean}>}
 */
export async function getProjectInviteContext(projectId, invitationStatus = null) {
  try {
    const { data, error } = await appDb.rpc('get_project_invite_context', {
      p_project_id: projectId,
      p_invitation_status: invitationStatus,
    })

    if (error) {
      const msg = error.message || ''
      const missingFn =
        error.code === '42883' ||
        error.code === 'PGRST202' ||
        /does not exist|function .* not found/i.test(msg)
      return {
        success: false,
        data: null,
        error: msg || 'RPC failed',
        useTableFallback: !!missingFn,
      }
    }

    const inv = data?.invitations
    const invitations = Array.isArray(inv) ? inv : []

    return {
      success: true,
      data: {
        invitations,
        seat_allocation: data?.seat_allocation ?? null,
      },
      error: null,
      useTableFallback: false,
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message || 'RPC failed',
      useTableFallback: true,
    }
  }
}

/**
 * Validate invitation token
 * @param {string} token - Invitation token
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function validateInvitationToken(token) {
  try {
    const { data, error } = await appDb.rpc('validate_invitation_token', {
      p_token: token,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Invalid invitation token',
      }
    }

    const invitation = data[0]

    if (!invitation.is_valid) {
      return {
        success: false,
        data: invitation,
        error: 'Invitation has expired or is no longer valid',
      }
    }

    return {
      success: true,
      data: invitation,
      error: null,
    }
  } catch (error) {
    console.error('Error validating invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to validate invitation',
    }
  }
}

/**
 * Accept invitation
 * @param {string} token - Invitation token
 * @param {string} userId - Internal user ID (not auth_user_id)
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function acceptInvitation(token, userId) {
  try {
    const { data, error } = await appDb.rpc('accept_project_invitation', {
      p_token: token,
      p_accepting_user_id: userId,
    })

    if (error) {
      // Check if it's a seat limit error
      if (error.message && error.message.includes('No available seats')) {
        return {
          success: false,
          data: null,
          error: 'No available seats in this project',
          code: 'SEAT_LIMIT_EXCEEDED',
        }
      }
      throw error
    }

    if (!data) {
      return {
        success: false,
        data: null,
        error: 'Failed to accept invitation',
      }
    }

    return {
      success: true,
      data: { accepted: true },
      error: null,
    }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to accept invitation',
    }
  }
}

/**
 * Decline invitation
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function declineInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        invitation_status: 'declined',
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error declining invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to decline invitation',
    }
  }
}

/**
 * Decline invitation via email link token (SECURITY DEFINER RPC; works when caller is not logged in).
 * @param {string} token - Invitation token from URL
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function declineInvitationByToken(token) {
  try {
    const { data, error } = await appDb.rpc('decline_project_invitation', {
      p_token: token,
    })

    if (error) throw error

    if (data !== true) {
      return {
        success: false,
        data: null,
        error: 'Unable to decline this invitation. It may be invalid, expired, or already processed.',
      }
    }

    return {
      success: true,
      data: { declined: true },
      error: null,
    }
  } catch (error) {
    console.error('Error declining invitation by token:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to decline invitation',
    }
  }
}

/**
 * Cancel invitation (by sender)
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function cancelInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        invitation_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to cancel invitation',
    }
  }
}

/**
 * Resend invitation email
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function resendInvitation(invitationId) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error resending invitation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to resend invitation',
    }
  }
}

/**
 * Get project members
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProjectMembers(projectId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .select(`
        id,
        project_id,
        user_id,
        project_role_id,
        accepted_at,
        created_at,
        invitation_status,
        is_active,
        user:users!project_memberships_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          last_login_at
        ),
        role:project_roles(
          id,
          role_name,
          role_display_name,
          role_level
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .or('invitation_status.eq.accepted,invitation_status.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback path for PMO-admin contexts where project_memberships RLS is still restrictive.
      // We can still resolve members from user_roles for the selected project.
      if (error.code === '42501') {
        const { data: fallbackRows, error: fallbackError } = await appDb
          .from('user_roles')
          .select(`
            id,
            project_id,
            user_id,
            role_id,
            assigned_at,
            is_active,
            users:users!user_roles_user_id_fkey(
              id,
              full_name,
              email,
              avatar_url,
              last_login_at
            ),
            roles:roles!user_roles_role_id_fkey(
              id,
              role_name,
              role_display_name,
              role_level
            )
          `)
          .eq('project_id', projectId)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('assigned_at', { ascending: false })

        if (!fallbackError) {
          const mapped = (fallbackRows || []).map((r) => ({
            id: `ur-${r.id}`,
            project_id: r.project_id,
            user_id: r.user_id,
            project_role_id: null,
            accepted_at: r.assigned_at,
            created_at: r.assigned_at,
            invitation_status: 'accepted',
            is_active: r.is_active,
            user: r.users || null,
            role: r.roles || null,
          }))

          return {
            success: true,
            data: mapped,
            error: null,
          }
        }
      }
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching project members:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch project members',
    }
  }
}

/**
 * PMO only: add an existing platform user to the project immediately (no invitation).
 * Creates or updates project_memberships with invitation_status accepted.
 */
export async function pmoAddExistingUserToProject(projectId, email, projectRoleId) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user?.id) return { success: false, data: null, error: 'Not authenticated' }

    const admin = await isPmoAdmin(user.id)
    if (!admin) {
      return {
        success: false,
        data: null,
        error: 'Only PMO administrators can add existing users without sending an invitation.',
      }
    }

    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized || !projectRoleId || !projectId) {
      return { success: false, data: null, error: 'Project, email, and role are required.' }
    }

    const { data: prRow, error: prErr } = await appDb
      .from('project_roles')
      .select('id')
      .eq('id', projectRoleId)
      .eq('is_active', true)
      .maybeSingle()

    if (prErr) throw prErr
    if (!prRow?.id) {
      return { success: false, data: null, error: 'Invalid or inactive project role.' }
    }

    const { data: targetUser, error: targetErr } = await appDb
      .from('users')
      .select('id, email')
      .ilike('email', normalized)
      .maybeSingle()

    if (targetErr) throw targetErr
    if (!targetUser?.id) {
      return {
        success: false,
        data: null,
        error: 'No platform user exists with that email. Use “Send invitation” to onboard them.',
      }
    }

    const { data: seatCheck, error: seatError } = await appDb.rpc('check_seat_availability', {
      p_project_id: projectId,
    })
    if (seatError) throw seatError

    const { data: existingActiveRow } = await appDb
      .from('project_memberships')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', targetUser.id)
      .eq('is_active', true)
      .maybeSingle()

    if (
      seatCheck &&
      seatCheck.length > 0 &&
      !seatCheck[0].has_available_seats &&
      !existingActiveRow?.id
    ) {
      return {
        success: false,
        data: null,
        error: 'No available seats. Purchase additional seats or remove another member.',
        code: 'SEAT_LIMIT_EXCEEDED',
      }
    }

    const { data: existing } = await appDb
      .from('project_memberships')
      .select('id, is_active')
      .eq('project_id', projectId)
      .eq('user_id', targetUser.id)
      .maybeSingle()

    const now = new Date().toISOString()

    if (existing?.id) {
      const { data: updated, error: upErr } = await appDb
        .from('project_memberships')
        .update({
          project_role_id: projectRoleId,
          is_active: true,
          invitation_status: 'accepted',
          ...(existing.is_active ? {} : { accepted_at: now }),
          updated_at: now,
        })
        .eq('id', existing.id)
        .select(`
          *,
          user:users!project_memberships_user_id_fkey(id, full_name, email, avatar_url),
          role:project_roles(id, role_name, role_display_name, role_level)
        `)
        .single()

      if (upErr) throw upErr
      return { success: true, data: updated, error: null }
    }

    const { data: inserted, error: insErr } = await appDb
      .from('project_memberships')
      .insert({
        project_id: projectId,
        user_id: targetUser.id,
        project_role_id: projectRoleId,
        invitation_status: 'accepted',
        accepted_at: now,
        is_active: true,
      })
      .select(`
        *,
        user:users!project_memberships_user_id_fkey(id, full_name, email, avatar_url),
        role:project_roles(id, role_name, role_display_name, role_level)
      `)
      .single()

    if (insErr) throw insErr
    return { success: true, data: inserted, error: null }
  } catch (error) {
    console.error('pmoAddExistingUserToProject:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to add member',
    }
  }
}

/**
 * Update role for a membership row from project_memberships, or from user_roles when id is ur-{user_roles.id}.
 */
export async function updatePlatformProjectMemberRole(memberRowId, newProjectRoleId) {
  try {
    if (typeof memberRowId === 'string' && memberRowId.startsWith('ur-')) {
      const userRoleId = memberRowId.slice(3)
      const resolved = await resolveInvitationRoleIdForInsert(newProjectRoleId)
      if (!resolved.success) {
        return { success: false, data: null, error: resolved.error || 'Invalid role' }
      }
      const legacyRoleId = resolved.invitationRoleId
      const { data, error } = await appDb
        .from('user_roles')
        .update({
          role_id: legacyRoleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRoleId)
        .select(`
          id,
          roles:roles!user_roles_role_id_fkey(id, role_name, role_display_name, role_level)
        `)
        .single()

      if (error) throw error
      return {
        success: true,
        data: {
          ...data,
          role: data?.roles || null,
        },
        error: null,
      }
    }
    return updateMemberRole(memberRowId, newProjectRoleId)
  } catch (error) {
    console.error('updatePlatformProjectMemberRole:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update member role',
    }
  }
}

/**
 * Remove member: project_memberships row, or soft-delete user_roles when id is ur-{user_roles.id}.
 */
export async function removePlatformProjectMember(memberRowId) {
  try {
    if (typeof memberRowId === 'string' && memberRowId.startsWith('ur-')) {
      const userRoleId = memberRowId.slice(3)
      const { error } = await appDb
        .from('user_roles')
        .update({
          is_active: false,
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRoleId)

      if (error) throw error
      return { success: true, data: null, error: null }
    }
    return removeMemberFromProject(memberRowId)
  } catch (error) {
    console.error('removePlatformProjectMember:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to remove member',
    }
  }
}

/**
 * Update member role (project_memberships.project_role_id)
 * @param {string} membershipId - project_memberships.id
 * @param {string} newProjectRoleId - project_roles.id
 */
export async function updateMemberRole(membershipId, newProjectRoleId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .update({
        project_role_id: newProjectRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select(`
        *,
        role:project_roles(role_name, role_display_name)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating member role:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update member role',
    }
  }
}

/**
 * Remove member from project (deactivate project_memberships row)
 * @param {string} membershipId - project_memberships.id
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function removeMemberFromProject(membershipId) {
  try {
    const { data, error } = await appDb
      .from('project_memberships')
      .update({
        is_active: false,
        invitation_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error removing member:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to remove member',
    }
  }
}

/**
 * Get user's pending invitations
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserPendingInvitations(email) {
  try {
    const { data, error } = await appDb
      .from('project_invitations')
      .select(`
        *,
        project:projects(project_name, project_code),
        role:roles(role_display_name),
        invited_by:users!project_invitations_invited_by_user_id_fkey(full_name)
      `)
      .eq('invited_email', email)
      .eq('invitation_status', 'pending')
      .gt('invitation_expires_at', new Date().toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching pending invitations:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch pending invitations',
    }
  }
}

export default {
  inviteUserToProject,
  getProjectInvitations,
  getProjectInviteContext,
  validateInvitationToken,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  resendInvitation,
  getProjectMembers,
  pmoAddExistingUserToProject,
  updatePlatformProjectMemberRole,
  removePlatformProjectMember,
  updateMemberRole,
  removeMemberFromProject,
  getUserPendingInvitations,
  resolveInvitationRoleIdForInsert,
  listProjectsForMemberManagement,
  canInviteToProject,
  projectRoleGrantsInvite,
  readMemberManagementProjectsCache,
  writeMemberManagementProjectsCache,
  fetchProjectPickerRowById,
  PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE,
  invitationRoleLookupNames,
  shouldTryLegacyInvitationInsert,
}
