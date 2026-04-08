/**
 * Risk interdependency links (risk_links)
 */

import { platformDb } from './supabase/supabaseClient'

export async function getLinksByRisk(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risk_links')
      .select(`
        *,
        source_risk:source_risk_id(id, risk_title, risk_ref),
        target_risk:target_risk_id(id, risk_title, risk_ref)
      `)
      .or(`source_risk_id.eq.${riskId},target_risk_id.eq.${riskId}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (e) {
    console.error('getLinksByRisk', e)
    return { success: false, error: e.message, data: [] }
  }
}

export async function createLink(sourceRiskId, targetRiskId, linkType, linkDescription = '') {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow, error: uErr } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (uErr || !userRow) throw new Error('User record not found')

    const { data, error } = await platformDb
      .from('risk_links')
      .insert({
        source_risk_id: sourceRiskId,
        target_risk_id: targetRiskId,
        link_type: linkType,
        link_description: linkDescription || null,
        created_by: userRow.id,
      })
      .select(`
        *,
        source_risk:source_risk_id(id, risk_title, risk_ref),
        target_risk:target_risk_id(id, risk_title, risk_ref)
      `)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (e) {
    console.error('createLink', e)
    return { success: false, error: e.message }
  }
}

export async function deleteLink(linkId) {
  try {
    const { error } = await platformDb.from('risk_links').delete().eq('id', linkId)
    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('deleteLink', e)
    return { success: false, error: e.message }
  }
}
