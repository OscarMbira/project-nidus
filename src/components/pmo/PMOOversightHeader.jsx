/**
 * PMO Oversight Header – shared header for Risk, Issue, Quality, Lessons oversight pages.
 * Renders page title, description, project selector (All Projects | specific), and stat cards.
 */

import { useMemo } from 'react';

const DEFAULT_ICON = () => null;

export default function PMOOversightHeader({
  title,
  description,
  icon: Icon = DEFAULT_ICON,
  stats = [],
  projectId,
  projects = [],
  onProjectChange,
}) {
  const statCards = useMemo(
    () =>
      Array.isArray(stats)
        ? stats.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {s.value != null ? s.value : '—'}
              </p>
            </div>
          ))
        : null,
    [stats]
  );

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {Icon !== DEFAULT_ICON && <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />}
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">All Projects</option>
            {(projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
                {p.project_code ? ` (${p.project_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {statCards && statCards.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {statCards}
        </div>
      )}
    </div>
  );
}
