/**
 * Work Package Products — fetch by work package (see SQL v216 wp_products).
 */
import { supabase } from './supabaseClient'

export async function getProducts(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_products')
      .select('*')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching wp products:', error)
    return { success: false, error: error.message, data: [] }
  }
}

async function nextProductNumber(wpId) {
  const { data, error } = await supabase
    .from('wp_products')
    .select('product_number')
    .eq('work_package_id', wpId)
    .eq('is_deleted', false)
    .order('product_number', { ascending: false })
    .limit(1)
  if (error) throw error
  const max = data?.[0]?.product_number
  return typeof max === 'number' ? max + 1 : 1
}

export async function addProduct(wpId, row) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (!userRow) throw new Error('User not found')

    const product_number = await nextProductNumber(wpId)
    const insert = {
      work_package_id: wpId,
      product_number,
      product_name: row.product_name,
      product_description: row.product_description ?? null,
      product_type: row.product_type ?? 'deliverable',
      linked_product_deliverable_id: row.linked_product_deliverable_id ?? null,
      linked_product_description_id: row.linked_product_description_id ?? null,
      quality_criteria: row.quality_criteria ?? null,
      acceptance_criteria: row.acceptance_criteria ?? null,
      delivery_status: row.delivery_status ?? 'not_started',
      delivery_date: row.delivery_date || null,
      acceptance_date: row.acceptance_date || null,
      display_order: row.display_order ?? 0,
      created_by: userRow.id,
      updated_by: userRow.id,
    }

    const { data, error } = await supabase.from('wp_products').insert(insert).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addProduct', error)
    return { success: false, error: error.message }
  }
}

export async function updateProduct(productId, row) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (!userRow) throw new Error('User not found')

    const updates = {
      product_name: row.product_name,
      product_description: row.product_description ?? null,
      product_type: row.product_type ?? 'deliverable',
      linked_product_deliverable_id: row.linked_product_deliverable_id ?? null,
      linked_product_description_id: row.linked_product_description_id ?? null,
      quality_criteria: row.quality_criteria ?? null,
      acceptance_criteria: row.acceptance_criteria ?? null,
      delivery_status: row.delivery_status ?? 'not_started',
      delivery_date: row.delivery_date || null,
      acceptance_date: row.acceptance_date || null,
      display_order: row.display_order ?? 0,
      updated_by: userRow.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('wp_products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateProduct', error)
    return { success: false, error: error.message }
  }
}

export async function deleteProduct(productId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    const uid = userRow?.id

    const { error } = await supabase
      .from('wp_products')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: uid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteProduct', error)
    return { success: false, error: error.message }
  }
}
