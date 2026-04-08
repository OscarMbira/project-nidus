/**
 * Practice Portfolio Category Service – CRUD for sim.practice_portfolio_categories.
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentAuthUserId() {
  const {
    data: { user },
    error,
  } = await simDb.auth.getUser()
  if (error || !user) throw new Error('User not authenticated')
  return user.id
}

export async function getPracticePortfolioCategories(options = {}) {
  try {
    const userId = await getCurrentAuthUserId()
    let query = simDb
      .from('practice_portfolio_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
    if (options.activeOnly !== false) query = query.eq('is_active', true)
    const { data, error } = await query.order('sort_order', { ascending: true })
    if (error) throw error
    const list = data || []
    list.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        (a.name || '').localeCompare(b.name || ''),
    )
    return { success: true, data: list }
  } catch (error) {
    console.error('Error fetching practice portfolio categories:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function createPracticePortfolioCategory(payload) {
  try {
    const userId = await getCurrentAuthUserId()
    const insertData = {
      user_id: userId,
      name: payload.name,
      code: payload.code || null,
      description: payload.description || null,
      sort_order: payload.sort_order != null ? payload.sort_order : 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    }
    const { data, error } = await simDb
      .from('practice_portfolio_categories')
      .insert(insertData)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating practice portfolio category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function updatePracticePortfolioCategory(id, payload) {
  try {
    const userId = await getCurrentAuthUserId()
    const updateData = {
      name: payload.name,
      code: payload.code !== undefined ? payload.code : undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      sort_order: payload.sort_order !== undefined ? payload.sort_order : undefined,
      is_active: payload.is_active !== undefined ? payload.is_active : undefined,
      updated_at: new Date().toISOString(),
    }
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k])

    const { data, error } = await simDb
      .from('practice_portfolio_categories')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating practice portfolio category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export async function deletePracticePortfolioCategory(id) {
  try {
    const userId = await getCurrentAuthUserId()
    const { data, error } = await simDb
      .from('practice_portfolio_categories')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error deleting practice portfolio category:', error)
    return { success: false, error: error.message, data: null }
  }
}

export default {
  getPracticePortfolioCategories,
  createPracticePortfolioCategory,
  updatePracticePortfolioCategory,
  deletePracticePortfolioCategory,
}

