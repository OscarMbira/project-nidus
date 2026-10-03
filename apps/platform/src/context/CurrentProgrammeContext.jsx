/**
 * CurrentProgrammeContext (v982 Phase 5 follow-up — Programme Manager Home)
 * Mirrors CurrentPortfolioContext.jsx exactly, substituting programme scope.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuthenticatedUser } from '@nidus/shared/utils/authSession'
import { platformDb } from '@nidus/supabase'

const STORAGE_KEY = 'nidus:currentProgrammeId'
const CurrentProgrammeContext = createContext(null)

function readStored(userId) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_KEY}:${userId}`) : null
  } catch {
    return null
  }
}
function writeStored(userId, programmeId) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(`${STORAGE_KEY}:${userId}`, programmeId)
  } catch {
    // ignore
  }
}

export function CurrentProgrammeProvider({ children }) {
  const [programmes, setProgrammes] = useState([])
  const [programmeId, setProgrammeIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { user } = await getAuthenticatedUser()
      if (!user) {
        setProgrammes([])
        setProgrammeIdState(null)
        setLoading(false)
        return
      }
      const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!userRow?.id) {
        setProgrammes([])
        setLoading(false)
        return
      }
      const { data, error } = await platformDb
        .from('programme_memberships')
        .select('programme_id, programmes:programme_id (id, programme_name, programme_code)')
        .eq('user_id', userRow.id)
        .eq('is_active', true)
      if (error) throw error

      const list = (data || [])
        .filter((r) => r.programmes)
        .map((r) => ({ id: r.programme_id, name: r.programmes.programme_name, code: r.programmes.programme_code }))
      setProgrammes(list)

      const stored = readStored(user.id)
      const match = list.find((p) => p.id === stored)
      setProgrammeIdState(match ? match.id : (list[0]?.id || null))
    } catch (err) {
      console.error('CurrentProgrammeContext load error:', err)
      setProgrammes([])
      setProgrammeIdState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setProgrammeId = useCallback(async (id) => {
    setProgrammeIdState(id)
    const { user } = await getAuthenticatedUser()
    if (user) writeStored(user.id, id)
  }, [])

  const currentProgramme = programmes.find((p) => p.id === programmeId) || null

  return (
    <CurrentProgrammeContext.Provider value={{ programmes, programmeId, currentProgramme, setProgrammeId, loading }}>
      {children}
    </CurrentProgrammeContext.Provider>
  )
}

export function useCurrentProgramme() {
  const ctx = useContext(CurrentProgrammeContext)
  if (!ctx) {
    return { programmes: [], programmeId: null, currentProgramme: null, setProgrammeId: () => {}, loading: false }
  }
  return ctx
}
