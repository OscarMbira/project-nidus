import { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function TrendChart({
  title,
  data = [], // Array of { date, value, label }
  height = 200,
  showPoints = true,
  showLine = true,
  color = '#3B82F6',
  formatValue = (val) => val,
  formatDate = (date) => new Date(date).toLocaleDateString(),
  className = ''
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 800;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Find min/max values for scaling
  const values = data.map(d => parseFloat(d.value) || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Calculate Y scale
  const scaleY = (value) => {
    const normalized = (value - minValue) / valueRange;
    return padding.top + innerHeight - (normalized * innerHeight);
  };

  // Calculate X positions (evenly spaced)
  const stepX = innerWidth / Math.max(1, data.length - 1);
  const points = data.map((d, index) => ({
    x: padding.left + (index * stepX),
    y: scaleY(parseFloat(d.value) || 0),
    ...d
  }));

  // Calculate trend
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
  const trendPercentage = firstValue !== 0 
    ? ((lastValue - firstValue) / firstValue) * 100 
    : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {data.length > 1 && (
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : null}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600 dark:text-green-400' :
              trend === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-gray-500 dark:text-gray-400'
            }`}>
              {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="relative" style={{ width: '100%', maxWidth: `${chartWidth}px`, overflowX: 'auto' }}>
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padding.top + (innerHeight * (1 - fraction));
            const value = minValue + (valueRange * fraction);
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {/* Line */}
          {showLine && points.length > 1 && (
            <polyline
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {showPoints && points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === index ? 6 : 4}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              
              {/* Tooltip */}
              {hoveredIndex === index && (
                <g>
                  <rect
                    x={point.x - 50}
                    y={point.y - 50}
                    width="100"
                    height="40"
                    rx="4"
                    fill="rgba(0, 0, 0, 0.8)"
                    className="dark:fill-gray-700"
                  />
                  <text
                    x={point.x}
                    y={point.y - 35}
                    textAnchor="middle"
                    className="text-xs fill-white dark:fill-gray-100"
                  >
                    {formatDate(point.date)}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 20}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-white dark:fill-gray-100"
                  >
                    {formatValue(point.value)}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((point, index) => {
            // Show every nth label to avoid crowding
            const showLabel = index === 0 || index === points.length - 1 || (points.length <= 10);
            if (!showLabel && index % Math.ceil(points.length / 5) !== 0) return null;

            return (
              <text
                key={index}
                x={point.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
              >
                {formatDate(point.date)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      {data.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>
              {data.length} data point{data.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            Range: {formatValue(minValue)} - {formatValue(maxValue)}
          </div>
        </div>
      )}
    </div>
  );
}

