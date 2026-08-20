/**
 * Risks List Component
 * List of risks with filters
 */

import { AlertTriangle } from 'lucide-react';
import RiskCard from './RiskCard';
import RiskStatusBadge from './RiskStatusBadge';
import RiskScoreBadge from './RiskScoreBadge';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { RowActionButton } from '@nidus/ui';

/** Sky tones are not remapped by BrandingContext (blue/purple are). */
const ACTION_LINK_CLASS =
  'inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200';

function formatEnumLabel(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RisksList({
  risks = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
  onEscalate,
  emptyMessage = 'No risks found',
  viewMode = 'grid',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!risks || risks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable={false} className="!normal-case">Reference</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case min-w-[280px] lg:min-w-[380px]">Title</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Score</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Proximity</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Risk Response</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Impact</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Status</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap min-w-[9rem] max-w-[12rem]">Owner</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Identified</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]">
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {risks.map((risk, index) => {
                const ownerName = risk.risk_owner?.full_name || '—';
                return (
                <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                    {risk.risk_identifier || risk.risk_code || `#${risk.risk_number || ''}`}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{risk.risk_title}</div>
                    {(risk.event_description || risk.risk_description) && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {risk.event_description || risk.risk_description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {risk.risk_category || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RiskScoreBadge score={risk.pre_risk_score || risk.risk_level} expectedValue={risk.pre_expected_value || risk.risk_score} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatEnumLabel(risk.proximity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatEnumLabel(risk.response_category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {risk.pre_impact ? `${risk.pre_impact}/5` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RiskStatusBadge status={risk.status_enum || risk.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[12rem]">
                    <span className="block truncate whitespace-nowrap" title={ownerName !== '—' ? ownerName : undefined}>
                      {ownerName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {risk.identified_date ? new Date(risk.identified_date).toLocaleDateString() : '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-3 justify-end">
                      {onView && (
                        <RowActionButton
                          variant="view"
                          label="View risk"
                          onClick={() => onView(risk)}
                        />
                      )}
                      {onEdit && (
                        <RowActionButton
                          variant="edit"
                          label="Edit risk"
                          onClick={() => onEdit(risk)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {risks.map((risk, index) => (
        <RiskCard
          key={risk.id}
          risk={risk}
          rowNumber={getDisplayRowNumber(index)}
          onEdit={onEdit}
          onDelete={onDelete}
          onEscalate={onEscalate}
        />
      ))}
    </div>
  );
}
