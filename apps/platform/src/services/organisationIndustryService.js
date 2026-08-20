/**
 * Organisation Industry & Capability Service (v918, Phase 7)
 * Reads for the "Organisation Settings — Industries & Capabilities" page. Writes go through
 * SECURITY DEFINER RPCs (provisionOrganisationTenant in organisationService.js for industries;
 * toggle_organisation_capability here for capabilities) — organisation_disabled_capabilities
 * only grants direct-client SELECT (v920), so a plain client insert/delete would be RLS-blocked
 * (rule 42: RLS stays the write gate, not bypassed).
 */

import { supabase } from './supabaseClient'

/**
 * This account's selected industries (+ segment + primary flag), for the settings page's
 * industry-management panel.
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrgIndustries(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('account_industries')
      .select('id, industry_category_id, industry_segment_id, is_primary, added_at')
      .eq('account_id', accountId)
      .order('is_primary', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getOrgIndustries:', error)
    return { success: false, data: [], error: error.message || 'Failed to load organisation industries' }
  }
}

/**
 * Every industry-pack menu item available to this account (Generic PM + its selected
 * industries), with each item's current disabled/enabled state — the "Modules & Capabilities"
 * panel's row data.
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrgCapabilities(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const [industriesRes, crossIndustryRes] = await Promise.all([
      supabase.from('account_industries').select('industry_category_id').eq('account_id', accountId),
      supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
    ])
    if (industriesRes.error) throw industriesRes.error

    const industryCategoryIds = new Set((industriesRes.data || []).map((r) => r.industry_category_id))
    if (crossIndustryRes.data?.id) industryCategoryIds.add(crossIndustryRes.data.id)
    if (industryCategoryIds.size === 0) return { success: true, data: [], error: null }

    const { data: packs, error: packsErr } = await supabase
      .from('industry_packs')
      .select('id, pack_name')
      .in('industry_category_id', Array.from(industryCategoryIds))
      .eq('is_active', true)
    if (packsErr) throw packsErr
    if (!packs || packs.length === 0) return { success: true, data: [], error: null }

    const packNameById = new Map(packs.map((p) => [p.id, p.pack_name]))

    const [itemsRes, disabledRes] = await Promise.all([
      supabase
        .from('industry_pack_menu_items')
        .select('id, industry_pack_id, menu_item_id, menu_items(menu_label)')
        .in('industry_pack_id', packs.map((p) => p.id)),
      supabase
        .from('organisation_disabled_capabilities')
        .select('industry_pack_menu_item_id')
        .eq('account_id', accountId),
    ])
    if (itemsRes.error) throw itemsRes.error
    if (disabledRes.error) throw disabledRes.error

    const disabledIds = new Set((disabledRes.data || []).map((r) => r.industry_pack_menu_item_id))

    const rows = (itemsRes.data || [])
      .map((row) => ({
        id: row.id,
        packName: packNameById.get(row.industry_pack_id) || 'Unknown pack',
        menuLabel: row.menu_items?.menu_label || 'Unnamed item',
        disabled: disabledIds.has(row.id),
      }))
      .sort((a, b) => a.packName.localeCompare(b.packName) || a.menuLabel.localeCompare(b.menuLabel))

    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('getOrgCapabilities:', error)
    return { success: false, data: [], error: error.message || 'Failed to load organisation capabilities' }
  }
}

/**
 * Enable/disable one industry-pack menu item for this account (PRD decision 7 — disable-only;
 * there is deliberately no "enable outside my packs" concept).
 * @param {string} accountId
 * @param {string} industryPackMenuItemId
 * @param {boolean} disabled
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function toggleOrganisationCapability(accountId, industryPackMenuItemId, disabled) {
  try {
    const { error } = await supabase.rpc('toggle_organisation_capability', {
      p_account_id: accountId,
      p_industry_pack_menu_item_id: industryPackMenuItemId,
      p_disabled: disabled,
    })
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('toggleOrganisationCapability:', error)
    return { success: false, error: error.message || 'Failed to update capability' }
  }
}

/**
 * "Your workspace includes" summary for the getting-started page (v918, Phase 9) — Generic PM
 * (Cross-Industry pack) is always included; one entry per selected industry's pack. Each pack's
 * features come from industry_pack_features (descriptive labels, v920) when curated; falls back
 * to the pack's own name when no feature rows exist yet for it rather than inventing copy
 * (rule 25.1 — no hardcoding; an empty industry_pack_features table is a real, honest gap, not
 * something to paper over client-side).
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getGettingStartedSummary(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const [industriesRes, crossIndustryRes] = await Promise.all([
      supabase.from('account_industries').select('industry_category_id').eq('account_id', accountId),
      supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
    ])
    if (industriesRes.error) throw industriesRes.error

    const industryCategoryIds = new Set((industriesRes.data || []).map((r) => r.industry_category_id))
    if (crossIndustryRes.data?.id) industryCategoryIds.add(crossIndustryRes.data.id)
    if (industryCategoryIds.size === 0) return { success: true, data: [], error: null }

    const { data: packs, error: packsErr } = await supabase
      .from('industry_packs')
      .select('id, pack_name')
      .in('industry_category_id', Array.from(industryCategoryIds))
      .eq('is_active', true)
    if (packsErr) throw packsErr
    if (!packs || packs.length === 0) return { success: true, data: [], error: null }

    const { data: features, error: featuresErr } = await supabase
      .from('industry_pack_features')
      .select('industry_pack_id, feature_label')
      .in('industry_pack_id', packs.map((p) => p.id))
      .order('display_order', { ascending: true })
    if (featuresErr) throw featuresErr

    const featuresByPack = new Map()
    ;(features || []).forEach((f) => {
      if (!featuresByPack.has(f.industry_pack_id)) featuresByPack.set(f.industry_pack_id, [])
      featuresByPack.get(f.industry_pack_id).push(f.feature_label)
    })

    const summary = packs
      .map((p) => ({
        packName: p.pack_name,
        features: featuresByPack.get(p.id) || [],
      }))
      .sort((a, b) => a.packName.localeCompare(b.packName))

    return { success: true, data: summary, error: null }
  } catch (error) {
    console.error('getGettingStartedSummary:', error)
    return { success: false, data: [], error: error.message || 'Failed to load workspace summary' }
  }
}

export default {
  getOrgIndustries,
  getOrgCapabilities,
  toggleOrganisationCapability,
  getGettingStartedSummary,
}
