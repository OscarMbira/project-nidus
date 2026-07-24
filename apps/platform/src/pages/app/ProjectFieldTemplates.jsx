import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TierFieldCustomisationPanel from '@nidus/ui/TierFieldCustomisationPanel.jsx'
import TierFormPolicyPanel from '@nidus/ui/TierFormPolicyPanel.jsx'
import { platformDb as db } from '../../services/supabase/supabaseClient'

export default function ProjectFieldTemplates() {
  const { projectId } = useParams()
  const [accountId, setAccountId] = useState(null)
  const [projectName, setProjectName] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    db.from('projects')
      .select('account_id, project_name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setAccountId(data?.account_id || null)
        setProjectName(data?.project_name || null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, db])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Field Templates</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Fields inherited from the programme, portfolio, or PMO default, with the option to override or add fields
        local to this project.
      </p>
      {accountId ? (
        <TierFieldCustomisationPanel
          db={db}
          accountId={accountId}
          tier="project"
          entityType="project"
          entityId={projectId}
          entityName={projectName}
        />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      )}

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-10 mb-1">Form Templates</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enable/disable and require fields on shared forms, or add fields local to this project.
      </p>
      {accountId && (
        <TierFormPolicyPanel
          mode="platform"
          accountId={accountId}
          tier="project"
          entityType="project"
          entityId={projectId}
          entityName={projectName}
        />
      )}
    </div>
  )
}
