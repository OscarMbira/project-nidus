/**
 * Team Service
 * Provides team management, resource directory, skill matrix, and capacity planning
 */

import { platformDb } from './supabase/supabaseClient';

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
          account_id
        )
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('team_name', { ascending: true });

    if (error) throw error;

    return { success: true, data: teams || [] };
  } catch (error) {
    console.error('Error getting teams:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get team detail with members
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team detail
 */
export async function getTeamDetail(teamId) {
  try {
    // Get team
    const { data: team, error: teamError } = await platformDb
      .from('teams')
      .select(`
        *,
        projects(
          id,
          project_name,
          account_id
        )
      `)
      .eq('id', teamId)
      .eq('is_deleted', false)
      .single();

    if (teamError) throw teamError;

    // Get team members
    const { data: members, error: membersError } = await platformDb
      .from('team_members')
      .select(`
        *,
        users(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .eq('is_deleted', false)
      .eq('is_active', true);

    if (membersError) throw membersError;

    return {
      success: true,
      data: {
        ...team,
        members: members || []
      }
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
        team_description: teamData.team_description,
        team_type: teamData.team_type,
        team_lead_user_id: teamData.team_lead_user_id,
        max_team_size: teamData.max_team_size,
        is_active: true
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
      .select('id, full_name, email, avatar_url, phone, job_title, department')
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
        users ( id, full_name, email, avatar_url )
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
 */
export async function getAssignableProjectMembers(projectId, teamId) {
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

    const { data: existing, error: eErr } = await platformDb
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('is_deleted', false);

    if (eErr) throw eErr;

    const taken = new Set((existing || []).map((r) => r.user_id));
    const rows = (memberships || []).filter((m) => m.user_id && !taken.has(m.user_id));
    return { success: true, data: rows };
  } catch (error) {
    console.error('getAssignableProjectMembers:', error);
    return { success: false, data: [], error: error.message };
  }
}

export async function addTeamMember(teamId, userId, memberRole, allocationPct) {
  return addMember(teamId, userId, {
    member_role: memberRole ?? null,
    allocation_percentage: allocationPct ?? 100,
  });
}

export async function updateTeamMember(teamMemberId, memberRole, allocationPct) {
  try {
    const { data, error } = await platformDb
      .from('team_members')
      .update({
        member_role: memberRole,
        allocation_percentage: allocationPct,
        updated_at: new Date().toISOString(),
      })
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
      .select('id, team_id, role_label, sort_order, is_active')
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

export async function addTeamFunctionalRole(teamId, roleLabel) {
  try {
    const label = (roleLabel || '').trim();
    if (!label) return { success: false, error: 'Role label is required' };

    const { data, error } = await platformDb
      .from('team_functional_roles')
      .insert({
        team_id: teamId,
        role_label: label,
        sort_order: 999,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('addTeamFunctionalRole:', error);
    return { success: false, data: null, error: error.message };
  }
}

export async function updateTeamFunctionalRole(roleId, roleLabel) {
  try {
    const label = (roleLabel || '').trim();
    if (!label) return { success: false, error: 'Role label is required' };

    const { data, error } = await platformDb
      .from('team_functional_roles')
      .update({ role_label: label, updated_at: new Date().toISOString() })
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
        users ( id, full_name, email )
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
