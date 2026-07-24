import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function BudgetUtilizationChart({ 
  utilized = 0, 
  allocated = 0, 
  budgetData = [] 
}) {
  const utilization = allocated > 0 ? (utilized / allocated) * 100 : 0;
  const normalizedUtilization = Math.max(0, Math.min(100, utilization));

  const hasTimeSeries = budgetData && budgetData.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Budget Utilization
        </h3>
        <DollarSign className="h-5 w-5 text-gray-400" />
      </div>

      {hasTimeSeries ? (
        <BudgetLineChart data={budgetData} />
      ) : (
        <BudgetBarChart utilized={utilized} allocated={allocated} utilization={normalizedUtilization} />
      )}
    </div>
  );
}

function BudgetBarChart({ utilized, allocated, utilization }) {
  const color = utilization > 100 ? '#EF4444' : utilization > 90 ? '#F59E0B' : '#10B981';
  const remaining = Math.max(0, allocated - utilized);
  const overBudget = utilized > allocated ? utilized - allocated : 0;

  const width = 300;
  const height = 200;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  const barHeight = 40;

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
          {/* Background */}
          <rect
            x={padding}
            y={padding}
            width={chartWidth}
            height={barHeight}
            fill="#E5E7EB"
            className="dark:fill-gray-700"
            rx="4"
          />

          {/* Utilized */}
          {utilized > 0 && (
            <rect
              x={padding}
              y={padding}
              width={(Math.min(utilized, allocated) / allocated) * chartWidth}
              height={barHeight}
              fill={color}
              rx="4"
              className="transition-all"
            />
          )}

          {/* Over budget (if any) */}
          {overBudget > 0 && (
            <rect
              x={padding + chartWidth}
              y={padding}
              width={(overBudget / allocated) * chartWidth}
              height={barHeight}
              fill="#EF4444"
              rx="4"
              className="transition-all"
            />
          )}

          {/* Labels */}
          <text
            x={padding + chartWidth / 2}
            y={padding + barHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-semibold fill-white"
          >
            ${utilized.toLocaleString()} / ${allocated.toLocaleString()}
          </text>

          {/* Utilization percentage */}
          <text
            x={padding + chartWidth / 2}
            y={padding + barHeight + 25}
            textAnchor="middle"
            className="text-2xl font-bold fill-gray-900 dark:fill-white"
          >
            {Math.round(utilization)}%
          </text>

          {/* Status label */}
          <text
            x={padding + chartWidth / 2}
            y={padding + barHeight + 45}
            textAnchor="middle"
            className="text-sm font-medium"
            style={{ fill: color }}
          >
            {utilization > 100 ? 'Over Budget' : utilization > 90 ? 'At Risk' : 'On Track'}
          </text>
        </svg>
      </div>

      {/* Budget breakdown */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            ${allocated.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Allocated
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${utilized.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Utilized
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
            ${remaining.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Remaining
          </div>
        </div>
      </div>

      {/* Alert if over budget */}
      {overBudget > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Over budget by ${overBudget.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetLineChart({ data }) {
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

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3B82F6"
          />
        ))}
      </svg>
    </div>
  );
}

