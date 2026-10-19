/**
 * v1239 Slice 5.5 — Planner home. Empty state (stories 7–8): "Create your first project" /
 * "Import a schedule". Otherwise: projects with quick links into the schedule.
 */
import { Link } from 'react-router-dom'
import { FolderPlus, FileUp, CalendarRange, BarChart3 } from 'lucide-react'
import { useWorkspace } from '../../lib/workspace.jsx'

const card = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5'

export default function HomePage() {
  const { context, projects, canManage, readOnly } = useWorkspace()
  const first = context?.full_name ? context.full_name.split(' ')[0] : null

  if (!projects.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Welcome{first ? `, ${first}` : ''}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Start by creating a project, or bring in a schedule you already have.</p>
        {canManage && !readOnly ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <Link to="/app/projects/new" className={`${card} hover:border-blue-500`}>
              <FolderPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <p className="mt-3 font-semibold">Create your first project</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name it, pick a start date, then add tasks.</p>
            </Link>
            <Link to="/app/projects/new?then=import" className={`${card} hover:border-blue-500`}>
              <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <p className="mt-3 font-semibold">Import a schedule</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">From XML, Excel or CSV. You check a preview before anything is saved.</p>
            </Link>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
            {readOnly ? 'Your trial has ended, so the workspace is read-only.' : 'You have not been added to a project yet. Ask your project manager to invite you.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Your projects</h1>
        {canManage && !readOnly && <Link to="/app/projects/new" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">New project</Link>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const q = `?projectId=${encodeURIComponent(p.project_code || p.id)}`
          return (
            <div key={p.id} className={card}>
              <p className="font-semibold">{p.project_name}</p>
              <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{p.project_code}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Starts {p.planned_start_date || '—'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link to={`/app/schedule/activities${q}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700"><CalendarRange className="h-4 w-4" /> Tasks</Link>
                <Link to={`/app/schedule/gantt${q}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700"><BarChart3 className="h-4 w-4" /> Plan Sheet</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
