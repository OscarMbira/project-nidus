import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function TimelineView({ projects = [] }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No timeline data available</p>
      </div>
    );
  }

  // Get all dates from projects
  const allDates = [];
  projects.forEach(p => {
    if (p.project?.project_start_date) allDates.push(parseISO(p.project.project_start_date));
    if (p.project?.project_end_date) allDates.push(parseISO(p.project.project_end_date));
  });

  if (allDates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No date information available</p>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Group projects by status for color coding
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'on_hold':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Calculate timeline bars
  const timelineData = projects
    .filter(p => p.project?.project_start_date && p.project?.project_end_date)
    .map(p => {
      const start = parseISO(p.project.project_start_date);
      const end = parseISO(p.project.project_end_date);
      const startOffset = differenceInDays(start, minDate);
      const duration = differenceInDays(end, start) + 1;
      const width = (duration / totalDays) * 100;
      const left = (startOffset / totalDays) * 100;

      return {
        ...p,
        start,
        end,
        startOffset,
        duration,
        width,
        left,
        color: getStatusColor(p.project?.project_status),
      };
    })
    .sort((a, b) => a.startOffset - b.startOffset);

  const width = 600;
  const barHeight = 30;
  const spacing = 8;
  const chartHeight = timelineData.length * (barHeight + spacing);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Timeline
        </h3>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>

      {/* Date range */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{format(minDate, 'MMM dd, yyyy')}</span>
        </div>
        <TrendingUp className="h-4 w-4" />
        <div className="flex items-center gap-2">
          <span>{format(maxDate, 'MMM dd, yyyy')}</span>
          <Clock className="h-4 w-4" />
        </div>
      </div>

      {/* Timeline bars */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: width, height: Math.max(chartHeight, 100) }}>
          {/* Timeline axis */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />

          {/* Project bars */}
          {timelineData.map((item, index) => (
            <div
              key={item.id || index}
              className="absolute group"
              style={{
                left: `${item.left}%`,
                top: index * (barHeight + spacing),
                width: `${item.width}%`,
                height: barHeight,
              }}
            >
              <div
                className="h-full rounded px-2 flex items-center justify-between text-white text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: item.color }}
                title={`${item.project?.project_name || 'Unknown'} - ${format(item.start, 'MMM dd')} to ${format(item.end, 'MMM dd')}`}
              >
                <span className="truncate flex-1 mr-2">
                  {item.project?.project_name || 'Unknown Project'}
                </span>
                <span className="flex-shrink-0">
                  {item.duration}d
                </span>
              </div>
            </div>
          ))}

          {/* Today marker */}
          {(() => {
            const today = new Date();
            if (today >= minDate && today <= maxDate) {
              const todayOffset = differenceInDays(today, minDate);
              const todayLeft = (todayOffset / totalDays) * 100;
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${todayLeft}%` }}
                >
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-1 rounded">
                    Today
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {[
          { status: 'active', label: 'Active', color: '#10B981' },
          { status: 'completed', label: 'Completed', color: '#3B82F6' },
          { status: 'on_hold', label: 'On Hold', color: '#F59E0B' },
          { status: 'cancelled', label: 'Cancelled', color: '#EF4444' },
        ].map(item => (
          <div key={item.status} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

