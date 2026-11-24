/**
 * v1354 — practice cross-project levelling. Kept in the Simulator app.
 */
import { useEffect, useState } from 'react'
import { simDb } from '@nidus/supabase'
import CrossProjectLevellingScreen from '@nidus/planning/screens/levelling/CrossProjectLevellingScreen.jsx'

export default function ResourceLevellingPage() {
  const [groups, setGroups] = useState([])
  const [priorities, setPriorities] = useState({})

  useEffect(() => {
    let cancel = false
    Promise.allSettled([
      simDb.from('practice_programmes').select('id, programme_name').eq('is_deleted', false),
      simDb.from('practice_programme_projects').select('practice_programme_id, practice_project_id, priority_order'),
      simDb.from('practice_portfolios').select('id, portfolio_name').eq('is_deleted', false),
      simDb.from('practice_portfolio_projects').select('practice_portfolio_id, practice_project_id, priority_order'),
    ]).then((results) => {
      if (cancel) return
      const programmes = results[0].status === 'fulfilled' ? results[0].value.data || [] : []
      const programmeLinks = results[1].status === 'fulfilled' ? results[1].value.data || [] : []
      const portfolios = results[2].status === 'fulfilled' ? results[2].value.data || [] : []
      const portfolioLinks = results[3].status === 'fulfilled' ? results[3].value.data || [] : []
      setGroups([
        ...programmes.map((p) => ({ id: `prg-${p.id}`, label: p.programme_name, projectIds: programmeLinks.filter((l) => l.practice_programme_id === p.id).map((l) => l.practice_project_id) })),
        ...portfolios.map((p) => ({ id: `pfo-${p.id}`, label: p.portfolio_name, projectIds: portfolioLinks.filter((l) => l.practice_portfolio_id === p.id).map((l) => l.practice_project_id) })),
      ])
      const order = {}
      for (const link of [...programmeLinks, ...portfolioLinks]) {
        const id = link.practice_project_id
        const n = Number(link.priority_order)
        if (!Number.isFinite(n)) continue
        order[id] = order[id] == null ? n : Math.min(order[id], n)
      }
      setPriorities(order)
    })
    return () => { cancel = true }
  }, [])

  return <CrossProjectLevellingScreen groups={groups} priorities={priorities} />
}
