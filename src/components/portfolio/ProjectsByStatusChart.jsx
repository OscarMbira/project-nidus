import { FolderKanban, CheckCircle, AlertCircle, XCircle, PauseCircle } from 'lucide-react';

export default function ProjectsByStatusChart({ projects = [] }) {
  const statusCounts = projects.reduce((acc, p) => {
    const status = p.project?.project_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = projects.length;
  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No projects data available</p>
      </div>
    );
  }

  const statusData = [
    { status: 'active', label: 'Active', count: statusCounts.active || 0, color: '#10B981', icon: FolderKanban },
    { status: 'completed', label: 'Completed', count: statusCounts.completed || 0, color: '#3B82F6', icon: CheckCircle },
    { status: 'on_hold', label: 'On Hold', count: statusCounts.on_hold || 0, color: '#F59E0B', icon: PauseCircle },
    { status: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0, color: '#EF4444', icon: XCircle },
    { status: 'planning', label: 'Planning', count: statusCounts.planning || 0, color: '#8B5CF6', icon: AlertCircle },
  ].filter(item => item.count > 0);

  const maxCount = Math.max(...statusData.map(d => d.count), 1);
  const width = 400;
  const height = 250;
  const padding = 60;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  const barWidth = chartWidth / Math.max(statusData.length, 1) - 10;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Projects by Status
      </h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
          {/* Y-axis */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-300 dark:text-gray-600"
          />
          {/* X-axis */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-300 dark:text-gray-600"
          />
          
          {/* Bars */}
          {statusData.map((item, index) => {
            const x = padding + index * (chartWidth / statusData.length) + 5;
            const barHeight = (item.count / maxCount) * chartHeight;
            const y = height - padding - barHeight;
            const Icon = item.icon;

            return (
              <g key={item.status}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={item.color}
                  className="transition-all hover:opacity-80"
                />
                {/* Count label on bar */}
                {barHeight > 20 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-gray-900 dark:fill-white"
                  >
                    {item.count}
                  </text>
                )}
                {/* Status label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  transform={`rotate(-45 ${x + barWidth / 2} ${height - padding + 20})`}
                >
                  {item.label}
                </text>
                {/* Percentage */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 35}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-500 dark:fill-gray-500"
                >
                  {Math.round((item.count / total) * 100)}%
                </text>
              </g>
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - padding - ratio * chartHeight;
            const value = Math.round(ratio * maxCount);
            return (
              <g key={ratio}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-300 dark:text-gray-600"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {statusData.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.label}: {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

