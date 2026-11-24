/**
 * v1354 — cross-project levelling with programme and portfolio shortcuts.
 * This file stays in the Platform app so the Planner allow-list does not gain portfolio tables.
 */
import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import CrossProjectLevellingScreen from '@nidus/planning/screens/levelling/CrossProjectLevellingScreen.jsx'

export default function ResourceLevellingPage() {
  const [groups, setGroups] = useState([])
  const [priorities, setPriorities] = useState({})

  useEffect(() => {
    let cancel = false
    Promise.allSettled([
      platformDb.from('programmes').select('id, programme_name').eq('is_deleted', false),
      platformDb.from('programme_projects').select('programme_id, project_id, priority_order'),
      platformDb.from('portfolios').select('id, portfolio_name').eq('is_deleted', false),
      platformDb.from('portfolio_projects').select('portfolio_id, project_id, priority_order'),
    ]).then((results) => {
      if (cancel) return
      const programmes = results[0].status === 'fulfilled' ? results[0].value.data || [] : []
      const programmeLinks = results[1].status === 'fulfilled' ? results[1].value.data || [] : []
      const portfolios = results[2].status === 'fulfilled' ? results[2].value.data || [] : []
      const portfolioLinks = results[3].status === 'fulfilled' ? results[3].value.data || [] : []
      const next = [
        ...programmes.map((p) => ({ id: `prg-${p.id}`, label: p.programme_name, projectIds: programmeLinks.filter((l) => l.programme_id === p.id).map((l) => l.project_id) })),
        ...portfolios.map((p) => ({ id: `pfo-${p.id}`, label: p.portfolio_name, projectIds: portfolioLinks.filter((l) => l.portfolio_id === p.id).map((l) => l.project_id) })),
      ]
      const order = {}
      for (const link of [...programmeLinks, ...portfolioLinks]) {
        const n = Number(link.priority_order)
        if (!Number.isFinite(n)) continue
        order[link.project_id] = order[link.project_id] == null ? n : Math.min(order[link.project_id], n)
      }
      setGroups(next)
      setPriorities(order)
    })
    return () => { cancel = true }
  }, [])

  return <CrossProjectLevellingScreen groups={groups} priorities={priorities} />
}
