/**
 * v1341 (D16, D12) — Industry Modules for a practice project (Simulator).
 * The practice project comes from ?projectId= (code or id), chosen with the practice project picker.
 */
import { useEffect, useState } from 'react'
import { simDb } from '@nidus/supabase'
import IndustryModulesScreen from '@nidus/ui/IndustryModulesScreen'
import PlanningProjectBar from '../../components/planning/PlanningProjectBar'
import { usePracticeProjectParam } from '../../lib/usePracticeProjectParam'

export default function IndustryModulesPage() {
  const { projectId } = usePracticeProjectParam()
  const [projectLabel, setProjectLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!projectId) return undefined
    simDb.from('practice_projects').select('project_name, project_code').eq('id', projectId).maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectLabel([data?.project_code, data?.project_name].filter(Boolean).join(' — '))
      })
    return () => { cancelled = true }
  }, [projectId])

  return (
    <IndustryModulesScreen
      app="simulator"
      projectId={projectId || null}
      projectLabel={projectLabel}
      picker={<PlanningProjectBar isSim autoSelectSingle />}
    />
  )
}
