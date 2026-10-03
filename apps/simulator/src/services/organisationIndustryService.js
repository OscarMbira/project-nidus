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

/**
 * Which real (non-Cross-Industry) industry pack, if any, "owns" each menu item this account's
 * selected industries make available — used by the pack-grouped sidebar (v930) to bucket the
 * already-resolved menu tree into top-level sections. Cross-Industry's own items are
 * deliberately excluded: they belong in the sidebar's "Core Project Management" section, same
 * as any menu item never classified into any industry_pack_menu_items row at all (v930 PRD
 * decision 6 — fail-open items and the Generic PM pack both read as "Core").
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: {sections: Array<{packId: string, industryCategoryId: string, packName: string, isPrimary: boolean}>, menuCodeToPack: Map<string, string>}, error: string|null}>}
 */
/**
 * @param {string} accountId
 * @param {string[] | null} [restrictToIndustryCategoryIds] — when provided, only these
 *   industries' sections/menu items are included even if the account has more selected.
 *   Used to narrow project-scoped roles (pm/tm layout) to just their assigned project(s)'
 *   industries; org-wide roles pass null and see every account-selected industry as before.
 */
export async function getMenuItemIndustryPackMap(accountId, restrictToIndustryCategoryIds = null) {
  const empty = { sections: [], menuCodeToPack: new Map() }
  if (!accountId) return { success: true, data: empty, error: null }
  try {
    const [industriesRes, crossIndustryRes] = await Promise.all([
      supabase
        .from('account_industries')
        .select('industry_category_id, is_primary')
        .eq('account_id', accountId)
        .order('is_primary', { ascending: false }),
      supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
    ])
    if (industriesRes.error) throw industriesRes.error

    const crossIndustryId = crossIndustryRes.data?.id || null
    // Every industry the ACCOUNT has enabled (unrestricted) — needed so an excluded pack's menu
    // codes still resolve to a real owner below and get dropped, instead of falling through to
    // 'core' (which is groupMenuTreeByIndustryPack's default for a menu_code with no owner at
    // all). `restrictToIndustryCategoryIds` narrows which of these actually get a section shown.
    const allRealIndustries = (industriesRes.data || []).filter(
      (r) => r.industry_category_id && r.industry_category_id !== crossIndustryId
    )
    if (allRealIndustries.length === 0) return { success: true, data: empty, error: null }

    let restrictedIndustries = allRealIndustries
    if (Array.isArray(restrictToIndustryCategoryIds)) {
      const allowed = new Set(restrictToIndustryCategoryIds)
      restrictedIndustries = allRealIndustries.filter((r) => allowed.has(r.industry_category_id))
    }

    const allIndustryCategoryIds = allRealIndustries.map((r) => r.industry_category_id)
    const primaryById = new Map(allRealIndustries.map((r) => [r.industry_category_id, !!r.is_primary]))

    const { data: allPacks, error: packsErr } = await supabase
      .from('industry_packs')
      .select('id, industry_category_id, pack_name')
      .in('industry_category_id', allIndustryCategoryIds)
      .eq('is_active', true)
    if (packsErr) throw packsErr
    if (!allPacks || allPacks.length === 0) return { success: true, data: empty, error: null }

    const restrictedCategoryIds = new Set(restrictedIndustries.map((r) => r.industry_category_id))

    // Preserve the account_industries primary-first order, not the packs query's own order.
    // Only restricted (allowed) industries get a rendered section.
    const sections = allIndustryCategoryIds
      .filter((catId) => restrictedCategoryIds.has(catId))
      .map((catId) => allPacks.find((p) => p.industry_category_id === catId))
      .filter(Boolean)
      .map((p) => ({
        packId: p.id,
        industryCategoryId: p.industry_category_id,
        packName: p.pack_name,
        isPrimary: !!primaryById.get(p.industry_category_id),
      }))

    // Built from EVERY enabled-industry pack (not just the restricted/shown ones) so
    // groupMenuTreeByIndustryPack's pruneToOwner correctly identifies an excluded pack's menu
    // codes as "owned by a pack that isn't being shown" (drop) rather than "no owner" (keep as
    // core) — see the comment above allRealIndustries for the live incident this fixes.
    const { data: items, error: itemsErr } = await supabase
      .from('industry_pack_menu_items')
      .select('industry_pack_id, menu_items(menu_code)')
      .in('industry_pack_id', allPacks.map((p) => p.id))
    if (itemsErr) throw itemsErr

    const menuCodeToPack = new Map()
    ;(items || []).forEach((row) => {
      const code = row.menu_items?.menu_code
      if (code) menuCodeToPack.set(code, row.industry_pack_id)
    })

    return { success: true, data: { sections, menuCodeToPack }, error: null }
  } catch (error) {
    console.error('getMenuItemIndustryPackMap:', error)
    return { success: false, data: empty, error: error.message || 'Failed to load industry pack menu map' }
  }
}

