import { useState } from 'react';
import { Filter, X, Plus, Trash2 } from 'lucide-react';

export default function FilterBuilder({ fields = [], filters = [], onFiltersChange, className = '' }) {
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilter, setNewFilter] = useState({
    field: '',
    operator: 'equals',
    value: '',
  });

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_equal', label: 'Greater Than or Equal' },
    { value: 'less_equal', label: 'Less Than or Equal' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' },
    { value: 'is_null', label: 'Is Null' },
    { value: 'is_not_null', label: 'Is Not Null' },
  ];

  const handleAddFilter = () => {
    if (!newFilter.field) return;

    const field = fields.find(f => f.name === newFilter.field);
    if (!field) return;

    onFiltersChange([...filters, {
      ...newFilter,
      id: Date.now().toString(),
      fieldName: field.name,
      fieldLabel: field.label || field.name,
      fieldType: field.type,
    }]);

    setNewFilter({ field: '', operator: 'equals', value: '' });
    setShowAddFilter(false);
  };

  const handleRemoveFilter = (filterId) => {
    onFiltersChange(filters.filter(f => f.id !== filterId));
  };

  const getFilterDisplay = (filter) => {
    const field = fields.find(f => f.name === filter.field || f.name === filter.fieldName);
    const operator = operators.find(op => op.value === filter.operator);
    
    let valueDisplay = filter.value;
    if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
      valueDisplay = '';
    }

    return `${field?.label || filter.fieldName || filter.field} ${operator?.label || filter.operator} ${valueDisplay}`.trim();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </h3>
          {filters.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filters.length} filter{filters.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Existing Filters */}
        {filters.length > 0 && (
          <div className="space-y-2">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-sm text-gray-900 dark:text-white">
                  {getFilterDisplay(filter)}
                </span>
                <button
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Remove filter"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Filter Form */}
        {showAddFilter ? (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Field
              </label>
              <select
                value={newFilter.field}
                onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select field...</option>
                {fields.map(field => (
                  <option key={field.name} value={field.name}>
                    {field.label || field.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Operator
              </label>
              <select
                value={newFilter.operator}
                onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {operators.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {newFilter.operator !== 'is_null' && newFilter.operator !== 'is_not_null' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={newFilter.value}
                  onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  placeholder="Enter value..."
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddFilter}
                disabled={!newFilter.field}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Filter
              </button>
              <button
                onClick={() => {
                  setShowAddFilter(false);
                  setNewFilter({ field: '', operator: 'equals', value: '' });
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddFilter(true)}
            className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add Filter</span>
          </button>
        )}
      </div>
    </div>
  );
}

