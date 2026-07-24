/**
 * Lesson Priority Selector Component
 * Priority picker
 */

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function LessonPrioritySelector({ value, onChange }) {
  return (
    <select
      value={value || 'medium'}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
    >
      {PRIORITIES.map(priority => (
        <option key={priority} value={priority}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </option>
      ))}
    </select>
  );
}
