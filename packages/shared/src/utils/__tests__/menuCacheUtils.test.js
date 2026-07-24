import { describe, it, expect, beforeEach } from 'vitest'
import {
  purgeAllSidebarMenuCaches,
  readSidebarCache,
  writeSidebarCache,
  clearSidebarCache,
} from '../menuCacheUtils'

describe('menuCacheUtils', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('purgeAllSidebarMenuCaches removes nidus_menu and nidus_sim_menu keys', () => {
    localStorage.setItem('nidus_menu_v49_user-1', '{}')
    localStorage.setItem('nidus_sim_menu_v26_pmo_user-1', '{}')
    localStorage.setItem('other_key', 'keep')
    purgeAllSidebarMenuCaches()
    expect(localStorage.getItem('nidus_menu_v49_user-1')).toBeNull()
    expect(localStorage.getItem('nidus_sim_menu_v26_pmo_user-1')).toBeNull()
    expect(localStorage.getItem('other_key')).toBe('keep')
  })

  it('stores PM and PMO sidebar caches separately per user', () => {
    writeSidebarCache('user-1', 'pm', {
      items: [{ menu_code: 'pm_dash' }],
      rawHierarchy: [{ menu_code: 'pm_dash' }],
      layoutHint: { layout: 'pm' },
    })
    writeSidebarCache('user-1', 'pmo', {
      items: [{ menu_code: 'pmo_exec' }],
      rawHierarchy: [{ menu_code: 'pmo_exec' }],
      layoutHint: { layout: 'pmo' },
    })

    const pmCache = readSidebarCache('user-1', 'pm')
    const pmoCache = readSidebarCache('user-1', 'pmo')

    expect(pmCache.items[0].menu_code).toBe('pm_dash')
    expect(pmoCache.items[0].menu_code).toBe('pmo_exec')
    expect(readSidebarCache('user-1', 'pm')).not.toEqual(readSidebarCache('user-1', 'pmo'))
  })

  it('clearSidebarCache(userId) removes all layout scopes for that user', () => {
    writeSidebarCache('user-1', 'pm', { items: [], rawHierarchy: [], layoutHint: null })
    writeSidebarCache('user-1', 'pmo', { items: [], rawHierarchy: [], layoutHint: null })
    writeSidebarCache('user-2', 'pm', { items: [], rawHierarchy: [], layoutHint: null })

    clearSidebarCache('user-1')

    expect(readSidebarCache('user-1', 'pm')).toBeNull()
    expect(readSidebarCache('user-1', 'pmo')).toBeNull()
    expect(readSidebarCache('user-2', 'pm')).not.toBeNull()
  })
})
