/**
 * Lesson Scope Selector Component
 * Project/Corporate/Both selector
 */

export default function LessonScopeSelector({ value, onChange }) {
  const options = [
    { value: 'project', label: 'Project Only' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'programme', label: 'Programme' },
    { value: 'both_project_corporate', label: 'Project & Corporate' },
    { value: 'both_project_programme', label: 'Project & Programme' }
  ];

  return (
    <select
      value={value || 'project'}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
