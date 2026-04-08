/**
 * CMS Roles and Responsibilities Service
 */

import { platformDb } from './supabaseClient';

export async function addRole(cmsId, roleData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_roles_responsibilities')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_roles_responsibilities')
      .insert({ ...roleData, cms_id: cmsId, display_order: roleData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding role:', error);
    throw error;
  }
}

export async function updateRole(roleId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_roles_responsibilities')
      .update(updates)
      .eq('id', roleId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
}

export async function deleteRole(roleId) {
  try {
    const { error } = await platformDb.from('cms_roles_responsibilities').delete().eq('id', roleId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
}

export async function getRoles(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_roles_responsibilities')
      .select(`
        *,
        assigned_to:assigned_to_id(id, full_name, email)
      `)
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

export async function assignRole(roleId, userId) {
  try {
    // Get user details
    const { data: user } = await platformDb
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    if (!user) throw new Error('User not found');

    const { data, error } = await platformDb
      .from('cms_roles_responsibilities')
      .update({
        assigned_to_id: userId,
        assigned_to_name: user.full_name
      })
      .eq('id', roleId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning role:', error);
    throw error;
  }
}
