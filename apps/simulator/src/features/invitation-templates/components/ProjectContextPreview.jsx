/** Read-only preview of project context block (matches invitation email). */

export default function ProjectContextPreview({ projectContext }) {
  if (!projectContext) return null

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-5 py-4 text-sm space-y-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Project context
      </p>
      {projectContext.projectDescription ? (
        <p className="m-0 text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-500 dark:text-gray-400">Description: </span>
          {projectContext.projectDescription}
        </p>
      ) : null}
      <p className="m-0 text-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-500 dark:text-gray-400">Type: </span>
        {projectContext.projectType || 'Not specified'}
      </p>
      <p className="m-0 text-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-500 dark:text-gray-400">Methodology: </span>
        {projectContext.projectMethodology || 'Not specified'}
      </p>
      <p className="m-0 text-gray-700 dark:text-gray-300">
        <span className="font-medium text-gray-500 dark:text-gray-400">Timeline: </span>
        {projectContext.timeline || 'Dates not set'}
      </p>
      <p className="m-0 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Hierarchy
      </p>
      <ul className="m-0 pl-4 list-disc space-y-1 text-gray-700 dark:text-gray-300">
        {projectContext.portfolio?.line && <li>{projectContext.portfolio.line}</li>}
        {projectContext.programme?.line && <li>{projectContext.programme.line}</li>}
        {projectContext.projectLine && <li>{projectContext.projectLine}</li>}
      </ul>
    </div>
  )
}
