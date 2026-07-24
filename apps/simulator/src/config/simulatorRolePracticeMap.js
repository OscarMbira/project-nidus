export const PORTFOLIO_PRACTICE_PAGES = {
  'strategic-alignment': {
    title: 'Portfolio Overview & Strategic Alignment',
    description: 'Align portfolio components with organisational strategy and objectives.',
    links: [{ label: 'Practice portfolio dashboard', path: '/simulator/practice-portfolio/dashboard' }],
  },
  'investment-prioritisation': {
    title: 'Investment Prioritisation & Pipeline',
    description: 'Prioritise initiatives based on value, risk, and strategic fit.',
    links: [{ label: 'Portfolio financial view', path: '/simulator/practice-portfolio/financial' }],
  },
  'resource-allocation': {
    title: 'Resource Capacity Planning',
    description: 'Allocate capacity across programmes and projects.',
    links: [{ label: 'Portfolio resources', path: '/simulator/practice-portfolio/resources' }],
  },
  health: {
    title: 'Portfolio Risk & Dependencies',
    description: 'Monitor portfolio health, risks, and interdependencies.',
    links: [{ label: 'Portfolio governance', path: '/simulator/practice-portfolio/governance' }],
  },
  'benefits-realisation': {
    title: 'Benefits Realisation Tracking',
    description: 'Track benefits delivery across the portfolio.',
    links: [{ label: 'Programme benefits', path: '/simulator/practice-programme/benefits' }],
  },
  reporting: {
    title: 'Portfolio Performance Reporting',
    description: 'Executive reporting on portfolio performance.',
    links: [{ label: 'Portfolio reports', path: '/simulator/practice-portfolio/reports' }],
  },
  governance: {
    title: 'Portfolio Governance & Stage Gates',
    description: 'Governance forums, decisions, and stage gate reviews.',
    links: [{ label: 'Portfolio governance', path: '/simulator/practice-portfolio/governance' }],
  },
  balancing: {
    title: 'Portfolio Balancing',
    description: 'Balance risk versus return across the investment portfolio.',
    links: [{ label: 'Portfolio EVM', path: '/simulator/practice-portfolio/evm' }],
  },
};

export const PROGRAMME_PRACTICE_PAGES = {
  roadmap: {
    title: 'Programme Roadmap & Planning',
    description: 'Plan programme tranches and delivery roadmap.',
    links: [{ label: 'Programme timeline', path: '/simulator/practice-programme/timeline' }],
  },
  dependencies: {
    title: 'Cross-Project Dependency Management',
    description: 'Manage dependencies between projects in the programme.',
    links: [{ label: 'Programme dependencies', path: '/simulator/practice-programme/dependencies' }],
  },
  benefits: {
    title: 'Benefits Mapping & Tracking',
    description: 'Map and track programme-level benefits.',
    links: [{ label: 'Programme benefits', path: '/simulator/practice-programme/benefits' }],
  },
  stakeholders: {
    title: 'Programme Stakeholder Engagement',
    description: 'Engage stakeholders across the programme.',
    links: [{ label: 'Programme detail', path: '/simulator/practice-programme' }],
  },
  tranches: {
    title: 'Tranche Planning & Review',
    description: 'Plan and review programme tranches.',
    links: [{ label: 'Programme dashboard', path: '/simulator/practice-programme/dashboard' }],
  },
  governance: {
    title: 'Programme Governance Board',
    description: 'Programme board packs, decisions, and assurance.',
    links: [{ label: 'Programme governance', path: '/simulator/practice-programme/dashboard' }],
  },
  reporting: {
    title: 'Programme Performance Reporting',
    description: 'Highlight reports and exception reporting at programme level.',
    links: [{ label: 'Programme reports', path: '/simulator/practice-programme/reports' }],
  },
  risks: {
    title: 'Programme-Level Risk Management',
    description: 'Aggregate and manage risks across projects.',
    links: [{ label: 'PMO oversight risks', path: '/simulator/pmo/oversight/risks' }],
  },
};

export const COORDINATOR_PRACTICE_PAGES = {
  schedule: {
    title: 'Schedule Management & Updates',
    description: 'Maintain and communicate schedule updates.',
    links: [{ label: 'Practice tasks calendar', path: '/simulator/practice-tasks/calendar' }],
  },
  meetings: {
    title: 'Meeting Management & Minutes',
    description: 'Plan meetings, capture minutes, and track actions.',
    links: [{ label: 'Team meetings', path: '/simulator/comms/meetings' }],
  },
  documents: {
    title: 'Document Control & Version Management',
    description: 'Control document versions and distribution.',
    links: [{ label: 'Document templates', path: '/simulator/templates' }],
  },
  actions: {
    title: 'Action Item Tracking',
    description: 'Track and close action items from meetings and reviews.',
    links: [{ label: 'Practice tasks', path: '/simulator/practice-tasks' }],
  },
  communications: {
    title: 'Stakeholder Communication Log',
    description: 'Log stakeholder communications and follow-ups.',
    links: [{ label: 'Stakeholder register', path: '/simulator/practice-stakeholders' }],
  },
  'progress-reporting': {
    title: 'Progress Data Collection & Reporting',
    description: 'Collect status data and prepare progress reports.',
    links: [{ label: 'Daily log', path: '/simulator/practice-daily-log' }],
  },
  resources: {
    title: 'Resource Tracking & Timesheets',
    description: 'Track team utilisation and timesheet data.',
    links: [{ label: 'My timesheets', path: '/simulator/tm/timesheets' }],
  },
  raid: {
    title: 'RAID Log Maintenance',
    description: 'Maintain risks, actions, issues, and decisions logs.',
    links: [
      { label: 'Practice risks', path: '/simulator/practice-risks' },
      { label: 'Practice issues', path: '/simulator/practice-issues' },
    ],
  },
};

export const PMO_ANALYST_PRACTICE_PAGES = {
  maturity: {
    title: 'PM Maturity Assessment',
    description: 'Assess PM capability maturity across the organisation.',
    links: [{ label: 'PMO dashboard', path: '/simulator/pmo/dashboard' }],
  },
  compliance: {
    title: 'Compliance Monitoring & Audit',
    description: 'Monitor compliance with standards and audit findings.',
    links: [{ label: 'Oversight quality register', path: '/simulator/pmo/oversight/quality' }],
  },
  utilisation: {
    title: 'Resource Utilisation Analysis',
    description: 'Analyse resource utilisation across projects.',
    links: [{ label: 'Manager assignments', path: '/simulator/pmo/manager-assignments' }],
  },
  methodology: {
    title: 'Methodology Guidance & Templates',
    description: 'Maintain methodology templates and guidance.',
    links: [{ label: 'Process templates', path: '/simulator/pmo/process-templates' }],
  },
  lessons: {
    title: 'Lessons Learned Repository',
    description: 'Capture and promote lessons learned.',
    links: [{ label: 'Lessons log', path: '/simulator/pmo/oversight/lessons' }],
  },
  metrics: {
    title: 'PMO Performance Metrics',
    description: 'Track PMO service performance metrics.',
    links: [{ label: 'PMO reporting', path: '/simulator/pmo/reporting/highlight' }],
  },
};
