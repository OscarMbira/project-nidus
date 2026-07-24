import { Network, Link2, AlertTriangle } from 'lucide-react';

export default function DependencyMapVisualization({ dependencies = [] }) {
  if (!dependencies || dependencies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Network className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No dependencies defined</p>
      </div>
    );
  }

  const criticalDependencies = dependencies.filter(d => d.dependency_criticality === 'critical' || d.is_critical_path);
  const activeDependencies = dependencies.filter(d => d.dependency_status === 'active');
  const atRiskDependencies = dependencies.filter(d => d.dependency_status === 'at_risk' || d.dependency_status === 'blocked');

  // Group dependencies by source/target for visualization
  const dependencyNodes = new Set();
  const dependencyLinks = [];

  dependencies.forEach(dep => {
    if (dep.source_project?.id) dependencyNodes.add(dep.source_project.id);
    if (dep.target_project?.id) dependencyNodes.add(dep.target_project.id);
    
    if (dep.source_project?.id && dep.target_project?.id) {
      dependencyLinks.push({
        id: dep.id,
        source: dep.source_project.id,
        sourceName: dep.source_project.project_name || 'Unknown',
        target: dep.target_project.id,
        targetName: dep.target_project.project_name || 'Unknown',
        type: dep.dependency_type,
        criticality: dep.dependency_criticality,
        isCritical: dep.is_critical_path,
        status: dep.dependency_status,
      });
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dependency Map
        </h3>
        <Network className="h-5 w-5 text-gray-400" />
      </div>

      {/* Dependency Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {dependencies.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Total Dependencies
          </div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {criticalDependencies.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Critical
          </div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {atRiskDependencies.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            At Risk
          </div>
        </div>
      </div>

      {/* Dependency Network Visualization */}
      <div className="overflow-x-auto">
        <div className="min-w-full space-y-3">
          {dependencyLinks.slice(0, 10).map((link) => {
            const isCritical = link.isCritical || link.criticality === 'critical';
            const isAtRisk = link.status === 'at_risk' || link.status === 'blocked';
            
            return (
              <div
                key={link.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isCritical
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : isAtRisk
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Source Project */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full ${
                    isCritical ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {link.sourceName}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-1">
                  <Link2 className={`h-4 w-4 ${
                    isCritical ? 'text-red-500' : isAtRisk ? 'text-orange-500' : 'text-gray-400'
                  }`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {link.type?.replace('-', ' ') || 'dependency'}
                  </span>
                </div>

                {/* Target Project */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate text-right">
                    {link.targetName}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${
                    isCritical ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                </div>

                {/* Status Badge */}
                {(isCritical || isAtRisk) && (
                  <div className={`px-2 py-1 text-xs font-medium rounded ${
                    isCritical
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {isCritical ? 'Critical' : 'At Risk'}
                  </div>
                )}
              </div>
            );
          })}
          {dependencyLinks.length > 10 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
              + {dependencyLinks.length - 10} more dependencies
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">At Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Target</span>
        </div>
      </div>
    </div>
  );
}

