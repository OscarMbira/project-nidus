/**
 * Constraint List Item Component
 * Displays a single constraint in the list
 */

import { Trash2, Edit2, GripVertical } from 'lucide-react';

export default function ConstraintListItem({
  constraint,
  onEdit,
  onDelete,
  readOnly = false,
  draggable = false
}) {
  if (!constraint || !constraint.constraint_category) {
    return null;
  }

  const category = constraint.constraint_category;

  // Get formatted value display
  const getFormattedValue = () => {
    const { value_type } = category;

    switch (value_type) {
      case 'numeric':
        if (constraint.operand === 'between') {
          return `${constraint.unit || ''} ${constraint.value_min || 0} - ${constraint.value_max || 0}`;
        }
        return `${getOperandSymbol(constraint.operand)} ${constraint.unit || ''}${constraint.value_numeric || 0}`;

      case 'date':
        return constraint.value_date
          ? new Date(constraint.value_date).toLocaleDateString()
          : 'No date set';

      case 'dropdown':
      case 'text':
      default:
        return constraint.value_text || 'No value set';
    }
  };

  const getOperandSymbol = (operand) => {
    const symbols = {
      '=': '=',
      '<': '<',
      '<=': '≤',
      '>': '>',
      '>=': '≥',
      'between': '↔'
    };
    return symbols[operand] || '';
  };

  const getCategoryColor = (code) => {
    // Core constraints
    if (['C01', 'C02', 'C03'].includes(code)) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    // Extended constraints
    if (['C04', 'C05', 'C06'].includes(code)) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    // Resource constraints
    if (['C07', 'C08', 'C09'].includes(code)) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    }
    // Governance constraints
    if (['C10', 'C11', 'C12'].includes(code)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800';
    }
    // Environmental constraints
    if (['C13', 'C14', 'C15'].includes(code)) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800';
    }
    // Information constraints
    if (['C16', 'C17'].includes(code)) {
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${draggable ? 'cursor-move' : ''}`}>
      {/* Drag handle */}
      {draggable && !readOnly && (
        <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Category badge */}
      <div className={`flex items-center gap-2 px-2 py-1 rounded border ${getCategoryColor(category.code)}`}>
        <span className="font-mono text-xs font-bold">{category.code}</span>
        <span className="text-sm font-medium">{category.name}</span>
      </div>

      {/* Value display */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 dark:text-white font-medium truncate">
          {getFormattedValue()}
        </p>
        {constraint.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {constraint.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit?.(constraint)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Edit constraint"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(constraint)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Remove constraint"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
