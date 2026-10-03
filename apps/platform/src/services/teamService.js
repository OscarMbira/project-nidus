/**
 * Team Service
 * Provides team management, resource directory, skill matrix, and capacity planning
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Attach team_lead profiles without PostgREST FK embeds (teams has multiple FKs to users).
 * @param {Array<Object>} teams
 * @returns {Promise<Array<Object>>}
 */
async function withTeamLeads(teams) {
  const list = Array.isArray(teams) ? teams : [];
  if (list.length === 0) return list;

  const leadIds = [
    ...new Set(list.map((t) => t.team_lead_user_id).filter(Boolean)),
  ];
  if (leadIds.length === 0) {
    return list.map((t) => ({ ...t, team_lead: null }));
  }

  const { data: leads, error } = await platformDb
    .from('users')
    .select('id, full_name, email')
    .in('id', leadIds);

  if (error) {
    console.warn('withTeamLeads: could not load lead profiles', error.message);
    return list.map((t) => ({ ...t, team_lead: null }));
  }

  const byId = new Map((leads || []).map((u) => [u.id, u]));
  return list.map((t) => ({
    ...t,
    team_lead: t.team_lead_user_id ? byId.get(t.team_lead_user_id) || null : null,
  }));
}

/**
 * Get all teams for an organization (through projects)
 * @param {string} organizationId - Account ID
 * @returns {Promise<Object>} Teams data
 */
