import { useEffect, useState } from 'react'
import { isColumnAvailable } from '../services/columnProbe'

/**
 * v1338 Requirement Changes: this project's requirements as picker options, and whether the change
 * table has `related_requirement_ids` yet (it arrives with SQL the owner runs; until then the picker
 * stays hidden and nothing is sent).
 * @param {{ db: object, projectId: string|null, projectColumn: 'project_id'|'practice_project_id', changeTable: string }} input
 * @returns {{ available: boolean, options: {value: string, label: string}[] }}
 */
export function useRelatedRequirementOptions({ db, projectId, projectColumn, changeTable }) {
  const [state, setState] = useState({ available: false, options: [] })
  useEffect(() => {
    if (!db || !projectId) return undefined
    let cancelled = false
    Promise.all([
      isColumnAvailable(db, changeTable, 'related_requirement_ids'),
      db.from('requirements_register')
        .select('id, requirement_code, name')
        .eq(projectColumn, projectId)
        .eq('is_deleted', false)
        .order('requirement_code', { ascending: true }),
    ]).then(([available, { data }]) => {
      if (cancelled) return
      setState({
        available,
        options: (data || []).map((r) => ({ value: r.id, label: [r.requirement_code, r.name].filter(Boolean).join(' – ') })),
      })
    })
    return () => { cancelled = true }
  }, [db, projectId, projectColumn, changeTable])
  return state
}
