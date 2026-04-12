import { useState, useEffect } from 'react'
import { platformDb } from '../services/supabase/supabaseClient'

/**
 * Count of open planning intelligence findings (error + warning) visible to the user (RLS).
 * For sidebar badges on Planning → Plan Intelligence.
 */
export function useOpenPlanningFindingsCount(enabled = true) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setCount(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { count: n, error } = await platformDb
          .from('plan_intelligence_findings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
          .in('severity', ['error', 'warning'])
        if (error) throw error
        if (!cancelled) setCount(n ?? 0)
      } catch {
        if (!cancelled) setCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return count
}
