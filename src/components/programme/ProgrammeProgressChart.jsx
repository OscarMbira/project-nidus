import { TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ProgrammeProgressChart({ progress = 0, projects = [] }) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  // Calculate progress breakdown
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.project?.project_status === 'completed').length;
  const activeProjects = projects.filter(p => p.project?.project_status === 'active').length;
  const onHoldProjects = projects.filter(p => p.project?.project_status === 'on_hold').length;

  // Circular progress chart
  const radius = 70;
  const centerX = 100;
  const centerY = 100;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (normalizedProgress / 100) * circumference;

  const color = normalizedProgress >= 80 ? '#10B981' : normalizedProgress >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Programme Progress
        </h3>
        <TrendingUp className="h-5 w-5 text-gray-400" />
      </div>

      <div className="flex items-center gap-8">
        {/* Circular Progress */}
        <div className="flex-shrink-0">
          <svg width={200} height={200} viewBox="0 0 200 200" className="mx-auto">
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
              strokeDashoffset={progressOffset}
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
              {Math.round(normalizedProgress)}%
            </text>
            <text
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm fill-gray-500 dark:fill-gray-400"
            >
              Complete
            </text>
          </svg>
        </div>

        {/* Progress Breakdown */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Completed
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {completedProjects} / {totalProjects}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {activeProjects}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0}%` }}
              />
            </div>
          </div>

          {onHoldProjects > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    On Hold
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {onHoldProjects}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${totalProjects > 0 ? (onHoldProjects / totalProjects) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

