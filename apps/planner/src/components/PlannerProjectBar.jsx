/**
 * v1239 Slice 5 — the Planner's project picker for the shared planning screens (passed to
 * PlanningProvider as ProjectBar). Writes `?projectId=<project_code>` (rule 16.1); the shared
 * screens resolve it with usePlatformProjectId().
 */
import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SelectField from '@nidus/ui/SelectField'
import { useWorkspace } from '../lib/workspace.jsx'

export default function PlannerProjectBar({ autoSelectSingle = true }) {
  const { projects } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const current = params.get('projectId') || ''
  const match = projects.find((p) => p.project_code === current || p.id === current)

  useEffect(() => {
    if (!current && autoSelectSingle && projects.length === 1) {
      const next = new URLSearchParams(params)
      next.set('projectId', projects[0].project_code || projects[0].id)
      setParams(next, { replace: true })
    }
  }, [current, autoSelectSingle, projects, params, setParams])

  if (!projects.length) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        No projects yet. <Link to="/app/projects/new" className="text-blue-600 dark:text-blue-400 underline">Create your first project</Link>.
      </p>
    )
  }
  return (
    <div className="max-w-sm">
      <SelectField
        options={projects.map((p) => ({ value: p.project_code || p.id, label: `${p.project_name}${p.project_code ? ` (${p.project_code})` : ''}` }))}
        value={match ? (match.project_code || match.id) : ''}
        onChange={(v) => {
          const next = new URLSearchParams(params)
          if (v) next.set('projectId', v)
          else next.delete('projectId')
          setParams(next)
        }}
        placeholder="Choose a project"
        searchPlaceholder="Search projects"
        aria-label="Project"
      />
    </div>
  )
}
