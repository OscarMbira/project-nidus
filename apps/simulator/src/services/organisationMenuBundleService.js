/**
 * Menu Bundle Service (v914)
 * "Manage Menu Bundles" — lets the same admin population as "Manage Roles" save a named,
 * reusable set of existing sidebar menu items, then quickly "start from" it when creating or
 * editing a custom role. Attaching a bundle copies its items into a role's grants at save time
 * (one-time copy, not a live link) — editing or deleting a bundle afterward never retroactively
 * changes a role already built from it.
 *
 * All writes go through SECURITY DEFINER RPCs (SQL/v915_org_menu_bundles_rpcs.sql) —
 * org_menu_bundles/org_menu_bundle_items stay RLS-restricted for direct client writes (rule 42:
 * do not bypass RLS as a workaround). This service only reads directly and calls RPCs to write.
 */

import { supabase } from './supabaseClient'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUNDLE_SELECT = 'id, account_id, bundle_name, description, is_active, created_at, updated_at'

/**
 * This organisation's active Menu Bundles, alphabetical by name (rule 40.1 default sort).
 * @param {string} accountId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getOrgMenuBundles(accountId) {
  try {
    if (!accountId) return { success: false, data: [], error: 'Missing organisation id' }

    const { data, error } = await supabase
      .from('org_menu_bundles')
      .select(`${BUNDLE_SELECT}, bundle_items:org_menu_bundle_items(count)`)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('bundle_name', { ascending: true })

    if (error) throw error
    const rows = (data || []).map(({ bundle_items, ...rest }) => ({
      ...rest,
      itemCount: bundle_items?.[0]?.count ?? 0,
    }))
    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('getOrgMenuBundles:', error)
    return { success: false, data: [], error: error.message || 'Failed to load menu bundles' }
  }
}

/**
 * A single bundle (with its items) by UUID or its friendly, per-account-unique `bundle_name`
 * (rule 16.3 — a bundle has no Admin ID Generation display_id, but its name is unique per
 * organisation, so it serves the same friendly-URL role `role_name` plays for custom roles).
 * Unlike `role_name`, `bundle_name` is free text, not a pre-slugified column — the caller is
 * expected to pass it `decodeURIComponent`-ed from the route param; matching is a plain
 * case-insensitive comparison done client-side (not `.ilike()`, since a bundle name can contain
 * `%`/`_`, which `ilike` treats as wildcards).
 * @param {string} idOrBundleName
 * @param {string|null} [knownAccountId] - pass this when the caller already resolved the
 *   account id (e.g. from `getManageRolesAccess()` fired in the same batch) so the friendly-name
 *   lookup path below doesn't redundantly re-run account resolution — that cascade can be
 *   several sequential queries deep on a cold cache, and running it twice concurrently just
 *   doubles the DB load for no speed benefit. Only used for the non-UUID branch.
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getMenuBundleById(idOrBundleName, knownAccountId = null) {
  try {
    if (!idOrBundleName) return { success: false, data: null, error: 'Missing bundle id' }

    let bundle = null
    if (UUID_RE.test(idOrBundleName)) {
      const { data, error } = await supabase
        .from('org_menu_bundles')
        .select(BUNDLE_SELECT)
        .eq('id', idOrBundleName)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      bundle = data
    } else {
      const accountId = knownAccountId || (await getCurrentUserAccountId())
      if (!accountId) return { success: false, data: null, error: 'Could not resolve your organisation' }

      const { data, error } = await supabase
        .from('org_menu_bundles')
        .select(BUNDLE_SELECT)
        .eq('account_id', accountId)
        .eq('is_active', true)
      if (error) throw error
      const target = idOrBundleName.trim().toLowerCase()
      bundle = (data || []).find((b) => b.bundle_name.trim().toLowerCase() === target) || null
    }

    if (!bundle) return { success: false, data: null, error: 'Menu bundle not found' }

    const { data: items, error: itemsErr } = await supabase
      .from('org_menu_bundle_items')
      .select('menu_item_id')
      .eq('bundle_id', bundle.id)
    if (itemsErr) throw itemsErr

    return {
      success: true,
      data: { ...bundle, menuItemIds: (items || []).map((i) => i.menu_item_id) },
      error: null,
    }
  } catch (error) {
    console.error('getMenuBundleById:', error)
    return { success: false, data: null, error: error.message || 'Failed to load menu bundle' }
  }
}

/**
 * @param {object} params
 * @param {string} params.bundleName
 * @param {string} [params.description]
 * @param {string[]} [params.menuItemIds]
 */
export async function createOrgMenuBundle({ bundleName, description = null, menuItemIds = [] }) {
  try {
    const accountId = await getCurrentUserAccountId()
    if (!accountId) throw new Error('Could not resolve your organisation')

    const { data, error } = await supabase.rpc('create_org_menu_bundle', {
      p_account_id: accountId,
      p_bundle_name: bundleName,
      p_description: description,
      p_menu_item_ids: menuItemIds,
    })

    if (error) throw error
    return { success: true, data: { bundleId: data }, error: null }
  } catch (error) {
    console.error('createOrgMenuBundle:', error)
    return { success: false, data: null, error: error.message || 'Failed to create menu bundle' }
  }
}

/**
 * @param {object} params
 * @param {string} params.bundleId
 * @param {string} params.bundleName
 * @param {string} [params.description]
 * @param {string[]} [params.menuItemIds]
 */
export async function updateOrgMenuBundle({ bundleId, bundleName, description = null, menuItemIds = [] }) {
  try {
    const { error } = await supabase.rpc('update_org_menu_bundle', {
      p_bundle_id: bundleId,
      p_bundle_name: bundleName,
      p_description: description,
      p_menu_item_ids: menuItemIds,
    })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateOrgMenuBundle:', error)
    return { success: false, error: error.message || 'Failed to update menu bundle' }
  }
}

/**
 * Soft-deletes a bundle (PRD decision 6) — has no effect on any role already built from it,
 * since attaching a bundle is a one-time copy, not a live link (PRD decision 2).
 * @param {string} bundleId
 */
export async function deleteOrgMenuBundle(bundleId) {
  try {
    const { error } = await supabase.rpc('delete_org_menu_bundle', { p_bundle_id: bundleId })
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteOrgMenuBundle:', error)
    return { success: false, error: error.message || 'Failed to delete menu bundle' }
  }
}
