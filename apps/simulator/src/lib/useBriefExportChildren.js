import { useEffect, useState } from 'react'
import { getTolerances } from '../services/briefTolerancesService'
import { getProducts } from '../services/briefProductService'
import { getRoles } from '../services/briefRolesService'
import { getReferences } from '../services/briefReferencesService'
import { listMilestones } from '../services/milestoneService'

const EMPTY = { tolerances: [], products: [], roles: [], references: [], milestones: [] }

/** A brief's tolerance, product, role and reference rows, plus the project's milestones (v1344), for its record export tables. */
export function useBriefExportChildren(briefId, projectId = null) {
  const [children, setChildren] = useState(EMPTY)

  useEffect(() => {
    if (!briefId) return undefined
    let cancelled = false
    const safe = (promise) => promise.catch(() => [])
    Promise.all([
      safe(getTolerances(briefId)),
      safe(getProducts(briefId)),
      safe(getRoles(briefId)),
      safe(getReferences(briefId)),
      projectId ? listMilestones(projectId).then((r) => r?.data || []).catch(() => []) : Promise.resolve([]),
    ]).then(([tolerances, products, roles, references, milestones]) => {
      if (!cancelled) setChildren({ tolerances, products, roles, references, milestones })
    })
    return () => {
      cancelled = true
    }
  }, [briefId, projectId])

  return briefId ? children : EMPTY
}
