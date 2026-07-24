import { Grid, List } from 'lucide-react';

/**
 * Card grid vs table list toggle (matches Projects page styling).
 * @param {{ value: 'grid'|'list', onChange: (v: 'grid'|'list') => void, ariaLabel?: string, className?: string }} props
 */
export default function ViewToggle({ value, onChange, ariaLabel = 'List layout', className = '' }) {
  return (
    <div
      className={`flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Card grid view"
        aria-pressed={value === 'grid'}
        title="Card view"
        onClick={() => onChange('grid')}
        className={`min-h-[44px] min-w-[44px] p-2 rounded transition-colors flex items-center justify-center ${
          value === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        <Grid className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Table list view"
        aria-pressed={value === 'list'}
        title="Table view"
        onClick={() => onChange('list')}
        className={`min-h-[44px] min-w-[44px] p-2 rounded transition-colors flex items-center justify-center ${
          value === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        <List className="h-5 w-5" />
      </button>
    </div>
  );
}
