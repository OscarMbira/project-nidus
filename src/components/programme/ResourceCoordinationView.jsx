import { Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ResourceCoordinationView({ projects = [], resourceAllocations = [] }) {
  // Calculate resource coordination metrics
  const totalResources = new Set();
  const projectResourceMap = new Map();

  projects.forEach(proj => {
    const projectId = proj.project_id || proj.id;
    const projectName = proj.project?.project_name || 'Unknown Project';
    const allocations = resourceAllocations.filter(a => 
      a.project_id === projectId || 
      a.source_project_id === projectId ||
      a.target_project_id === projectId
    );

    allocations.forEach(allocation => {
      const resourceId = allocation.resource_id || allocation.resource?.id;
      if (resourceId) {
        totalResources.add(resourceId);
        
        if (!projectResourceMap.has(resourceId)) {
          projectResourceMap.set(resourceId, []);
        }
        projectResourceMap.get(resourceId).push({
          projectId,
          projectName,
          allocation,
        });
      }
    });
  });

  const sharedResources = Array.from(projectResourceMap.entries())
    .filter(([_, projects]) => projects.length > 1)
    .map(([resourceId, projects]) => ({
      resourceId,
      projects,
      count: projects.length,
    }))
    .sort((a, b) => b.count - a.count);

  const coordinationScore = projects.length > 0 && totalResources.size > 0
    ? (sharedResources.length / totalResources.size) * 100
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Resource Coordination
        </h3>
        <Users className="h-5 w-5 text-gray-400" />
      </div>

      {/* Coordination Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Coordination Score
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(coordinationScore)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${coordinationScore}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {sharedResources.length} of {totalResources.size} resources shared across projects
        </div>
      </div>

      {/* Resource Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalResources.size}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Total Resources
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {sharedResources.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Shared Resources
          </div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {projects.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Projects
          </div>
        </div>
      </div>

      {/* Shared Resources List */}
      {sharedResources.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Shared Resources
          </h4>
          <div className="space-y-3">
            {sharedResources.slice(0, 5).map((shared) => {
              const resource = resourceAllocations.find(a => 
                (a.resource_id || a.resource?.id) === shared.resourceId
              )?.resource;

              return (
                <div
                  key={shared.resourceId}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {resource?.resource_name || 'Unknown Resource'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {shared.count} projects
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shared.projects.map((proj, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded"
                      >
                        {proj.projectName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {sharedResources.length > 5 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                + {sharedResources.length - 5} more shared resources
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No shared resources across projects
          </p>
        </div>
      )}
    </div>
  );
}

