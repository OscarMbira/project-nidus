/**
 * Platform Menu Configuration
 * Defines menu structure for Platform with permission requirements
 * Updated with comprehensive 14-module structure
 */

export const pmMenuConfig = [
  // 1. Dashboard
  {
    id: 'platform-dashboard',
    label: 'Dashboard',
    path: '/platform/dashboard',
    icon: 'layout-dashboard',
    permission: null, // Available to all
  },

  // 2. AI Assistant
  {
    id: 'platform-ai',
    label: 'AI Assistant',
    path: '/platform/ai',
    icon: 'bot',
    permission: null, // Available to all
  },

  // 3. Projects
  {
    id: 'platform-projects',
    label: 'Projects',
    path: '/platform/projects',
    icon: 'folder-kanban',
    permission: 'project.view',
    children: [
      {
        id: 'platform-projects-my',
        label: 'My Projects',
        path: '/platform/projects',
        permission: 'project.view',
      },
      {
        id: 'platform-projects-all',
        label: 'All Projects',
        path: '/platform/projects/all',
        permission: 'project.view_all',
      },
      {
        id: 'platform-projects-create',
        label: 'Create Project',
        path: '/platform/projects/create',
        permission: 'project.create',
      },
      {
        id: 'platform-projects-templates',
        label: 'Templates',
        path: '/platform/projects/templates',
        permission: 'project.view',
      },
      {
        id: 'platform-projects-archives',
        label: 'Archived',
        path: '/platform/projects/archives',
        permission: 'project.view',
      },
      {
        id: 'platform-projects-on-hold',
        label: 'On Hold',
        path: '/app/projects/on-hold',
        permission: 'project.view',
        badge: 'project_drafts', // Dynamic badge count
      },
      {
        id: 'platform-projects-manage-members',
        label: 'Manage Members',
        path: '/app/project-members',
        permission: 'user.invite',
      },
      {
        id: 'platform-projects-daily-log',
        label: 'Daily Log',
        path: null, // Dynamic path based on selected project
        permission: 'project.view',
      },
      {
        id: 'platform-projects-lessons-log',
        label: 'Lessons Log',
        path: null, // Dynamic path based on selected project
        permission: 'project.view',
      },
      {
        id: 'platform-projects-plans',
        label: 'Plans',
        path: null, // Dynamic path based on selected project
        permission: 'project.view',
      },
      {
        id: 'platform-projects-product-descriptions',
        label: 'Product Descriptions',
        path: null, // Dynamic path based on selected project
        permission: 'project.view',
      },
    ],
  },

  // Personal section - My Daily Log Entries
  {
    id: 'platform-daily-log-my-entries',
    label: 'My Daily Log Entries',
    path: '/app/daily-log/my-entries',
    icon: 'book-open',
    permission: null, // Available to all
  },

  // Personal section - My Lesson Actions
  {
    id: 'platform-lessons-my-actions',
    label: 'My Lesson Actions',
    path: '/app/lessons/my-actions',
    icon: 'lightbulb',
    permission: null, // Available to all
  },

  // 3. Tasks
  {
    id: 'platform-tasks',
    label: 'Tasks',
    path: '/platform/tasks',
    icon: 'list-checks',
    permission: 'task.view',
    children: [
      {
        id: 'platform-tasks-my',
        label: 'My Tasks',
        path: '/platform/tasks',
        permission: 'task.view',
      },
      {
        id: 'platform-tasks-all',
        label: 'All Tasks',
        path: '/platform/tasks/all',
        permission: 'task.view_all',
      },
      {
        id: 'platform-tasks-board',
        label: 'Board View',
        path: '/platform/tasks/board',
        permission: 'task.view',
      },
      {
        id: 'platform-tasks-calendar',
        label: 'Calendar',
        path: '/platform/tasks/calendar',
        permission: 'task.view',
      },
    ],
  },

  // 4. Teams
  {
    id: 'platform-teams',
    label: 'Teams',
    path: '/platform/teams',
    icon: 'users',
    permission: 'team.view',
    children: [
      {
        id: 'platform-teams-list',
        label: 'All Teams',
        path: '/platform/teams',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-my-team',
        label: 'My Team',
        path: '/platform/teams/my-team',
        permission: 'team.manage',
      },
      {
        id: 'platform-teams-directory',
        label: 'Resource Directory',
        path: '/platform/teams/directory',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-skills',
        label: 'Skill Matrix',
        path: '/platform/teams/skills',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-capacity',
        label: 'Capacity Planning',
        path: '/platform/teams/capacity',
        permission: 'team.manage',
      },
      {
        id: 'platform-teams-leaves',
        label: 'Leave Calendar',
        path: '/platform/teams/leaves',
        permission: 'team.view',
      },
    ],
  },

  {
    id: 'platform-itto',
    label: 'ITTO Management',
    path: '/platform/itto/templates',
    icon: 'git-branch',
    permission: 'itto.view',
    children: [
      {
        id: 'platform-itto-templates',
        label: 'ITTO Templates',
        path: '/platform/itto/templates',
        permission: 'itto.view',
      },
      {
        id: 'platform-itto-project',
        label: 'Project ITTOs',
        path: '/platform/itto/project',
        permission: 'itto.view',
      },
      {
        id: 'platform-itto-drafts',
        label: 'ITTO Drafts',
        path: '/platform/itto/drafts',
        permission: 'itto.create',
      },
    ],
  },

  {
    id: 'platform-delays',
    label: 'Delays',
    path: '/platform/delays',
    icon: 'clock-alert',
    permission: 'delay.view',
    children: [
      {
        id: 'platform-delays-register',
        label: 'Delay Register',
        path: '/platform/delays',
        permission: 'delay.view',
      },
      {
        id: 'platform-delays-drafts',
        label: 'Delay Drafts',
        path: '/platform/delays/drafts',
        permission: 'delay.create',
      },
    ],
  },

  // 5. Reports & Analytics
  {
    id: 'platform-reports',
    label: 'Reports & Analytics',
    path: '/platform/reports',
    icon: 'chart-bar',
    permission: 'report.view',
    children: [
      {
        id: 'platform-reports-library',
        label: 'Report Library',
        path: '/platform/reports',
        permission: 'report.view',
      },
      {
        id: 'platform-reports-builder',
        label: 'Report Builder',
        path: '/platform/reports/builder',
        permission: 'report.create',
      },
      {
        id: 'platform-reports-analytics',
        label: 'Analytics Dashboards',
        path: '/platform/reports/analytics',
        permission: 'report.view',
      },
      {
        id: 'platform-reports-metrics',
        label: 'Custom Metrics',
        path: '/platform/reports/metrics',
        permission: 'report.manage',
      },
      // PMO Assurance reports (visible to pmo_admin only)
      {
        id: 'platform-reports-highlight',
        label: 'Highlight Reports',
        path: '/pmo/reporting/highlight-reports',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-reports-exception',
        label: 'Exception Reports',
        path: '/pmo/reporting/exception-reports',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-reports-end-stage',
        label: 'End Stage Reports',
        path: '/pmo/reporting/end-stage-reports',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-reports-end-project',
        label: 'End Project Reports',
        path: '/pmo/reporting/end-project-reports',
        permission: 'pmo.admin',
      },
    ],
  },

  // 6. Governance
  {
    id: 'platform-governance',
    label: 'Governance',
    path: '/platform/governance',
    icon: 'shield-check',
    permission: 'governance.view',
    children: [
      {
        id: 'platform-governance-framework',
        label: 'Framework',
        path: '/platform/governance/framework',
        permission: 'governance.manage',
      },
      {
        id: 'platform-governance-policies',
        label: 'Policies',
        path: '/platform/governance/policies',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-compliance',
        label: 'Compliance',
        path: '/platform/governance/compliance',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-decisions',
        label: 'Decision Log',
        path: '/platform/governance/decisions',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-audit',
        label: 'Audit Trail',
        path: '/platform/governance/audit',
        permission: 'governance.audit',
      },
      {
        id: 'platform-governance-documents',
        label: 'Document Governance',
        path: '/platform/document-governance',
        permission: 'pmo.admin', // PMO Admin or governance.admin required
        children: [
          {
            id: 'platform-document-register',
            label: 'Document Register',
            path: '/platform/document-governance/register',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-document-compliance',
            label: 'Compliance Dashboard',
            path: '/platform/document-governance/compliance',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-programme-documents',
            label: 'Programme Documents',
            path: '/platform/document-governance/programme',
            permission: 'pmo.admin',
          },
        ],
      },
      // PMO Governance strategies (visible to pmo_admin only)
      {
        id: 'platform-gov-communication-strategy',
        label: 'Communication Strategy',
        path: '/pmo/governance/communication-strategy',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-gov-configuration-strategy',
        label: 'Configuration Strategy',
        path: '/pmo/governance/configuration-strategy',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-gov-quality-strategy',
        label: 'Quality Management Strategy',
        path: '/pmo/governance/quality-strategy',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-gov-risk-strategy',
        label: 'Risk Management Strategy',
        path: '/pmo/governance/risk-strategy',
        permission: 'pmo.admin',
      },
    ],
  },

  // 7. Portfolio
  {
    id: 'platform-portfolio',
    label: 'Portfolio',
    path: '/platform/portfolio',
    icon: 'briefcase',
    permission: 'portfolio.view',
    children: [
      {
        id: 'platform-portfolio-list',
        label: 'All Portfolios',
        path: '/platform/portfolio',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-dashboard',
        label: 'Portfolio Dashboard',
        path: '/platform/portfolio/dashboard',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-projects',
        label: 'Portfolio Projects',
        path: '/platform/portfolio/projects',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-resources',
        label: 'Portfolio Resources',
        path: '/platform/portfolio/resources',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-financial',
        label: 'Portfolio Financial',
        path: '/platform/portfolio/financial',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-reports',
        label: 'Portfolio Reports',
        path: '/platform/portfolio/reports',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-governance',
        label: 'Portfolio Governance',
        path: '/platform/portfolio/governance',
        permission: 'portfolio.view',
      },
    ],
  },

  // 8. Programme
  {
    id: 'platform-programme',
    label: 'Programme',
    path: '/platform/programme',
    icon: 'layers',
    permission: 'programme.view',
    children: [
      {
        id: 'platform-programme-list',
        label: 'All Programmes',
        path: '/platform/programme',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-projects',
        label: 'Programme Projects',
        path: '/platform/programme/projects',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-dependencies',
        label: 'Dependencies',
        path: '/platform/programme/dependencies',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-benefits',
        label: 'Benefits',
        path: '/platform/programme/benefits',
        permission: 'programme.view',
      },
    ],
  },

  // 9. Dependencies
  {
    id: 'platform-dependencies',
    label: 'Dependencies',
    path: '/platform/dependencies',
    icon: 'git-branch',
    permission: 'dependency.view',
    children: [
      {
        id: 'platform-dependencies-all',
        label: 'All Dependencies',
        path: '/platform/dependencies',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-inter-project',
        label: 'Inter-Project Dependencies',
        path: '/platform/dependencies/inter-project',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-map',
        label: 'Dependency Map',
        path: '/platform/dependencies/map',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-impact',
        label: 'Impact Analysis',
        path: '/platform/dependencies/impact',
        permission: 'dependency.view',
      },
    ],
  },

  // 10. Benefits
  {
    id: 'platform-benefits',
    label: 'Benefits',
    path: '/platform/benefits',
    icon: 'target',
    permission: 'benefit.view',
    children: [
      {
        id: 'platform-benefits-all',
        label: 'All Benefits',
        path: '/platform/benefits',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-create',
        label: 'Create Benefit',
        path: '/platform/benefits/create',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-register',
        label: 'Benefits Register',
        path: '/platform/benefits/register',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-measurements',
        label: 'Measurements',
        path: '/platform/benefits/measurements',
        permission: 'benefit.manage',
      },
      {
        id: 'platform-benefits-realization',
        label: 'Realization',
        path: '/platform/benefits/realization',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-on-hold',
        label: 'On Hold',
        path: '/platform/benefits/on-hold',
        permission: 'benefit.view',
        badge: 'benefit_drafts',
      },
    ],
  },

  // 11. Strategy
  {
    id: 'platform-strategy',
    label: 'Strategy',
    path: '/platform/strategy',
    icon: 'compass',
    permission: 'strategy.view',
    children: [
      {
        id: 'platform-strategy-dashboard',
        label: 'Strategy Dashboard',
        path: '/platform/strategy',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-objectives',
        label: 'Strategic Objectives',
        path: '/platform/strategy/objectives',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-alignment',
        label: 'Strategic Alignment',
        path: '/platform/strategy/alignment',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-contribution',
        label: 'Strategic Contribution',
        path: '/platform/strategy/contribution',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-portfolio',
        label: 'Strategic Portfolio',
        path: '/platform/strategy/portfolio',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-reports',
        label: 'Strategic Reports',
        path: '/platform/strategy/reports',
        permission: 'strategy.view',
      },
    ],
  },

  // 12. Quality
  {
    id: 'platform-quality',
    label: 'Quality',
    path: '/platform/quality',
    icon: 'award',
    permission: 'quality.view',
    children: [
      {
        id: 'platform-quality-register',
        label: 'Quality Register',
        path: '/platform/quality-management',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-reviews',
        label: 'Quality Reviews',
        path: '/platform/quality/reviews',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-inspections',
        label: 'Quality Inspections',
        path: '/platform/quality/inspections',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-reports',
        label: 'Quality Reports',
        path: '/platform/quality/reports',
        permission: 'quality.view',
      },
    ],
  },

  // 13. Stakeholders
  {
    id: 'platform-stakeholders',
    label: 'Stakeholders',
    path: '/platform/stakeholders',
    icon: 'users-2',
    permission: 'stakeholder.view',
    children: [
      {
        id: 'platform-stakeholders-register',
        label: 'Stakeholder Register',
        path: '/platform/stakeholders/register',
        permission: 'stakeholder.view',
      },
      {
        id: 'platform-stakeholders-analysis',
        label: 'Stakeholder Analysis',
        path: '/platform/stakeholders/analysis',
        permission: 'stakeholder.view',
      },
      {
        id: 'platform-stakeholders-engagement',
        label: 'Engagement Planning',
        path: '/platform/stakeholders/engagement',
        permission: 'stakeholder.manage',
      },
      {
        id: 'platform-stakeholders-comms',
        label: 'Communication Plans',
        path: '/platform/stakeholders/communications',
        permission: 'stakeholder.view',
      },
      {
        id: 'platform-stakeholders-monitoring',
        label: 'Monitoring',
        path: '/platform/stakeholders/monitoring',
        permission: 'stakeholder.view',
      },
    ],
  },

  // Testing & QA
  {
    id: 'platform-testing-qa',
    label: 'Testing & QA',
    path: '/platform/testing',
    icon: 'test-tube',
    permission: null,
    children: [
      { id: 'platform-testing-dashboard', label: 'Dashboard', path: '/platform/testing', permission: null },
      { id: 'platform-testing-suites', label: 'Test Suites', path: '/platform/testing/suites', permission: null },
      { id: 'platform-testing-cases', label: 'Test Cases', path: '/platform/testing/cases', permission: null },
      { id: 'platform-testing-runs', label: 'Test Runs', path: '/platform/testing/runs', permission: null },
      { id: 'platform-testing-import', label: 'Bulk Import', path: '/platform/testing/import', permission: null },
      { id: 'platform-testing-defects', label: 'Defects', path: '/platform/testing/defects', permission: null },
      { id: 'platform-testing-defect-reports', label: 'Defect Reports', path: '/platform/testing/defects/dashboard', permission: null },
    ],
  },

  // Project Oversight (PMO Admin — cross-project read-only view)
  {
    id: 'platform-oversight',
    label: 'Project Oversight',
    path: null,
    icon: 'eye',
    permission: 'pmo.admin',
    children: [
      {
        id: 'platform-oversight-risk-register',
        label: 'Risk Register',
        path: '/pmo/oversight/risk-register',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-oversight-issue-register',
        label: 'Issue Register',
        path: '/pmo/oversight/issue-register',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-oversight-quality-register',
        label: 'Quality Register',
        path: '/pmo/oversight/quality-register',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-oversight-lessons-log',
        label: 'Lessons Log',
        path: '/pmo/oversight/lessons-log',
        permission: 'pmo.admin',
      },
    ],
  },

  // 14. Lessons (Corporate)
  {
    id: 'platform-lessons-corporate',
    label: 'Corporate Lessons',
    path: '/app/lessons/corporate',
    icon: 'building-2',
    permission: 'pmo.admin', // PMO Admin required
  },

  // 15. PMO Admin
  {
    id: 'platform-pmo-admin',
    label: 'PMO Admin',
    path: '/platform/pmo-admin',
    icon: 'shield',
    permission: 'pmo.admin',
    children: [
      {
        id: 'platform-org-admin-settings',
        label: 'Organization Settings',
        path: '/platform/pmo-admin/settings',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-org-admin-users',
        label: 'User Management',
        path: '/platform/pmo-admin/users',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-add-project-users',
        label: 'Add users to project',
        path: '/platform/project-members',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-project-types',
        label: 'Project Types',
        path: '/platform/pmo-admin/project-types',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-project-statuses',
        label: 'Project Statuses',
        path: '/platform/pmo-admin/project-statuses',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-funding-sources',
        label: 'Funding Sources',
        path: '/platform/pmo-admin/funding-sources',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-portfolio-categories',
        label: 'Portfolio Categories',
        path: '/platform/pmo-admin/portfolio-categories',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-admin-budget-categories',
        label: 'Budget Categories',
        path: '/platform/pmo-admin/budget-categories',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-manager-assignments-section',
        label: 'Manager Assignments',
        path: null,
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-assign-managers',
            label: 'Assign Managers',
            path: '/platform/pmo-admin/manager-assignments',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-assignment-settings',
            label: 'Assignment Settings',
            path: '/platform/pmo-admin/manager-assignment-settings',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-org-admin-subscription',
        label: 'Subscription',
        path: '/platform/pmo-admin/subscription',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-org-admin-branding',
        label: 'Branding',
        path: '/platform/pmo-admin/branding',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-org-admin-integrations',
        label: 'Integrations',
        path: '/platform/pmo-admin/integrations',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-org-admin-security',
        label: 'Security',
        path: '/platform/pmo-admin/security',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-org-admin-analytics',
        label: 'Analytics',
        path: '/platform/pmo-admin/analytics',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-pmo-document-governance',
        label: 'Document Governance',
        path: '/platform/document-governance',
        permission: 'pmo.admin',
      },
      // PMO Initiation documents
      {
        id: 'platform-pmo-business-case-section',
        label: 'Business Cases',
        path: null,
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-business-case-list',
            label: 'All Business Cases',
            path: '/pmo/initiation/business-case',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-benefits-review-plan-section',
        label: 'Benefits Review Plans',
        path: null,
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-benefits-review-plan-list',
            label: 'All Benefits Review Plans',
            path: '/pmo/initiation/benefits-review-plan',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-mandates-section',
        label: 'Project Mandates',
        path: null,
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-mandates-create',
            label: 'Create Mandate',
            path: '/platform/mandates/create',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-mandates-all',
            label: 'All Mandates',
            path: '/platform/mandates/list',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-mandates-unlinked',
            label: 'Unlinked Mandates',
            path: '/platform/mandates/unlinked',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-mandates-pending-approvals',
            label: 'Pending Approvals',
            path: '/platform/mandates/approvals',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-briefs-section',
        label: 'Project Briefs',
        path: null, // This makes it a collapsible section
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-briefs-all',
            label: 'All Briefs',
            path: '/platform/briefs/list',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-briefs-pending-approvals',
            label: 'Pending Approvals',
            path: '/platform/briefs/approvals',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-ppd-section',
        label: 'Project Product Descriptions',
        path: null, // This makes it a collapsible section
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-ppd-all',
            label: 'All PPDs',
            path: '/app/ppd/list',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-pd-section',
        label: 'Product Descriptions',
        path: null, // This makes it a collapsible section
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-pd-templates',
            label: 'Templates',
            path: '/platform/pmo-admin/product-description-templates',
            permission: 'pmo.admin',
          },
        ],
      },
      {
        id: 'platform-pmo-draft-queue-section',
        label: 'Draft Queue',
        path: null,
        permission: 'pmo.admin',
        children: [
          {
            id: 'platform-pmo-draft-expiry-config',
            label: 'Expiry Settings',
            path: '/platform/pmo-admin/draft-expiry-config',
            permission: 'pmo.admin',
          },
          {
            id: 'platform-pmo-org-drafts',
            label: 'Organisation Drafts',
            path: '/platform/pmo-admin/drafts',
            permission: 'pmo.admin',
          },
        ],
      },
    ],
  },

  // 16. Procurement
  {
    id: 'platform-procurement',
    label: 'Procurement',
    path: null,
    icon: 'shopping-cart',
    permission: null,
    children: [
      {
        id: 'platform-proc-rfp',
        label: 'RFP Register',
        path: '/pmo/procurement/rfp',
        permission: null,
      },
      {
        id: 'platform-proc-rfp-create',
        label: 'Load RFP',
        path: '/pmo/rfp/create',
        permission: 'pmo.admin',
      },
      {
        id: 'platform-proc-rfp-drafts',
        label: 'RFP Drafts',
        path: '/pmo/rfp/on-hold',
        permission: 'pmo.admin',
      },
    ],
  },
]

/**
 * Check if menu item should be visible based on permissions
 * @param {object} menuItem - Menu item configuration
 * @param {array} userPermissions - User's permissions for current project
 * @returns {boolean}
 */
export function isMenuItemVisible(menuItem, userPermissions = []) {
  // If no permission required, always visible
  if (!menuItem.permission) {
    return true
  }

  // Check if user has required permission
  return userPermissions.includes(menuItem.permission)
}

/**
 * Filter menu items based on permissions
 * @param {array} menuItems - Menu items to filter
 * @param {array} userPermissions - User's permissions
 * @returns {array} Filtered menu items
 */
export function filterMenuByPermissions(menuItems, userPermissions = []) {
  return menuItems
    .filter((item) => isMenuItemVisible(item, userPermissions))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterMenuByPermissions(item.children, userPermissions),
        }
      }
      return item
    })
    .filter((item) => !item.children || item.children.length > 0) // Remove items with no visible children
}

export default pmMenuConfig

