import { createClient } from '@supabase/supabase-js'

let platformClient = null

function getPlatformClient() {
  if (platformClient) return platformClient
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  platformClient = createClient(url, key, { db: { schema: 'public' } })
  return platformClient
}

export async function fetchActiveCancellationCategories() {
  const db = getPlatformClient()
  if (!db) return []
  const { data, error } = await db.rpc('fetch_active_cancellation_categories')
  if (error) throw error
  return data || []
}

export async function recordCancellationRequest(reasonCategoryId, notes, subscriptionId, targetSystem) {
  const db = getPlatformClient()
  if (!db) {
    throw new Error('Cancellation reasons are not configured.')
  }
  const { data, error } = await db.rpc('record_cancellation_request', {
    p_reason_category_id: reasonCategoryId,
    p_notes: notes || null,
    p_subscription_id: subscriptionId || null,
    p_target_system: targetSystem,
  })
  if (error) throw error
  return data
}
