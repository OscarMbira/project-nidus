// Reusable dashboard widgets

export function StatCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`${colorClasses[color]} rounded-lg p-3`}>
            <span className="text-white text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProgressCard({ title, percentage, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`${colorClasses[color]} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  )
}

export function TaskListWidget({ title, tasks, onTaskClick }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No tasks found
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick && onTaskClick(task.id)}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {task.task_name}
                </span>
                {task.task_statuses && (
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                  >
                    {task.task_statuses.status_name}
                  </span>
                )}
              </div>
              {task.projects && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {task.projects.project_name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectListWidget({ title, projects, onProjectClick }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No projects found
        </p>
      ) : (
        <div className="space-y-2">
          {projects.slice(0, 5).map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectClick && onProjectClick(project.id)}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.project_name}
                </span>
                {project.project_statuses && (
                  <span
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
                  >
                    {project.project_statuses.status_name}
                  </span>
                )}
              </div>
              {project.percentage_complete !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{project.percentage_complete}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${project.percentage_complete}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

