const ROLE_LABELS = {
  project_manager: { spi: 'SPI', cpi: 'CPI', open_risks: 'Open Risks', open_issues: 'Open Issues', milestone_rag: 'Milestone RAG' },
  programme_manager: { dependency_health: 'Dependencies', benefits_realised_pct: 'Benefits %', tranche_progress: 'Tranche', cross_project_risks: 'Prog. Risks' },
  portfolio_manager: { portfolio_alignment: 'Alignment', investment_utilisation: 'Investment', portfolio_rag: 'Portfolio RAG', strategic_fit: 'Strategic Fit' },
  pmo_analyst: { compliance_score: 'Compliance', audit_findings: 'Audit Findings', reporting_accuracy: 'Reporting', methodology_adherence: 'Methodology' },
  project_coordinator: { action_completion_rate: 'Actions', document_currency: 'Documents', schedule_variance: 'Schedule Var.', meeting_backlog: 'Meetings' },
};

export default function TurnDashboard({ roleId = 'project_manager', metrics = {}, health = { score: 0, rag: 'red' } }) {
  const labels = ROLE_LABELS[roleId] || ROLE_LABELS.project_manager;
  const ragColor = health.rag === 'green' ? 'text-green-500' : health.rag === 'amber' ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Turn KPIs</h3>
        <span className={`text-sm font-medium ${ragColor}`}>Health {health.score}% ({health.rag?.toUpperCase()})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {metrics[key] != null ? Math.round(metrics[key]) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
