/**
 * Project Manager Dashboard Sidebar Menu Configuration
 *
 * Static menu for the PM Dashboard (/pm/*)
 * Aligned to PRD: Documents/PMO_PM_Independent_Dashboards_PRD.md Section 5
 *
 * Sections:
 * 1. Governance Reference & Tailoring
 * 2. Initiation & Business Justification
 * 3. Delivery Management
 * 4. Controls & Registers
 * 5. Reporting
 * 6. Project Closure
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
  AlertCircle,
  ClipboardList,
  GraduationCap,
  BarChart3,
  Flag,
  FileWarning,
  FileCheck,
  FileClock,
  Package,
  Layers,
  Map,
  FileBox,
  Activity,
  Calendar,
  ListChecks,
  Wrench,
  FolderClosed,
  DollarSign,
  Receipt,
  ClipboardCheck,
  TrendingUp,
  GitBranch,
  Pause,
  SearchCode,
  PackageOpen,
  HeartPulse,
  Sparkles,
  Presentation,
  RefreshCcw,
  ShieldCheck,
  FlaskConical,
  Users,
  Mail,
  MailCheck,
  UserCog,
} from 'lucide-react';

const pmDashboardMenuConfig = [
  // Dashboard
  {
    id: 'pm-dashboard',
    label: 'Dashboard',
    path: '/pm/dashboard',
    icon: LayoutDashboard,
    section: null,
    order: 0
  },

  {
    id: 'pm-authorisation',
    label: 'Authorisation',
    path: null,
    icon: ShieldCheck,
    section: 'Authorisation',
    order: 0.5,
    children: [
      { id: 'pm-auth-queue', label: 'Pending My Approval', path: '/pm/authorisation/queue', icon: ClipboardCheck, order: 1 },
      { id: 'pm-auth-submitted', label: 'My Submitted Records', path: '/pm/authorisation/submitted', icon: Mail, order: 2 },
      { id: 'pm-auth-chains', label: 'Approval Chains', path: '/pm/authorisation/chains', icon: GitBranch, order: 3 },
    ],
  },

  // Team & Members — invite Team Manager/Lead and Team Members (v399, PM dashboard shell)
  {
    id: 'pm-team-members',
    label: 'Team & Members',
    path: null,
    icon: Users,
    section: 'Team & Members',
    order: 1,
    children: [
      {
        id: 'pm-manage-members',
        label: 'Manage Members',
        path: '/pm/team-members',
        icon: Users,
        order: 1,
      },
      {
        id: 'pm-send-role-invitation',
        label: 'Send Role Invitation',
        path: '/pm/team-members?action=send-invite',
        icon: Mail,
        order: 2,
      },
      {
        id: 'pm-invitation-tracker',
        label: 'Invitation Tracker',
        path: '/platform/invitation-tracker',
        icon: MailCheck,
        order: 3,
      },
      {
        id: 'pm-pending-invitations',
        label: 'Pending Invitations',
        path: '/pm/team-members?tab=pending',
        icon: Mail,
        order: 4,
      },
      {
        id: 'pm-my-team-appointments',
        label: 'My Assignment',
        path: '/platform/my-team-appointments',
        icon: ClipboardList,
        order: 5,
      },
    ],
  },

  // People & Assignments — decoupled manager/member assignment (v592)
  {
    id: 'pm-people-assignments',
    label: 'People & Assignments',
    path: null,
    icon: UserCog,
    section: 'People & Assignments',
    order: 2,
    children: [
      {
        id: 'pm-portfolio-assign-managers',
        label: 'Assign Managers (Portfolio)',
        path: '/platform/portfolio-manager/assignments',
        icon: UserCog,
        order: 1,
      },
      {
        id: 'pm-programme-assign-pm',
        label: 'Assign Project Managers (Programme)',
        path: '/platform/programme-manager/assignments',
        icon: UserCog,
        order: 2,
      },
      {
        id: 'pm-people-invitation-status',
        label: 'Invitation Tracker',
        path: '/platform/invitation-tracker',
        icon: MailCheck,
        order: 3,
      },
      {
        id: 'pm-my-appointments',
        label: 'My Appointments',
        path: '/platform/my-appointments',
        icon: UserCog,
        order: 4,
      },
      {
        id: 'pm-team-appointments',
        label: 'Team Appointments',
        path: '/platform/app/team-appointments',
        icon: Users,
        order: 5,
      },
    ],
  },

  // Section 1: Governance Reference & Tailoring
  {
    id: 'pm-governance',
    label: 'Governance Reference',
    path: null,
    icon: Shield,
    section: 'Governance Reference',
    order: 1,
    children: [
      {
        id: 'pm-gov-mandate',
        label: 'Project Mandate',
        path: '/pm/governance/mandate',
        icon: FileText,
        order: 1
      },
      {
        id: 'pm-gov-communication-strategy',
        label: 'Communication Management Strategy',
        path: '/pm/governance/communication-strategy',
        icon: Megaphone,
        order: 2
      },
      {
        id: 'pm-gov-configuration-strategy',
        label: 'Configuration Management Strategy',
        path: '/pm/governance/configuration-strategy',
        icon: Settings2,
        order: 3
      },
      {
        id: 'pm-gov-quality-strategy',
        label: 'Quality Management Strategy',
        path: '/pm/governance/quality-strategy',
        icon: CheckSquare,
        order: 4
      },
      {
        id: 'pm-gov-risk-strategy',
        label: 'Risk Management Strategy',
        path: '/pm/governance/risk-strategy',
        icon: AlertTriangle,
        order: 5
      }
    ]
  },

  // Section 2: Initiation & Business Justification
  {
    id: 'pm-initiation',
    label: 'Initiation & Business Justification',
    path: null,
    icon: Briefcase,
    section: 'Initiation & Business Justification',
    order: 2,
    children: [
      {
        id: 'pm-init-business-case',
        label: 'Business Case',
        path: '/pm/initiation/business-case',
        icon: Briefcase,
        order: 1
      },
      {
        id: 'pm-init-project-brief',
        label: 'Project Brief',
        path: '/pm/initiation/project-brief',
        icon: FileText,
        order: 2
      },
      {
        id: 'pm-init-pid',
        label: 'Project Initiation Document (PID)',
        path: '/pm/initiation/pid',
        icon: FileBox,
        order: 3
      },
      {
        id: 'pm-init-benefits-review-plan',
        label: 'Benefits Review Plan',
        path: '/pm/initiation/benefits-review-plan',
        icon: BookOpen,
        order: 4
      }
    ]
  },

  // Section 3: Delivery Management
  {
    id: 'pm-delivery',
    label: 'Delivery Management',
    path: null,
    icon: Package,
    section: 'Delivery Management',
    order: 3,
    children: [
      {
        id: 'pm-delivery-work-packages',
        label: 'Work Packages',
        path: '/pm/delivery/work-packages',
        icon: Layers,
        order: 1
      },
      {
        id: 'pm-delivery-product-description',
        label: 'Product Description',
        path: '/pm/delivery/product-description',
        icon: FileText,
        order: 2
      },
      {
        id: 'pm-delivery-project-product-description',
        label: 'Project Product Description',
        path: '/pm/delivery/project-product-description',
        icon: ClipboardList,
        order: 3
      },
      {
        id: 'pm-delivery-product-status-account',
        label: 'Product Status Account',
        path: '/pm/delivery/product-status-account',
        icon: Activity,
        order: 4
      },
      {
        id: 'pm-delivery-daily-log',
        label: 'Daily Log',
        path: '/pm/delivery/daily-log',
        icon: Calendar,
        order: 5
      },
      {
        id: 'pm-delivery-itto-templates',
        label: 'ITTO Templates',
        path: '/pm/itto/templates',
        icon: GitBranch,
        order: 6
      },
      {
        id: 'pm-delivery-itto-drafts',
        label: 'ITTO Drafts',
        path: '/pm/itto/drafts',
        icon: Pause,
        order: 7
      },
      {
        id: 'pm-delivery-delay-register',
        label: 'Delay Register',
        path: '/pm/delays',
        icon: FileClock,
        order: 8
      },
      {
        id: 'pm-delivery-delay-drafts',
        label: 'Delay Drafts',
        path: '/pm/delays/drafts',
        icon: Pause,
        order: 9
      }
    ]
  },

  // Section 4: Controls & Registers
  {
    id: 'pm-controls',
    label: 'Controls & Registers',
    path: null,
    icon: ListChecks,
    section: 'Controls & Registers',
    order: 4,
    children: [
      {
        id: 'pm-controls-risk-register',
        label: 'Risk Register',
        path: '/pm/controls/risk-register',
        icon: AlertTriangle,
        order: 1
      },
      {
        id: 'pm-controls-issue-register',
        label: 'Issue Register',
        path: '/pm/controls/issue-register',
        icon: AlertCircle,
        order: 2
      },
      {
        id: 'pm-controls-quality-register',
        label: 'Quality Register',
        path: '/pm/controls/quality-register',
        icon: CheckSquare,
        order: 3
      },
      {
        id: 'pm-controls-configuration-items',
        label: 'Configuration Item Records',
        path: '/pm/controls/configuration-items',
        icon: Wrench,
        order: 4
      },
      {
        id: 'pm-controls-lessons-log',
        label: 'Lessons Log',
        path: '/pm/controls/lessons-log',
        icon: GraduationCap,
        order: 5
      }
    ]
  },

  // Section 4b: Process Templates (v629)
  {
    id: 'pm-process-templates',
    label: 'Process Templates',
    path: null,
    icon: Layers,
    section: 'Process Templates',
    order: 4.5,
    children: [
      { id: 'pm-pt-hub', label: 'Hub Overview', path: '/pm/process-templates', icon: Layers, order: 1 },
      { id: 'pm-pt-pre', label: 'Pre-Project', path: '/pm/process-templates/pre-project', icon: FileText, order: 2 },
      { id: 'pm-pt-init', label: 'Initiating', path: '/pm/process-templates/initiating', icon: Flag, order: 3 },
      { id: 'pm-pt-plan', label: 'Planning', path: '/pm/process-templates/planning', icon: Map, order: 4 },
      { id: 'pm-pt-exec', label: 'Executing', path: '/pm/process-templates/executing', icon: Activity, order: 5 },
      { id: 'pm-pt-mon', label: 'Monitoring & Controlling', path: '/pm/process-templates/monitoring-controlling', icon: BarChart3, order: 6 },
      { id: 'pm-pt-close', label: 'Closing', path: '/pm/process-templates/closing', icon: FileCheck, order: 7 },
    ]
  },

  // Section 5: Planning Intelligence
  {
    id: 'pm-planning',
    label: 'Planning Intelligence',
    path: null,
    icon: BarChart3,
    section: 'Planning Intelligence',
    order: 5,
    children: [
      {
        id: 'pm-planning-hub',
        label: 'Planning Hub',
        path: '/pm/planning',
        icon: LayoutDashboard,
        order: 1
      },
      {
        id: 'pm-planning-intelligence',
        label: 'Plan Intelligence',
        path: '/pm/planning/intelligence',
        icon: SearchCode,
        order: 2
      },
      {
        id: 'pm-planning-scenarios',
        label: 'Scenarios',
        path: '/pm/planning/scenarios',
        icon: GitBranch,
        order: 3
      },
      {
        id: 'pm-planning-pbs',
        label: 'Product Plan (PBS)',
        path: '/pm/planning/pbs',
        icon: PackageOpen,
        order: 4
      },
      {
        id: 'pm-planning-health',
        label: 'Plan Health',
        path: '/pm/planning/health',
        icon: HeartPulse,
        order: 5
      },
      {
        id: 'pm-planning-executive',
        label: 'Executive View',
        path: '/pm/planning/executive',
        icon: Presentation,
        order: 6
      },
      {
        id: 'pm-planning-recovery',
        label: 'Recovery Planning',
        path: '/pm/planning/recovery',
        icon: RefreshCcw,
        order: 7
      },
      {
        id: 'pm-planning-governance',
        label: 'Governance Gates',
        path: '/pm/planning/governance',
        icon: ShieldCheck,
        order: 8
      },
      {
        id: 'pm-planning-ai-group',
        label: 'AI & Intelligence',
        path: null,
        icon: Sparkles,
        order: 9,
        children: [
          {
            id: 'pm-planning-ai',
            label: 'AI Plan Generator',
            path: '/pm/planning/ai',
            icon: Sparkles,
            order: 1
          },
          {
            id: 'pm-planning-confidence',
            label: 'Confidence Forecast',
            path: '/pm/planning/confidence',
            icon: TrendingUp,
            order: 2
          }
        ]
      }
    ]
  },

  // Section 6: Process Group Forms
  {
    id: 'pm-forms',
    label: 'Process Group Forms',
    path: '/pm/projects/:projectId/forms',
    icon: FileText,
    section: 'Process Group Forms',
    order: 6,
    children: [
      { id: 'pm-forms-initiating', label: 'Initiating', path: '/pm/projects/:projectId/forms?group=Initiating', icon: FileText, order: 1 },
      { id: 'pm-forms-planning', label: 'Planning', path: '/pm/projects/:projectId/forms?group=Planning', icon: FileText, order: 2 },
      { id: 'pm-forms-executing', label: 'Executing', path: '/pm/projects/:projectId/forms?group=Executing', icon: FileText, order: 3 },
      { id: 'pm-forms-monitoring', label: 'Monitoring & Controlling', path: '/pm/projects/:projectId/forms?group=Monitoring', icon: FileText, order: 4 },
      { id: 'pm-forms-closing', label: 'Closing', path: '/pm/projects/:projectId/forms?group=Closing', icon: FileText, order: 5 },
      { id: 'pm-forms-agile', label: 'Agile', path: '/pm/projects/:projectId/forms?group=Agile', icon: FileText, order: 6 },
      { id: 'pm-forms-drafts', label: 'My Drafts', path: '/pm/projects/:projectId/forms/drafts', icon: FileClock, order: 7 },
      { id: 'pm-forms-approvals', label: 'Pending Approvals', path: '/pm/projects/:projectId/forms?status=in_review', icon: ClipboardCheck, order: 8 },
    ]
  },

  {
    id: 'pm-testing-centre',
    label: 'Quality & Testing',
    path: null,
    icon: FlaskConical,
    section: 'Quality & Testing',
    order: 7,
    children: [
      { id: 'pm-tc-dash', label: 'Testing Dashboard', path: '/pm/testing-centre', icon: LayoutDashboard, order: 1, permission: 'testing_centre.view' },
      { id: 'pm-tc-cases', label: 'Test Case Library', path: '/pm/testing-centre/cases', icon: ClipboardList, order: 2, permission: 'testing_centre.view' },
      { id: 'pm-tc-drafts', label: 'Test Case Drafts', path: '/pm/testing-centre/cases/drafts', icon: FileClock, order: 3, permission: 'testing_centre.view' },
      { id: 'pm-tc-suites', label: 'Test Suites', path: '/pm/testing-centre/suites', icon: Layers, order: 4, permission: 'testing_centre.view' },
      { id: 'pm-tc-runs', label: 'Test Runs', path: '/pm/testing-centre/runs', icon: Activity, order: 5, permission: 'testing_centre.run' },
      { id: 'pm-tc-scripts', label: 'Automated Scripts', path: '/pm/testing-centre/scripts', icon: Wrench, order: 6, permission: 'testing_centre.configure' },
      { id: 'pm-tc-evidence', label: 'Screenshot Evidence', path: '/pm/testing-centre/evidence', icon: FileBox, order: 7, permission: 'testing_centre.view' },
      { id: 'pm-tc-diag', label: 'Diagnostic Centre', path: '/pm/testing-centre/diagnostics', icon: SearchCode, order: 8, permission: 'testing_centre.view' },
      { id: 'pm-tc-defects', label: 'Defect & Issue Links', path: '/pm/testing-centre/defects', icon: AlertTriangle, order: 9, permission: 'testing_centre.view' },
      { id: 'pm-tc-data', label: 'Test Data Manager', path: '/pm/testing-centre/data', icon: FileText, order: 10, permission: 'testing_centre.configure' },
      { id: 'pm-tc-reports', label: 'Reports', path: '/pm/testing-centre/reports', icon: BarChart3, order: 11, permission: 'testing_centre.view' },
      { id: 'pm-tc-settings', label: 'Settings', path: '/pm/testing-centre/settings', icon: Settings2, order: 12, permission: 'testing_centre.configure' },
    ]
  },

  // Knowledge & Resources (industry plan templates — v575)
  {
    id: 'pm-knowledge-resources',
    label: 'Knowledge & Resources',
    path: null,
    icon: BookOpen,
    section: 'Knowledge & Resources',
    order: 7.5,
    children: [
      {
        id: 'pm-industry-templates-browse',
        label: 'Industry Templates',
        path: '/pm/industry-templates',
        icon: Layers,
        order: 1,
      },
      {
        id: 'pm-industry-plan',
        label: 'My Industry Plan',
        path: '/pm/projects/:projectId/industry-plan',
        icon: Map,
        order: 2,
      },
    ],
  },

  // Section 8: Reporting & Closure (merged)
  {
    id: 'pm-reporting-closure',
    label: 'Reporting & Closure',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Closure',
    order: 8,
    children: [
      { id: 'pm-report-checkpoint', label: 'Checkpoint Reports', path: '/pm/reporting/checkpoint-reports', icon: Flag, order: 1 },
      { id: 'pm-report-highlight', label: 'Highlight Reports', path: '/pm/reporting/highlight-reports', icon: Flag, order: 2 },
      { id: 'pm-report-issue-reports', label: 'Issue Reports', path: '/pm/reporting/issue-reports', icon: AlertCircle, order: 3 },
      { id: 'pm-report-exception', label: 'Exception Reports', path: '/pm/reporting/exception-reports', icon: FileWarning, order: 4 },
      { id: 'pm-report-end-stage', label: 'End Stage Report', path: '/pm/reporting/end-stage-reports', icon: FileClock, order: 5 },
      { id: 'pm-fin-my-expenses', label: 'My Expenses', path: '/platform/expenses/my', icon: Receipt, order: 6 },
      { id: 'pm-fin-exp-approvals', label: 'Expense Approvals', path: '/platform/expenses/approvals', icon: ClipboardCheck, order: 7 },
      { id: 'pm-fin-reports', label: 'Financial Reports', path: '/platform/financial-reports', icon: DollarSign, order: 8 },
      { id: 'pm-fin-portfolio-evm', label: 'Portfolio EVM', path: '/platform/portfolio/evm', icon: TrendingUp, order: 9 },
      {
        id: 'pm-closure-lessons-report',
        label: 'Lessons Report',
        path: '/pm/closure/lessons-report',
        icon: GraduationCap,
        order: 10
      },
      {
        id: 'pm-closure-end-project-report',
        label: 'End Project Report',
        path: '/pm/closure/end-project-report',
        icon: FileCheck,
        order: 11
      }
    ]
  }
];

export default pmDashboardMenuConfig;
