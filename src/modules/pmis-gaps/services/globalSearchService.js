import { platformDb, simDb } from '../../../services/supabase/supabaseClient'

const ENTITY_SEARCH_CONFIG = [
  { type: 'project', table: 'projects', titleCol: 'project_name', schema: 'platform' },
  { type: 'task', table: 'tasks', titleCol: 'task_name', schema: 'platform' },
  { type: 'risk', table: 'risks', titleCol: 'risk_title', schema: 'platform' },
  { type: 'issue', table: 'issues', titleCol: 'issue_title', schema: 'platform' },
]

function dbForSchema(schema) {
  return schema === 'sim' ? simDb : platformDb
}

/**
 * Search across platform/sim entities and search_index table.
 * @param {string} query
 * @param {{ sim?: boolean, limit?: number }} [opts]
 */
export async function searchGlobal(query, opts = {}) {
  const q = String(query || '').trim()
  const limit = opts.limit ?? 20
  if (!q) return { results: [], categories: {} }

  const results = []
  const db = opts.sim ? simDb : platformDb

  // search_index table (GAP-02)
  const { data: indexed, error: indexErr } = await db
    .from('search_index')
    .select('entity_type, entity_id, title, keywords, project_id')
    .or(`title.ilike.%${q}%,keywords.ilike.%${q}%`)
    .limit(limit)

  if (!indexErr && indexed?.length) {
    for (const row of indexed) {
      results.push({
        type: row.entity_type,
        id: row.entity_id,
        title: row.title,
        subtitle: row.keywords || '',
        projectId: row.project_id,
      })
    }
  }

  // Fallback live entity search when index empty or partial
  if (results.length < limit) {
    for (const cfg of ENTITY_SEARCH_CONFIG) {
      if (opts.sim && cfg.schema !== 'sim') continue
      if (!opts.sim && cfg.schema === 'sim') continue
      const client = dbForSchema(cfg.schema)
      const { data } = await client
        .from(cfg.table)
        .select(`id, ${cfg.titleCol}`)
        .ilike(cfg.titleCol, `%${q}%`)
        .eq('is_deleted', false)
        .limit(Math.max(3, Math.floor(limit / ENTITY_SEARCH_CONFIG.length)))

      for (const row of data || []) {
        if (results.some((r) => r.id === row.id && r.type === cfg.type)) continue
        results.push({
          type: cfg.type,
          id: row.id,
          title: row[cfg.titleCol],
          subtitle: cfg.type,
        })
      }
    }
  }

  const categories = results.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})

  return { results: results.slice(0, limit), categories }
}

export async function getRecentItems(userId, opts = {}) {
  if (!userId) return []
  const db = opts.sim ? simDb : platformDb
  const { data, error } = await db
    .from('user_recent_items')
    .select('*')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

export async function getFavourites(userId, opts = {}) {
  if (!userId) return []
  const db = opts.sim ? simDb : platformDb
  const { data, error } = await db
    .from('user_favourites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function trackRecentItem(userId, item, opts = {}) {
  if (!userId || !item?.entity_type || !item?.entity_id) return
  const db = opts.sim ? simDb : platformDb
  await db.from('user_recent_items').upsert(
    {
      user_id: userId,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      title: item.title,
      route_path: item.route_path || null,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,entity_type,entity_id' }
  )
}

export async function toggleFavourite(userId, item, opts = {}) {
  if (!userId || !item?.entity_type || !item?.entity_id) return false
  const db = opts.sim ? simDb : platformDb
  const { data: existing } = await db
    .from('user_favourites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', item.entity_type)
    .eq('entity_id', item.entity_id)
    .maybeSingle()

  if (existing?.id) {
    await db.from('user_favourites').delete().eq('id', existing.id)
    return false
  }

  await db.from('user_favourites').insert({
    user_id: userId,
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    title: item.title,
    route_path: item.route_path || null,
  })
  return true
}

export function entityRoute(type, id) {
  const map = {
    project: `/platform/projects/${id}`,
    task: `/platform/tasks/${id}`,
    risk: `/platform/risks/${id}`,
    issue: `/platform/issues/${id}`,
  }
  return map[type] || `/platform/dashboard`
}
