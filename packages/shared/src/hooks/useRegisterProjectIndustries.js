/**
 * v1342 — the industry names of a register record's project, for industry-only register fields
 * (`filterFieldsForProjectIndustries` / `registerForProjectIndustries` in registerFieldGroups).
 *
 * Platform: project_industries, else projects.industry_category_id. Simulator: practice project
 * industries. Names come from public.industry_categories (shared by both apps).
 * Cached in memory per app + project (rule 66): the names are read on every register
 * form and record page, and a project's industries change rarely. `clearRegisterProjectIndustries`
 * drops the cache (call it after a project's industries are saved).
 *
 * @param {string | null | undefined} projectId
 * @returns {{ names: string[] | null, loading: boolean }}  names = null while loading or with no project
 */
import { useContext, useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import AppConfigContext from '../context/AppConfigContext'
import { loadProjectMenuContext } from '../utils/consolidatedMenuData'

const cache = new Map() // `${app}:${projectId}` → Promise<string[]>

export async function loadRegisterProjectIndustries(app, projectId) {
  if (!projectId) return []
  const key = `${app}:${projectId}`
  if (!cache.has(key)) {
    const promise = (async () => {
      const { industries } = await loadProjectMenuContext(app === 'simulator' ? 'simulator' : 'platform', projectId)
      const ids = [...new Set((industries || []).map((r) => r.industry_category_id).filter(Boolean))]
      if (ids.length === 0) return []
      const { data, error } = await platformDb.from('industry_categories').select('id, name').in('id', ids)
      if (error) throw error
      return (data || []).map((r) => r.name).filter(Boolean)
    })()
    cache.set(key, promise)
    promise.catch(() => cache.delete(key))
  }
  return cache.get(key)
}

export function clearRegisterProjectIndustries() {
  cache.clear()
}

export function useRegisterProjectIndustries(projectId) {
  const app = useContext(AppConfigContext)?.app || 'platform'
  const key = projectId ? `${app}:${projectId}` : null
  const [loaded, setLoaded] = useState({ key: null, names: [] }) // result for one key

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    loadRegisterProjectIndustries(app, projectId)
      .then((names) => { if (!cancelled) setLoaded({ key, names }) })
      .catch(() => { if (!cancelled) setLoaded({ key, names: [] }) })
    return () => { cancelled = true }
  }, [app, projectId, key])

  if (!key) return { names: [], loading: false }
  if (loaded.key !== key) return { names: null, loading: true }
  return { names: loaded.names, loading: false }
}
