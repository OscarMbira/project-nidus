/**
 * Entry Status Badge Component
 * Visual badge for daily log entry status
 */

export default function EntryStatusBadge({ status, className = '' }) {
  const getColorClasses = (entryStatus) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      escalated: 'bg-orange-100 text-orange-800'
    };
    return colors[entryStatus] || colors.open;
  };

  const formatStatus = (entryStatus) => {
    return entryStatus ? entryStatus.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') : 'Open';
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getColorClasses(status)} ${className}`}>
      {formatStatus(status)}
    </span>
  );
}
