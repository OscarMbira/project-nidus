/**
 * Entry Type Badge Component
 * Visual badge for daily log entry types
 */

export default function EntryTypeBadge({ type, className = '' }) {
  const getColorClasses = (entryType) => {
    const colors = {
      problem: 'bg-red-100 text-red-800 border-red-300',
      action: 'bg-blue-100 text-blue-800 border-blue-300',
      event: 'bg-green-100 text-green-800 border-green-300',
      comment: 'bg-gray-100 text-gray-800 border-gray-300',
      observation: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      decision: 'bg-purple-100 text-purple-800 border-purple-300',
      other: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return colors[entryType] || colors.other;
  };

  const formatType = (entryType) => {
    return entryType ? entryType.charAt(0).toUpperCase() + entryType.slice(1) : 'Other';
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${getColorClasses(type)} ${className}`}>
      {formatType(type)}
    </span>
  );
}
