/**
 * Risk heat map + resource allocation (row) and recent activity (full width).
 * Reused on Platform portfolio / programme list dashboards and scoped portfolio / project views.
 */
import { lazy, Suspense, memo } from 'react';

const RiskHeatMap = lazy(() => import('./RiskHeatMap'));
const ResourceAllocationChart = lazy(() => import('./ResourceAllocationChart'));
const ActivityFeed = lazy(() => import('./ActivityFeed'));

function BlockFallback() {
  return (
    <div
      className="animate-pulse h-52 rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80"
      aria-hidden
    />
  );
}

const PmoDashboardInsightsSection = memo(function PmoDashboardInsightsSection({
  organizationId,
  /** When set, metrics are limited to these project ids (must belong to the organisation). */
  filterProjectIds = null,
  activityLimit = 10,
  className = '',
}) {
  if (!organizationId) return null;

  return (
    <section
      className={`space-y-6 ${className}`}
      aria-label="Risk, resources, and activity"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<BlockFallback />}>
          <RiskHeatMap organizationId={organizationId} filterProjectIds={filterProjectIds} />
        </Suspense>
        <Suspense fallback={<BlockFallback />}>
          <ResourceAllocationChart organizationId={organizationId} filterProjectIds={filterProjectIds} />
        </Suspense>
      </div>
      <Suspense fallback={<BlockFallback />}>
        <ActivityFeed
          organizationId={organizationId}
          limit={activityLimit}
          filterProjectIds={filterProjectIds}
        />
      </Suspense>
    </section>
  );
});

PmoDashboardInsightsSection.displayName = 'PmoDashboardInsightsSection';

export default PmoDashboardInsightsSection;
