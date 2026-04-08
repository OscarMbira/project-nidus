import { useState, useEffect, useCallback } from 'react'
import { getPracticeProjectById } from '../services/sim/practiceProjectService'
import { simDb } from '../services/supabase/supabaseClient'

/**
 * True if current Simulator user owns the practice project (full planning CRUD).
 */
export function useSimPracticeOwner(practiceProjectId) {
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!practiceProjectId) {
      setCanEdit(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user?.id) {
        setCanEdit(false)
        return
      }
      const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      const internalId = u.data?.id
      const res = await getPracticeProjectById(practiceProjectId)
      if (!res.success || !res.data) {
        setCanEdit(false)
        return
      }
      setCanEdit(!!internalId && res.data.user_id === internalId)
    } catch {
      setCanEdit(false)
    } finally {
      setLoading(false)
    }
  }, [practiceProjectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { canEdit, loading, refresh }
}
