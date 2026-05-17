/**
 * Project Membership Service
 * Handles project invitations and user memberships for Platform
 *
 * IMPORTANT: Platform specific - uses appDb (public schema)
 * Manages invitations and role assignments to projects
 */

import { appDb } from './supabase/supabaseClient'
import { isPmoAdmin } from './organisationRoleService'
import { getMyProjects } from './projectService'
import {
  clampInvitationExpiryDays,
  fetchDefaultInvitationExpiryDaysForProject,
  INVITE_EXPIRY_FALLBACK_DAYS,
} from './invitationExpiryService'
import {
  buildInvitationRpcPayload,
  invitationRpcSetupSuffix,
  isInvitationRpcMissingOrUnreachable,
  probePostgrestRpcListedInOpenApi,
} from './inviteRpcUtils'

/** Maps project_roles.role_name (templates) → roles.role_name used by project_invitations.role_id FK */
const PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE = {
  team_manager: 'pm_team_manager',
  team_member: 'pm_team_member',
  project_assurance: 'pm_project_assurance',
  quality_assurance: 'pm_quality_assurance',
  change_authority: 'pm_change_authority',
}

/** PostgREST may return json scalar as object or string depending on driver/version */
function parseInvitationRpcPayload(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return typeof raw === 'object' ? raw : null
}

function isValidInvitationRow(row) {
  return !!(row && row.id)
}

/**
 * Resolve a selected project role (project_roles.id or legacy roles.id) to roles.id for invitations.
 * @param {string} selectedRoleId
 * @returns {Promise<{success: boolean, invitationRoleId?: string, error?: string|null}>}
 */
