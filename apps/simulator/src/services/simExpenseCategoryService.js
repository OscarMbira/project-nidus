/** Expense Categories lookup service (Simulator) — sim.expense_categories (v1226) */
import { simDb, platformDb } from './supabaseClient'

async function getInternalUserId() {
  const { data: { user } } = await simDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: userRecord } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (!userRecord?.id) throw new Error('User record not found')
  return userRecord.id
}

export async function getSimExpenseCategories(filters = {}) {
  try {
    let query = simDb.from('expense_categories').select('*').eq('is_deleted', false)
    query = query.eq('is_active', filters.active !== undefined ? filters.active : true)
    const { data, error } = await query.order('category_name', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching sim expense categories:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function createSimExpenseCategory(payload) {
  try {
    const userId = await getInternalUserId()
    const insertData = {
      category_code: payload.category_code,
      category_name: payload.category_name,
      category_description: payload.category_description || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_by: userId,
      updated_by: userId,
    }
    const { data, error } = await simDb.from('expense_categories').insert(insertData).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating sim expense category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function updateSimExpenseCategory(categoryId, payload) {
  try {
    const userId = await getInternalUserId()
    const updateData = {
      category_code: payload.category_code,
      category_name: payload.category_name,
      category_description: payload.category_description || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      updated_by: userId,
    }
    const { data, error } = await simDb
      .from('expense_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating sim expense category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function deleteSimExpenseCategory(categoryId) {
  try {
    const userId = await getInternalUserId()
    const { data, error } = await simDb
      .from('expense_categories')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId, is_active: false })
      .eq('id', categoryId)
      .eq('is_deleted', false)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error deleting sim expense category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export default {
  getSimExpenseCategories,
  createSimExpenseCategory,
  updateSimExpenseCategory,
  deleteSimExpenseCategory,
}