/**
 * The organisation's own selected industries, with display names — for the project
 * wizard's "Industry" dropdown, which is restricted to what the Account Owner/PMO already
 * picked in Organisation Industries settings rather than the full industry_categories list.
 * Excludes Cross-Industry (always-on baseline, not a real selectable industry).
 */
export async function getOrgIndustryOptions(accountId) {
  if (!accountId) return { success: true, data: [], error: null }
  try {
    const [industriesRes, crossIndustryRes] = await Promise.all([
      supabase
        .from('account_industries')
        .select('industry_category_id, is_primary')
        .eq('account_id', accountId)
        .order('is_primary', { ascending: false }),
      supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
    ])
    if (industriesRes.error) throw industriesRes.error

    const crossIndustryId = crossIndustryRes.data?.id || null
    const realIndustries = (industriesRes.data || []).filter(
      (r) => r.industry_category_id && r.industry_category_id !== crossIndustryId
    )
    if (realIndustries.length === 0) return { success: true, data: [], error: null }

    const categoryIds = realIndustries.map((r) => r.industry_category_id)
    const { data: categories, error: catErr } = await supabase
      .from('industry_categories')
      .select('id, name')
      .in('id', categoryIds)
    if (catErr) throw catErr

    const nameById = new Map((categories || []).map((c) => [c.id, c.name]))
    const options = realIndustries
      .map((r) => ({
        id: r.industry_category_id,
        name: nameById.get(r.industry_category_id) || 'Unknown industry',
        is_primary: !!r.is_primary,
      }))
      .filter((o) => nameById.has(o.id))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { success: true, data: options, error: null }
  } catch (error) {
    console.error('getOrgIndustryOptions:', error)
    return { success: false, data: [], error: error.message || 'Failed to load organisation industries' }
  }
}

/**
 * The single currently-open project's own industry_category_id, as a 0-or-1-element array
 * (same return shape as getUserProjectIndustryIds, so both plug into
 * getMenuItemIndustryPackMap's restrictToIndustryCategoryIds the same way).
 *
 * Replaces the old "union across every project this user is assigned to" behaviour for the
 * pm/tm-layout sidebar (Platform fix, 2026-09-10, mirrored here for parity): a user who also
 * holds a role on an unrelated industry's project was seeing that pack's whole menu block while
 * viewing an unrelated project, because the sidebar's industry filter was scoped to the user's
 * entire project portfolio rather than the one project actually open.
 *
 * Reads project_industries first. When that set is empty, or the junction table is not
 * available yet, falls back to projects.industry_category_id. Callers that still get an
 * empty list should show the organisation's selected industries (pass null into
 * getMenuItemIndustryPackMap) rather than hiding every industry pack.
 */
export async function getProjectIndustryCategoryIds(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data: junctionRows, error: junctionErr } = await supabase
      .from('project_industries')
      .select('industry_category_id')
      .eq('project_id', projectId)

    const junctionIds = junctionErr
      ? []
      : [...new Set((junctionRows || []).map((r) => r.industry_category_id).filter(Boolean))]
    if (junctionIds.length > 0) {
      return { success: true, data: junctionIds, error: null }
    }

    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('industry_category_id')
      .eq('id', projectId)
      .maybeSingle()
    if (projectErr) throw projectErr

    return {
      success: true,
      data: project?.industry_category_id ? [project.industry_category_id] : [],
      error: null,
    }
  } catch (error) {
    console.error('getProjectIndustryCategoryIds:', error)
    return { success: false, data: [], error: error.message || 'Failed to load project industry' }
  }
}

/**
 * Distinct industry_category_ids of the projects this user holds a project-scoped role on
 * (user_roles.project_id IS NOT NULL). Superseded by getProjectIndustryCategoryIds for the
 * pm/tm-layout sidebar (see its comment) — kept as a general-purpose utility, not currently
 * called from useMenu.js.
 */
export async function getUserProjectIndustryIds(userId) {
  if (!userId) return { success: true, data: [], error: null }
  try {
    const { data: roleRows, error: roleErr } = await supabase
      .from('user_roles')
      .select('project_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('project_id', 'is', null)
    if (roleErr) throw roleErr

    const projectIds = [...new Set((roleRows || []).map((r) => r.project_id).filter(Boolean))]
    if (projectIds.length === 0) return { success: true, data: [], error: null }

    const { data: projectRows, error: projErr } = await supabase
      .from('projects')
      .select('industry_category_id')
      .in('id', projectIds)
      .not('industry_category_id', 'is', null)
    if (projErr) throw projErr

    const industryIds = [...new Set((projectRows || []).map((r) => r.industry_category_id).filter(Boolean))]
    return { success: true, data: industryIds, error: null }
  } catch (error) {
    console.error('getUserProjectIndustryIds:', error)
    return { success: false, data: [], error: error.message || 'Failed to load project industries' }
  }
}

export default {
  getOrgIndustries,
  getOrgCapabilities,
  toggleOrganisationCapability,
  getGettingStartedSummary,
  getMenuItemIndustryPackMap,
  getOrgIndustryOptions,
  getUserProjectIndustryIds,
  getProjectIndustryCategoryIds,
}
