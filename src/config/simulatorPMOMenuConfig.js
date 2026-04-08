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
  Pause
} from 'lucide-react';

const simulatorPMOMenuConfig = [
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
    label: 'PMO Governance',
    path: null,
    icon: Shield,
    section: 'PMO Governance',
    order: 1,
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
    order: 2,
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
    order: 3,
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
      }
    ]
  },

  // Section 4: Procurement
  {
    id: 'sim-pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Procurement',
    order: 4,
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

  // Section 5: Reporting & Assurance
  {
    id: 'sim-pmo-reporting',
    label: 'Reporting & Assurance',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Assurance',
    order: 5,
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
      }
    ]
  }
];

export default simulatorPMOMenuConfig;
