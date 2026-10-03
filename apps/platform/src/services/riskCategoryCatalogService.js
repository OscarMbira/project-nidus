/**
 * Organisation risk category catalogue (v1107).
 * Reads public.risk_categories / public.risk_subcategories.
 * Writes go through the v1113 SECURITY DEFINER functions.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { orderSimilarRisks } from '../utils/riskCategoryMatch'

const CATEGORY_SELECT = 'id, organisation_id, category_code, category_name, is_active, created_at, created_by, updated_at, updated_by'
const SUBCATEGORY_SELECT = 'id, organisation_id, category_code, subcategory_code, subcategory_name, is_active, display_order, created_at, created_by, updated_at, updated_by'

function fail(error, fallback) {
  const raw = error?.message || error?.details || fallback
  const message = String(raw).replace(/^.*ERROR:\s*/i, '').trim()
  return message || fallback
}

export async function getRiskCatalogueAccess(accountId) {
  try {
    const resolvedAccountId = accountId || (await getCurrentUserAccountId())
    const userId = await getCurrentUserInternalUserId()
    if (!resolvedAccountId || !userId) {
      return { success: true, accountId: resolvedAccountId || null, canAdd: false, canMaintain: false, error: null }
    }
    const [addRes, maintainRes] = await Promise.all([
      platformDb.rpc('user_can_add_risk_catalogue', { p_user_id: userId, p_account_id: resolvedAccountId }),
      platformDb.rpc('user_can_maintain_risk_catalogue', { p_user_id: userId, p_account_id: resolvedAccountId }),
    ])
    if (addRes.error) throw addRes.error
    if (maintainRes.error) throw maintainRes.error
    return {
      success: true,
      accountId: resolvedAccountId,
      canAdd: addRes.data === true,
      canMaintain: maintainRes.data === true,
      error: null,
    }
  } catch (error) {
    console.error('getRiskCatalogueAccess:', error)
    return { success: false, accountId: null, canAdd: false, canMaintain: false, error: fail(error, 'Could not check access') }
  }
}

export async function listRiskCatalogue(accountId) {
  try {
    const resolvedAccountId = accountId || (await getCurrentUserAccountId())
    const scope = resolvedAccountId
      ? `organisation_id.is.null,organisation_id.eq.${resolvedAccountId}`
      : 'organisation_id.is.null'
    const [categoriesRes, subcategoriesRes] = await Promise.all([
      platformDb.from('risk_categories').select(CATEGORY_SELECT).or(scope),
      platformDb.from('risk_subcategories').select(SUBCATEGORY_SELECT).or(scope),
    ])
    if (categoriesRes.error) throw categoriesRes.error
    if (subcategoriesRes.error) throw subcategoriesRes.error
    const categories = [...(categoriesRes.data || [])].sort((a, b) => {
      const byName = String(a.category_name || '').localeCompare(String(b.category_name || ''), undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
    const subcategories = [...(subcategoriesRes.data || [])].sort((a, b) => {
      const byName = String(a.subcategory_name || '').localeCompare(String(b.subcategory_name || ''), undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
    return { success: true, categories, subcategories, error: null }
  } catch (error) {
    console.error('listRiskCatalogue:', error)
    return { success: false, categories: [], subcategories: [], error: fail(error, 'Could not load risk categories') }
  }
}

export async function addRiskCategory(accountId, name) {
  try {
    const { data, error } = await platformDb.rpc('add_organisation_risk_category', {
      p_account_id: accountId,
      p_name: name,
    })
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addRiskCategory:', error)
    return { success: false, data: null, error: fail(error, 'Could not add that category') }
  }
}

export async function addRiskSubcategory(accountId, categoryCode, name) {
  try {
    const { data, error } = await platformDb.rpc('add_organisation_risk_subcategory', {
      p_account_id: accountId,
      p_category_code: categoryCode,
      p_name: name,
    })
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addRiskSubcategory:', error)
    return { success: false, data: null, error: fail(error, 'Could not add that sub-category') }
  }
}

export async function updateRiskCategory(id, { name, isActive } = {}) {
  try {
    const { data, error } = await platformDb.rpc('update_organisation_risk_category', {
      p_id: id,
      p_name: name ?? null,
      p_is_active: typeof isActive === 'boolean' ? isActive : null,
    })
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateRiskCategory:', error)
    return { success: false, data: null, error: fail(error, 'Could not update that category') }
  }
}

export async function updateRiskSubcategory(id, { name, isActive } = {}) {
  try {
    const { data, error } = await platformDb.rpc('update_organisation_risk_subcategory', {
      p_id: id,
      p_name: name ?? null,
      p_is_active: typeof isActive === 'boolean' ? isActive : null,
    })
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateRiskSubcategory:', error)
    return { success: false, data: null, error: fail(error, 'Could not update that sub-category') }
  }
}

export async function findSimilarRisks(accountId, term, currentProjectId) {
  try {
    const cleaned = String(term || '').trim().replace(/[%_\\]/g, '')
    if (cleaned.length < 2 || !accountId) return { success: true, data: [], error: null }
    const { data: projects, error: projectError } = await platformDb
      .from('projects')
      .select('id, project_name')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
    if (projectError) throw projectError
    const projectIds = (projects || []).map((project) => project.id)
    if (projectIds.length === 0) return { success: true, data: [], error: null }
    const names = new Map((projects || []).map((project) => [project.id, project.project_name]))
    const { data: risks, error } = await platformDb
      .from('risks')
      .select('id, risk_title, risk_code, project_id')
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .ilike('risk_title', `%${cleaned}%`)
      .limit(30)
    if (error) throw error
    const decorated = (risks || []).map((risk) => ({
      ...risk,
      project_name: names.get(risk.project_id) || '',
    }))
    return { success: true, data: orderSimilarRisks(decorated, currentProjectId, 5), error: null }
  } catch (error) {
    console.error('findSimilarRisks:', error)
    return { success: false, data: [], error: fail(error, 'Could not search similar risks') }
  }
}
