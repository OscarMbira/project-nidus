/**
 * PMO Dashboard Sidebar Menu Configuration
 *
 * Static menu for the PMO Dashboard (/pmo/*)
 * Aligned to PRD: Documents/PMO_PM_Independent_Dashboards_PRD.md Section 4
 *
 * Sections:
 * 1. PMO Governance (Baselines)
 * 2. Initiation & Business Justification
 * 3. Project Oversight (Read-Only)
 * 4. Reporting & Assurance
 */

import {
  LayoutDashboard,
  Shield,
  FileText,
  Megaphone,
  Settings2,
  CheckSquare,
  AlertTriangle,
  Briefcase,
  BookOpen,
  Eye,
  AlertCircle,
  ClipboardList,
  GraduationCap,
  BarChart3,
  Flag,
  FileWarning,
  FileCheck,
  FileClock,
  ShoppingCart,
  FileSpreadsheet,
  FilePlus,
  Pause,
  DollarSign,
  ClipboardCheck,
  TrendingUp,
  GitBranch,
  Layers,
  SearchCode,
  PackageOpen,
  HeartPulse,
  Sparkles,
  Presentation,
  RefreshCcw,
  ShieldCheck,
  FlaskConical,
  Users,
  FolderKanban,
  Database,
  Mail,
  Clock,
  AtSign,
} from 'lucide-react';

