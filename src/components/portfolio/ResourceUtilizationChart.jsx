import { Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function ResourceUtilizationChart({ utilization = 0, resourceData = [] }) {
  const normalizedUtilization = Math.max(0, Math.min(100, utilization));

  // If we have resource data over time, show a line chart; otherwise show a gauge
  const hasTimeSeries = resourceData && resourceData.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Resource Utilization
        </h3>
        <Users className="h-5 w-5 text-gray-400" />
      </div>

      {hasTimeSeries ? (
        // Line chart for time series data
        <LineChart data={resourceData} />
      ) : (
        // Gauge for single utilization value
        <UtilizationGauge utilization={normalizedUtilization} />
      )}
    </div>
  );
}

function UtilizationGauge({ utilization }) {
  const color = utilization > 90 ? '#EF4444' : utilization > 75 ? '#F59E0B' : '#10B981';
  const label = utilization > 90 ? 'Overutilized' : utilization > 75 ? 'High' : 'Optimal';

  const radius = 60;
  const centerX = 120;
  const centerY = 120;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (utilization / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      <svg width={240} height={140} viewBox="0 0 240 140" className="mx-auto">
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          className="dark:stroke-gray-700"
        />
        
        {/* Progress circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${centerX} ${centerY})`}
          className="transition-all duration-500"
        />

        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-3xl font-bold fill-gray-900 dark:fill-white"
        >
          {Math.round(utilization)}%
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium"
          style={{ fill: color }}
        >
          {label}
        </text>
      </svg>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 w-full">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(utilization)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Current
          </div>
        </div>
        <div className="text-center border-l border-r border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            75%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Target
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {utilization > 75 ? (
              <TrendingUp className="h-6 w-6 text-red-500 mx-auto" />
            ) : (
              <TrendingDown className="h-6 w-6 text-green-500 mx-auto" />
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status
          </div>
        </div>
      </div>
    </div>
  );
}

function LineChart({ data }) {
  const width = 400;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const values = data.map(d => d.value || 0);
  const maxValue = Math.max(...values, 100);
  const minValue = Math.min(...values, 0);

  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - ((item.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, ...item };
  });

  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
        {/* Axes */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-300 dark:text-gray-600"
        />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-300 dark:text-gray-600"
        />

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - padding - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          return (
            <line
              key={value}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="text-gray-200 dark:text-gray-700"
            />
          );
        })}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          className="transition-all"
        />

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3B82F6"
              className="transition-all hover:r-6"
            />
            {/* Value label */}
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {Math.round(point.value)}%
            </text>
          </g>
        ))}

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - padding - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          return (
            <text
              key={value}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {value}%
            </text>
          );
        })}
      </svg>
    </div>
  );
}

