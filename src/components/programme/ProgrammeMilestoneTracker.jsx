import { Calendar, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { format, parseISO, isBefore, isAfter } from 'date-fns';

export default function ProgrammeMilestoneTracker({ milestones = [] }) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No milestones defined</p>
      </div>
    );
  }

  const now = new Date();
  const completedMilestones = milestones.filter(m => m.milestone_status === 'completed');
  const upcomingMilestones = milestones.filter(m => {
    if (m.milestone_status === 'completed') return false;
    if (!m.milestone_date) return false;
    return isAfter(parseISO(m.milestone_date), now);
  });
  const overdueMilestones = milestones.filter(m => {
    if (m.milestone_status === 'completed') return false;
    if (!m.milestone_date) return false;
    return isBefore(parseISO(m.milestone_date), now);
  });
  const inProgressMilestones = milestones.filter(m => 
    m.milestone_status === 'in_progress' || m.milestone_status === 'active'
  );

  const completionRate = milestones.length > 0
    ? (completedMilestones.length / milestones.length) * 100
    : 0;

  const getStatusIcon = (milestone) => {
    if (milestone.milestone_status === 'completed') return CheckCircle;
    if (milestone.milestone_status === 'cancelled') return XCircle;
    if (!milestone.milestone_date) return Clock;
    const milestoneDate = parseISO(milestone.milestone_date);
    if (isBefore(milestoneDate, now)) return AlertTriangle;
    return Clock;
  };

  const getStatusColor = (milestone) => {
    if (milestone.milestone_status === 'completed') return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (milestone.milestone_status === 'cancelled') return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    if (!milestone.milestone_date) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    const milestoneDate = parseISO(milestone.milestone_date);
    if (isBefore(milestoneDate, now)) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  };

  // Sort milestones by date
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!a.milestone_date) return 1;
    if (!b.milestone_date) return -1;
    return parseISO(a.milestone_date).getTime() - parseISO(b.milestone_date).getTime();
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Milestone Tracker
        </h3>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>

      {/* Milestone Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {milestones.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Total
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedMilestones.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Completed
          </div>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {upcomingMilestones.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Upcoming
          </div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {overdueMilestones.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Overdue
          </div>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Completion Rate
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {Math.round(completionRate)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedMilestones.map((milestone) => {
          const StatusIcon = getStatusIcon(milestone);
          const statusColor = getStatusColor(milestone);
          const isOverdue = milestone.milestone_date && 
            isBefore(parseISO(milestone.milestone_date), now) && 
            milestone.milestone_status !== 'completed';

          return (
            <div
              key={milestone.id}
              className={`p-4 rounded-lg border ${
                isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : milestone.milestone_status === 'completed'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <StatusIcon className={`h-5 w-5 ${statusColor} rounded-full p-1 flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {milestone.milestone_name || 'Unknown Milestone'}
                    </h4>
                    {milestone.milestone_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {milestone.milestone_description}
                      </p>
                    )}
                    {milestone.milestone_date && (
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(parseISO(milestone.milestone_date), 'MMM dd, yyyy')}
                        </span>
                        {isOverdue && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                            (Overdue)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${statusColor}`}>
                  {milestone.milestone_status?.replace('_', ' ') || 'planned'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

