/**
 * Risks Filters Component
 * Filter by type, category, status, score, proximity, owner
 */

import { Search, X } from 'lucide-react';

const CATEGORIES = [
  'schedule', 'cost', 'quality', 'scope', 'resource', 
  'technical', 'legal', 'regulatory', 'commercial', 
  'operational', 'strategic', 'external', 'organizational', 'other'
];

const STATUSES = [
  'identified', 'assessing', 'responding', 'monitoring', 'occurred', 'closed', 'expired'
];

const RISK_LEVELS = ['very_low', 'low', 'medium', 'high', 'very_high'];

const PROXIMITY_OPTIONS = [
  { value: 'imminent', label: 'Imminent' },
  { value: 'within_stage', label: 'Within Stage' },
  { value: 'within_project', label: 'Within Project' },
  { value: 'beyond_project', label: 'Beyond Project' }
];

export default function RisksFilters({ filters, onFiltersChange, onClear }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value === filters[key] ? '' : value
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search risks..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={filters.risk_type || ''}
            onChange={(e) => handleFilterChange('risk_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="threat">Threat</option>
            <option value="opportunity">Opportunity</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={filters.risk_category || ''}
            onChange={(e) => handleFilterChange('risk_category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Level */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Risk Level
          </label>
          <select
            value={filters.risk_level || ''}
            onChange={(e) => handleFilterChange('risk_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Levels</option>
            {RISK_LEVELS.map(level => (
              <option key={level} value={level}>
                {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Proximity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Proximity
          </label>
          <select
            value={filters.proximity || ''}
            onChange={(e) => handleFilterChange('proximity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Proximities</option>
            {PROXIMITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
