/**
 * Simulator PMO Dashboard Sidebar Menu Configuration
 *
 * Static menu for the Simulator PMO Dashboard (/simulator/pmo/*)
 * Mirrors Platform PMO structure but for practice/simulation context
 *
 * Sections:
 * 1. PMO Governance (Practice Baselines)
 * 2. Initiation & Business Justification
 * 3. Practice Project Oversight (Read-Only)
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
  SlidersHorizontal,
  GitBranch,
  Layers,
  FlaskConical,
  Users
} from 'lucide-react';

const simulatorPMOMenuConfig = [
  {
    id: 'sim-pmo-portfolio-programme',
    label: 'Practice Portfolio',
    path: null,
    icon: Briefcase,
    section: 'Practice Portfolio',
    order: 1,
    children: [
      { id: 'sim-pmo-pp-projects', label: 'All Practice Projects', path: '/simulator/practice-projects', icon: Briefcase, order: 1 },
      { id: 'sim-pmo-pp-programme', label: 'Programme Management', path: '/simulator/practice-programme', icon: Layers, order: 2 },
      { id: 'sim-pmo-pp-benefits', label: 'Benefits Management', path: '/simulator/benefits', icon: TrendingUp, order: 3 },
      { id: 'sim-pmo-pp-dependencies', label: 'Dependencies', path: '/simulator/practice-dependencies', icon: GitBranch, order: 4 },
      { id: 'sim-pmo-pp-collisions', label: 'Portfolio Collisions', path: '/simulator/pmo/planning/collisions', icon: AlertTriangle, order: 5 },
    ]
  },

  // Dashboard
  {
    id: 'sim-pmo-dashboard',
    label: 'Dashboard',
    path: '/simulator/pmo/dashboard',
    icon: LayoutDashboard,
    section: null,
    order: 0
  },

  // Section 1: PMO Governance (Practice Baselines)
  {
    id: 'sim-pmo-governance',
    label: 'Governance & Standards',
    path: null,
    icon: Shield,
    section: 'Governance & Standards',
    order: 2,
    children: [
      {
        id: 'sim-pmo-gov-mandate',
        label: 'Practice Project Mandate',
        path: '/simulator/pmo/governance/mandate',
        icon: FileText,
        order: 1
      },
      {
        id: 'sim-pmo-gov-communication-strategy',
        label: 'Practice Communication Management Strategy',
        path: '/simulator/pmo/governance/communication-strategy',
        icon: Megaphone,
        order: 2
      },
      {
        id: 'sim-pmo-gov-configuration-strategy',
        label: 'Practice Configuration Management Strategy',
        path: '/simulator/pmo/governance/configuration-strategy',
        icon: Settings2,
        order: 3
      },
      {
        id: 'sim-pmo-gov-quality-strategy',
        label: 'Practice Quality Management Strategy',
        path: '/simulator/pmo/governance/quality-strategy',
        icon: CheckSquare,
        order: 4
      },
      {
        id: 'sim-pmo-gov-risk-strategy',
        label: 'Practice Risk Management Strategy',
        path: '/simulator/pmo/governance/risk-strategy',
        icon: AlertTriangle,
        order: 5
      },
      {
        id: 'sim-pmo-gov-itto-templates',
        label: 'ITTO Templates',
        path: '/simulator/pmo/itto/templates',
        icon: GitBranch,
        order: 6
      },
      {
        id: 'sim-pmo-gov-itto-drafts',
        label: 'ITTO Drafts',
        path: '/simulator/pmo/itto/drafts',
        icon: Pause,
        order: 7
      }
    ]
  },

  // Section 2: Initiation & Business Justification
  {
    id: 'sim-pmo-initiation',
    label: 'Initiation & Business Justification',
    path: null,
    icon: Briefcase,
    section: 'Initiation & Business Justification',
    order: 3,
    children: [
      {
        id: 'sim-pmo-init-business-case',
        label: 'Practice Business Case',
        path: '/simulator/pmo/initiation/business-case',
        icon: Briefcase,
        order: 1
      },
      {
        id: 'sim-pmo-init-project-brief',
        label: 'Practice Project Brief',
        path: '/simulator/pmo/initiation/project-brief',
        icon: FileText,
        order: 2
      },
      {
        id: 'sim-pmo-init-benefits-review-plan',
        label: 'Practice Benefits Review Plan',
        path: '/simulator/pmo/initiation/benefits-review-plan',
        icon: BookOpen,
        order: 3
      }
    ]
  },

  // Section 3: Practice Project Oversight (Read-Only)
  {
    id: 'sim-pmo-oversight',
    label: 'Practice Project Oversight',
    path: null,
    icon: Eye,
    section: 'Practice Project Oversight',
    order: 4,
    children: [
      {
        id: 'sim-pmo-oversight-risk-register',
        label: 'Practice Risk Register',
        path: '/simulator/pmo/oversight/risk-register',
        icon: AlertTriangle,
        order: 1
      },
      {
        id: 'sim-pmo-oversight-issue-register',
        label: 'Practice Issue Register',
        path: '/simulator/pmo/oversight/issue-register',
        icon: AlertCircle,
        order: 2
      },
      {
        id: 'sim-pmo-oversight-quality-register',
        label: 'Practice Quality Register',
        path: '/simulator/pmo/oversight/quality-register',
        icon: ClipboardList,
        order: 3
      },
      {
        id: 'sim-pmo-oversight-lessons-log',
        label: 'Practice Lessons Log',
        path: '/simulator/pmo/oversight/lessons-log',
        icon: GraduationCap,
        order: 4
      },
      {
        id: 'sim-pmo-oversight-delays',
        label: 'Delay Register',
        path: '/simulator/pmo/oversight/delays',
        icon: FileClock,
        order: 5
      },
      {
        id: 'sim-pmo-oversight-delay-templates',
        label: 'Delay Templates',
        path: '/simulator/pmo/delays/templates',
        icon: Layers,
        order: 6
      },
      {
        id: 'sim-pmo-oversight-scope',
        label: 'Scope Oversight',
        path: '/simulator/pmo/oversight/scope',
        icon: ClipboardList,
        order: 7
      },
      {
        id: 'sim-pmo-oversight-schedules',
        label: 'Schedule Oversight',
        path: '/simulator/pmo/oversight/schedules',
        icon: FileClock,
        order: 8
      }
    ]
  },

  // Section 5: Procurement
  {
    id: 'sim-pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Procurement',
    order: 8,
    children: [
      {
        id: 'sim-pmo-proc-rfp',
        label: 'Practice RFP Register',
        path: '/simulator/pmo/procurement/rfp',
        icon: FileSpreadsheet,
        order: 1
      },
      {
        id: 'sim-pmo-proc-rfp-create',
        label: 'Load RFP',
        path: '/simulator/pmo/rfp/create',
        icon: FilePlus,
        order: 2
      },
      {
        id: 'sim-pmo-proc-rfp-on-hold',
        label: 'RFP Drafts',
        path: '/simulator/pmo/rfp/on-hold',
        icon: Pause,
        order: 3
      }
    ]
  },

  // Section 5: Financial Management
  {
    id: 'sim-pmo-financial',
    label: 'Financial Management',
    path: null,
    icon: DollarSign,
    section: 'Financial Management',
    order: 7,
    children: [
      {
        id: 'sim-pmo-fin-reports',
        label: 'Financial Reports',
        path: '/simulator/financial-reports',
        icon: BarChart3,
        order: 1
      },
      {
        id: 'sim-pmo-fin-portfolio-evm',
        label: 'Portfolio EVM',
        path: '/simulator/practice-portfolio/evm',
        icon: TrendingUp,
        order: 2
      },
      {
        id: 'sim-pmo-fin-exp-approvals',
        label: 'Expense Approvals',
        path: '/simulator/expenses/approvals',
        icon: ClipboardCheck,
        order: 3
      },
      {
        id: 'sim-pmo-fin-thresholds',
        label: 'Expense Thresholds',
        path: '/simulator/pmo/expense-thresholds',
        icon: SlidersHorizontal,
        order: 4
      }
    ]
  },

  {
    id: 'sim-pmo-forms',
    label: 'Process Group Forms',
    path: '/simulator/pmo/forms',
    icon: FileText,
    section: 'Process Group Forms',
    order: 6,
    permission: 'form.view_all',
    children: [
      { id: 'sim-pmo-forms-initiating', label: 'Initiating', path: '/simulator/pmo/forms?group=Initiating', icon: FileText, order: 1, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-planning', label: 'Planning', path: '/simulator/pmo/forms?group=Planning', icon: FileText, order: 2, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-executing', label: 'Executing', path: '/simulator/pmo/forms?group=Executing', icon: FileText, order: 3, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-monitoring', label: 'Monitoring & Controlling', path: '/simulator/pmo/forms?group=Monitoring', icon: FileText, order: 4, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-closing', label: 'Closing', path: '/simulator/pmo/forms?group=Closing', icon: FileText, order: 5, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-agile', label: 'Agile', path: '/simulator/pmo/forms?group=Agile', icon: FileText, order: 6, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-drafts', label: 'My Drafts', path: '/simulator/pmo/forms?status=draft', icon: FileClock, order: 7, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-approvals', label: 'Pending Approvals', path: '/simulator/pmo/forms?status=in_review', icon: FileCheck, order: 8, permission: 'form.approve' },
    ]
  },
  {
    id: 'sim-pmo-testing-centre',
    label: 'Quality & Testing',
    path: null,
    icon: FlaskConical,
    section: 'Quality & Testing',
    order: 9,
    children: [
      { id: 'sim-pmo-tc-dash', label: 'Testing Dashboard', path: '/simulator/pmo/testing-centre', icon: FlaskConical, order: 1, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-cases', label: 'Test Case Library', path: '/simulator/pmo/testing-centre/cases', icon: FlaskConical, order: 2, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-drafts', label: 'Test Case Drafts', path: '/simulator/pmo/testing-centre/cases/drafts', icon: FlaskConical, order: 3, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-suites', label: 'Test Suites', path: '/simulator/pmo/testing-centre/suites', icon: FlaskConical, order: 4, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-runs', label: 'Test Runs', path: '/simulator/pmo/testing-centre/runs', icon: FlaskConical, order: 5, permission: 'testing_centre.run' },
      { id: 'sim-pmo-tc-scripts', label: 'Automated Scripts', path: '/simulator/pmo/testing-centre/scripts', icon: FlaskConical, order: 6, permission: 'testing_centre.configure' },
      { id: 'sim-pmo-tc-evidence', label: 'Screenshot Evidence', path: '/simulator/pmo/testing-centre/evidence', icon: FlaskConical, order: 7, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-diag', label: 'Diagnostic Centre', path: '/simulator/pmo/testing-centre/diagnostics', icon: FlaskConical, order: 8, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-defects', label: 'Defect & Issue Links', path: '/simulator/pmo/testing-centre/defects', icon: FlaskConical, order: 9, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-data', label: 'Test Data Manager', path: '/simulator/pmo/testing-centre/data', icon: FlaskConical, order: 10, permission: 'testing_centre.configure' },
      { id: 'sim-pmo-tc-reports', label: 'Reports', path: '/simulator/pmo/testing-centre/reports', icon: FlaskConical, order: 11, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-settings', label: 'Settings', path: '/simulator/pmo/testing-centre/settings', icon: FlaskConical, order: 12, permission: 'testing_centre.configure' },
    ]
  },

  // Section 6: Reporting & Assurance
  {
    id: 'sim-pmo-reporting',
    label: 'Reporting & Assurance',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Assurance',
    order: 11,
    children: [
      {
        id: 'sim-pmo-report-highlight',
        label: 'Practice Highlight Reports',
        path: '/simulator/pmo/reporting/highlight-reports',
        icon: Flag,
        order: 1
      },
      {
        id: 'sim-pmo-report-exception',
        label: 'Practice Exception Reports',
        path: '/simulator/pmo/reporting/exception-reports',
        icon: FileWarning,
        order: 2
      },
      {
        id: 'sim-pmo-report-end-stage',
        label: 'Practice End Stage Reports',
        path: '/simulator/pmo/reporting/end-stage-reports',
        icon: FileClock,
        order: 3
      },
      {
        id: 'sim-pmo-report-end-project',
        label: 'Practice End Project Reports',
        path: '/simulator/pmo/reporting/end-project-reports',
        icon: FileCheck,
        order: 4
      },
      {
        id: 'sim-pmo-report-library',
        label: 'Report Library',
        path: '/simulator/reports',
        icon: FileText,
        order: 5
      },
      {
        id: 'sim-pmo-report-analytics',
        label: 'Analytics',
        path: '/simulator/reports/analytics',
        icon: BarChart3,
        order: 6
      }
    ]
  },
  {
    id: 'sim-pmo-people-resources',
    label: 'People & Resources',
    path: null,
    icon: Users,
    section: 'People & Resources',
    order: 10,
    children: [
      { id: 'sim-pmo-people-manager-assignments', label: 'Manager Assignments', path: '/simulator/pmo/manager-assignments', icon: Users, order: 1 },
      { id: 'sim-pmo-people-assignment-settings', label: 'Assignment Settings', path: '/simulator/pmo/manager-assignment-settings', icon: Settings2, order: 2 },
      { id: 'sim-pmo-people-resource-directory', label: 'Resource Directory', path: '/simulator/practice-teams', icon: Users, order: 3 },
      { id: 'sim-pmo-people-team-capacity', label: 'Team Capacity', path: '/simulator/practice-teams', icon: BarChart3, order: 4 },
    ]
  }
];

export default simulatorPMOMenuConfig;
