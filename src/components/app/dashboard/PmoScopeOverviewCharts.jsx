/**
 * Compact Recharts visualizations for PMO scope overview (Portfolio / Programmes / Projects).
 * Data comes from buildPmoOverviewMetricsFromSummaries — tiles remain the source of truth; charts aid scanability.
 */
import { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const GRID_STROKE = 'rgba(148, 163, 184, 0.35)';
const AXIS_TICK = { fill: 'currentColor', fontSize: 11 };

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-gray-200/80 bg-white/90 px-2 py-3 dark:border-gray-700/80 dark:bg-gray-900/50 ${className}`}
    >
      <div className="px-2 mb-2">
        <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{title}</div>
        {subtitle ? (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
      <div className="h-[220px] w-full text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
}

function PmoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-900">
      {label != null && label !== '' && (
        <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
      )}
      {payload.map((p) => (
        <div key={p.dataKey} className="tabular-nums text-gray-700 dark:text-gray-200">
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = p.payload?.total ?? 0;
  const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-600 dark:bg-gray-900">
      <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
      <div className="tabular-nums text-gray-700 dark:text-gray-200">
        {p.value} ({pct}%)
      </div>
    </div>
  );
}

/** Non-negative lifecycle rows for bar charts */
function lifecycleRows(entries) {
  return entries.filter((e) => e.value > 0);
}

export const PortfolioLifecycleCharts = memo(function PortfolioLifecycleCharts({ po = {} }) {
  const lifecycle = lifecycleRows([
    { name: 'Active', value: Number(po.active) || 0, fill: '#059669' },
    { name: 'Planning', value: Number(po.planning) || 0, fill: '#38bdf8' },
    { name: 'On hold', value: Number(po.onHold) || 0, fill: '#f59e0b' },
    { name: 'Completed', value: Number(po.completed) || 0, fill: '#6366f1' },
    { name: 'Cancelled', value: Number(po.cancelled) || 0, fill: '#94a3b8' },
  ]);

  const withP = Number(po.programmesWithPortfolioParent) || 0;
  const withoutP = Number(po.programmesWithoutPortfolio) || 0;
  const progTotal = withP + withoutP;
  const alignment = [
    { name: 'Under a portfolio', value: withP, fill: '#10b981', total: progTotal },
    { name: 'No portfolio', value: withoutP, fill: '#f97316', total: progTotal },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <ChartCard
        title="Portfolio lifecycle"
        subtitle="Count by portfolio status"
      >
        {lifecycle.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-500">No portfolio data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifecycle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={48} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} width={32} />
              <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Portfolios">
                {lifecycle.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard
        title="Programme alignment"
        subtitle="Programmes with vs without a parent portfolio"
      >
        {alignment.length === 0 || progTotal === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-500">
            No programme data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={alignment}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {alignment.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
});

PortfolioLifecycleCharts.displayName = 'PortfolioLifecycleCharts';

export const ProgrammesLifecycleCharts = memo(function ProgrammesLifecycleCharts({ pr = {} }) {
  const lifecycle = lifecycleRows([
    { name: 'Active', value: Number(pr.active) || 0, fill: '#0284c7' },
    { name: 'Planning', value: Number(pr.planning) || 0, fill: '#7dd3fc' },
    { name: 'On hold', value: Number(pr.onHold) || 0, fill: '#f59e0b' },
    { name: 'Completed', value: Number(pr.completed) || 0, fill: '#6366f1' },
    { name: 'Cancelled', value: Number(pr.cancelled) || 0, fill: '#94a3b8' },
  ]);

  const linked = Number(pr.linkedToPortfolio) || 0;
  const unlinked = Number(pr.unlinkedNoPortfolio) || 0;
  const total = linked + unlinked;
  const linkage = [
    { name: 'Linked to portfolio', value: linked, fill: '#0ea5e9', total },
    { name: 'Unlinked', value: unlinked, fill: '#fb923c', total },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <ChartCard title="Programme lifecycle" subtitle="Count by programme status">
        {lifecycle.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-500">No programme data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifecycle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={48} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} width={32} />
              <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Programmes">
                {lifecycle.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard title="Portfolio linkage" subtitle="Hierarchy coverage (programme register)">
        {linkage.length === 0 || total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-500">No programme data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={linkage}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {linkage.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
});

ProgrammesLifecycleCharts.displayName = 'ProgrammesLifecycleCharts';

const HEALTH_COLORS = {
  Healthy: '#10b981',
  'At risk': '#f59e0b',
  Critical: '#ef4444',
};

export const ProjectsLifecycleCharts = memo(function ProjectsLifecycleCharts({ pj = {} }) {
  const lifecycle = lifecycleRows([
    { name: 'Active', value: Number(pj.active) || 0, fill: '#059669' },
    { name: 'Planned / draft', value: Number(pj.planned) || 0, fill: '#38bdf8' },
    { name: 'Completed', value: Number(pj.completed) || 0, fill: '#6366f1' },
    { name: 'On hold', value: Number(pj.onHold) || 0, fill: '#f59e0b' },
  ]);

  const both = Number(pj.linkedToBothProgrammeAndPortfolio) || 0;
  const progOnly = Number(pj.linkedToProgrammesOnly) || 0;
  const portOnly = Number(pj.linkedToPortfoliosOnly) || 0;
  const unlinked = Number(pj.unlinkedNoProgrammeOrPortfolio) || 0;
  const linkTotal = both + progOnly + portOnly + unlinked;

  const linkage = [
    { name: 'Programme & portfolio', value: both, fill: '#059669', total: linkTotal },
    { name: 'Programme only', value: progOnly, fill: '#0ea5e9', total: linkTotal },
    { name: 'Portfolio only', value: portOnly, fill: '#06b6d4', total: linkTotal },
    { name: 'Unlinked', value: unlinked, fill: '#f97316', total: linkTotal },
  ].filter((d) => d.value > 0);

  const healthy = Number(pj.healthy) || 0;
  const atRisk = Number(pj.atRisk) || 0;
  const critical = Number(pj.critical) || 0;
  const healthTotal = healthy + atRisk + critical;
  const health = [
    { name: 'Healthy', value: healthy, fill: HEALTH_COLORS.Healthy, total: healthTotal },
    { name: 'At risk', value: atRisk, fill: HEALTH_COLORS['At risk'], total: healthTotal },
    { name: 'Critical', value: critical, fill: HEALTH_COLORS.Critical, total: healthTotal },
  ].filter((d) => d.value > 0);

  const sr = pj.scheduleRag;
  const scheduleRows = sr
    ? lifecycleRows([
        { name: 'On track', value: Number(sr.onTrack) || 0, fill: '#10b981' },
        { name: 'Delayed / at risk', value: Number(sr.delayed) || 0, fill: '#f59e0b' },
        { name: 'Critical', value: Number(sr.critical) || 0, fill: '#ef4444' },
      ])
    : [];

  const budgetTotal = Number(pj.totalBudget) || 0;
  const spent = Number(pj.totalSpent) || 0;
  const budgetRemain = Math.max(0, budgetTotal - spent);
  const budgetRows =
    budgetTotal > 0
      ? [
          { name: 'Spent', value: spent, fill: '#f59e0b' },
          { name: 'Remaining', value: budgetRemain, fill: '#22c55e' },
        ]
      : [];

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Project lifecycle" subtitle="Count by project status (executive buckets)">
          {lifecycle.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">No project data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lifecycle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-25} textAnchor="end" height={52} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} width={32} />
                <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Projects">
                  {lifecycle.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard
          title="Programme / portfolio linkage"
          subtitle="Distinct projects by governance linkage"
        >
          {linkage.length === 0 || linkTotal === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">No project data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={linkage}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={1}
                >
                  {linkage.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Health distribution (RAG)" subtitle="In-scope portfolio health view">
          {health.length === 0 || healthTotal === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              No health breakdown
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={health}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {health.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        {scheduleRows.length > 0 ? (
          <ChartCard title="Schedule health (RAG)" subtitle="From schedule variance / milestone tracking">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scheduleRows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                <YAxis type="category" dataKey="name" width={108} tick={AXIS_TICK} />
                <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Projects">
                  {scheduleRows.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : budgetRows.length > 0 ? (
          <ChartCard title="Budget vs spend" subtitle="Aggregate portfolio financials">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} width={44} />
                <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Amount">
                  {budgetRows.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title="Schedule / budget chart" subtitle="No schedule RAG or budget totals yet">
            <div className="h-full flex items-center justify-center text-xs text-gray-500 px-4 text-center">
              Extended metrics will populate schedule RAG or budget bars when data is available.
            </div>
          </ChartCard>
        )}
      </div>

      {scheduleRows.length > 0 && budgetRows.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <ChartCard title="Budget vs spend" subtitle="Aggregate portfolio financials (alongside schedule RAG above)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} width={44} />
                <Tooltip content={<PmoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Amount">
                  {budgetRows.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
});

ProjectsLifecycleCharts.displayName = 'ProjectsLifecycleCharts';
