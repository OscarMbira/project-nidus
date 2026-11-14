/**
 * v1341 (D16, D19) — Project Setup → Project Settings → Industry Modules (Platform).
 * The open project comes from usePlatformProjectId (rule 16.1 project_code in the URL).
 */
import { useEffect, useState } from 'react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformDb } from '@nidus/supabase'
import IndustryModulesScreen from '@nidus/ui/IndustryModulesScreen'

export default function IndustryModulesPage() {
  const { projectId } = usePlatformProjectId()
  const [projectLabel, setProjectLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!projectId) return undefined
    platformDb.from('projects').select('project_name, project_code').eq('id', projectId).maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectLabel([data?.project_code, data?.project_name].filter(Boolean).join(' — '))
      })
    return () => { cancelled = true }
  }, [projectId])

  return <IndustryModulesScreen app="platform" projectId={projectId || null} projectLabel={projectLabel} />
}
