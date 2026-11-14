/**
 * v1341 (D16, D19, R3) — Industry Modules: list / switch industry menu items for one project.
 * `app` = 'platform' (public.projects) or 'simulator' (sim.practice_projects).
 * Switching only hides the menu entry; records are never changed (SQL v1453).
 */
import { platformDb, simDb } from '@nidus/supabase'
import { notifyMenuContextChanged } from './consolidatedMenuData'

const RPC = {
  platform: { list: 'list_project_industry_menu_items', set: 'set_project_menu_item_disabled', id: 'p_project_id' },
  simulator: { list: 'list_practice_project_industry_menu_items', set: 'set_practice_project_menu_item_disabled', id: 'p_practice_project_id' },
}
const clientFor = (app) => (app === 'simulator' ? simDb : platformDb)

/** Industry items of the project with their switched-off state; `canEdit` is the same for every row. */
export async function listIndustryModules(app, projectId) {
  if (!projectId) return { rows: [], canEdit: false }
  const cfg = RPC[app]
  const { data, error } = await clientFor(app).rpc(cfg.list, { [cfg.id]: projectId })
  if (error) throw error
  const rows = (data || []).map((r) => ({ ...r }))
  return { rows, canEdit: rows.some((r) => r.can_edit === true) }
}

/** Switch one item off (`disabled = true`) or back on; refreshes the sidebar. */
export async function setIndustryModuleDisabled(app, projectId, menuItemId, disabled) {
  const cfg = RPC[app]
  const { data, error } = await clientFor(app).rpc(cfg.set, {
    [cfg.id]: projectId,
    p_menu_item_id: menuItemId,
    p_disabled: !!disabled,
  })
  if (error) throw error
  notifyMenuContextChanged()
  return data
}

/** Switch-off history for the Audit details tab, newest first, with names. */
export async function listIndustryModuleHistory(app, projectId, limit = 50) {
  if (!projectId) return []
  const { data, error } = await platformDb
    .from('project_menu_item_switch_log')
    .select('id, menu_item_id, action, changed_by_auth_id, changed_at')
    .eq('app', app)
    .eq('project_id', projectId)
    .order('changed_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = data || []
  const itemIds = [...new Set(rows.map((r) => r.menu_item_id))]
  const authIds = [...new Set(rows.map((r) => r.changed_by_auth_id).filter(Boolean))]
  const [itemsRes, usersRes] = await Promise.all([
    itemIds.length ? platformDb.from('menu_items').select('id, menu_label').in('id', itemIds) : Promise.resolve({ data: [] }),
    authIds.length ? platformDb.from('users').select('auth_user_id, full_name, email').in('auth_user_id', authIds) : Promise.resolve({ data: [] }),
  ])
  const labelById = new Map((itemsRes.data || []).map((m) => [m.id, m.menu_label]))
  const nameByAuth = new Map((usersRes.data || []).map((u) => [u.auth_user_id, u.full_name || u.email]))
  return rows.map((r) => ({
    ...r,
    menu_label: labelById.get(r.menu_item_id) || 'Menu item',
    changed_by_name: nameByAuth.get(r.changed_by_auth_id) || null,
  }))
}
