/**
 * Activity Feed Component
 *
 * Displays recent activities across the organization
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { Activity, FolderKanban, ListChecks, Users, AlertTriangle, FileText, Clock } from 'lucide-react';
import { getRecentActivity } from '../../../services/dashboardService';
import { formatDistanceToNow } from 'date-fns';

const activityIcons = {
  project: FolderKanban,
  task: ListChecks,
  team: Users,
  risk: AlertTriangle,
  document: FileText,
  default: Activity,
};

const activityColors = {
  created: 'text-green-400',
  updated: 'text-blue-400',
  deleted: 'text-red-400',
  completed: 'text-purple-400',
  assigned: 'text-yellow-400',
  default: 'text-gray-400',
};

const ActivityFeed = memo(function ActivityFeed({ organizationId, limit = 10, filterProjectIds = null }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterKey = filterProjectIds?.length ? filterProjectIds.join(',') : '';

  useEffect(() => {
    loadActivities();
  }, [organizationId, limit, filterKey]);

  const loadActivities = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const opts =
      Array.isArray(filterProjectIds) && filterProjectIds.length
        ? { projectIds: filterProjectIds }
        : {};
    const result = await getRecentActivity(organizationId, limit, opts);

    if (result.success) {
      setActivities(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const getActivityIcon = (entityType) => {
    const Icon = activityIcons[entityType] || activityIcons.default;
    return Icon;
  };

  const getActivityColor = (action) => {
    return activityColors[action] || activityColors.default;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error loading activity feed: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h3>
        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.entity_type);
            const colorClass = getActivityColor(activity.action);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-gray-700 last:border-0 last:pb-0"
              >
                <div className={`${colorClass} bg-gray-700 p-2 rounded-full`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">{activity.user?.full_name || 'Unknown'}</span>
                    {' '}
                    <span className={colorClass}>{activity.action}</span>
                    {' '}
                    {activity.entity_type}
                  </p>
                  {activity.description && (
                    <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={() => loadActivities()}
            className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
