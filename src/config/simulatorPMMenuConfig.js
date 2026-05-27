/**
 * Simulator Project Manager Dashboard Sidebar Menu Configuration
 *
 * @deprecated Runtime sidebar uses DB menu_items via useSimMenu + Sidebar.jsx (v641).
 * Use src/config/menuRegistry.js (domain: simulator) as build-time source of truth.
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
  MailCheck,
  Users,
  Mail,
  UserCog,
} from 'lucide-react';

const simulatorPMMenuConfig = [
  { id: 'sim-pm-dashboard', label: 'Dashboard', path: '/simulator/pm/dashboard', icon: LayoutDashboard, section: null, order: 0 },
  {
    id: 'sim-pm-people-assignments',
    label: 'People & Assignments',
    path: null,
    icon: UserCog,
    section: 'People & Assignments',
    order: 1,
    children: [
      {
        id: 'sim-pm-portfolio-assign',
        label: 'Assign Managers (Portfolio)',
        path: '/simulator/pm/portfolio-manager/assignments',
        icon: UserCog,
        order: 1,
      },
      {
        id: 'sim-pm-programme-assign',
        label: 'Assign Project Managers (Programme)',
        path: '/simulator/pm/programme-manager/assignments',
        icon: UserCog,
        order: 2,
      },
      {
        id: 'sim-pm-team-members',
        label: 'Manage Team Members',
        path: '/simulator/pm/team-members',
        icon: Users,
        order: 3,
      },
      {
        id: 'sim-pm-send-invite',
        label: 'Send Invitation',
        path: '/simulator/pm/team-members?action=send-invite',
        icon: Mail,
        order: 4,
      },
      {
        id: 'sim-pm-invitation-status',
        label: 'Invitation Status',
        path: '/simulator/pm/invitation-tracker',
        icon: MailCheck,
        order: 5,
      },
      {
        id: 'sim-pm-my-appointments',
        label: 'My Appointments',
        path: '/simulator/my-appointments',
        icon: UserCog,
        order: 6,
      },
      {
        id: 'sim-pm-team-appointments',
        label: 'Team Appointments',
        path: '/simulator/app/team-appointments',
        icon: Users,
        order: 7,
      },
      {
        id: 'sim-pm-my-team-assignments',
        label: 'My Assignment',
        path: '/simulator/my-team-appointments',
        icon: ClipboardList,
        order: 8,
      },
    ],
  },
  {
    id: 'sim-pm-my-work',
    label: 'My Practice Work',
    path: null,
    icon: ClipboardCheck,
    section: 'My Practice Work',
    order: 1,
    children: [
      { id: 'sim-pm-my-work-tasks', label: 'My Tasks', path: '/simulator/practice-tasks', icon: ClipboardList, order: 1 },
      { id: 'sim-pm-my-work-projects', label: 'My Practice Projects', path: '/simulator/practice-projects', icon: Briefcase, order: 2 },
      { id: 'sim-pm-my-work-drafts', label: 'My Draft Forms', path: '/simulator/pm/projects/:projectId/forms/drafts', icon: FileClock, order: 3 },
    ]
  },
  {
    id: 'sim-pm-projects',
    label: 'Practice Projects',
    path: '/simulator/practice-projects',
    icon: Briefcase,
    section: 'Practice Projects',
    order: 2,
    children: [
      { id: 'sim-pm-projects-list', label: 'My Practice Projects', path: '/simulator/practice-projects', icon: Briefcase, order: 1 },
      { id: 'sim-pm-projects-create', label: 'Create Practice Project', path: '/simulator/practice-projects/create', icon: FileText, order: 2 },
      { id: 'sim-pm-projects-members', label: 'Manage Members', path: '/simulator/practice-project-members', icon: Shield, order: 3 },
    ]
  },
  {
    id: 'sim-pm-controls',
    label: 'Controls & Registers',
    path: null,
    icon: ListChecks,
    section: 'Controls & Registers',
    order: 3,
    children: [
      { id: 'sim-pm-controls-risk-register', label: 'Practice Risk Register', path: '/simulator/pm/controls/risk-register', icon: AlertTriangle, order: 1 },
      { id: 'sim-pm-controls-issue-register', label: 'Practice Issue Register', path: '/simulator/pm/controls/issue-register', icon: AlertCircle, order: 2 },
      { id: 'sim-pm-controls-quality-register', label: 'Practice Quality Register', path: '/simulator/pm/controls/quality-register', icon: CheckSquare, order: 3 },
      { id: 'sim-pm-controls-work-authorisations', label: 'Practice Work Authorisations', path: '/simulator/pm/controls/work-authorisations', icon: Shield, order: 4 },
    ]
  },
  {
    id: 'sim-pm-process-templates',
    label: 'Process Templates',
    path: null,
    icon: Layers,
    section: 'Process Templates',
    order: 3.5,
    children: [
      { id: 'sim-pm-pt-hub', label: 'Hub Overview', path: '/simulator/pm/process-templates', icon: Layers, order: 1 },
      { id: 'sim-pm-pt-pre', label: 'Pre-Project', path: '/simulator/pm/process-templates/pre-project', icon: FileText, order: 2 },
      { id: 'sim-pm-pt-init', label: 'Initiating', path: '/simulator/pm/process-templates/initiating', icon: Flag, order: 3 },
      { id: 'sim-pm-pt-plan', label: 'Planning', path: '/simulator/pm/process-templates/planning', icon: Map, order: 4 },
      { id: 'sim-pm-pt-exec', label: 'Executing', path: '/simulator/pm/process-templates/executing', icon: Activity, order: 5 },
      { id: 'sim-pm-pt-mon', label: 'Monitoring & Controlling', path: '/simulator/pm/process-templates/monitoring-controlling', icon: BarChart3, order: 6 },
      { id: 'sim-pm-pt-close', label: 'Closing', path: '/simulator/pm/process-templates/closing', icon: FileCheck, order: 7 },
    ]
  },
  {
    id: 'sim-pm-planning-delivery',
    label: 'Planning & Delivery',
    path: null,
    icon: Package,
    section: 'Planning & Delivery',
    order: 4,
    children: [
      { id: 'sim-pm-delivery-work-packages', label: 'Practice Work Packages', path: '/simulator/pm/delivery/work-packages', icon: Layers, order: 1 },
      { id: 'sim-pm-planning-hub', label: 'Planning Hub', path: '/simulator/pm/planning', icon: LayoutDashboard, order: 2 },
      { id: 'sim-pm-planning-intelligence', label: 'Plan Intelligence', path: '/simulator/pm/planning/intelligence', icon: SearchCode, order: 3 },
      { id: 'sim-pm-itto-templates', label: 'ITTO Templates', path: '/simulator/pm/itto/templates', icon: GitBranch, order: 4 },
      { id: 'sim-pm-delay-register', label: 'Delay Register', path: '/simulator/pm/delays', icon: FileClock, order: 5 },
    ]
  },
  {
    id: 'sim-pm-forms',
    label: 'Process Group Forms',
    path: '/simulator/pm/projects/:projectId/forms',
    icon: FileText,
    section: 'Process Group Forms',
    order: 5,
    children: [
      { id: 'sim-pm-forms-initiating', label: 'Initiating', path: '/simulator/pm/projects/:projectId/forms?group=Initiating', icon: FileText, order: 1, permission: 'form.view' },
      { id: 'sim-pm-forms-planning', label: 'Planning', path: '/simulator/pm/projects/:projectId/forms?group=Planning', icon: FileText, order: 2, permission: 'form.view' },
      { id: 'sim-pm-forms-executing', label: 'Executing', path: '/simulator/pm/projects/:projectId/forms?group=Executing', icon: FileText, order: 3, permission: 'form.view' },
      { id: 'sim-pm-forms-monitoring', label: 'Monitoring & Controlling', path: '/simulator/pm/projects/:projectId/forms?group=Monitoring', icon: FileText, order: 4, permission: 'form.view' },
      { id: 'sim-pm-forms-closing', label: 'Closing', path: '/simulator/pm/projects/:projectId/forms?group=Closing', icon: FileText, order: 5, permission: 'form.view' },
      { id: 'sim-pm-forms-agile', label: 'Agile', path: '/simulator/pm/projects/:projectId/forms?group=Agile', icon: FileText, order: 6, permission: 'form.view' },
    ]
  },
  {
    id: 'sim-pm-testing-centre',
    label: 'Quality & Testing',
    path: null,
    icon: FlaskConical,
    section: 'Quality & Testing',
    order: 6,
    children: [
      { id: 'sim-pm-tc-dash', label: 'Testing Dashboard', path: '/simulator/pm/testing-centre', icon: LayoutDashboard, order: 1, permission: 'testing_centre.view' },
      { id: 'sim-pm-tc-cases', label: 'Test Case Library', path: '/simulator/pm/testing-centre/cases', icon: ClipboardList, order: 2, permission: 'testing_centre.view' },
      { id: 'sim-pm-tc-suites', label: 'Test Suites', path: '/simulator/pm/testing-centre/suites', icon: Layers, order: 3, permission: 'testing_centre.view' },
      { id: 'sim-pm-tc-runs', label: 'Test Runs', path: '/simulator/pm/testing-centre/runs', icon: Activity, order: 4, permission: 'testing_centre.run' },
      { id: 'sim-pm-tc-defects', label: 'Defect & Issue Links', path: '/simulator/pm/testing-centre/defects', icon: AlertTriangle, order: 5, permission: 'testing_centre.view' },
    ]
  },
  {
    id: 'sim-pm-people-stakeholders',
    label: 'People & Stakeholders',
    path: null,
    icon: Briefcase,
    section: 'People & Stakeholders',
    order: 7,
    children: [
      { id: 'sim-pm-people-teams', label: 'Practice Teams', path: '/simulator/practice-teams', icon: Briefcase, order: 1 },
      { id: 'sim-pm-people-stakeholders', label: 'Stakeholders', path: '/simulator/practice-stakeholders', icon: AlertCircle, order: 2 },
      { id: 'sim-pm-invitation-tracker', label: 'Invitation Tracker', path: '/simulator/pm/invitation-tracker', icon: MailCheck, order: 3 },
    ]
  },
  {
    id: 'sim-pm-reporting',
    label: 'Reporting',
    path: null,
    icon: BarChart3,
    section: 'Reporting',
    order: 8,
    children: [
      { id: 'sim-pm-report-highlight', label: 'Practice Highlight Reports', path: '/simulator/pm/reporting/highlight-reports', icon: Flag, order: 1 },
      { id: 'sim-pm-report-exception', label: 'Practice Exception Reports', path: '/simulator/pm/reporting/exception-reports', icon: FileWarning, order: 2 },
      { id: 'sim-pm-report-end-stage', label: 'Practice End Stage Report', path: '/simulator/pm/reporting/end-stage-reports', icon: FileClock, order: 3 },
      { id: 'sim-pm-fin-reports', label: 'Financial Reports', path: '/simulator/financial-reports', icon: DollarSign, order: 4 },
    ]
  }
];

export default simulatorPMMenuConfig;
