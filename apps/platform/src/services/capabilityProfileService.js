/**
 * Capability Profile service (v982 Phase 6 — Capability Profiles, brief §12).
 * A profile is a curated default MENU-VISIBILITY selection layered on top of the existing v918
 * industry-pack entitlement model (PRD decision 2 — no new feature-flag enforcement layer this
 * phase). Applying a profile is a one-time bulk-set action (PRD decision 3) that reconciles the
 * account's existing organisation_disabled_capabilities overrides against the profile's declared
 * default set, reusing the SAME toggle_organisation_capability RPC the "Modules & Capabilities"
 * settings page already uses (organisationIndustryService.js) — never a new write path, never a
 * new override table (rule 42: writes stay behind the existing RLS-gated RPC).
 *
 * IMPORTANT structural property this service relies on for safety: organisation_disabled_
 * capabilities can only ever target a row in industry_pack_menu_items (a menu item reachable
 * through some industry pack the account selected). A menu item granted through any OTHER path
 * (e.g. a role_menu_items grant with no industry-pack linkage at all — the shape a genuine paying
 * entitlement outside the free/ungated industry-pack model would take) is structurally
 * unreachable by this service's reconciliation loop, because it never appears in the
 * account's own industry_pack_menu_items result set in the first place. Applying a profile can
 * therefore never revoke such an entitlement — see capabilityProfileService.test.js's explicit
 * test of this property.
 */
import { supabase } from './supabaseClient'

/**
 * The 4 Capability Profile tiers, ordered.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProfiles() {
  try {
    const { data, error } = await supabase
      .from('capability_profiles')
      .select('id, tier_code, tier_name, tier_order, description, is_active')
      .eq('is_active', true)
      .order('tier_order', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getProfiles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load capability profiles' }
  }
}

/**
 * The account's currently-applied profile (informational — PRD decision 3, not an enforced
 * ceiling), or null if none has ever been applied.
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountCapabilityProfile(accountId) {
  try {
    if (!accountId) return { success: true, data: null, error: null }
    const { data: account, error: accountErr } = await supabase
      .from('accounts')
      .select('capability_profile_id, capability_profile_applied_at, capability_profile_applied_by')
      .eq('id', accountId)
      .maybeSingle()
    if (accountErr) throw accountErr
    if (!account?.capability_profile_id) return { success: true, data: null, error: null }

    const { data: profile, error: profileErr } = await supabase
      .from('capability_profiles')
      .select('id, tier_code, tier_name, tier_order, description')
      .eq('id', account.capability_profile_id)
      .maybeSingle()
    if (profileErr) throw profileErr
    if (!profile) return { success: true, data: null, error: null }
    return {
      success: true,
      data: {
        ...profile,
        appliedAt: account.capability_profile_applied_at || null,
        appliedBy: account.capability_profile_applied_by || null,
      },
      error: null,
    }
  } catch (error) {
    console.error('getAccountCapabilityProfile:', error)
    return { success: false, data: null, error: error.message || 'Failed to load the account\'s capability profile' }
  }
}

/**
 * Every menu item a profile declares as its default set — used to render "what this tier
 * unlocks" in the picker UI.
 * @param {string} profileId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getProfileMenuItems(profileId) {
  try {
    if (!profileId) return { success: true, data: [], error: null }
    const { data, error } = await supabase
      .from('capability_profile_menu_items')
      .select('menu_item_id, menu_items(id, menu_label, menu_code)')
      .eq('capability_profile_id', profileId)
    if (error) throw error
    return {
      success: true,
      data: (data || [])
        .map((r) => ({ id: r.menu_item_id, label: r.menu_items?.menu_label || r.menu_items?.menu_code || 'Unnamed item' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      error: null,
    }
  } catch (error) {
    console.error('getProfileMenuItems:', error)
    return { success: false, data: [], error: error.message || 'Failed to load profile contents' }
  }
}

/** Every industry_pack_menu_items row (id, menu_item_id) this account can currently reach — same
 * resolution organisationIndustryService.js's getOrgCapabilities() uses (this account's selected
 * industries' packs + the always-included Cross-Industry/Generic pack). */
