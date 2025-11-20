import { Calendar, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function ProgrammeTimelineView({ programme, milestones = [], projects = [] }) {
  if (!programme) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No programme data available</p>
      </div>
    );
  }

  // Get all dates
  const allDates = [];
  if (programme.programme_start_date) allDates.push(parseISO(programme.programme_start_date));
  if (programme.programme_end_date) allDates.push(parseISO(programme.programme_end_date));
  
  milestones.forEach(m => {
    if (m.milestone_date) allDates.push(parseISO(m.milestone_date));
  });

  projects.forEach(p => {
    if (p.project?.project_start_date) allDates.push(parseISO(p.project.project_start_date));
    if (p.project?.project_end_date) allDates.push(parseISO(p.project.project_end_date));
  });

  if (allDates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No timeline data available</p>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Prepare milestones
  const milestoneData = milestones
    .filter(m => m.milestone_date)
    .map(m => ({
      ...m,
      date: parseISO(m.milestone_date),
      offset: differenceInDays(parseISO(m.milestone_date), minDate),
      position: (differenceInDays(parseISO(m.milestone_date), minDate) / totalDays) * 100,
    }))
    .sort((a, b) => a.offset - b.offset);

  const completedMilestones = milestoneData.filter(m => m.milestone_status === 'completed').length;
  const overdueMilestones = milestoneData.filter(m => {
    if (!m.date) return false;
    return m.date < new Date() && m.milestone_status !== 'completed';
  }).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Programme Timeline
        </h3>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>

      {/* Timeline Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {milestones.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Total Milestones
          </div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedMilestones}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Completed
          </div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {overdueMilestones}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Overdue
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="relative mb-6">
        {/* Timeline line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600" />

        {/* Programme dates */}
        <div className="flex items-center justify-between mb-8 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(minDate, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{format(maxDate, 'MMM dd, yyyy')}</span>
            <Clock className="h-4 w-4" />
          </div>
        </div>

        {/* Milestones */}
        <div className="relative space-y-4">
          {milestoneData.map((milestone, index) => {
            const isCompleted = milestone.milestone_status === 'completed';
            const isOverdue = milestone.date < new Date() && !isCompleted;
            const isUpcoming = milestone.date > new Date();

            return (
              <div
                key={milestone.id}
                className="flex items-center gap-4"
                style={{ marginLeft: `${milestone.position}%` }}
              >
                {/* Milestone marker */}
                <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                  isCompleted
                    ? 'bg-green-500 border-green-600'
                    : isOverdue
                    ? 'bg-red-500 border-red-600'
                    : isUpcoming
                    ? 'bg-blue-500 border-blue-600'
                    : 'bg-gray-400 border-gray-500'
                }`} />

                {/* Milestone info */}
                <div className={`flex-1 p-3 rounded-lg border ${
                  isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : isOverdue
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : isUpcoming
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {milestone.milestone_name || 'Unknown Milestone'}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(milestone.date, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {isCompleted && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
                    {isOverdue && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      {(programme.programme_start_date || programme.programme_end_date) && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Programme Duration:</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              {programme.programme_start_date && format(parseISO(programme.programme_start_date), 'MMM dd, yyyy')}
              {programme.programme_start_date && programme.programme_end_date && ' - '}
              {programme.programme_end_date && format(parseISO(programme.programme_end_date), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

