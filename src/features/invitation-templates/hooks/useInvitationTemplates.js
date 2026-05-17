import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getTemplatesForAccount,
  ensureTemplatesForAccount,
} from '../api/invitationTemplatesApi'
import { DEFAULT_INVITATION_MESSAGES_BY_ROLE } from '../constants/defaultInvitationMessages'

const TTL_MS = 5 * 60 * 1000

function cacheKey(accountId) {
  return `nidus-invitation-templates:${accountId || 'none'}`
}

function readCache(accountId) {
  if (!accountId || typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(accountId))
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (!ts || !Array.isArray(data)) return null
    if (Date.now() - ts > TTL_MS) return null
    // Empty cache was pinned for TTL and blocked refetch — treat as miss.
    if (data.length === 0) return null
    return data
  } catch {
    return null
  }
}

function writeCache(accountId, data) {
  if (!accountId || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(cacheKey(accountId), JSON.stringify({ ts: Date.now(), data }))
  } catch {
    /* ignore quota */
  }
}

export function invalidateInvitationTemplatesCache(accountId) {
  if (!accountId || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(cacheKey(accountId))
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ accountId: string | null, authUserId?: string | null, prefetchEnsure?: boolean }} opts
 * prefetchEnsure: when true (PMO admin templates page), insert missing seed rows before fetch.
 */
export function useInvitationTemplates({ accountId, authUserId = null, prefetchEnsure = false } = {}) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(!!accountId)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!accountId) {
      setTemplates([])
      setLoading(false)
      setError(null)
      return
    }
    if (!prefetchEnsure) {
      const cached = readCache(accountId)
      if (cached) {
        setTemplates(cached)
        setLoading(false)
        setError(null)
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      if (prefetchEnsure && authUserId) {
        await ensureTemplatesForAccount(accountId, authUserId)
      }
      const res = await getTemplatesForAccount(accountId)
      if (!res.success) {
        setError(res.error || 'Failed to load templates')
        setTemplates([])
        return
      }
      const list = res.data || []
      setTemplates(list)
      if (list.length > 0) writeCache(accountId, list)
    } catch (e) {
      setError(e?.message || 'Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [accountId, authUserId, prefetchEnsure])

  useEffect(() => {
    load()
  }, [load])

  const refetch = useCallback(async () => {
    invalidateInvitationTemplatesCache(accountId)
    await load()
  }, [accountId, load])

  const getTemplateForRole = useCallback(
    (roleName) => {
      const key = String(roleName || '').trim()
      if (!key) return null
      const activeRow = templates.find((t) => t.role_name === key && t.is_active !== false)
      if (activeRow?.message_body?.trim()) return activeRow
      const inactiveRow = templates.find((t) => t.role_name === key && t.is_active === false)
      if (inactiveRow) return null

      const fallback = DEFAULT_INVITATION_MESSAGES_BY_ROLE[key]
      if (!fallback?.message_body) return null
      return {
        role_name: key,
        template_label: fallback.template_label,
        subject_line: fallback.subject_line ?? null,
        message_body: fallback.message_body,
        is_active: true,
      }
    },
    [templates],
  )

  const value = useMemo(
    () => ({
      templates,
      loading,
      error,
      getTemplateForRole,
      refetch,
    }),
    [templates, loading, error, getTemplateForRole, refetch],
  )

  return value
}