async function getAccountReachableCapabilityRows(accountId) {
  const [industriesRes, crossIndustryRes] = await Promise.all([
    supabase.from('account_industries').select('industry_category_id').eq('account_id', accountId),
    supabase.from('industry_categories').select('id').eq('name', 'Cross-Industry').eq('is_active', true).maybeSingle(),
  ])
  if (industriesRes.error) throw industriesRes.error

  const industryCategoryIds = new Set((industriesRes.data || []).map((r) => r.industry_category_id))
  if (crossIndustryRes.data?.id) industryCategoryIds.add(crossIndustryRes.data.id)
  if (industryCategoryIds.size === 0) return []

  const { data: packs, error: packsErr } = await supabase
    .from('industry_packs')
    .select('id')
    .in('industry_category_id', Array.from(industryCategoryIds))
    .eq('is_active', true)
  if (packsErr) throw packsErr
  if (!packs || packs.length === 0) return []

  const { data: items, error: itemsErr } = await supabase
    .from('industry_pack_menu_items')
    .select('id, menu_item_id')
    .in('industry_pack_id', packs.map((p) => p.id))
  if (itemsErr) throw itemsErr
  return items || []
}

/**
 * Applies a Capability Profile to an account: bulk-reconciles organisation_disabled_capabilities
 * so the account's menu visibility matches the profile's declared default set EXACTLY, no
 * more/fewer (task D) — enabling anything the profile includes that's currently disabled,
 * disabling anything reachable-but-not-in-the-profile that's currently enabled. Skips any item
 * already in the correct state (no-op toggle calls), which is what makes re-applying the same
 * profile a true no-op the second time (idempotency, task D) rather than just "ending in the same
 * state via redundant writes".
 * @param {string} accountId
 * @param {string} profileId
 * @param {(current: number, total: number) => void} [onProgress] - optional progress callback
 * @returns {Promise<{success: boolean, enabled: number, disabled: number, unchanged: number, error: string|null}>}
 */
export async function applyProfileToAccount(accountId, profileId, onProgress) {
  try {
    if (!accountId || !profileId) return { success: false, enabled: 0, disabled: 0, unchanged: 0, error: 'Missing account or profile id' }

    const [profileItemsRes, reachableRows, disabledRes] = await Promise.all([
      supabase.from('capability_profile_menu_items').select('menu_item_id').eq('capability_profile_id', profileId),
      getAccountReachableCapabilityRows(accountId),
      supabase.from('organisation_disabled_capabilities').select('industry_pack_menu_item_id').eq('account_id', accountId),
    ])
    if (profileItemsRes.error) throw profileItemsRes.error
    if (disabledRes.error) throw disabledRes.error

    const profileMenuItemIds = new Set((profileItemsRes.data || []).map((r) => r.menu_item_id))
    const currentlyDisabledIds = new Set((disabledRes.data || []).map((r) => r.industry_pack_menu_item_id))

    let enabled = 0
    let disabled = 0
    let unchanged = 0
    const total = reachableRows.length
    let processed = 0

    for (const row of reachableRows) {
      const shouldBeEnabled = profileMenuItemIds.has(row.menu_item_id)
      const isCurrentlyDisabled = currentlyDisabledIds.has(row.id)

      if (shouldBeEnabled && isCurrentlyDisabled) {
        const { error } = await supabase.rpc('toggle_organisation_capability', {
          p_account_id: accountId,
          p_industry_pack_menu_item_id: row.id,
          p_disabled: false,
        })
        if (error) throw error
        enabled += 1
      } else if (!shouldBeEnabled && !isCurrentlyDisabled) {
        const { error } = await supabase.rpc('toggle_organisation_capability', {
          p_account_id: accountId,
          p_industry_pack_menu_item_id: row.id,
          p_disabled: true,
        })
        if (error) throw error
        disabled += 1
      } else {
        unchanged += 1
      }
      processed += 1
      if (onProgress) onProgress(processed, total)
    }

    const { data: { user } = {} } = await supabase.auth.getUser()
    const { data: userRow } = user
      ? await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      : { data: null }

    const { error: acctErr } = await supabase
      .from('accounts')
      .update({
        capability_profile_id: profileId,
        capability_profile_applied_at: new Date().toISOString(),
        capability_profile_applied_by: userRow?.id || null,
      })
      .eq('id', accountId)
    if (acctErr) throw acctErr

    return { success: true, enabled, disabled, unchanged, error: null }
  } catch (error) {
    console.error('applyProfileToAccount:', error)
    return { success: false, enabled: 0, disabled: 0, unchanged: 0, error: error.message || 'Failed to apply capability profile' }
  }
}
