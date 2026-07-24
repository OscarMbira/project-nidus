import { FolderKanban, Target, Grid3x3, Zap, Layers } from 'lucide-react';

export default function ProjectsByMethodologyChart({ projects = [] }) {
  const methodologyCounts = projects.reduce((acc, p) => {
    const methodology = p.project?.methodology || 'unknown';
    acc[methodology] = (acc[methodology] || 0) + 1;
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

  const methodologyLabels = {
    'structured': 'Structured PM',
    'scrum': 'Scrum',
    'kanban': 'Kanban',
    'agile': 'Agile',
    'hybrid': 'Hybrid',
  };

  const methodologyIcons = {
    'structured': Target,
    'scrum': Zap,
    'kanban': Grid3x3,
    'agile': Layers,
    'hybrid': FolderKanban,
  };

  const methodologyColors = {
    'structured': '#3B82F6',
    'scrum': '#10B981',
    'kanban': '#F59E0B',
    'agile': '#8B5CF6',
    'hybrid': '#EF4444',
  };

  const methodologyData = Object.entries(methodologyCounts)
    .map(([methodology, count]) => ({
      methodology,
      label: methodologyLabels[methodology] || methodology,
      count,
      color: methodologyColors[methodology] || '#6B7280',
      icon: methodologyIcons[methodology] || FolderKanban,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // Pie chart calculation
  const radius = 80;
  const centerX = 120;
  const centerY = 120;
  let currentAngle = -Math.PI / 2; // Start at top

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Projects by Methodology
      </h3>
      <div className="flex items-center justify-center gap-8">
        {/* Pie Chart */}
        <svg width={240} height={240} viewBox="0 0 240 240" className="flex-shrink-0">
          {methodologyData.map((item, index) => {
            const sliceAngle = (item.count / total) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z',
            ].join(' ');

            currentAngle = endAngle;

            // Label position (middle of slice)
            const labelAngle = startAngle + sliceAngle / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos(labelAngle);
            const labelY = centerY + labelRadius * Math.sin(labelAngle);

            return (
              <g key={item.methodology}>
                <path
                  d={pathData}
                  fill={item.color}
                  className="transition-all hover:opacity-80 cursor-pointer"
                  stroke="white"
                  strokeWidth="2"
                />
                {sliceAngle > 0.3 && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-semibold fill-white"
                  >
                    {Math.round((item.count / total) * 100)}%
                  </text>
                )}
              </g>
            );
          })}
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.4}
            fill="white"
            className="dark:fill-gray-800"
          />
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold fill-gray-900 dark:fill-white"
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            Projects
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1">
          {methodologyData.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.methodology} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                  {item.label}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.count} ({Math.round((item.count / total) * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

