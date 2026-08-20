/**
 * Lessons List Component
 * List of lessons with filters
 */

import { Lightbulb } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
import LessonCard from './LessonCard';
import LessonStatusBadge from './LessonStatusBadge';
import EffectTypeIndicator from './EffectTypeIndicator';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';

export default function LessonsList({
  lessons = [],
  loading = false,
  onView,
  onEdit,
  onDelete,
  onPromote,
  emptyMessage = 'No lessons found',
  viewMode = 'grid',
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[72rem] w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap min-w-[9rem]">Record ID</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case min-w-[16rem]">Title</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Effect</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Priority</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Status</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Date</TableHeaderCell>
                <TableHeaderCell
                  sortable={false}
                  className="!normal-case text-right sticky right-0 min-w-[8.5rem] bg-gray-50 dark:bg-gray-700 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.15)]"
                >
                  Actions
                </TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {lessons.map((lesson, index) => (
                <tr key={lesson.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                    {lesson.lesson_reference || `#${lesson.lesson_number || ''}`}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{lesson.lesson_title}</div>
                    {lesson.what_happened && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{lesson.what_happened}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {lesson.lesson_category || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <EffectTypeIndicator effectType={lesson.effect_type} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm capitalize">{lesson.priority || '—'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <LessonStatusBadge status={lesson.status} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {lesson.lesson_date ? new Date(lesson.lesson_date).toLocaleDateString() : '—'}
                  </td>
                  <td
                    className="px-3 py-3 text-right sticky right-0 min-w-[8.5rem] whitespace-nowrap bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-[2] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 justify-end">
                      {onView && (
                        <RowActionButton variant="view" label="View lesson" onClick={() => onView(lesson)} />
                      )}
                      {onEdit && (
                        <RowActionButton variant="edit" label="Edit lesson" onClick={() => onEdit(lesson)} />
                      )}
                      {onDelete && (
                        <RowActionButton variant="delete" label="Delete lesson" onClick={() => onDelete(lesson)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson, index) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          rowNumber={getDisplayRowNumber(index)}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onPromote={onPromote}
        />
      ))}
    </div>
  );
}