export async function resolveInvitationRoleIdForInsert(selectedRoleId) {
  try {
    const { data: pr, error: prErr } = await appDb
      .from('project_roles')
      .select('id, role_name')
      .eq('id', selectedRoleId)
      .maybeSingle()

    if (prErr) throw prErr

    if (pr?.role_name) {
      const legacyName = PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE[pr.role_name]
      if (legacyName) {
        const { data: lr, error: lrErr } = await appDb
          .from('roles')
          .select('id')
          .eq('role_name', legacyName)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .maybeSingle()

        if (lrErr) throw lrErr
        if (!lr?.id) {
          return {
            success: false,
            error: `System role "${legacyName}" is missing. Run database migrations (v388).`,
          }
        }
        return { success: true, invitationRoleId: lr.id, error: null }
      }

      const { data: directRole, error: drErr } = await appDb
        .from('roles')
        .select('id')
        .eq('role_name', pr.role_name)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle()

      if (drErr) throw drErr
      if (directRole?.id) {
        return { success: true, invitationRoleId: directRole.id, error: null }
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

/**
 * Projects where the user is assigned as PM (not merely a team member).
 * Merges user_projects, projects.project_manager_user_id, project_memberships, and user_roles.
 * @param {string} internalUserId - public.users.id
 */
async function listPmProjectsForMemberManagement(internalUserId) {
  const byId = new Map()

  const upRes = await getMyProjects(internalUserId, {})
  if (!upRes.success) {
    return { success: false, data: [], error: upRes.error || 'Failed to load projects' }
  }
  for (const p of upRes.data || []) {
    if (p?.id && p.is_deleted !== true) addProjectPickerRow(byId, p)
  }

  const { data: directManaged, error: dmErr } = await appDb
    .from('projects')
    .select('id, project_name, project_code')
    .eq('project_manager_user_id', internalUserId)
    .eq('is_deleted', false)

  if (dmErr) throw dmErr
  for (const p of directManaged || []) addProjectPickerRow(byId, p)

  const { data: memberships, error: memErr } = await appDb
    .from('project_memberships')
    .select(`
      project_id,
      project:projects(id, project_name, project_code, is_deleted),
      role:project_roles(role_name)
    `)
    .eq('user_id', internalUserId)
    .eq('is_active', true)
    .or('invitation_status.eq.accepted,invitation_status.is.null')

  if (memErr) {
    console.warn('listPmProjectsForMemberManagement: project_memberships', memErr.message)
  } else {
    for (const m of memberships || []) {
      const roleName = m.role?.role_name
      if (roleName && PM_MEMBER_MANAGEMENT_ROLE_NAMES.has(roleName)) {
        const proj = m.project
        if (proj && proj.is_deleted !== true) addProjectPickerRow(byId, proj)
      }
    }
  }

  const { data: userRoles, error: urErr } = await appDb
    .from('user_roles')
    .select(`
      project_id,
      roles:roles!user_roles_role_id_fkey(role_name)
    `)
    .eq('user_id', internalUserId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .not('project_id', 'is', null)

  if (urErr) {
    console.warn('listPmProjectsForMemberManagement: user_roles', urErr.message)
  } else {
    const missingIds = []
    for (const ur of userRoles || []) {
      const roleName = ur.roles?.role_name
      if (!roleName || !PM_MEMBER_MANAGEMENT_ROLE_NAMES.has(roleName)) continue
      const pid = ur.project_id
      if (pid && !byId.has(pid)) missingIds.push(pid)
    }
    const uniqueMissing = [...new Set(missingIds)]
    if (uniqueMissing.length > 0) {
      const { data: projRows, error: pErr } = await appDb
        .from('projects')
        .select('id, project_name, project_code')
        .in('id', uniqueMissing)
        .eq('is_deleted', false)

      if (pErr) {
        console.warn('listPmProjectsForMemberManagement: projects by user_roles', pErr.message)
      } else {
        for (const p of projRows || []) addProjectPickerRow(byId, p)
      }
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
 */
export async function listProjectsForMemberManagement(internalUserId, authUserId) {
  try {
    const admin = await isPmoAdmin(authUserId)
    if (admin) {
      // Keep this lightweight and RLS-friendly; avoid complex embeds from assignment pages.
      const { data: rows, error } = await appDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })

      if (error) throw error
      return {
        success: true,
        data: (rows || []).map((p) => ({
          id: p.id,
          project_name: p.project_name,
          project_code: p.project_code,
        })),
        error: null,
      }
    }

    return listPmProjectsForMemberManagement(internalUserId)
  } catch (error) {
    console.error('listProjectsForMemberManagement:', error)
    return { success: false, data: [], error: error.message || 'Failed to list projects' }
  }
}

/**
 * Invite user to project
 * @param {string} projectId - Project UUID
 * @param {object} invitationData - Invitation details
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function inviteUserToProject(projectId, invitationData) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const resolved = await resolveInvitationRoleIdForInsert(invitationData.roleId)
    if (!resolved.success) {
      return { success: false, data: null, error: resolved.error || 'Invalid role' }
    }
    const invitationRoleId = resolved.invitationRoleId

    const emailTrimmed = String(invitationData?.email ?? '').trim()
    if (!projectId || !invitationRoleId || !emailTrimmed) {
      return { success: false, data: null, error: 'Invalid invitation details' }
    }

    // Get internal user ID
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    // Check if user already exists with this email (avoid .single() — 0 rows is normal)
    const { data: existingUser } = await appDb
      .from('users')
      .select('id')
      .eq('email', emailTrimmed)
      .maybeSingle()

    // Check seat availability — non-blocking: a hung or missing RPC must never
    // prevent the invitation from being attempted. v85 check_seat_availability called
    // calculate_project_seat_usage (UPDATE) which could deadlock on the lock held by
    // a previous stalled request. v535 SQL fixes the root cause; Promise.race(timeout)
    // below is the JS-side defence so the button never sticks even on older DB versions
    // where the RPC hangs (a hanging await is NOT caught by try-catch alone).
    try {
      const seatRpc = appDb.rpc('check_seat_availability', { p_project_id: projectId })
      const seatFallback = new Promise(resolve =>
        setTimeout(() => resolve({ data: null, error: { message: 'seat_check_timeout' } }), 3_000)
      )
      const { data: seatCheck, error: seatError } = await Promise.race([seatRpc, seatFallback])
      if (!seatError && seatCheck && seatCheck.length > 0 && !seatCheck[0].has_available_seats) {
        return {
          success: false,
          data: null,
          error: 'No available seats. Please purchase additional seats.',
          code: 'SEAT_LIMIT_EXCEEDED',
          seatInfo: seatCheck[0],
        }
      }
      if (seatError) {
        console.warn('[inviteUserToProject] seat check error/timeout (proceeding):', seatError?.message)
      }
    } catch (seatErr) {
      console.warn('[inviteUserToProject] seat check threw (proceeding):', seatErr?.message)
    }

    let expiryDays = INVITE_EXPIRY_FALLBACK_DAYS
    if (invitationData.expiryDays != null && invitationData.expiryDays !== '') {
      expiryDays = clampInvitationExpiryDays(invitationData.expiryDays)
    } else {
      const resolved = await fetchDefaultInvitationExpiryDaysForProject(projectId)
      expiryDays = resolved.days
    }

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

    // Prefer SECURITY DEFINER RPC (v398): PostgREST often omits SQLSTATE on 403 so table-insert
    // fallback was unreliable; RPC bypasses RLS for PMO admins and project members (SQL-enforced).
    // 10s timeout: seat-check(3s) + rpc(10s) + legacy(8s) < 30s outer — outer fires last.
    const rpcCallPromise = appDb.rpc('insert_project_invitation_as_pmo_admin', rpcPayload)
    const rpcTimeoutPromise = new Promise(resolve =>
      setTimeout(
        () => resolve({ data: null, error: { message: 'Invitation RPC timed out — PostgREST may not have loaded v398 yet. Pause/resume your Supabase project, then retry.', code: 'CLIENT_TIMEOUT' }, status: 408 }),
        10_000,
      )
    )
    const rpcResult = await Promise.race([rpcCallPromise, rpcTimeoutPromise])
    const rpcData = rpcResult.data
    const rpcError = rpcResult.error
    const rpcHttpStatus = rpcResult.status

    const rpcNotDeployed = isInvitationRpcMissingOrUnreachable(rpcError, rpcHttpStatus)

    if (rpcError || rpcHttpStatus === 404) {
      console.warn('[inviteUserToProject] insert_project_invitation_as_pmo_admin:', {
        code: rpcError?.code,
        message: rpcError?.message,
        details: rpcError?.details,
        hint: rpcError?.hint,
        httpStatus: rpcHttpStatus,
        errorStatus: rpcError?.status ?? rpcError?.statusCode,
        rpcNotDeployed,
      })
    }

    if (import.meta.env.DEV && rpcNotDeployed && rpcHttpStatus === 404) {
      try {
        let userJwt = null
        try {
          const { data: sessWrap } = await appDb.auth.getSession()
          userJwt = sessWrap?.session?.access_token ?? null
        } catch {
          /* ignore */
        }
        const openApiProbe = await probePostgrestRpcListedInOpenApi(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          'insert_project_invitation_as_pmo_admin',
          userJwt,
        )
        console.warn('[inviteUserToProject] PostgREST OpenAPI RPC probe (compare with SQL grants):', openApiProbe)
      } catch (probeErr) {
        console.warn('[inviteUserToProject] PostgREST OpenAPI probe failed:', probeErr)
      }
    }

    if (!rpcError) {
      const row = parseInvitationRpcPayload(rpcData)
      if (isValidInvitationRow(row)) {
        return { success: true, data: row, error: null }
      }
      // RPC ran but returned no id — this is abnormal (function should always return json with id
      // or raise an exception). Do not silently fall to legacy INSERT for PMO admin context.
      console.warn('[inviteUserToProject] RPC returned success but no valid row:', rpcData)
      return {
        success: false,
        data: null,
        error: 'Invitation RPC returned an empty response. Check Supabase logs for the function body error.',
      }
    }

    // Caller is not a PMO admin according to the function — fall through to legacy INSERT
    // so PMs can still invite team members via direct table INSERT + their own RLS policies.
    const callerNotPmoAdmin =
      rpcError?.code === '42501' && /not a pmo admin/i.test(String(rpcError?.message || ''))

    if (rpcError && !rpcNotDeployed && !callerNotPmoAdmin) {
      return {
        success: false,
        data: null,
        error: rpcError.message || 'Failed to send invitation',
      }
    }

    // Legacy path: either RPC not deployed (v400 not run yet) OR caller is a PM (not PMO admin).
    // 8s timeout keeps total chain (seat 3s + rpc 10s + legacy 8s) well under 30s outer limit.
    const legacyInsertPromise = appDb
      .from('project_invitations')
      .insert({
        project_id: projectId,
        invited_email: emailTrimmed,
        invited_user_id: existingUser?.id || null,
        role_id: invitationRoleId,
        invited_by_user_id: userData.id,
        invitation_message: invitationData.message || null,
        invitation_expires_at: invitationExpiresAt,
      })
      .select(selectCols)
      .maybeSingle()
    const legacyInsertTimeout = new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
            error: { message: 'Database insert timed out — likely an RLS or lock issue. Run SQL/v397 + v398 then pause/resume Supabase.', code: 'CLIENT_TIMEOUT' },
          }),
        8_000,
      ),
    )
    const { data, error } = await Promise.race([legacyInsertPromise, legacyInsertTimeout])

    if (error) {
      const denied = /permission denied/i.test(String(error.message || ''))
      if (denied) {
        const rpcDiag = rpcError
          ? ` [RPC ${rpcError.code || 'err'}: ${rpcError.message || 'unknown'}]`
          : ` [RPC: 404 — function not found by PostgREST]`
        const insertDiag = ` [INSERT ${error.code || 'err'}: ${error.message || 'permission denied'}]`
        return {
          success: false,
          data: null,
          error: `Run SQL/v404_fix_uuid_and_sender_policy.sql in Supabase SQL Editor, then retry.${rpcDiag}${insertDiag}`,
          requiresDbSetup: true,
        }
      }
      throw error
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error inviting user:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to send invitation',
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
}
