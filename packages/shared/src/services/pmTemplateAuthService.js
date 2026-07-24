/**
 * Entity-scoped authorization for PM template node customisation (v785 Gap 1).
 * Wraps public/sim.can_manage_pm_template_node — same rules as RLS.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db - platformDb or simDb
 * @param {{
 *   accountId: string,
 *   tier: string,
 *   scopeEntityType?: string|null,
 *   scopeEntityId?: string|null,
 *   isSystemSynced?: boolean,
 * }} args
 * @returns {Promise<boolean>}
 */
export async function canManagePmTemplateNode(db, {
  accountId,
  tier,
  scopeEntityType = null,
  scopeEntityId = null,
  isSystemSynced = false,
}) {
  if (!db || !accountId || !tier) return false
  const { data, error } = await db.rpc('can_manage_pm_template_node', {
    p_account_id: accountId,
    p_tier: tier,
    p_scope_entity_type: scopeEntityType,
    p_scope_entity_id: scopeEntityId,
    p_is_system_synced: isSystemSynced,
  })
  if (error) {
    console.warn('can_manage_pm_template_node failed:', error.message)
    return false
  }
  return data === true
}
