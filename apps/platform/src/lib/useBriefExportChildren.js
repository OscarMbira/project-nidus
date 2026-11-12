import { useEffect, useState } from 'react'
import { getTolerances } from '../services/briefTolerancesService'
import { getProducts } from '../services/briefProductService'
import { getRoles } from '../services/briefRolesService'
import { getReferences } from '../services/briefReferencesService'

const EMPTY = { tolerances: [], products: [], roles: [], references: [] }

/** A brief's tolerance, product, role and reference rows for its record export tables. */
export function useBriefExportChildren(briefId) {
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
    ]).then(([tolerances, products, roles, references]) => {
      if (!cancelled) setChildren({ tolerances, products, roles, references })
    })
    return () => {
      cancelled = true
    }
  }, [briefId])

  return briefId ? children : EMPTY
}
