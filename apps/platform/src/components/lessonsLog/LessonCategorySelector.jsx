/**
 * Lesson Category Selector Component
 * Category picker
 */

const CATEGORIES = [
  'process', 'technical', 'resource', 'communication', 
  'stakeholder', 'quality', 'schedule', 'cost', 'risk', 
  'procurement', 'other'
];

export default function LessonCategorySelector({ value, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
    >
      <option value="">Select category</option>
      {CATEGORIES.map(cat => (
        <option key={cat} value={cat}>
          {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </option>
      ))}
    </select>
  );
}
