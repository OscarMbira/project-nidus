/**
 * Procurement (GAP-12, taxonomy §3 Procurement) — account-wide vendor register + per-vendor
 * performance ratings (public.vendors / public.vendor_ratings, SQL/v644). Neither table has a
 * created_by/updated_by column, so writes use direct queries rather than gapDataService's
 * generic create/updateGapRecord. vendor_ratings has no is_deleted column — ratings are hard
 * deleted rather than soft deleted.
 */
import { platformDb } from '@nidus/supabase'
import { getGapRecord } from './gapDataService'

function db() {
  return platformDb
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export async function listVendors(accountId) {
  const { data, error } = await db()
    .from('vendors')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('vendor_name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getVendor(id) {
  return getGapRecord('vendors', id)
}

export async function createVendor({ accountId, vendorName, vendorCode, category, contactEmail, contactPhone }) {
  if (!vendorName?.trim()) throw new Error('Vendor name is required')
  const { data, error } = await db()
    .from('vendors')
    .insert({
      account_id: accountId,
      vendor_name: vendorName.trim(),
      vendor_code: vendorCode?.trim() ? vendorCode.trim() : '',
      category: category || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    })
    .select()
    .single()
  if (error) throw error
  const { data: fresh, error: readError } = await db().from('vendors').select('*').eq('id', data.id).maybeSingle()
  if (readError || !fresh) return data
  return fresh
}

export async function updateVendor(id, { vendorName, vendorCode, category, contactEmail, contactPhone, isActive }) {
  if (!vendorName?.trim()) throw new Error('Vendor name is required')
  const { data, error } = await db()
    .from('vendors')
    .update({
      vendor_name: vendorName.trim(),
      ...(vendorCode?.trim() ? { vendor_code: vendorCode.trim() } : {}),
      category: category || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      is_active: isActive !== false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listVendorCategories(accountId) {
  const { data, error } = await db()
    .from('vendor_categories')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('category_name', { ascending: true })
  if (error) throw error
  return data || []
}

const VENDOR_CATEGORY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getVendorCategory(key, accountId) {
  let query = db().from('vendor_categories').select('*').eq('is_deleted', false)
  if (VENDOR_CATEGORY_UUID.test(String(key || ''))) {
    query = query.eq('id', key)
  } else if (accountId) {
    query = query.eq('account_id', accountId).eq('category_name', key)
  } else {
    return null
  }
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function saveVendorCategory({ id, accountId, categoryName, description, isActive = true }) {
  if (!categoryName?.trim()) throw new Error('Category name is required')
  const payload = {
    category_name: categoryName.trim(),
    description: description?.trim() || null,
    is_active: isActive !== false,
    updated_at: new Date().toISOString(),
  }
  if (id) {
    const { data, error } = await db().from('vendor_categories').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await db()
    .from('vendor_categories')
    .insert({ ...payload, account_id: accountId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVendorCategory(id) {
  const { error } = await db()
    .from('vendor_categories')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteVendor(id) {
  const { error } = await db().from('vendors').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Recomputes and persists vendors.rating_avg from that vendor's current ratings. */
async function refreshVendorRatingAvg(vendorId) {
  const { data, error } = await db().from('vendor_ratings').select('rating_score').eq('vendor_id', vendorId)
  if (error) throw error
  const scores = (data || []).map((r) => r.rating_score).filter((n) => typeof n === 'number')
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const { error: updErr } = await db()
    .from('vendors')
    .update({ rating_avg: avg !== null ? Math.round(avg * 100) / 100 : null, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
  if (updErr) throw updErr
}

// ── Vendor performance ratings ───────────────────────────────────────────────

export async function listVendorRatings(accountId) {
  const { data, error } = await db()
    .from('vendor_ratings')
    .select('*, vendors!inner(vendor_name, account_id)')
    .eq('vendors.account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => ({ ...row, vendor_name: row.vendors?.vendor_name || null }))
}

export async function getVendorRating(id) {
  const { data, error } = await db().from('vendor_ratings').select('*, vendors(vendor_name)').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? { ...data, vendor_name: data.vendors?.vendor_name || null } : null
}

export async function createVendorRating({ vendorId, projectId, ratingScore, ratingNotes, ratedBy }) {
  if (!vendorId) throw new Error('Vendor is required')
  if (!ratingScore || ratingScore < 1 || ratingScore > 5) throw new Error('Rating score must be between 1 and 5')
  const { data, error } = await db()
    .from('vendor_ratings')
    .insert({
      vendor_id: vendorId,
      project_id: projectId || null,
      rating_score: ratingScore,
      rating_notes: ratingNotes || null,
      rated_by: ratedBy || null,
    })
    .select()
    .single()
  if (error) throw error
  await refreshVendorRatingAvg(vendorId)
  return data
}

export async function updateVendorRating(id, { vendorId, projectId, ratingScore, ratingNotes }) {
  if (!ratingScore || ratingScore < 1 || ratingScore > 5) throw new Error('Rating score must be between 1 and 5')
  const { data, error } = await db()
    .from('vendor_ratings')
    .update({
      project_id: projectId || null,
      rating_score: ratingScore,
      rating_notes: ratingNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  if (vendorId) await refreshVendorRatingAvg(vendorId)
  return data
}

export async function deleteVendorRating(id, vendorId) {
  const { error } = await db().from('vendor_ratings').delete().eq('id', id)
  if (error) throw error
  if (vendorId) await refreshVendorRatingAvg(vendorId)
}

export default {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  listVendorRatings,
  getVendorRating,
  createVendorRating,
  updateVendorRating,
  deleteVendorRating,
}
