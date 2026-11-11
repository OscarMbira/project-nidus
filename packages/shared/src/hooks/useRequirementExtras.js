import { useEffect, useState } from 'react'
import { loadRequirementNfrAreas, requirementExtrasAvailable } from '../services/requirementExtrasService'

/**
 * v1338: whether the requirement owner / rationale / verification / area columns exist on this client's
 * requirements_register, and the non-functional areas. Both load together (rule 66).
 * @param {object} db platformDb (public) or simDb (practice projects)
 */
export function useRequirementExtras(db) {
  const [state, setState] = useState({ available: false, areas: [], loading: true })
  useEffect(() => {
    let cancelled = false
    Promise.all([requirementExtrasAvailable(db), loadRequirementNfrAreas()]).then(([available, areas]) => {
      if (!cancelled) setState({ available, areas, loading: false })
    })
    return () => { cancelled = true }
  }, [db])
  return state
}
