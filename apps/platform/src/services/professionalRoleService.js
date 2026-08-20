/**
 * Professional Role Service (v918)
 * "Professional role" (e.g. Project Manager, PMO Professional) is informational-only metadata
 * describing what the user does day-to-day — distinct from their SECURITY role (roles/
 * project_roles/role_menu_items), which continues to govern authorization exactly as before.
 * users.professional_role_id is never read by any authorization/RLS check (PRD decision 4),
 * so unlike organisationCustomRoleService.js's role writes, this is a plain client update —
 * no SECURITY DEFINER RPC needed.
 */

import { supabase } from './supabaseClient'

/**
 * Active professional roles (v919) — populates the registration/invitation-acceptance picker.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProfessionalRoles() {
  try {
    const { data, error } = await supabase
      .from('professional_roles')
      .select('id, role_code, role_label, description')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getProfessionalRoles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load professional roles' }
  }
}

/**
 * Sets the current user's professional role. Informational only — see file header.
 * @param {string} userId - users.id (not auth_user_id)
 * @param {string} professionalRoleId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateUserProfessionalRole(userId, professionalRoleId) {
  if (!userId || !professionalRoleId) {
    return { success: false, error: 'userId and professionalRoleId are required' }
  }
  try {
    const { error } = await supabase
      .from('users')
      .update({ professional_role_id: professionalRoleId })
      .eq('id', userId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateUserProfessionalRole:', error)
    return { success: false, error: error.message || 'Failed to save professional role' }
  }
}

export default {
  getProfessionalRoles,
  updateUserProfessionalRole,
}
