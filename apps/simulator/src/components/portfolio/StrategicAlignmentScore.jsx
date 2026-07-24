import { Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function StrategicAlignmentScore({ objectives = [], projects = [] }) {
  // Calculate alignment score based on objectives
  const totalObjectives = objectives.length;
  const alignedProjects = projects.filter(p => {
    // Check if project has associated objectives
    return objectives.some(obj => 
      obj.project_id === p.project_id || 
      obj.portfolio_id === p.portfolio_id
    );
  }).length;

  const alignmentPercentage = totalObjectives > 0 && projects.length > 0
    ? (alignedProjects / projects.length) * 100
    : 0;

  // Calculate score based on objective completion
  const completedObjectives = objectives.filter(obj => obj.status === 'achieved').length;
  const objectiveCompletion = totalObjectives > 0
    ? (completedObjectives / totalObjectives) * 100
    : 0;

  // Overall alignment score (combination of project alignment and objective completion)
  const overallScore = (alignmentPercentage * 0.6 + objectiveCompletion * 0.4);

  let scoreLabel, color, bgColor, icon;
  if (overallScore >= 80) {
    scoreLabel = 'Highly Aligned';
    color = '#10B981';
    bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    icon = CheckCircle;
  } else if (overallScore >= 60) {
    scoreLabel = 'Moderately Aligned';
    color = '#F59E0B';
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    icon = TrendingUp;
  } else {
    scoreLabel = 'Needs Alignment';
    color = '#EF4444';
    bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    icon = AlertCircle;
  }

  const Icon = icon;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${bgColor} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Strategic Alignment
        </h3>
        <Target className="h-5 w-5" style={{ color }} />
      </div>

      {/* Overall Score */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold mb-2" style={{ color }}>
          {Math.round(overallScore)}%
        </div>
        <div className="text-sm font-medium mb-1" style={{ color }}>
          {scoreLabel}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Strategic Alignment Score
        </div>
      </div>

      {/* Alignment Metrics */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Alignment
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {Math.round(alignmentPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${alignmentPercentage}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {alignedProjects} of {projects.length} projects aligned with objectives
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Objective Completion
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {Math.round(objectiveCompletion)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${objectiveCompletion}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {completedObjectives} of {totalObjectives} objectives achieved
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalObjectives}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Strategic Objectives
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {alignedProjects}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Aligned Projects
          </div>
        </div>
      </div>
    </div>
  );
}

