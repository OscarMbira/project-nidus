/**
 * CurrentPortfolioContext (v982 Phase 5 follow-up — Portfolio Manager Home)
 * Tracks which portfolio the viewer is currently looking at, mirroring
 * CurrentProjectContext.jsx's pattern (own hook, own provider, remembered per-user in
 * localStorage) — there is no portfolio segment in Portfolio Manager Home's route, so without
 * this there is no way to scope its widgets to "this portfolio" when a user has an explicit
 * portfolio_memberships grant on more than one.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuthenticatedUser } from '@nidus/shared/utils/authSession'
import { platformDb } from '@nidus/supabase'

const STORAGE_KEY = 'nidus:currentPortfolioId'
const CurrentPortfolioContext = createContext(null)

function readStored(userId) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_KEY}:${userId}`) : null
  } catch {
    return null
  }
}
function writeStored(userId, portfolioId) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(`${STORAGE_KEY}:${userId}`, portfolioId)
  } catch {
    // ignore
  }
}

export function CurrentPortfolioProvider({ children }) {
  const [portfolios, setPortfolios] = useState([])
  const [portfolioId, setPortfolioIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { user } = await getAuthenticatedUser()
      if (!user) {
        setPortfolios([])
        setPortfolioIdState(null)
        setLoading(false)
        return
      }
      const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!userRow?.id) {
        setPortfolios([])
        setLoading(false)
        return
      }
      const { data, error } = await platformDb
        .from('portfolio_memberships')
        .select('portfolio_id, portfolios:portfolio_id (id, portfolio_name, portfolio_code)')
        .eq('user_id', userRow.id)
        .eq('is_active', true)
      if (error) throw error

      const list = (data || [])
        .filter((r) => r.portfolios)
        .map((r) => ({ id: r.portfolio_id, name: r.portfolios.portfolio_name, code: r.portfolios.portfolio_code }))
      setPortfolios(list)

      const stored = readStored(user.id)
      const match = list.find((p) => p.id === stored)
      setPortfolioIdState(match ? match.id : (list[0]?.id || null))
    } catch (err) {
      console.error('CurrentPortfolioContext load error:', err)
      setPortfolios([])
      setPortfolioIdState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setPortfolioId = useCallback(async (id) => {
    setPortfolioIdState(id)
    const { user } = await getAuthenticatedUser()
    if (user) writeStored(user.id, id)
  }, [])

  const currentPortfolio = portfolios.find((p) => p.id === portfolioId) || null

  return (
    <CurrentPortfolioContext.Provider value={{ portfolios, portfolioId, currentPortfolio, setPortfolioId, loading }}>
      {children}
    </CurrentPortfolioContext.Provider>
  )
}

export function useCurrentPortfolio() {
  const ctx = useContext(CurrentPortfolioContext)
  if (!ctx) {
    // No provider in the tree — same "empty, non-throwing" shape as a genuine zero-portfolio
    // result, so a widget mounted outside PortfolioManagerHome's own provider degrades safely
    // (matches this codebase's general preference for graceful degradation over a hard crash).
    return { portfolios: [], portfolioId: null, currentPortfolio: null, setPortfolioId: () => {}, loading: false }
  }
  return ctx
}
