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
  ShieldCheck
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

  // Section 1: PMO Governance (Baselines)
  {
    id: 'pmo-governance',
    label: 'PMO Governance',
    path: null,
    icon: Shield,
    section: 'PMO Governance',
    order: 1,
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
      }
    ]
  },

  // Section 2: Initiation & Business Justification
  {
    id: 'pmo-initiation',
    label: 'Initiation & Business Justification',
    path: null,
    icon: Briefcase,
    section: 'Initiation & Business Justification',
    order: 2,
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

  // Section 3: Project Oversight (Read-Only)
  {
    id: 'pmo-oversight',
    label: 'Project Oversight',
    path: null,
    icon: Eye,
    section: 'Project Oversight',
    order: 3,
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
      }
    ]
  },

  // Section 4: Reporting & Assurance
  {
    id: 'pmo-reporting',
    label: 'Reporting & Assurance',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Assurance',
    order: 4,
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
      }
    ]
  },

  // Section 5: Procurement
  {
    id: 'pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Procurement',
    order: 5,
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
        permission: 'pmo_admin'
      },
      {
        id: 'pmo-proc-rfp-on-hold',
        label: 'RFP Drafts',
        path: '/pmo/rfp/on-hold',
        icon: Pause,
        order: 3,
        permission: 'pmo_admin'
      }
    ]
  },

  {
    id: 'pmo-itto',
    label: 'ITTO Management',
    path: null,
    icon: GitBranch,
    section: 'ITTO Management',
    order: 5.5,
    children: [
      {
        id: 'pmo-itto-templates',
        label: 'ITTO Templates',
        path: '/pmo/itto/templates',
        icon: Layers,
        order: 1
      },
      {
        id: 'pmo-itto-drafts',
        label: 'ITTO Drafts',
        path: '/pmo/itto/drafts',
        icon: Pause,
        order: 2
      }
    ]
  },

  {
    id: 'pmo-delay-templates',
    label: 'Delay Management',
    path: null,
    icon: Layers,
    section: 'Delay Management',
    order: 5.52,
    children: [
      {
        id: 'pmo-delay-templates-crud',
        label: 'Delay Templates',
        path: '/pmo/delays/templates',
        icon: Layers,
        order: 1
      }
    ]
  },

  {
    id: 'pmo-planning',
    label: 'Planning Intelligence',
    path: null,
    icon: BarChart3,
    section: 'Planning Intelligence',
    order: 5.5,
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
    order: 6,
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
  }
];

export default pmoMenuConfig;