const pmoMenuConfig = [
  // Dashboard
  {
    id: 'pmo-dashboard',
    label: 'Dashboard',
    path: '/pmo/dashboard',
    icon: LayoutDashboard,
    section: null,
    order: 0
  },

  // Section 1a: Portfolio
  {
    id: 'pmo-portfolio',
    label: 'Portfolio',
    path: null,
    icon: Briefcase,
    section: 'Portfolio',
    order: 1,
    children: [
      { id: 'pmo-pp-dependencies', label: 'Dependencies', path: '/platform/dependencies', icon: GitBranch, order: 1 },
      { id: 'pmo-pp-collisions', label: 'Portfolio Collisions', path: '/pmo/planning/collisions', icon: AlertTriangle, order: 2 },
    ],
  },

  // Section 1b: Programme
  {
    id: 'pmo-programme',
    label: 'Programme',
    path: null,
    icon: Layers,
    section: 'Programme',
    order: 2,
    children: [
      { id: 'pmo-pp-programme', label: 'Programme Management', path: '/platform/programme', icon: Layers, order: 1 },
      { id: 'pmo-pp-benefits', label: 'Benefits Management', path: '/platform/benefits', icon: TrendingUp, order: 2 },
    ],
  },

  // Section 1c: Projects (delivery hub)
  {
    id: 'pmo-projects',
    label: 'Projects',
    path: null,
    icon: FolderKanban,
    section: 'Projects',
    order: 3,
    children: [
      {
        id: 'pmo-pr-project-dashboard',
        label: 'Project dashboard',
        path: '/platform/dashboard?tab=projects',
        icon: LayoutDashboard,
        order: 1,
      },
      { id: 'pmo-pr-my-projects', label: 'My Projects', path: '/platform/projects', icon: FolderKanban, order: 2 },
      {
        id: 'pmo-pp-project-list',
        label: 'Project list (browse & edit)',
        path: '/platform/projects/all',
        icon: Briefcase,
        order: 3,
      },
      {
        id: 'pmo-pp-create-project',
        label: 'Create project',
        path: '/platform/projects/create',
        icon: FilePlus,
        order: 4,
      },
      {
        id: 'pmo-pr-quick-create',
        label: 'Quick create (new wizard)',
        path: '/platform/projects/new',
        icon: FilePlus,
        order: 5,
      },
      {
        id: 'pmo-pp-archives',
        label: 'Archived projects',
        path: '/platform/projects/archives',
        icon: PackageOpen,
        order: 6,
      },
      { id: 'pmo-pp-on-hold', label: 'On hold / drafts', path: '/app/projects/on-hold', icon: Pause, order: 7 },
      {
        id: 'pmo-pr-members-roles',
        label: 'Members & roles (invite / assign)',
        path: '/app/project-members',
        icon: Users,
        order: 8,
      },
      { id: 'pmo-pp-project-templates', label: 'Templates', path: '/platform/templates', icon: Layers, order: 10 },
      {
        id: 'pmo-industry-templates',
        label: 'Industry Templates',
        path: '/pmo/industry-templates',
        icon: Layers,
        order: 11,
      },
      {
        id: 'pmo-industry-templates-new',
        label: 'Add Industry Template',
        path: '/pmo/industry-templates/new',
        icon: Layers,
        order: 12,
      },
      {
        id: 'pmo-industry-templates-on-hold',
        label: 'Template Drafts',
        path: '/pmo/industry-templates/on-hold',
        icon: Layers,
        order: 13,
      },
      {
        id: 'pmo-pr-my-daily-log',
        label: 'My daily log entries',
        path: '/app/daily-log/my-entries',
        icon: BookOpen,
        order: 11,
      },
    ],
  },

  // Section 2: PMO Governance (Baselines)
  {
    id: 'pmo-governance',
    label: 'Governance & Standards',
    path: null,
    icon: Shield,
    section: 'Governance & Standards',
    order: 4,
    children: [
      {
        id: 'pmo-gov-mandate',
        label: 'Project Mandate',
        path: '/pmo/governance/mandate',
        icon: FileText,
        order: 1
      },
      {
        id: 'pmo-gov-mandate-approval',
        label: 'Approval / Authorisation',
        path: '/pmo/mandates/approvals',
        icon: FileCheck,
        order: 2
      },
      {
        id: 'pmo-gov-communication-strategy',
        label: 'Communication Management Strategy',
        path: '/pmo/governance/communication-strategy',
        icon: Megaphone,
        order: 3
      },
      {
        id: 'pmo-gov-configuration-strategy',
        label: 'Configuration Management Strategy',
        path: '/pmo/governance/configuration-strategy',
        icon: Settings2,
        order: 4
      },
      {
        id: 'pmo-gov-quality-strategy',
        label: 'Quality Management Strategy',
        path: '/pmo/governance/quality-strategy',
        icon: CheckSquare,
        order: 5
      },
      {
        id: 'pmo-gov-risk-strategy',
        label: 'Risk Management Strategy',
        path: '/pmo/governance/risk-strategy',
        icon: AlertTriangle,
        order: 6
      },
      {
        id: 'pmo-gov-itto-templates',
        label: 'ITTO Templates',
        path: '/pmo/itto/templates',
        icon: GitBranch,
        order: 7
      },
      {
        id: 'pmo-gov-itto-drafts',
        label: 'ITTO Drafts',
        path: '/pmo/itto/drafts',
        icon: Pause,
        order: 8
      }
    ]
  },

  // Section 3: Initiation & Business Justification
  {
    id: 'pmo-initiation',
    label: 'Initiation & Business Justification',
    path: null,
    icon: Briefcase,
    section: 'Initiation & Business Justification',
    order: 5,
    children: [
      {
        id: 'pmo-init-business-case',
        label: 'Business Case',
        path: '/pmo/initiation/business-case',
        icon: Briefcase,
        order: 1
      },
      {
        id: 'pmo-init-project-brief',
        label: 'Project Brief',
        path: '/pmo/initiation/project-brief',
        icon: FileText,
        order: 2
      },
      {
        id: 'pmo-init-benefits-review-plan',
        label: 'Benefits Review Plan',
        path: '/pmo/initiation/benefits-review-plan',
        icon: BookOpen,
        order: 3
      }
    ]
  },

  // Section 4: Project Oversight (Read-Only)
  {
    id: 'pmo-oversight',
    label: 'Project Oversight',
    path: null,
    icon: Eye,
    section: 'Project Oversight',
    order: 6,
    children: [
      {
        id: 'pmo-oversight-risk-register',
        label: 'Risk Register',
        path: '/pmo/oversight/risk-register',
        icon: AlertTriangle,
        order: 1
      },
      {
        id: 'pmo-oversight-issue-register',
        label: 'Issue Register',
        path: '/pmo/oversight/issue-register',
        icon: AlertCircle,
        order: 2
      },
      {
        id: 'pmo-oversight-quality-register',
        label: 'Quality Register',
        path: '/pmo/oversight/quality-register',
        icon: ClipboardList,
        order: 3
      },
      {
        id: 'pmo-oversight-lessons-log',
        label: 'Lessons Log',
        path: '/pmo/oversight/lessons-log',
        icon: GraduationCap,
        order: 4
      },
      {
        id: 'pmo-oversight-delays',
        label: 'Delay Register',
        path: '/pmo/oversight/delays',
        icon: FileClock,
        order: 5
      },
      {
        id: 'pmo-oversight-delay-templates',
        label: 'Delay Templates',
        path: '/pmo/delays/templates',
        icon: Layers,
        order: 6
      },
      {
        id: 'pmo-oversight-scope',
        label: 'Scope Oversight',
        path: '/pmo/oversight/scope',
        icon: ClipboardList,
        order: 7
      },
      {
        id: 'pmo-oversight-schedules',
        label: 'Schedule Oversight',
        path: '/pmo/oversight/schedules',
        icon: FileClock,
        order: 8
      },
      {
        id: 'pmo-oversight-changes',
        label: 'Change Register (All)',
        path: '/pmo/registers/changes',
        icon: RefreshCcw,
        order: 9
      }
    ]
  },

  // Section 5: Reporting & Assurance
  {
    id: 'pmo-reporting',
    label: 'Reporting & Assurance',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Assurance',
    order: 12,
    children: [
      {
        id: 'pmo-report-highlight',
        label: 'Highlight Reports',
        path: '/pmo/reporting/highlight-reports',
        icon: Flag,
        order: 1
      },
      {
        id: 'pmo-report-exception',
        label: 'Exception Reports',
        path: '/pmo/reporting/exception-reports',
        icon: FileWarning,
        order: 2
      },
      {
        id: 'pmo-report-end-stage',
        label: 'End Stage Reports',
        path: '/pmo/reporting/end-stage-reports',
        icon: FileClock,
        order: 3
      },
      {
        id: 'pmo-report-end-project',
        label: 'End Project Reports',
        path: '/pmo/reporting/end-project-reports',
        icon: FileCheck,
        order: 4
      },
      {
        id: 'pmo-report-library',
        label: 'Report Library',
        path: '/platform/reports',
        icon: FileText,
        order: 5
      },
      {
        id: 'pmo-report-analytics',
        label: 'Analytics',
        path: '/platform/reports/analytics',
        icon: BarChart3,
        order: 6
      }
    ]
  },

  // Section 6: Procurement
  {
    id: 'pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Administration',
    order: 10,
    children: [
      {
        id: 'pmo-proc-rfp',
        label: 'RFP Register',
        path: '/pmo/procurement/rfp',
        icon: FileSpreadsheet,
        order: 1
      },
      {
        id: 'pmo-proc-rfp-create',
        label: 'Load RFP',
        path: '/pmo/rfp/create',
        icon: FilePlus,
        order: 2,
        permission: 'pmo.admin'
      },
      {
        id: 'pmo-proc-rfp-on-hold',
        label: 'RFP Drafts',
        path: '/pmo/rfp/on-hold',
        icon: Pause,
        order: 3,
        permission: 'pmo.admin'
      }
    ]
  },

  {
    id: 'pmo-planning',
    label: 'Planning Intelligence',
    path: null,
    icon: BarChart3,
    section: 'Planning Intelligence',
    order: 7,
    children: [
      {
        id: 'pmo-planning-hub',
        label: 'Planning Hub',
        path: '/pmo/planning',
        icon: LayoutDashboard,
        order: 1
      },
      {
        id: 'pmo-planning-collisions',
        label: 'Portfolio Collisions',
        path: '/pmo/planning/collisions',
        icon: AlertTriangle,
        order: 2
      },
      {
        id: 'pmo-planning-intelligence',
        label: 'Intelligence Rules',
        path: '/pmo/planning/intelligence',
        icon: SearchCode,
        order: 3
      },
      {
        id: 'pmo-planning-governance-config',
        label: 'Governance Rules Config',
        path: '/pmo/planning/governance-config',
        icon: ShieldCheck,
        order: 4
      }
    ]
  },

  {
    id: 'pmo-financial',
    label: 'Financial Management',
    path: null,
    icon: DollarSign,
    section: 'Financial Management',
    order: 9,
    children: [
      {
        id: 'pmo-fin-reports',
        label: 'Financial Reports',
        path: '/platform/financial-reports',
        icon: BarChart3,
        order: 1
      },
      {
        id: 'pmo-fin-portfolio-evm',
        label: 'Portfolio EVM',
        path: '/platform/portfolio/evm',
        icon: TrendingUp,
        order: 2
      },
      {
        id: 'pmo-fin-exp-approvals',
        label: 'Expense Approvals',
        path: '/platform/expenses/approvals',
        icon: ClipboardCheck,
        order: 3
      },
      {
        id: 'pmo-fin-thresholds',
        label: 'Expense Thresholds',
        path: '/platform/pmo-admin/expense-thresholds',
        icon: Settings2,
        order: 4
      }
    ]
  },

  {
    id: 'pmo-pmbok-forms',
    label: 'Process Group Forms',
    path: '/pmo/forms',
    icon: FileText,
    section: 'Process Group Forms',
    order: 8,
    permission: 'form.view_all',
    children: [
      { id: 'pmo-forms-initiating', label: 'Initiating', path: '/pmo/forms?group=Initiating', icon: FileText, order: 1, permission: 'form.view_all' },
      { id: 'pmo-forms-planning', label: 'Planning', path: '/pmo/forms?group=Planning', icon: FileText, order: 2, permission: 'form.view_all' },
      { id: 'pmo-forms-executing', label: 'Executing', path: '/pmo/forms?group=Executing', icon: FileText, order: 3, permission: 'form.view_all' },
      { id: 'pmo-forms-monitoring', label: 'Monitoring & Controlling', path: '/pmo/forms?group=Monitoring', icon: FileText, order: 4, permission: 'form.view_all' },
      { id: 'pmo-forms-closing', label: 'Closing', path: '/pmo/forms?group=Closing', icon: FileText, order: 5, permission: 'form.view_all' },
      { id: 'pmo-forms-agile', label: 'Agile', path: '/pmo/forms?group=Agile', icon: FileText, order: 6, permission: 'form.view_all' },
      { id: 'pmo-forms-drafts', label: 'My Drafts', path: '/pmo/forms?status=draft', icon: FileClock, order: 7, permission: 'form.view_all' },
      { id: 'pmo-forms-approvals', label: 'Pending Approvals', path: '/pmo/forms?status=in_review', icon: FileCheck, order: 8, permission: 'form.approve' },
    ]
  },
  {
    id: 'pmo-testing-centre',
    label: 'Quality & Testing',
    path: null,
    icon: FlaskConical,
    section: 'Quality & Testing',
    order: 11,
    children: [
      { id: 'pmo-tc-dash', label: 'Testing Dashboard', path: '/pmo/testing-centre', icon: FlaskConical, order: 1, permission: 'testing_centre.view' },
      { id: 'pmo-tc-cases', label: 'Test Case Library', path: '/pmo/testing-centre/cases', icon: FlaskConical, order: 2, permission: 'testing_centre.view' },
      { id: 'pmo-tc-drafts', label: 'Test Case Drafts', path: '/pmo/testing-centre/cases/drafts', icon: FlaskConical, order: 3, permission: 'testing_centre.view' },
      { id: 'pmo-tc-suites', label: 'Test Suites', path: '/pmo/testing-centre/suites', icon: FlaskConical, order: 4, permission: 'testing_centre.view' },
      { id: 'pmo-tc-runs', label: 'Test Runs', path: '/pmo/testing-centre/runs', icon: FlaskConical, order: 5, permission: 'testing_centre.run' },
      { id: 'pmo-tc-scripts', label: 'Automated Scripts', path: '/pmo/testing-centre/scripts', icon: FlaskConical, order: 6, permission: 'testing_centre.configure' },
      { id: 'pmo-tc-evidence', label: 'Screenshot Evidence', path: '/pmo/testing-centre/evidence', icon: FlaskConical, order: 7, permission: 'testing_centre.view' },
      { id: 'pmo-tc-diag', label: 'Diagnostic Centre', path: '/pmo/testing-centre/diagnostics', icon: FlaskConical, order: 8, permission: 'testing_centre.view' },
      { id: 'pmo-tc-defects', label: 'Defect & Issue Links', path: '/pmo/testing-centre/defects', icon: FlaskConical, order: 9, permission: 'testing_centre.view' },
      { id: 'pmo-tc-data', label: 'Test Data Manager', path: '/pmo/testing-centre/data', icon: FlaskConical, order: 10, permission: 'testing_centre.configure' },
      { id: 'pmo-tc-reports', label: 'Reports', path: '/pmo/testing-centre/reports', icon: FlaskConical, order: 11, permission: 'testing_centre.view' },
      { id: 'pmo-tc-settings', label: 'Settings', path: '/pmo/testing-centre/settings', icon: FlaskConical, order: 12, permission: 'testing_centre.configure' },
      { id: 'pmo-testing-quality-register', label: 'Quality Register (All)', path: '/pmo/oversight/quality-register', icon: ClipboardList, order: 13, permission: 'testing_centre.view' },
    ]
  },
  {
    id: 'pmo-administration',
    label: 'Administration',
    path: null,
    icon: Settings2,
    section: 'Administration',
    order: 13,
    children: [
      { id: 'pmo-admin-local-data-extensions', label: 'Local Data Extensions', path: '/app/local-data-extensions', icon: Database, order: 0, permission: 'pmo.admin' },
      { id: 'pmo-admin-form-templates', label: 'Form Templates', path: '/platform/admin/form-templates', icon: FileText, order: 1, permission: 'form_template.manage' },
      { id: 'pmo-admin-org-settings', label: 'Organisation Settings', path: '/platform/pmo-admin/settings', icon: Settings2, order: 2, permission: 'pmo.admin' },
      { id: 'pmo-admin-users', label: 'User Management', path: '/platform/pmo-admin/users', icon: Shield, order: 3, permission: 'pmo.admin' },
      { id: 'pmo-admin-role-menu-access', label: 'Role Menu Access', path: '/platform/pmo/role-menu-access', icon: ShieldCheck, order: 4, permission: 'pmo.admin' },
      { id: 'pmo-admin-project-types', label: 'Project Types', path: '/platform/pmo-admin/project-types', icon: Layers, order: 5, permission: 'pmo.admin' },
      { id: 'pmo-admin-funding-sources', label: 'Funding Sources', path: '/platform/pmo-admin/funding-sources', icon: DollarSign, order: 6, permission: 'pmo.admin' },
      { id: 'pmo-admin-budget-categories', label: 'Budget Categories', path: '/platform/pmo-admin/budget-categories', icon: DollarSign, order: 7, permission: 'pmo.admin' },
      { id: 'pmo-admin-rfp', label: 'RFP Register', path: '/pmo/procurement/rfp', icon: ShoppingCart, order: 8, permission: 'pmo.admin' },
      { id: 'pmo-admin-rfp-load', label: 'Load RFP', path: '/pmo/rfp/create', icon: FilePlus, order: 9, permission: 'pmo.admin' },
      { id: 'pmo-admin-rfp-drafts', label: 'RFP Drafts', path: '/pmo/rfp/on-hold', icon: Pause, order: 10, permission: 'pmo.admin' },
      { id: 'pmo-admin-subscription', label: 'Subscription', path: '/platform/pmo-admin/subscription', icon: Settings2, order: 11, permission: 'system.admin' },
      { id: 'pmo-admin-branding', label: 'Branding', path: '/platform/pmo-admin/branding', icon: Settings2, order: 12, permission: 'system.admin' },
    ]
  },
  {
    id: 'pmo-email-notifications',
    label: 'Email & Notifications',
    path: null,
    icon: Mail,
    section: 'Email & Notifications',
    order: 15,
    children: [
      { id: 'pmo-email-settings', label: 'Email Settings', path: '/platform/admin/email-settings', icon: Mail, order: 1, permission: 'pmo.admin' },
      { id: 'pmo-email-sender-profiles', label: 'Sender Profiles', path: '/platform/admin/email-sender-profiles', icon: AtSign, order: 2, permission: 'pmo.admin' },
      { id: 'pmo-email-invitation-templates', label: 'Invitation Templates', path: '/app/settings/invitation-templates', icon: FileText, order: 3, permission: 'pmo.admin' },
      { id: 'pmo-email-invitation-expiry', label: 'Invitation Expiry', path: '/platform/admin/invitation-settings', icon: Clock, order: 4, permission: 'pmo.admin' },
    ],
  },
  {
    id: 'pmo-people-resources',
    label: 'People & Resources',
    path: null,
    icon: Users,
    section: 'People & Resources',
    order: 14,
    children: [
      { id: 'pmo-people-manager-assignments', label: 'Manager Assignments', path: '/platform/pmo-admin/manager-assignments', icon: Users, order: 1, permission: 'pmo.admin' },
      { id: 'pmo-people-assignment-settings', label: 'Assignment Settings', path: '/platform/pmo-admin/manager-assignment-settings', icon: Settings2, order: 2, permission: 'pmo.admin' },
      { id: 'pmo-people-resource-directory', label: 'Resource Directory', path: '/platform/teams/directory', icon: Users, order: 4, permission: 'pmo.admin' },
      { id: 'pmo-people-team-capacity', label: 'Team Capacity', path: '/platform/teams/capacity', icon: BarChart3, order: 5, permission: 'pmo.admin' },
    ],
  },
];

export default pmoMenuConfig;
