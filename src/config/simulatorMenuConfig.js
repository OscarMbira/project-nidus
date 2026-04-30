/**
 * Simulator Platform Menu Configuration
 * Defines menu structure for Simulator Platform with subscription-based visibility
 */

export const simulatorMenuConfig = [
  {
    id: 'sim-dashboard',
    label: 'Dashboard',
    path: '/simulator/dashboard',
    icon: 'layout-dashboard',
    subscriptionTier: null, // Available to all
  },
  {
    id: 'sim-ai-workspace',
    label: 'AI Workspace',
    path: '/simulator/ai',
    icon: 'bot',
    subscriptionTier: null, // Visible to all authenticated Simulator users
  },
  {
    id: 'sim-forms-practice',
    label: 'Process Group Practice',
    path: '/simulator/pm/projects/:projectId/forms',
    icon: 'file-text',
    permissionsAny: ['form.view', 'form.view_all'],
    subscriptionTier: null,
    children: [
      {
        id: 'sim-forms-practice-initiating',
        label: 'Initiating',
        path: '/simulator/pm/projects/:projectId/forms?group=Initiating',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-planning',
        label: 'Planning',
        path: '/simulator/pm/projects/:projectId/forms?group=Planning',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-executing',
        label: 'Executing',
        path: '/simulator/pm/projects/:projectId/forms?group=Executing',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-monitoring',
        label: 'Monitoring & Controlling',
        path: '/simulator/pm/projects/:projectId/forms?group=Monitoring',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-closing',
        label: 'Closing',
        path: '/simulator/pm/projects/:projectId/forms?group=Closing',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-agile',
        label: 'Agile',
        path: '/simulator/pm/projects/:projectId/forms?group=Agile',
        permission: 'form.view',
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-drafts',
        label: 'My Drafts',
        path: '/simulator/pm/projects/:projectId/forms/drafts',
        permissionsAny: ['form.view', 'team_member.view', 'qa.view', 'procurement.view', 'finance.view'],
        subscriptionTier: null,
      },
      {
        id: 'sim-forms-practice-approvals',
        label: 'Pending Approvals',
        path: '/simulator/pm/projects/:projectId/forms?status=in_review',
        permission: 'form.approve',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-testing-centre',
    label: 'Testing and QA',
    path: '/simulator/testing-centre',
    icon: 'flask-conical',
    permission: 'testing_centre.view',
    subscriptionTier: null,
    children: [
      { id: 'sim-tc-dash', label: 'Testing Dashboard', path: '/simulator/testing-centre', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-cases', label: 'Test Case Library', path: '/simulator/testing-centre/cases', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-drafts', label: 'Test Case Drafts', path: '/simulator/testing-centre/cases/drafts', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-suites', label: 'Test Suites', path: '/simulator/testing-centre/suites', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-runs', label: 'Test Runs', path: '/simulator/testing-centre/runs', permission: 'testing_centre.run', subscriptionTier: null },
      { id: 'sim-tc-scripts', label: 'Automated Scripts', path: '/simulator/testing-centre/scripts', permission: 'testing_centre.configure', subscriptionTier: null },
      { id: 'sim-tc-evidence', label: 'Screenshot Evidence', path: '/simulator/testing-centre/evidence', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-diag', label: 'Diagnostic Centre', path: '/simulator/testing-centre/diagnostics', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-defects', label: 'Defect & Issue Links', path: '/simulator/testing-centre/defects', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-data', label: 'Test Data Manager', path: '/simulator/testing-centre/data', permission: 'testing_centre.configure', subscriptionTier: null },
      { id: 'sim-tc-reports', label: 'Reports', path: '/simulator/testing-centre/reports', permission: 'testing_centre.view', subscriptionTier: null },
      { id: 'sim-tc-settings', label: 'Settings', path: '/simulator/testing-centre/settings', permission: 'testing_centre.configure', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-financial',
    label: 'Financial Management',
    path: '/simulator/financial-reports',
    icon: 'dollar-sign',
    subscriptionTier: 'premium',
    children: [
      { id: 'sim-fin-reports', label: 'Financial Reports', path: '/simulator/financial-reports', subscriptionTier: 'premium' },
      { id: 'sim-fin-portfolio-evm', label: 'Portfolio EVM', path: '/simulator/practice-portfolio/evm', subscriptionTier: 'premium' },
      { id: 'sim-fin-my-expenses', label: 'My Expenses', path: '/simulator/expenses/my', subscriptionTier: 'premium' },
      { id: 'sim-fin-exp-approvals', label: 'Expense Approvals', path: '/simulator/expenses/approvals', subscriptionTier: 'premium' },
    ],
  },
  {
    id: 'sim-comms',
    label: 'Communications',
    path: '/simulator/comms',
    icon: 'message-square',
    subscriptionTier: null,
    children: [
      { id: 'sim-comms-hub', label: 'Hub', path: '/simulator/comms', subscriptionTier: null },
      { id: 'sim-comms-messages', label: 'Messages', path: '/simulator/comms/messages', subscriptionTier: null },
      { id: 'sim-comms-direct', label: 'Direct messages', path: '/simulator/comms/direct', subscriptionTier: null },
      { id: 'sim-comms-meetings', label: 'Meetings', path: '/simulator/comms/meetings', subscriptionTier: null },
      { id: 'sim-comms-summaries', label: 'Meeting summaries', path: '/simulator/comms/meetings/summaries', subscriptionTier: null },
      { id: 'sim-comms-pending', label: 'Pending AI reviews', path: '/simulator/comms/pending-review', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-org-knowledge',
    label: 'Org Knowledge',
    path: null,
    icon: 'book-open',
    subscriptionTier: null,
    children: [
      { id: 'sim-eef-list', label: 'Environment Factors', path: '/simulator/eef', subscriptionTier: null },
      { id: 'sim-eef-new', label: 'Add EEF', path: '/simulator/eef/new', subscriptionTier: null },
      { id: 'sim-eef-hold', label: 'EEF Drafts', path: '/simulator/eef/on-hold', subscriptionTier: null },
      { id: 'sim-eef-bulk', label: 'EEF Bulk upload', path: '/simulator/eef/bulk-upload', subscriptionTier: null },
      { id: 'sim-opa-list', label: 'Process Assets', path: '/simulator/opa', subscriptionTier: null },
      { id: 'sim-opa-new', label: 'Add OPA', path: '/simulator/opa/new', subscriptionTier: null },
      { id: 'sim-opa-hold', label: 'OPA Drafts', path: '/simulator/opa/on-hold', subscriptionTier: null },
      { id: 'sim-opa-bulk', label: 'OPA Bulk upload', path: '/simulator/opa/bulk-upload', subscriptionTier: null },
      { id: 'sim-template-lib', label: 'Template Library', path: '/simulator/templates', subscriptionTier: null },
      { id: 'sim-template-manage', label: 'Manage templates', path: '/simulator/templates/manage', subscriptionTier: null },
      { id: 'sim-template-new', label: 'New template', path: '/simulator/templates/new', subscriptionTier: null },
      { id: 'sim-template-copies', label: 'Practice copies', path: '/simulator/templates/project-copies', subscriptionTier: null },
      { id: 'sim-template-notifications', label: 'Template notifications', path: '/simulator/templates/notifications', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-itto',
    label: 'ITTO Management',
    path: '/simulator/itto/templates',
    icon: 'git-branch',
    subscriptionTier: null,
    children: [
      { id: 'sim-itto-templates', label: 'ITTO Templates', path: '/simulator/itto/templates', subscriptionTier: null },
      { id: 'sim-itto-project', label: 'Project ITTOs', path: '/simulator/itto/project', subscriptionTier: null },
      { id: 'sim-itto-drafts', label: 'ITTO Drafts', path: '/simulator/itto/drafts', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-delays',
    label: 'Delays',
    path: '/simulator/delays',
    icon: 'clock-alert',
    subscriptionTier: null,
    children: [
      { id: 'sim-delays-register', label: 'Delay Register', path: '/simulator/delays', icon: 'list', subscriptionTier: null },
      { id: 'sim-delays-drafts', label: 'Delay Drafts', path: '/simulator/delays/drafts', icon: 'pause-circle', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-pmo',
    label: 'PMO',
    path: '/simulator/pmo/dashboard',
    icon: 'shield',
    subscriptionTier: null,
    children: [
      { id: 'sim-pmo-dashboard', label: 'PMO Dashboard', path: '/simulator/pmo/dashboard', subscriptionTier: null },
      {
        id: 'sim-pmo-manager-assignments-section',
        label: 'Manager Assignments',
        path: null,
        subscriptionTier: null,
        children: [
          {
            id: 'sim-pmo-assign-managers',
            label: 'Assign Managers',
            path: '/simulator/pmo/manager-assignments',
            subscriptionTier: null,
          },
          {
            id: 'sim-pmo-assignment-settings',
            label: 'Assignment Settings',
            path: '/simulator/pmo/manager-assignment-settings',
            subscriptionTier: null,
          },
        ],
      },
      { id: 'sim-pmo-governance', label: 'PMO Governance', path: '/simulator/pmo/governance/mandate', subscriptionTier: null },
      { id: 'sim-pmo-initiation', label: 'Initiation & Business', path: '/simulator/pmo/initiation/business-case', subscriptionTier: null },
      { id: 'sim-pmo-oversight', label: 'Practice Oversight', path: '/simulator/pmo/oversight/risk-register', subscriptionTier: null },
      { id: 'sim-pmo-procurement', label: 'Procurement', path: '/simulator/pmo/procurement/rfp', subscriptionTier: null },
      { id: 'sim-pmo-reporting', label: 'Reporting & Assurance', path: '/simulator/pmo/reporting/highlight-reports', subscriptionTier: null },
    ],
  },
  {
    id: 'sim-practice-projects',
    label: 'Practice Projects',
    path: null,
    icon: 'folder-kanban',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-projects-list',
        label: 'My Practice Projects',
        path: '/simulator/practice-projects',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-projects-create',
        label: 'Create Practice Project',
        path: '/simulator/practice-projects/create',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-projects-members',
        label: 'Manage Members',
        path: '/simulator/practice-project-members',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-tasks',
        label: 'Practice Tasks',
        path: '/simulator/practice-tasks',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-teams-section',
    label: 'Teams',
    path: null,
    icon: 'users',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-teams-list',
        label: 'Practice Teams',
        path: '/simulator/practice-teams',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-teams-my-team',
        label: 'My Practice Team',
        path: '/simulator/practice-teams/my-team',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-initiation',
    label: 'Practice Initiation',
    path: null,
    icon: 'rocket',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-mandates-list',
        label: 'Practice Mandates',
        path: '/simulator/mandates/list',
        subscriptionTier: null,
      },
      {
        id: 'sim-mandates-create',
        label: 'Create Practice Mandate',
        path: '/simulator/mandates/create',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-briefs',
        label: 'Practice Briefs',
        path: '/simulator/practice-briefs',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-business-cases',
        label: 'Practice Business Cases',
        path: '/simulator/practice-business-cases',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-pids',
        label: 'Practice PIDs',
        path: '/simulator/practice-pids',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-benefits',
        label: 'Practice Benefits Review Plans',
        path: '/simulator/practice-benefits',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-delivery',
    label: 'Practice Delivery',
    path: null,
    icon: 'package',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-work-packages',
        label: 'Work Packages',
        path: '/simulator/practice-work-packages',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-product-descriptions',
        label: 'Product Descriptions',
        path: '/simulator/practice-product-descriptions',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-ppds',
        label: 'Project Product Descriptions',
        path: '/simulator/practice-ppds',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-psas',
        label: 'Product Status Accounts',
        path: '/simulator/practice-psas',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-plans',
        label: 'Plan Documentation',
        path: '/simulator/practice-plans',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-daily-log',
        label: 'Daily Log',
        path: '/simulator/practice-daily-log',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-controls',
    label: 'Practice Controls & Registers',
    path: null,
    icon: 'clipboard-list',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-risk-register',
        label: 'Risk Register',
        path: '/simulator/practice-risk-register',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-issue-register',
        label: 'Issue Register',
        path: '/simulator/practice-issue-register',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-quality-register',
        label: 'Quality Register',
        path: '/simulator/practice-quality-register',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-quality-reviews',
        label: 'Quality Reviews',
        path: '/simulator/practice-quality-reviews',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-quality-inspections',
        label: 'Quality Inspections',
        path: '/simulator/practice-quality-inspections',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-quality-reports',
        label: 'Quality Reports',
        path: '/simulator/practice-quality-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-lessons-log',
        label: 'Lessons Log',
        path: '/simulator/practice-lessons-log',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-config-items',
        label: 'Configuration Items',
        path: '/simulator/practice-config-items',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-dashboard',
        label: 'Testing & QA — Dashboard',
        path: '/simulator/practice-testing',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-suites',
        label: 'Testing — Test Suites',
        path: '/simulator/practice-testing/suites',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-cases',
        label: 'Testing — Test Cases',
        path: '/simulator/practice-testing/cases',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-runs',
        label: 'Testing — Test Runs',
        path: '/simulator/practice-testing/runs',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-import',
        label: 'Testing — Bulk Import',
        path: '/simulator/practice-testing/import',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-defects',
        label: 'Testing — Defects',
        path: '/simulator/practice-testing/defects',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-testing-defect-reports',
        label: 'Testing — Defect Reports',
        path: '/simulator/practice-testing/defects/dashboard',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-register',
        label: 'Stakeholder Register',
        path: '/simulator/practice-stakeholders/register',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-analysis',
        label: 'Stakeholder Analysis',
        path: '/simulator/practice-stakeholders/analysis',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-engagement',
        label: 'Engagement Planning',
        path: '/simulator/practice-stakeholders/engagement',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-comms',
        label: 'Communication Plans',
        path: '/simulator/practice-stakeholders/communications',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-monitoring',
        label: 'Monitoring',
        path: '/simulator/practice-stakeholders/monitoring',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-seam',
        label: 'SEAM',
        path: '/simulator/practice-stakeholders/seam',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-engagement-actions',
        label: 'Engagement Actions',
        path: '/simulator/practice-stakeholders/engagement-actions',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-salience',
        label: 'Salience Model',
        path: '/simulator/practice-stakeholders/salience',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stakeholders-on-hold',
        label: 'Draft queue',
        path: '/simulator/practice-stakeholders/on-hold',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-strategies',
    label: 'Practice Strategies',
    path: null,
    icon: 'file-text',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-rms',
        label: 'Risk Management Strategy',
        path: '/simulator/practice-rms',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-qms',
        label: 'Quality Management Strategy',
        path: '/simulator/practice-qms',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-cms',
        label: 'Communication Management Strategy',
        path: '/simulator/practice-cms',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-config-ms',
        label: 'Configuration Management Strategy',
        path: '/simulator/practice-config-ms',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-reporting',
    label: 'Practice Reporting',
    path: null,
    icon: 'file-bar-chart',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-checkpoint-reports',
        label: 'Checkpoint Reports',
        path: '/simulator/practice-checkpoint-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-highlight-reports',
        label: 'Highlight Reports',
        path: '/simulator/practice-highlight-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-issue-reports',
        label: 'Issue Reports',
        path: '/simulator/practice-issue-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-exception-reports',
        label: 'Exception Reports',
        path: '/simulator/practice-exception-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-end-stage-reports',
        label: 'End Stage Reports',
        path: '/simulator/practice-end-stage-reports',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-closure',
    label: 'Practice Closure',
    path: null,
    icon: 'check-circle-2',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-lessons-reports',
        label: 'Lessons Reports',
        path: '/simulator/practice-lessons-reports',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-end-project-reports',
        label: 'End Project Reports',
        path: '/simulator/practice-end-project-reports',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-lifecycle',
    label: 'Practice Lifecycle',
    path: null,
    icon: 'git-branch',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-practice-starting-up',
        label: 'Starting Up a Project',
        path: '/simulator/practice-starting-up',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-initiating',
        label: 'Initiating a Project',
        path: '/simulator/practice-initiating',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-controlling-stage',
        label: 'Controlling a Stage',
        path: '/simulator/practice-controlling-stage',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-managing-delivery',
        label: 'Managing Product Delivery',
        path: '/simulator/practice-managing-delivery',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-stage-boundaries',
        label: 'Managing Stage Boundaries',
        path: '/simulator/practice-stage-boundaries',
        subscriptionTier: null,
      },
      {
        id: 'sim-practice-closing-project',
        label: 'Closing a Project',
        path: '/simulator/practice-closing-project',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-practice-portfolio',
    label: 'Practice Portfolio & Governance',
    path: null,
    icon: 'briefcase',
    subscriptionTier: 'premium', // Premium feature
    children: [
      {
        id: 'sim-practice-portfolio',
        label: 'Portfolios',
        path: '/simulator/practice-portfolio',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-categories',
        label: 'Portfolio Categories',
        path: '/simulator/practice-portfolio/categories',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-dashboard',
        label: 'Portfolio Dashboard',
        path: '/simulator/practice-portfolio/dashboard',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-projects',
        label: 'Portfolio Projects',
        path: '/simulator/practice-portfolio/projects',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-resources',
        label: 'Portfolio Resources',
        path: '/simulator/practice-portfolio/resources',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-financial',
        label: 'Portfolio Financial',
        path: '/simulator/practice-portfolio/financial',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-reports',
        label: 'Portfolio Reports',
        path: '/simulator/practice-portfolio/reports',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-portfolio-governance',
        label: 'Portfolio Governance',
        path: '/simulator/practice-portfolio/governance',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme-dashboard',
        label: 'Programme Dashboard',
        path: '/simulator/practice-programme/dashboard',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme-projects',
        label: 'Programme Projects',
        path: '/simulator/practice-programme/projects',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme-dependencies',
        label: 'Programme Dependencies',
        path: '/simulator/practice-programme/dependencies',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme-benefits',
        label: 'Benefits',
        path: '/simulator/practice-programme/benefits',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme-timeline',
        label: 'Timeline',
        path: '/simulator/practice-programme/timeline',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-programme',
        label: 'Programme',
        path: '/simulator/practice-programme',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-dependencies',
        label: 'Dependencies',
        path: '/simulator/practice-dependencies',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-stakeholders',
        label: 'Stakeholders',
        path: '/simulator/practice-stakeholders',
        subscriptionTier: 'premium',
      },
      {
        id: 'sim-practice-governance',
        label: 'Governance',
        path: '/simulator/practice-governance',
        subscriptionTier: 'premium',
      },
    ],
  },
  {
    id: 'sim-benefits',
    label: 'Benefits',
    path: '/simulator/benefits',
    icon: 'target',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-benefits-all',
        label: 'All Benefits',
        path: '/simulator/benefits',
        subscriptionTier: null,
      },
      {
        id: 'sim-benefits-create',
        label: 'Create Benefit',
        path: '/simulator/benefits/create',
        subscriptionTier: null,
      },
      {
        id: 'sim-benefits-register',
        label: 'Benefits Register',
        path: '/simulator/benefits/register',
        subscriptionTier: null,
      },
      {
        id: 'sim-benefits-measurements',
        label: 'Measurements',
        path: '/simulator/benefits/measurements',
        subscriptionTier: null,
      },
      {
        id: 'sim-benefits-realization',
        label: 'Realization',
        path: '/simulator/benefits/realization',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-scenarios',
    label: 'Scenarios',
    path: null,
    icon: 'gamepad-2',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-scenarios-browse',
        label: 'Browse Scenarios',
        path: '/simulator/scenarios',
        subscriptionTier: null,
      },
      {
        id: 'sim-scenarios-progress',
        label: 'My Progress',
        path: '/simulator/scenarios/progress',
        subscriptionTier: null,
      },
      {
        id: 'sim-scenarios-custom',
        label: 'Custom Scenarios',
        path: '/simulator/scenarios/custom',
        subscriptionTier: 'premium', // Premium only
      },
    ],
  },
  {
    id: 'sim-learning-path',
    label: 'Learning Path',
    path: '/simulator/learning-path',
    icon: 'graduation-cap',
    subscriptionTier: null,
  },
  {
    id: 'sim-leaderboard',
    label: 'Leaderboard',
    path: '/simulator/leaderboard',
    icon: 'trophy',
    subscriptionTier: null,
  },
  {
    id: 'sim-certificates',
    label: 'Certificates',
    path: '/simulator/certificates',
    icon: 'award',
    subscriptionTier: null,
  },
  {
    id: 'sim-profile',
    label: 'Profile',
    path: null,
    icon: 'user',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-profile-stats',
        label: 'My Stats',
        path: '/simulator/profile/stats',
        subscriptionTier: null,
      },
      {
        id: 'sim-profile-badges',
        label: 'Badges & Achievements',
        path: '/simulator/profile/badges',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-settings',
    label: 'Settings',
    path: '/simulator/settings',
    icon: 'settings',
    subscriptionTier: null,
  },
]

/**
 * Check if menu item should be visible based on subscription tier
 * @param {object} menuItem - Menu item configuration
 * @param {string} userSubscriptionTier - User's subscription tier ('free', 'premium', etc.)
 * @returns {boolean}
 */
export function isSimMenuItemVisible(menuItem, userSubscriptionTier = 'free') {
  if (Array.isArray(menuItem.permissionsAny) && menuItem.permissionsAny.length > 0) {
    return true
  }

  if (menuItem.permission) {
    return true
  }

  // If no subscription tier required, always visible
  if (!menuItem.subscriptionTier) {
    return true
  }

  // Premium features require premium subscription
  if (menuItem.subscriptionTier === 'premium') {
    return userSubscriptionTier === 'premium' || userSubscriptionTier === 'enterprise'
  }

  return true
}

/**
 * Filter menu items based on subscription tier
 * @param {array} menuItems - Menu items to filter
 * @param {string} userSubscriptionTier - User's subscription tier
 * @returns {array} Filtered menu items
 */
export function filterSimMenuBySubscription(menuItems, userSubscriptionTier = 'free') {
  return menuItems
    .filter((item) => isSimMenuItemVisible(item, userSubscriptionTier))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterSimMenuBySubscription(item.children, userSubscriptionTier),
        }
      }
      return item
    })
    .filter((item) => !item.children || item.children.length > 0) // Remove items with no visible children
}

export default simulatorMenuConfig

