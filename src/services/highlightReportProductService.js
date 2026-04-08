import { supabase } from './supabaseClient'

/**
 * Highlight Report Products Service
 * Handles products/deliverables tracking for Highlight Reports
 */

export async function getProducts(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_products')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getProductsByPeriod(reportId, periodType) {
  const { data, error } = await supabase
    .from('highlight_report_products')
    .select('*')
    .eq('highlight_report_id', reportId)
    .eq('period_type', periodType)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addProduct(reportId, productData) {
  const { data: existing } = await supabase
    .from('highlight_report_products')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...productData,
    highlight_report_id: reportId,
    display_order: productData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_products')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(productId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from('highlight_report_products')
    .delete()
    .eq('id', productId)
  if (error) throw error
}
