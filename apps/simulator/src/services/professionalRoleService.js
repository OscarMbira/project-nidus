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

/**
 * The current user's own professional role code (e.g. 'pmo_professional',
 * 'portfolio_manager') — used to tailor the post-registration Getting Started CTA
 * (v918 follow-up: PMO/Programme/Portfolio-facing users aren't funneled toward
 * "create a project" — they can create a Portfolio/Programme/Project later via the
 * existing PMO functionality, or nothing at all yet).
 * @returns {Promise<{success: boolean, roleCode: string|null, error: string|null}>}
 */
export async function getMyProfessionalRoleCode() {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { success: true, roleCode: null, error: null }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('professional_role_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()
    if (userError) throw userError
    if (!userRow?.professional_role_id) return { success: true, roleCode: null, error: null }

    const { data: roleRow, error: roleError } = await supabase
      .from('professional_roles')
      .select('role_code')
      .eq('id', userRow.professional_role_id)
      .maybeSingle()
    if (roleError) throw roleError

    return { success: true, roleCode: roleRow?.role_code || null, error: null }
  } catch (error) {
    console.error('getMyProfessionalRoleCode:', error)
    return { success: false, roleCode: null, error: error.message || 'Failed to load professional role' }
  }
}

export default {
  getProfessionalRoles,
  updateUserProfessionalRole,
  getMyProfessionalRoleCode,
}
