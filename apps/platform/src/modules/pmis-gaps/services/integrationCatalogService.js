/**
 * Integrations Marketplace (GAP-25, v963 Phase 21) — public.integration_catalog (browsable
 * catalog of available integration types, largely admin/system-seeded reference data) +
 * public.integration_connections (lightweight per-account connection-status marker against a
 * catalog entry).
 *
 * Complementary to, and fully separate from, the existing "configured connectors" feature
 * (Integrations.jsx / IntegrationConfig.jsx / IntegrationSync.jsx on public.integrations) —
 * NOT touched by this service. The marketplace's "Connect" action marks a connection-status row
 * here, then hands off into IntegrationConfig.jsx for the actual credential/sync configuration;
 * this service does not implement sync or credential logic itself.
 *
 * integration_catalog has no account_id/created_by/is_deleted columns (it's a single global
 * catalog, hard-deleted, no created_by stamping) — writes use direct queries rather than
 * gapDataService's generic create/updateGapRecord (setCreatedBy would 400 on a table with no
 * such column). Catalog writes are admin-only at the RLS layer (public.is_user_pmo_admin),
 * see SQL/v964_integrations_marketplace_catalog_admin_write_rls.sql.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getGapRecord } from './gapDataService'

function db() {
  return platformDb
}

const CATALOG_TABLE = 'integration_catalog'
const CONNECTIONS_TABLE = 'integration_connections'

// ── Catalog ──────────────────────────────────────────────────────────────────

export async function listCatalog() {
  const { data, error } = await db()
    .from(CATALOG_TABLE)
    .select('*')
    .order('integration_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getCatalogEntry(id) {
  return getGapRecord(CATALOG_TABLE, id, { sim: false })
}

export async function createCatalogEntry({
  integrationCode,
  integrationName,
  category,
  description,
  logoUrl,
  isAvailable = true,
  isComingSoon = false,
  setupGuideUrl,
  sortOrder = 0,
}) {
  if (!integrationCode?.trim()) throw new Error('Integration code is required')
  if (!integrationName?.trim()) throw new Error('Integration name is required')
  if (!category?.trim()) throw new Error('Category is required')
  const { data, error } = await db()
    .from(CATALOG_TABLE)
    .insert({
      integration_code: integrationCode.trim(),
      integration_name: integrationName.trim(),
      category: category.trim(),
      description: description || null,
      logo_url: logoUrl || null,
      is_available: !!isAvailable,
      is_coming_soon: !!isComingSoon,
      setup_guide_url: setupGuideUrl || null,
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCatalogEntry(id, {
  integrationCode,
  integrationName,
  category,
  description,
  logoUrl,
  isAvailable,
  isComingSoon,
  setupGuideUrl,
  sortOrder,
}) {
  if (!integrationName?.trim()) throw new Error('Integration name is required')
  if (!category?.trim()) throw new Error('Category is required')
  const { data, error } = await db()
    .from(CATALOG_TABLE)
    .update({
      ...(integrationCode?.trim() ? { integration_code: integrationCode.trim() } : {}),
      integration_name: integrationName.trim(),
      category: category.trim(),
      description: description || null,
      logo_url: logoUrl || null,
      is_available: !!isAvailable,
      is_coming_soon: !!isComingSoon,
      setup_guide_url: setupGuideUrl || null,
      sort_order: sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** No is_deleted column on integration_catalog — this is a real delete (it's a global admin
 *  reference catalog, not an account-scoped business record). */
export async function deleteCatalogEntry(id) {
  const { error } = await db().from(CATALOG_TABLE).delete().eq('id', id)
  if (error) throw error
}

// ── Connections — lightweight status marker only. NOT the real sync/credential store; that
//    remains public.integrations via the untouched IntegrationConfig.jsx flow. ────────────────

export async function listConnectionsForAccount(accountId) {
  if (!accountId) return []
  const { data, error } = await db()
    .from(CONNECTIONS_TABLE)
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function connectIntegration({ accountId, integrationId }) {
  if (!accountId || !integrationId) throw new Error('accountId and integrationId are required')
  const {
    data: { user },
  } = await db().auth.getUser()
  const { data, error } = await db()
    .from(CONNECTIONS_TABLE)
    .upsert(
      {
        account_id: accountId,
        integration_id: integrationId,
        connected_by: user?.id || null,
        connection_status: 'connected',
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,integration_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function disconnectIntegration({ accountId, integrationId }) {
  if (!accountId || !integrationId) throw new Error('accountId and integrationId are required')
  const { data, error } = await db()
    .from(CONNECTIONS_TABLE)
    .update({ connection_status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('integration_id', integrationId)
    .select()
    .single()
  if (error) throw error
  return data
}

export { getCurrentUserAccountId }

export default {
  listCatalog,
  getCatalogEntry,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  listConnectionsForAccount,
  connectIntegration,
  disconnectIntegration,
  getCurrentUserAccountId,
}
