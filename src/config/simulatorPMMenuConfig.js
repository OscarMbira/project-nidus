/**
 * Simulator Project Manager Dashboard Sidebar Menu Configuration
 *
 * Static menu for the Simulator PM Dashboard (/simulator/pm/*)
 * Mirrors Platform PM structure but for practice/simulation context
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
  ShieldCheck
} from 'lucide-react';

const simulatorPMMenuConfig = [
  // Dashboard
  {
    id: 'sim-pm-dashboard',
    label: 'Dashboard',
    path: '/simulator/pm/dashboard',
    icon: LayoutDashboard,
    section: null,
    order: 0
  },

  // Section 1: Governance Reference & Tailoring
  {
    id: 'sim-pm-governance',
    label: 'Governance Reference',
    path: null,
    icon: Shield,
    section: 'Governance Reference',
    order: 1,
    children: [
      {
        id: 'sim-pm-gov-mandate',
        label: 'Practice Project Mandate',
        path: '/simulator/pm/governance/mandate',
        icon: FileText,
        order: 1
      },
      {
        id: 'sim-pm-gov-communication-strategy',
        label: 'Practice Communication Management Strategy',
        path: '/simulator/pm/governance/communication-strategy',
        icon: Megaphone,
        order: 2
      },
      {
        id: 'sim-pm-gov-configuration-strategy',
        label: 'Practice Configuration Management Strategy',
        path: '/simulator/pm/governance/configuration-strategy',
        icon: Settings2,
        order: 3
      },
      {
        id: 'sim-pm-gov-quality-strategy',
        label: 'Practice Quality Management Strategy',
        path: '/simulator/pm/governance/quality-strategy',
        icon: CheckSquare,
        order: 4
      },
      {
        id: 'sim-pm-gov-risk-strategy',
        label: 'Practice Risk Management Strategy',
        path: '/simulator/pm/governance/risk-strategy',
        icon: AlertTriangle,
        order: 5
      }
    ]
  },

  // Section 2: Initiation & Business Justification
  {
    id: 'sim-pm-initiation',
    label: 'Initiation & Business Justification',
    path: null,
    icon: Briefcase,
    section: 'Initiation & Business Justification',
    order: 2,
    children: [
      {
        id: 'sim-pm-init-business-case',
        label: 'Practice Business Case',
        path: '/simulator/pm/initiation/business-case',
        icon: Briefcase,
        order: 1
      },
      {
        id: 'sim-pm-init-project-brief',
        label: 'Practice Project Brief',
        path: '/simulator/pm/initiation/project-brief',
        icon: FileText,
        order: 2
      },
      {
        id: 'sim-pm-init-pid',
        label: 'Practice Project Initiation Document (PID)',
        path: '/simulator/pm/initiation/pid',
        icon: FileBox,
        order: 3
      },
      {
        id: 'sim-pm-init-benefits-review-plan',
        label: 'Practice Benefits Review Plan',
        path: '/simulator/pm/initiation/benefits-review-plan',
        icon: BookOpen,
        order: 4
      }
    ]
  },

  // Section 3: Delivery Management
  {
    id: 'sim-pm-delivery',
    label: 'Delivery Management',
    path: null,
    icon: Package,
    section: 'Delivery Management',
    order: 3,
    children: [
      {
        id: 'sim-pm-delivery-work-packages',
        label: 'Practice Work Packages',
        path: '/simulator/pm/delivery/work-packages',
        icon: Layers,
        order: 1
      },
      {
        id: 'sim-pm-delivery-product-description',
        label: 'Practice Product Description',
        path: '/simulator/pm/delivery/product-description',
        icon: FileText,
        order: 2
      },
      {
        id: 'sim-pm-delivery-project-product-description',
        label: 'Practice Project Product Description',
        path: '/simulator/pm/delivery/project-product-description',
        icon: ClipboardList,
        order: 3
      },
      {
        id: 'sim-pm-delivery-product-status-account',
        label: 'Practice Product Status Account',
        path: '/simulator/pm/delivery/product-status-account',
        icon: Activity,
        order: 4
      },
      {
        id: 'sim-pm-delivery-daily-log',
        label: 'Practice Daily Log',
        path: '/simulator/pm/delivery/daily-log',
        icon: Calendar,
        order: 5
      }
    ]
  },

  // Section 4: Controls & Registers
  {
    id: 'sim-pm-controls',
    label: 'Controls & Registers',
    path: null,
    icon: ListChecks,
    section: 'Controls & Registers',
    order: 4,
    children: [
      {
        id: 'sim-pm-controls-risk-register',
        label: 'Practice Risk Register',
        path: '/simulator/pm/controls/risk-register',
        icon: AlertTriangle,
        order: 1
      },
      {
        id: 'sim-pm-controls-issue-register',
        label: 'Practice Issue Register',
        path: '/simulator/pm/controls/issue-register',
        icon: AlertCircle,
        order: 2
      },
      {
        id: 'sim-pm-controls-quality-register',
        label: 'Practice Quality Register',
        path: '/simulator/pm/controls/quality-register',
        icon: CheckSquare,
        order: 3
      },
      {
        id: 'sim-pm-controls-configuration-items',
        label: 'Practice Configuration Item Records',
        path: '/simulator/pm/controls/configuration-items',
        icon: Wrench,
        order: 4
      },
      {
        id: 'sim-pm-controls-lessons-log',
        label: 'Practice Lessons Log',
        path: '/simulator/pm/controls/lessons-log',
        icon: GraduationCap,
        order: 5
      }
    ]
  },

  // Section 5: Reporting
  {
    id: 'sim-pm-reporting',
    label: 'Reporting',
    path: null,
    icon: BarChart3,
    section: 'Reporting',
    order: 5,
    children: [
      {
        id: 'sim-pm-report-checkpoint',
        label: 'Practice Checkpoint Reports',
        path: '/simulator/pm/reporting/checkpoint-reports',
        icon: Flag,
        order: 1
      },
      {
        id: 'sim-pm-report-highlight',
        label: 'Practice Highlight Reports',
        path: '/simulator/pm/reporting/highlight-reports',
        icon: Flag,
        order: 2
      },
      {
        id: 'sim-pm-report-issue-reports',
        label: 'Practice Issue Reports',
        path: '/simulator/pm/reporting/issue-reports',
        icon: AlertCircle,
        order: 3
      },
      {
        id: 'sim-pm-report-exception',
        label: 'Practice Exception Reports',
        path: '/simulator/pm/reporting/exception-reports',
        icon: FileWarning,
        order: 4
      },
      {
        id: 'sim-pm-report-end-stage',
        label: 'Practice End Stage Report',
        path: '/simulator/pm/reporting/end-stage-reports',
        icon: FileClock,
        order: 5
      }
    ]
  },

  // Section 6: Financial Management
  {
    id: 'sim-pm-financial',
    label: 'Financial Management',
    path: null,
    icon: DollarSign,
    section: 'Financial Management',
    order: 6,
    children: [
      {
        id: 'sim-pm-fin-my-expenses',
        label: 'My Expenses',
        path: '/simulator/expenses/my',
        icon: Receipt,
        order: 1
      },
      {
        id: 'sim-pm-fin-exp-approvals',
        label: 'Expense Approvals',
        path: '/simulator/expenses/approvals',
        icon: ClipboardCheck,
        order: 2
      },
      {
        id: 'sim-pm-fin-reports',
        label: 'Financial Reports',
        path: '/simulator/financial-reports',
        icon: BarChart3,
        order: 3
      },
      {
        id: 'sim-pm-fin-portfolio-evm',
        label: 'Portfolio EVM',
        path: '/simulator/practice-portfolio/evm',
        icon: TrendingUp,
        order: 4
      }
    ]
  },

  {
    id: 'sim-pm-itto',
    label: 'ITTO Management',
    path: null,
    icon: GitBranch,
    section: 'ITTO Management',
    order: 6.5,
    children: [
      {
        id: 'sim-pm-itto-templates',
        label: 'ITTO Templates',
        path: '/simulator/pm/itto/templates',
        icon: Layers,
        order: 1
      },
      {
        id: 'sim-pm-itto-project',
        label: 'Project ITTOs',
        path: '/simulator/pm/itto/project',
        icon: Layers,
        order: 2
      },
      {
        id: 'sim-pm-itto-drafts',
        label: 'ITTO Drafts',
        path: '/simulator/pm/itto/drafts',
        icon: Pause,
        order: 3
      }
    ]
  },

  {
    id: 'sim-pm-delays',
    label: 'Delays',
    path: null,
    icon: FileClock,
    section: 'Delays',
    order: 6.55,
    children: [
      {
        id: 'sim-pm-delay-register',
        label: 'Delay Register',
        path: '/simulator/pm/delays',
        icon: ClipboardList,
        order: 1
      },
      {
        id: 'sim-pm-delay-drafts',
        label: 'Delay Drafts',
        path: '/simulator/pm/delays/drafts',
        icon: Pause,
        order: 2
      }
    ]
  },

  {
    id: 'sim-pm-planning',
    label: 'Planning Intelligence',
    path: null,
    icon: BarChart3,
    section: 'Planning Intelligence',
    order: 6.57,
    children: [
      {
        id: 'sim-pm-planning-hub',
        label: 'Planning Hub',
        path: '/simulator/pm/planning',
        icon: LayoutDashboard,
        order: 1
      },
      {
        id: 'sim-pm-planning-intelligence',
        label: 'Plan Intelligence',
        path: '/simulator/pm/planning/intelligence',
        icon: SearchCode,
        order: 2
      },
      {
        id: 'sim-pm-planning-scenarios',
        label: 'Scenarios',
        path: '/simulator/pm/planning/scenarios',
        icon: GitBranch,
        order: 3
      },
      {
        id: 'sim-pm-planning-pbs',
        label: 'Product Plan (PBS)',
        path: '/simulator/pm/planning/pbs',
        icon: PackageOpen,
        order: 4
      },
      {
        id: 'sim-pm-planning-health',
        label: 'Plan Health',
        path: '/simulator/pm/planning/health',
        icon: HeartPulse,
        order: 5
      },
      {
        id: 'sim-pm-planning-ai',
        label: 'AI Plan Generator',
        path: '/simulator/pm/planning/ai',
        icon: Sparkles,
        order: 6
      },
      {
        id: 'sim-pm-planning-executive',
        label: 'Executive View',
        path: '/simulator/pm/planning/executive',
        icon: Presentation,
        order: 7
      },
      {
        id: 'sim-pm-planning-recovery',
        label: 'Recovery Planning',
        path: '/simulator/pm/planning/recovery',
        icon: RefreshCcw,
        order: 8
      },
      {
        id: 'sim-pm-planning-confidence',
        label: 'Confidence Forecast',
        path: '/simulator/pm/planning/confidence',
        icon: TrendingUp,
        order: 9
      },
      {
        id: 'sim-pm-planning-governance',
        label: 'Governance Gates',
        path: '/simulator/pm/planning/governance',
        icon: ShieldCheck,
        order: 10
      },
      {
        id: 'sim-pm-planning-microplans',
        label: 'Team Micro Plans',
        path: '/simulator/pm/planning/microplans',
        icon: ClipboardList,
        order: 11
      },
      {
        id: 'sim-pm-planning-microplans-drafts',
        label: 'My Draft Plans',
        path: '/simulator/pm/planning/microplans/drafts',
        icon: FileClock,
        order: 12
      }
    ]
  },

  // Section 7: Project Closure
  {
    id: 'sim-pm-closure',
    label: 'Project Closure',
    path: null,
    icon: FolderClosed,
    section: 'Project Closure',
    order: 7,
    children: [
      {
        id: 'sim-pm-closure-lessons-report',
        label: 'Practice Lessons Report',
        path: '/simulator/pm/closure/lessons-report',
        icon: GraduationCap,
        order: 1
      },
      {
        id: 'sim-pm-closure-end-project-report',
        label: 'Practice End Project Report',
        path: '/simulator/pm/closure/end-project-report',
        icon: FileCheck,
        order: 2
      }
    ]
  }
];

export default simulatorPMMenuConfig;
