import { memo } from 'react';
import { TableRowNumberCell } from '../ui/Table';
import RowNumberBadge from '../ui/RowNumberBadge';
import { RowActionButton } from '@nidus/ui';

function formatShortDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

const DELIVERY_METHODOLOGY_LABELS = {
  hybrid: 'Hybrid (all tracks)',
  structured: 'Structured / Traditional',
  standards_based: 'Standards-Based Process Groups',
  agile: 'Agile & Lean',
  Structured: 'Structured (legacy)',
  Agile: 'Agile (legacy)',
  Hybrid: 'Hybrid (legacy)',
  Waterfall: 'Waterfall (legacy)',
};

/** delivery_methodology is the single field a user can capture (Create + Edit, Delivery tab).
 * project_methodologies (a separate junction table, no longer settable from the UI) is read
 * only as a last-resort fallback for legacy rows predating that simplification. */
export function getProjectMethodologyLabel(project) {
  if (project?.delivery_methodology) {
    return DELIVERY_METHODOLOGY_LABELS[project.delivery_methodology] || project.delivery_methodology;
  }
  // project_methodologies has a UNIQUE(project_id) constraint, so PostgREST embeds it as a
  // single object, not an array — handle both shapes rather than assuming [0] indexing.
  const pm = project?.project_methodologies;
  const linked = Array.isArray(pm) ? pm[0]?.methodologies : pm?.methodologies;
  if (linked?.methodology_name) return linked.methodology_name;
  return null;
}

/** Memoised grid tile — avoids re-rendering the whole grid on parent state churn */
export const ProjectGridCard = memo(function ProjectGridCard({
  project,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
  rowNumber,
}) {
  const start = formatShortDate(project.planned_start_date);
  const end = formatShortDate(project.planned_end_date);
  const dateLabel = start && end ? `${start} - ${end}` : null;
  const isDeleting = deletingId === project.id;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col text-left hover:border-purple-500/80 transition-colors">
      <button
        type="button"
        onClick={() => onSelect(project)}
        className="p-6 text-left cursor-pointer flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-t-lg"
      >
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {rowNumber != null && <RowNumberBadge number={rowNumber} className="shrink-0 mt-0.5" />}
            <h3 className="text-xl font-semibold text-gray-100">
              {project.project_name}
            </h3>
          </div>
          {project.project_code && (
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded shrink-0">
              {project.project_code}
            </span>
          )}
        </div>

        {project.project_description && (
          <p className="text-gray-400 mb-4 line-clamp-2 text-sm">
            {project.project_description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {project.project_statuses && (
            <span
              className="px-2 py-1 text-xs rounded text-white"
              style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
            >
              {project.project_statuses.status_name}
            </span>
          )}
          {getProjectMethodologyLabel(project) && (
            <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
              {getProjectMethodologyLabel(project)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 gap-2">
          {dateLabel && <span>{dateLabel}</span>}
          {project.percentage_complete != null && (
            <span className="text-purple-400 font-medium whitespace-nowrap">
              {project.percentage_complete}% Complete
            </span>
          )}
        </div>
      </button>

      <div
        className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-700 bg-gray-800/90"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <RowActionButton
          variant="view"
          label={`View project ${project.project_name}`}
          onClick={() => onSelect(project)}
        />
        <RowActionButton
          variant="edit"
          label={`Edit project ${project.project_name}`}
          onClick={() => onEdit(project)}
        />
        <RowActionButton
          variant="delete"
          label={`Delete project ${project.project_name}`}
          disabled={isDeleting}
          onClick={() => onDelete(project)}
        />
      </div>
    </div>
  );
});

/** Memoised table row — row click opens detail (Read); Actions column for View / Edit / Delete */
export const ProjectListRow = memo(function ProjectListRow({
  project,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
  rowNumber,
}) {
  const start = formatShortDate(project.planned_start_date);
  const end = formatShortDate(project.planned_end_date);
  const isDeleting = deletingId === project.id;

  return (
    <tr
      className="hover:bg-gray-700/30 cursor-pointer group"
      onClick={() => onSelect(project)}
    >
      <TableRowNumberCell number={rowNumber} className="!px-6" />
      <td className="px-6 py-4">
        <div>
          <div className="text-gray-100 font-medium">{project.project_name}</div>
          {project.project_description && (
            <div className="text-sm text-gray-400 line-clamp-1">{project.project_description}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
        {project.project_code ? (
          <span className="text-xs text-gray-400 bg-gray-700/80 px-2 py-1 rounded font-mono">
            {project.project_code}
          </span>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        {project.project_statuses && (
          <span
            className="px-2 py-1 text-xs rounded text-white"
            style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
          >
            {project.project_statuses.status_name}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
        {getProjectMethodologyLabel(project) || <span className="text-gray-500">—</span>}
      </td>
      <td className="px-6 py-4">
        {project.percentage_complete != null ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2 min-w-[4rem]">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, Number(project.percentage_complete)))}%` }}
              />
            </div>
            <span className="text-sm text-gray-400 w-12 text-right">{project.percentage_complete}%</span>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
        {start || <span className="text-gray-500">—</span>}
      </td>
      <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
        {end || <span className="text-gray-500">—</span>}
      </td>
      <td
        className="px-4 py-3 text-right whitespace-nowrap sticky right-0 bg-gray-800 group-hover:bg-gray-700/40 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-0.5">
          <RowActionButton
            variant="view"
            label={`View project ${project.project_name}`}
            onClick={() => onSelect(project)}
          />
          <RowActionButton
            variant="edit"
            label={`Edit project ${project.project_name}`}
            onClick={() => onEdit(project)}
          />
          <RowActionButton
            variant="delete"
            label={`Delete project ${project.project_name}`}
            disabled={isDeleting}
            onClick={() => onDelete(project)}
          />
        </div>
      </td>
    </tr>
  );
});
