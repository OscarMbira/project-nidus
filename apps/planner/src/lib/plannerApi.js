/**
 * v1239 Slice 5 — the Planner shell's own data calls. Planning screens use @nidus/planning's
 * services; this file only covers the shell: workspace context, sidebar, projects, pricing.
 * Account-level writes go through SECURITY DEFINER RPCs (SQL v1247 / v1256) so limits,
 * read-only trials and the planner menu allow-list are enforced by the database.
 */
import { platformDb } from '@nidus/supabase'

function fail(error, fallback) {
  const msg = error?.message || fallback
  throw new Error(msg.replace(/^(PLANNER_[A-Z_]+):\s*/, ''))
}

export async function getContext() {
  const { data, error } = await platformDb.rpc('planner_context')
  if (error) fail(error, 'Could not load your workspace.')
  return data
}

/** Creates the planner workspace on first sign-in (idempotent server-side). */
export async function ensureAccount(fullName) {
  const { data, error } = await platformDb.rpc('planner_create_account', { p_account_name: null, p_full_name: fullName || null })
  if (error) fail(error, 'Could not create your workspace.')
  return data
}

export async function isSignupOpen() {
  const { data, error } = await platformDb.rpc('planner_signup_open')
  if (error) return false
  return data === true
}

export async function getMenu() {
  const { data, error } = await platformDb.rpc('planner_menu')
  if (error) fail(error, 'Could not load the menu.')
  return data || []
}

export async function listProjects(accountId) {
  if (!accountId) return []
  const { data, error } = await platformDb
    .from('projects')
    .select('id, project_name, project_code, planned_start_date, planned_end_date, created_at')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) fail(error, 'Could not load projects.')
  return data || []
}

export async function createProject({ name, startDate, description }) {
  const { data, error } = await platformDb.rpc('planner_create_project', {
    p_project_name: name,
    p_start_date: startDate || null,
    p_description: description || null,
  })
  if (error) fail(error, 'Could not create the project.')
  return data
}

/** Pricing page: active planner catalog rows + the trial/paid limits (both public reads). */
export async function getPricing() {
  const [plans, limits] = await Promise.all([
    platformDb.from('subscription_plans').select('id, plan_name, billing_cycle, price, currency, features').eq('plan_type', 'planner').eq('is_active', true).gt('price', 0).order('display_order'), // unpriced plans are never offered
    platformDb.from('planner_plan_limits').select('*').eq('is_active', true),
  ])
  if (plans.error) fail(plans.error, 'Could not load prices.')
  if (limits.error) fail(limits.error, 'Could not load plan limits.')
  return { plans: plans.data || [], limits: Object.fromEntries((limits.data || []).map((l) => [l.plan_code, l])) }
}

/** Builds the sidebar tree from planner_menu() rows. Pure; exported for tests. */
export function buildMenuTree(rows) {
  // Planner rows only (D19): a plat_/sim_ row must never reach the planner sidebar.
  const own = (rows || []).filter((r) => String(r.menu_code || '').startsWith('pln_'))
  const byId = new Map(own.map((r) => [r.id, { ...r, children: [] }]))
  const roots = []
  for (const node of byId.values()) {
    const parent = node.parent_menu_id && byId.get(node.parent_menu_id)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sort = (list) => list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.menu_label).localeCompare(String(b.menu_label)))
  const walk = (list) => { sort(list); list.forEach((n) => walk(n.children)); return list }
  // Hide empty groups (a group with no route and no visible children).
  const prune = (list) => list.filter((n) => { n.children = prune(n.children); return n.route_path || n.children.length })
  return prune(walk(roots))
}