export async function getAllTeams(organizationId) {
  try {
    // First get projects for this account
    const { data: projects, error: projectsError } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectsError) throw projectsError;

    const projectIds = projects?.map(p => p.id) || [];

    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get teams for these projects
    const { data: teams, error } = await platformDb
      .from('teams')
      .select(`
        id,
        team_code,
        team_name,
        team_description,
        team_type,
        team_lead_user_id,
        max_team_size,
        is_active,
        created_at,
        project_id,
        projects(
          id,
          project_name,
          project_code,
          account_id
        )
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .or('is_active.eq.true,is_active.is.null')
      .order('team_name', { ascending: true });

    if (error) throw error;

    return { success: true, data: await withTeamLeads(teams || []) };
  } catch (error) {
    console.error('Error getting teams:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get teams for a single project (current project context).
 * @param {string} projectId - projects.id UUID
 */
export async function getTeamsForProject(projectId) {
  try {
    if (!projectId) return { success: true, data: [] };

    const { data: teams, error } = await platformDb
      .from('teams')
      .select(`
        id,
        team_code,
        team_name,
        team_description,
        team_type,
        team_lead_user_id,
        max_team_size,
        is_active,
        created_at,
        project_id,
        projects(
          id,
          project_name,
          project_code,
          account_id
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .or('is_active.eq.true,is_active.is.null')
      .order('team_name', { ascending: true });

    if (error) throw error;
    return { success: true, data: await withTeamLeads(teams || []) };
  } catch (error) {
    console.error('Error getting project teams:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Get team detail with members (resolve by UUID or team_code).
 * @param {string} teamIdOrCode - teams.id UUID or team_code (e.g. TEAM-0010)
 * @returns {Promise<Object>} Team detail
 */
export async function getTeamDetail(teamIdOrCode) {
  try {
    if (!teamIdOrCode) return { success: false, error: 'Team id is required' };

    const key = String(teamIdOrCode).trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

    let query = platformDb
      .from('teams')
      .select(`
        *,
        projects(
          id,
          project_name,
          project_code,
          account_id
        )
      `)
      .eq('is_deleted', false);

    query = isUuid ? query.eq('id', key) : query.eq('team_code', key);

    const { data: team, error: teamError } = await query.maybeSingle();

    if (teamError) throw teamError;
    if (!team) return { success: false, error: 'Team not found' };

    const [{ data: members, error: membersError }, rolesRes] = await Promise.all([
      platformDb
        .from('team_members')
        .select(`
          *,
          users:users!user_id(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', team.id)
        .eq('is_deleted', false)
        .eq('is_active', true),
      getTeamFunctionalRoles(team.id),
    ]);

    if (membersError) throw membersError;

    return {
      success: true,
      data: {
        ...team,
        members: members || [],
        functional_roles: rolesRes.success ? rolesRes.data || [] : [],
      },
    };
  } catch (error) {
    console.error('Error getting team detail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new team
 * @param {Object} teamData - Team data
 * @returns {Promise<Object>} Created team
 */
export async function createTeam(teamData) {
  try {
    const { data, error } = await platformDb
      .from('teams')
      .insert({
        project_id: teamData.project_id,
        team_name: teamData.team_name,
        team_description: teamData.team_description ?? null,
        team_type: teamData.team_type ?? null,
        team_lead_user_id: teamData.team_lead_user_id || null,
        max_team_size: teamData.max_team_size ?? null,
        required_skills: teamData.required_skills || null,
        team_code: '',
        is_active: true,
        created_by: teamData.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a team, seed functional roles (with required skills), and optionally add members.
 * @param {Object} teamData
 * @param {Array<{user_id:string, member_role?:string, allocation_percentage?:number, required_skills?:string}>} [members]
 * @param {{ roleSkillRows?: Array<{role:string, skills:string}> }} [options]
 */
export async function createTeamWithMembers(teamData, members = [], options = {}) {
  const created = await createTeam(teamData);
  if (!created.success) return created;

  const teamId = created.data?.id;
  const errors = [];

  const roleSkillRows = Array.isArray(options.roleSkillRows) ? options.roleSkillRows : [];
  for (const row of roleSkillRows) {
    const label = String(row?.role || '').trim();
    if (!label) continue;
    const skills = String(row?.skills || '').trim() || null;
    const roleRes = await addTeamFunctionalRole(teamId, label, skills);
    if (!roleRes.success) errors.push(roleRes.error || `Failed to add role: ${label}`);
  }

  // Also accept legacy roleLabels without skills
  for (const label of options.roleLabels || []) {
    const trimmed = String(label || '').trim();
    if (!trimmed) continue;
    if (roleSkillRows.some((r) => String(r?.role || '').trim().toLowerCase() === trimmed.toLowerCase())) {
      continue;
    }
    const roleRes = await addTeamFunctionalRole(teamId, trimmed, null);
    if (!roleRes.success) errors.push(roleRes.error || `Failed to add role: ${trimmed}`);
  }

  for (const m of members || []) {
    if (!m?.user_id) continue;
    const res = await addMember(teamId, m.user_id, {
      member_role: m.member_role || null,
      allocation_percentage: m.allocation_percentage ?? 100,
      required_skills: m.required_skills || null,
      allocation_start_date: m.allocation_start_date || null,
      allocation_end_date: m.allocation_end_date || null,
      member_comments: m.member_comments || null,
    });
    if (!res.success) errors.push(res.error || 'Failed to add member');
  }

  if (errors.length) {
    return {
      success: true,
      data: created.data,
      warning: `Team created, but some items failed: ${errors.join('; ')}`,
    };
  }
  return { success: true, data: created.data };
}

/**
 * Update team
 * @param {string} teamId - Team ID
 * @param {Object} teamData - Updated team data
 * @returns {Promise<Object>} Updated team
 */
export async function updateTeam(teamId, teamData) {
  try {
    const { data, error } = await platformDb
      .from('teams')
      .update({
        team_name: teamData.team_name,
        team_description: teamData.team_description,
        team_type: teamData.team_type,
        team_lead_user_id: teamData.team_lead_user_id,
        max_team_size: teamData.max_team_size,
        is_active: teamData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete team (soft delete)
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Result
 */
export async function deleteTeam(teamId) {
  try {
    const { error } = await platformDb
      .from('teams')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', teamId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add member to team
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @param {Object} memberData - Member data (role, allocation_percentage)
 * @returns {Promise<Object>} Created member
 */
export async function addMember(teamId, userId, memberData = {}) {
  try {
    const { data, error } = await platformDb
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        member_role: memberData.member_role || null,
        allocation_percentage: memberData.allocation_percentage || 100,
        required_skills: memberData.required_skills || null,
        allocation_start_date: memberData.allocation_start_date || null,
        allocation_end_date: memberData.allocation_end_date || null,
        member_comments: memberData.member_comments || null,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding member:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove member from team
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export async function removeMember(teamId, userId) {
  try {
    const { error } = await platformDb
      .from('team_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get resource directory (all users in organization)
 * @param {string} organizationId - Account ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Resource directory
 */
export async function getResourceDirectory(organizationId, filters = {}) {
  try {
    // Get users through projects (users assigned to projects in this account)
    const { data: projects } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    const projectIds = projects?.map(p => p.id) || [];

    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get users through user_projects or team_members
    const { data: userProjects } = await platformDb
      .from('user_projects')
      .select('user_id')
      .in('project_id', projectIds)
      .eq('is_deleted', false);

    // Get team IDs for these projects
    const { data: teams } = await platformDb
      .from('teams')
      .select('id')
      .in('project_id', projectIds)
      .eq('is_deleted', false);

    const teamIds = teams?.map(t => t.id) || [];

    let teamMembers = [];
    if (teamIds.length > 0) {
      const { data: members } = await platformDb
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)
        .eq('is_deleted', false);
      teamMembers = members || [];
    }

    const userIds = [
      ...new Set([
        ...(userProjects?.map(up => up.user_id) || []),
        ...(teamMembers?.map(tm => tm.user_id) || [])
      ])
    ];

    if (userIds.length === 0) {
      return { success: true, data: [] };
    }

    let query = platformDb
      .from('users')
      .select('id, full_name, email, avatar_url, phone_number, job_title, department')
      .in('id', userIds)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters.department) {
      query = query.eq('department', filters.department);
    }

    const { data: users, error } = await query.order('full_name', { ascending: true });

    if (error) throw error;

    return { success: true, data: users || [] };
  } catch (error) {
    console.error('Error getting resource directory:', error);
    return { success: false, error: error.message };
  }
}

/** Update the signed-in user's own directory fields (job title, department, phone). */
export async function updateResourceDirectoryEntry(userId, { job_title, department, phone_number }) {
  try {
    const { data, error } = await platformDb
      .from('users')
      .update({
        job_title: job_title?.trim() || null,
        department: department?.trim() || null,
        phone_number: phone_number?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, full_name')
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating resource directory entry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get capacity data for a team
 * @param {string} teamId - Team ID
 * @param {Object} dateRange - Date range {start, end}
 * @returns {Promise<Object>} Capacity data
 */
export async function getCapacityData(teamId, dateRange = {}) {
  try {
    // Get team members
    const { data: members } = await platformDb
      .from('team_members')
      .select('user_id, allocation_percentage')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('is_deleted', false);

    // Get resource allocations for these users
    // Note: This would require resource_allocations table
    // For now, return basic capacity info
    const capacityData = {
      teamId,
      totalMembers: members?.length || 0,
      totalAllocation: members?.reduce((sum, m) => sum + (m.allocation_percentage || 0), 0) || 0,
      members: members || []
    };

    return { success: true, data: capacityData };
  } catch (error) {
    console.error('Error getting capacity data:', error);
    return { success: false, error: error.message };
  }
}

// --- v345 Team Lead / My Team -------------------------------------------------

/**
 * Teams where the current user is the team lead (public.users.id).
 * @param {string} authUserId — auth.users.id
 */
export async function getMyTeams(authUserId) {
  try {
    const { data: u, error: ue } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (ue) throw ue;
    if (!u?.id) return { success: true, data: [] };

    const { data, error } = await platformDb
      .from('teams')
      .select(
        `
        id,
        team_name,
        team_description,
        team_type,
        project_id,
        team_lead_user_id,
        projects ( id, project_name, project_code )
      `
      )
      .eq('team_lead_user_id', u.id)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('team_name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getMyTeams:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Active team members with user profile rows.
 */
export async function getTeamMembers(teamId) {
  try {
    const { data, error } = await platformDb
      .from('team_members')
      .select(
        `
        id,
        team_id,
        user_id,
        member_role,
        allocation_percentage,
        joined_at,
        left_at,
        is_active,
        users:users!user_id ( id, full_name, email, avatar_url )
      `
      )
      .eq('team_id', teamId)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getTeamMembers:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Project members not already on this team (for add-member picker).
 * When teamId is omitted, returns all active project members.
 */
export async function getAssignableProjectMembers(projectId, teamId = null) {
  try {
    const { data: memberships, error: mErr } = await platformDb
      .from('project_memberships')
      .select(
        `
        user_id,
        users:users!project_memberships_user_id_fkey ( id, full_name, email, avatar_url ),
        role:project_roles ( role_name, role_display_name )
      `
      )
      .eq('project_id', projectId)
      .eq('is_active', true)
      .or('invitation_status.eq.accepted,invitation_status.is.null');

    if (mErr) throw mErr;

    let taken = new Set();
    if (teamId) {
      const { data: existing, error: eErr } = await platformDb
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (eErr) throw eErr;
      taken = new Set((existing || []).map((r) => r.user_id));
    }

    const rows = (memberships || []).filter((m) => m.user_id && !taken.has(m.user_id));
    return { success: true, data: rows };
  } catch (error) {
    console.error('getAssignableProjectMembers:', error);
    return { success: false, data: [], error: error.message };
  }
}

export async function addTeamMember(teamId, userId, memberRole, allocationPct, requiredSkills = null) {
  return addMember(teamId, userId, {
    member_role: memberRole ?? null,
    allocation_percentage: allocationPct ?? 100,
    required_skills: requiredSkills || null,
  });
}

export async function updateTeamMember(teamMemberId, memberRole, allocationPct, extra = {}) {
  try {
    const patch = {
      member_role: memberRole,
      allocation_percentage: allocationPct,
      updated_at: new Date().toISOString(),
    };
    if (Object.prototype.hasOwnProperty.call(extra, 'allocation_start_date')) {
      patch.allocation_start_date = extra.allocation_start_date || null;
    }
    if (Object.prototype.hasOwnProperty.call(extra, 'allocation_end_date')) {
      patch.allocation_end_date = extra.allocation_end_date || null;
    }
    if (Object.prototype.hasOwnProperty.call(extra, 'member_comments')) {
      patch.member_comments = extra.member_comments || null;
    }

    const { data, error } = await platformDb
      .from('team_members')
      .update(patch)
      .eq('id', teamMemberId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('updateTeamMember:', error);
    return { success: false, data: null, error: error.message };
  }
}

export async function removeTeamMember(teamMemberId) {
  try {
    const { error } = await platformDb
      .from('team_members')
      .update({
        is_active: false,
        is_deleted: true,
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamMemberId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('removeTeamMember:', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamFunctionalRoles(teamId) {
  try {
    const { data, error } = await platformDb
      .from('team_functional_roles')
      .select('id, team_id, role_label, required_skills, sort_order, is_active')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getTeamFunctionalRoles:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Project-scoped functional roles catalog (v1084).
 * @param {string} projectId
 */
export async function listProjectFunctionalRoles(projectId) {
  try {
    if (!projectId) return { success: false, data: [], error: 'Project id is required' };
    const { data, error } = await platformDb
      .from('project_functional_roles')
      .select('id, project_id, role_label, required_skills, sort_order, is_active, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('role_label', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('listProjectFunctionalRoles:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Ensure a project functional role exists in the catalog (v1084).
 * Inserts or reactivates by case-insensitive label. Safe to call on every custom pick.
 * @param {string} projectId
 * @param {string} roleLabel
 * @param {string|null} [userId] public.users.id for audit
 */
export async function ensureProjectFunctionalRole(projectId, roleLabel, userId = null) {
  try {
    const label = String(roleLabel || '').trim()
    if (!projectId) return { success: false, data: null, error: 'Project id is required' }
    if (!label) return { success: false, data: null, error: 'Role label is required' }

    const { data: existingRows, error: findErr } = await platformDb
      .from('project_functional_roles')
      .select('id, project_id, role_label, required_skills, sort_order, is_active')
      .eq('project_id', projectId)
      .ilike('role_label', label)
    if (findErr) throw findErr

    const match = (existingRows || []).find(
      (r) => String(r.role_label || '').toLowerCase() === label.toLowerCase(),
    )

    if (match) {
      if (match.is_active === false) {
        const { data, error } = await platformDb
          .from('project_functional_roles')
          .update({
            role_label: label,
            is_active: true,
            updated_at: new Date().toISOString(),
            updated_by: userId || null,
          })
          .eq('id', match.id)
          .select()
          .single()
        if (error) throw error
        return { success: true, data, created: false, reactivated: true }
      }
      return { success: true, data: match, created: false, reactivated: false }
    }

    const { data: maxRow } = await platformDb
      .from('project_functional_roles')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (maxRow?.sort_order ?? 0) + 10

    const { data, error } = await platformDb
      .from('project_functional_roles')
      .insert({
        project_id: projectId,
        role_label: label,
        required_skills: null,
        sort_order: sortOrder,
        is_active: true,
        created_by: userId || null,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, created: true, reactivated: false }
  } catch (error) {
    console.error('ensureProjectFunctionalRole:', error)
    return { success: false, data: null, error: error.message }
  }
}

/**
 * Replace the active project role catalog with the given rows (role + skills).
 * Soft-deactivates removed labels; upserts current ones.
 * @param {string} projectId
 * @param {Array<{role:string, skills?:string}>} rows
 */
export async function replaceProjectFunctionalRoles(projectId, rows = []) {
  try {
    if (!projectId) return { success: false, error: 'Project id is required' };

    const cleaned = (Array.isArray(rows) ? rows : [])
      .map((r) => ({
        role: String(r?.role || '').trim(),
        skills: String(r?.skills || '').trim() || null,
      }))
      .filter((r) => r.role);

    const { data: existingAll, error: exErr } = await platformDb
      .from('project_functional_roles')
      .select('id, project_id, role_label, required_skills, sort_order, is_active')
      .eq('project_id', projectId);
    if (exErr) throw exErr;
    const existing = existingAll || [];
    const keep = new Set(cleaned.map((r) => r.role.toLowerCase()));

    for (const row of existing) {
      if (!keep.has(String(row.role_label || '').toLowerCase())) {
        if (row.is_active === false) continue;
        const { error } = await platformDb
          .from('project_functional_roles')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (error) throw error;
      }
    }

    let sort = 10;
    for (const row of cleaned) {
      const match = existing.find(
        (e) => String(e.role_label || '').toLowerCase() === row.role.toLowerCase(),
      );
      if (match) {
        const { error } = await platformDb
          .from('project_functional_roles')
          .update({
            role_label: row.role,
            required_skills: row.skills,
            sort_order: sort,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id);
        if (error) throw error;
      } else {
        const { error } = await platformDb.from('project_functional_roles').insert({
          project_id: projectId,
          role_label: row.role,
          required_skills: row.skills,
          sort_order: sort,
          is_active: true,
        });
        if (error) throw error;
      }
      sort += 10;
    }

    return listProjectFunctionalRoles(projectId);
  } catch (error) {
    console.error('replaceProjectFunctionalRoles:', error);
    return { success: false, data: [], error: error.message };
  }
}

export async function addTeamFunctionalRole(teamId, roleLabel, requiredSkills = null) {
  try {
    const label = (roleLabel || '').trim();
    if (!label) return { success: false, error: 'Role label is required' };
    const skills = (requiredSkills || '').trim() || null;

    const { data, error } = await platformDb
      .from('team_functional_roles')
      .upsert(
        {
          team_id: teamId,
          role_label: label,
          required_skills: skills,
          sort_order: 999,
          is_active: true,
        },
        { onConflict: 'team_id,role_label' },
      )
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('addTeamFunctionalRole:', error);
    return { success: false, data: null, error: error.message };
  }
}

export async function updateTeamFunctionalRole(roleId, roleLabel, requiredSkills = undefined) {
  try {
    const label = (roleLabel || '').trim();
    if (!label) return { success: false, error: 'Role label is required' };

    const patch = { role_label: label, updated_at: new Date().toISOString() };
    if (requiredSkills !== undefined) {
      patch.required_skills = (requiredSkills || '').trim() || null;
    }

    const { data, error } = await platformDb
      .from('team_functional_roles')
      .update(patch)
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('updateTeamFunctionalRole:', error);
    return { success: false, data: null, error: error.message };
  }
}

export async function deleteTeamFunctionalRole(teamId, roleId) {
  try {
    const { data: fr, error: fe } = await platformDb
      .from('team_functional_roles')
      .select('role_label')
      .eq('id', roleId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (fe) throw fe;
    if (!fr?.role_label) return { success: false, error: 'Role not found' };

    const { count, error: cErr } = await platformDb
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('member_role', fr.role_label);

    if (cErr) throw cErr;
    if ((count || 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete: members are still assigned this functional role',
      };
    }

    const { error: de } = await platformDb.from('team_functional_roles').delete().eq('id', roleId);
    if (de) throw de;
    return { success: true };
  } catch (error) {
    console.error('deleteTeamFunctionalRole:', error);
    return { success: false, error: error.message };
  }
}

/**
 * PMO: all active teams with nested members and functional role labels.
 */
export async function getAllTeamsWithMembers() {
  try {
    const { data: teams, error: te } = await platformDb
      .from('teams')
      .select(
        `
        id,
        team_name,
        team_type,
        project_id,
        team_lead_user_id,
        projects ( id, project_name, project_code )
      `
      )
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('team_name', { ascending: true });

    if (te) throw te;
    const list = teams || [];
    if (list.length === 0) return { success: true, data: [] };

    const teamIds = list.map((t) => t.id);

    const { data: members, error: me } = await platformDb
      .from('team_members')
      .select(
        `
        id,
        team_id,
        user_id,
        member_role,
        allocation_percentage,
        joined_at,
        users:users!user_id ( id, full_name, email )
      `
      )
      .in('team_id', teamIds)
      .eq('is_deleted', false)
      .eq('is_active', true);

    if (me) throw me;

    const { data: roles, error: re } = await platformDb
      .from('team_functional_roles')
      .select('id, team_id, role_label, sort_order')
      .in('team_id', teamIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (re) throw re;

    const byTeam = (rows, key) => {
      const m = new Map();
      for (const r of rows || []) {
        const k = r[key];
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(r);
      }
      return m;
    };

    const memMap = byTeam(members, 'team_id');
    const roleMap = byTeam(roles, 'team_id');

    const enriched = list.map((t) => ({
      ...t,
      members: memMap.get(t.id) || [],
      functionalRoles: roleMap.get(t.id) || [],
    }));

    return { success: true, data: enriched };
  } catch (error) {
    console.error('getAllTeamsWithMembers:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Sum allocation % for a user across all active team memberships (optional UI warning).
 */
export async function getUserTotalTeamAllocation(userId, excludeTeamMemberId = null) {
  try {
    let q = platformDb
      .from('team_members')
      .select('allocation_percentage')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (excludeTeamMemberId) {
      q = q.neq('id', excludeTeamMemberId);
    }

    const { data, error } = await q;
    if (error) throw error;

    const total = (data || []).reduce((s, r) => s + Number(r.allocation_percentage || 0), 0);
    return { success: true, total };
  } catch (error) {
    console.error('getUserTotalTeamAllocation:', error);
    return { success: false, total: 0, error: error.message };
  }
}

function slugifyTeamTypeCode(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'custom';
}

/**
 * Active team types for the Team type dropdown (shared catalog).
 */
export async function listTeamTypes() {
  try {
    const { data, error } = await platformDb
      .from('team_types')
      .select('id, type_code, type_label, sort_order, is_system')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true })
      .order('type_label', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('listTeamTypes:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Ensure a team type exists (create if missing). Returns the catalog row.
 * @param {string} labelOrCode - User-entered label or existing code
 * @param {string|null} createdByUserId - internal users.id
 */
export async function ensureTeamType(labelOrCode, createdByUserId = null) {
  try {
    const raw = String(labelOrCode || '').trim();
    if (!raw) return { success: false, error: 'Team type is required' };

    const code = slugifyTeamTypeCode(raw);

    const byCode = await platformDb
      .from('team_types')
      .select('id, type_code, type_label, sort_order, is_system')
      .eq('is_deleted', false)
      .eq('type_code', code)
      .maybeSingle();
    if (byCode.error) throw byCode.error;
    if (byCode.data) return { success: true, data: byCode.data, created: false };

    const byLabel = await platformDb
      .from('team_types')
      .select('id, type_code, type_label, sort_order, is_system')
      .eq('is_deleted', false)
      .ilike('type_label', raw)
      .maybeSingle();
    if (byLabel.error) throw byLabel.error;
    if (byLabel.data) return { success: true, data: byLabel.data, created: false };

    const { data: inserted, error: insertErr } = await platformDb
      .from('team_types')
      .insert({
        type_code: code,
        type_label: raw,
        sort_order: 200,
        is_active: true,
        is_system: false,
        created_by: createdByUserId || null,
      })
      .select('id, type_code, type_label, sort_order, is_system')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        const again = await platformDb
          .from('team_types')
          .select('id, type_code, type_label, sort_order, is_system')
          .eq('is_deleted', false)
          .eq('type_code', code)
          .maybeSingle();
        if (again.data) return { success: true, data: again.data, created: false };
      }
      throw insertErr;
    }

    return { success: true, data: inserted, created: true };
  } catch (error) {
    console.error('ensureTeamType:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set optional change reason for the current DB transaction (v1082 history triggers).
 * @param {string} [reason]
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function setTeamChangeReason(reason = '') {
  try {
    const { error } = await platformDb.rpc('set_team_change_reason', {
      p_reason: String(reason || '').trim(),
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('setTeamChangeReason:', error);
    return { success: false, error: error.message };
  }
}

export async function clearTeamChangeReason() {
  try {
    const { error } = await platformDb.rpc('clear_team_change_reason');
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('clearTeamChangeReason:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load append-only change history for a team (newest first).
 * @param {string} teamId UUID
 * @returns {Promise<{ success: boolean, data: Array, error?: string }>}
 */
export async function getTeamChangeHistory(teamId) {
  try {
    if (!teamId) return { success: false, data: [], error: 'Team id is required' };

    const { data, error } = await platformDb
      .from('team_change_history')
      .select(
        `
        id,
        team_id,
        project_id,
        entity_type,
        team_member_id,
        user_id,
        event_type,
        changes,
        change_reason,
        changed_by,
        changed_at,
        source_event
      `,
      )
      .eq('team_id', teamId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const userIds = [
      ...new Set(
        rows
          .flatMap((r) => [r.changed_by, r.user_id])
          .filter(Boolean),
      ),
    ];
    let byId = new Map();
    if (userIds.length) {
      const { data: users, error: uErr } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      if (uErr) {
        console.warn('getTeamChangeHistory: user lookup failed', uErr.message);
      } else {
        byId = new Map((users || []).map((u) => [u.id, u]));
      }
    }

    return {
      success: true,
      data: rows.map((r) => ({
        ...r,
        changed_by_user: r.changed_by ? byId.get(r.changed_by) || null : null,
        member_user: r.user_id ? byId.get(r.user_id) || null : null,
      })),
    };
  } catch (error) {
    console.error('getTeamChangeHistory:', error);
    return { success: false, data: [], error: error.message };
  }
}
