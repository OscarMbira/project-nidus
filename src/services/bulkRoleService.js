/**
 * Bulk invite — auto-create unknown roles as global project_roles templates.
 */

import { platformDb } from './supabase/supabaseClient'

const DEFAULT_NEW_ROLE_PERMISSIONS = [
  'project.view',
  'tasks.view',
  'tasks.edit',
]

/**
 * Derive a safe role_name slug from a raw string.
 * @param {string} rawValue
 * @param {string[]} existingSlugs
 */
export function deriveRoleSlug(rawValue, existingSlugs = []) {
  const base = String(rawValue ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'custom_role'

  const taken = new Set((existingSlugs || []).map((s) => String(s).toLowerCase()))
  if (!taken.has(base)) return base

  let n = 2
  while (taken.has(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}

/**
 * Fetch active global template project_roles for pickers.
 */
export async function fetchAvailableRoles() {
  try {
    const { data, error } = await platformDb
      .from('project_roles')
      .select('id, role_name, role_display_name, role_description, role_level, is_system_default')
      .eq('is_active', true)
      .eq('is_template', true)
      .is('project_id', null)
      .order('role_level', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (err) {
    console.error('[fetchAvailableRoles]', err)
    return { success: false, data: [], error: err.message || 'Failed to load roles' }
  }
}

/**
 * Insert confirmed new roles as global templates (project_id NULL, is_template TRUE).
 * @param {Array<{ role_name: string, role_display_name: string, role_description?: string }>} newRoles
 */
export async function createProjectRoleTemplates(newRoles) {
  const created = []
  const skipped = []
  const errors = []

  if (!newRoles?.length) {
    return { created, skipped, errors }
  }

  const { data: existing } = await platformDb
    .from('project_roles')
    .select('role_name')
    .eq('is_template', true)
    .is('project_id', null)

  const existingSlugs = (existing || []).map((r) => r.role_name)

  for (const item of newRoles) {
    const roleName = String(item.role_name || '').trim()
    const displayName = String(item.role_display_name || roleName).trim()
    if (!roleName || !displayName) {
      errors.push(`Invalid role: ${displayName || roleName || '(empty)'}`)
      continue
    }

    if (existingSlugs.includes(roleName)) {
      const { data: row } = await platformDb
        .from('project_roles')
        .select('id, role_name, role_display_name')
        .eq('role_name', roleName)
        .eq('is_template', true)
        .is('project_id', null)
        .maybeSingle()

      if (row?.id) {
        created.push(row)
        skipped.push(roleName)
      } else {
        skipped.push(roleName)
      }
      continue
    }

    const { data: inserted, error } = await platformDb
      .from('project_roles')
      .insert({
        role_name: roleName,
        role_display_name: displayName,
        role_description: item.role_description || `Created from bulk invite: ${displayName}`,
        is_system_default: false,
        is_template: true,
        project_id: null,
        role_level: 5,
        permissions: DEFAULT_NEW_ROLE_PERMISSIONS,
        is_active: true,
      })
      .select('id, role_name, role_display_name')
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: row } = await platformDb
          .from('project_roles')
          .select('id, role_name, role_display_name')
          .eq('role_name', roleName)
          .eq('is_template', true)
          .is('project_id', null)
          .maybeSingle()
        if (row) {
          created.push(row)
          skipped.push(roleName)
        } else {
          errors.push(`${roleName}: ${error.message}`)
        }
      } else {
        errors.push(`${roleName}: ${error.message}`)
      }
      continue
    }

    existingSlugs.push(roleName)
    created.push(inserted)
  }

  return { created, skipped, errors }
}

export default {
  deriveRoleSlug,
  fetchAvailableRoles,
  createProjectRoleTemplates,
}
