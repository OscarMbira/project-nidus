/**
 * Simulator PMO Dashboard Sidebar Menu Configuration
 *
 * @deprecated Runtime sidebar uses DB menu_items via useSimMenu + Sidebar.jsx (v641).
 * Use src/config/menuRegistry.js (domain: simulator) as build-time source of truth.
 *
 * Static menu for the Simulator PMO Dashboard (/simulator/pmo/*)
 * Mirrors Platform PMO structure (pmoMenuConfig.js) but for practice/simulation context.
 * Rationalised v659 — sections and items now match Platform PMO 1-to-1.
 * v671 — Practice [S]/[P]/[A] track grouping via useMenu / useSimMenu (Platform–Simulator parity).
 *
 * Sections (order matches Platform PMO):
 * 0.   Dashboard
 * 0.5  Live Simulation          [Simulator-only]
 * 1.   Practice Authorisation & Lifecycle
 * 2.   Practice Delivery Management
 *        → Portfolio, Programme, Projects, Project Oversight
 * 3.   Financial Management
 * 4.   Governance & Standards  (+ EEF sub-group)
 * 5.   Business Justification
 * 6.   Process Templates        (+ Browse / Manage / Agile / New Template)
 * 7.   Planning Intelligence    [added to match Platform]
 * 8.   Process Group Forms
 * 9.   Quality & Testing
 * 10.  Reporting & Assurance    (+ Lessons Report, Sprint Metrics)
 * 11.  Procurement
 * 12.  People & Resources       (fixed URLs)
 * 13.  Email & Notifications    [added to match Platform] (+ Communications sub-group)
 * 14.  Administration           [added to match Platform]
 */

import {
  Play,
  PlayCircle,
  Inbox,
  History,
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
  Layers,
  Map,
  Activity,
  GitBranch,
  FlaskConical,
  Users,
  FolderKanban,
  Clock,
  MailCheck,
  SlidersHorizontal,
  ShieldCheck,
  Send,
  Database,
  Archive,
  RefreshCcw,
  Mail,
  AtSign,
  SearchCode,
  MessageSquare,
  PackageOpen,
  Rocket,
  Workflow,
  Library,
  Upload,
  Plug,
  History,
  Sparkles,
} from 'lucide-react';

const simulatorPMOMenuConfig = [
  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    id: 'sim-pmo-dashboard',
    label: 'Dashboard',
    path: '/simulator/pmo/dashboard',
    icon: LayoutDashboard,
    section: null,
    order: 0,
  },

  // ── Live Simulation (Simulator-only) ─────────────────────────────────────────
  {
    id: 'sim-pmo-live-simulation',
    label: 'Live Simulation',
    path: null,
    icon: Play,
    section: 'Live Simulation',
    order: 0.3,
    children: [
      { id: 'sim-pmo-live-start',   label: 'Start New Run',        path: '/simulator/run/setup',                icon: PlayCircle,    order: 1 },
      { id: 'sim-pmo-live-dash',    label: 'Active Run Dashboard',  path: '/simulator/run/active/dashboard',     icon: LayoutDashboard, order: 2 },
      { id: 'sim-pmo-live-inbox',   label: 'Event Inbox',           path: '/simulator/run/active/inbox',         icon: Inbox,         order: 3 },
      { id: 'sim-pmo-live-evm',     label: 'EVM Dashboard',         path: '/simulator/run/active/evm',           icon: TrendingUp,    order: 4 },
      { id: 'sim-pmo-live-history', label: 'My Run History',        path: '/simulator/runs',                     icon: History,       order: 5 },
    ],
  },

  // ── Practice Authorisation & Lifecycle ───────────────────────────────────────
  {
    id: 'sim-pmo-authorisation',
    label: 'Practice Authorisation',
    path: null,
    icon: ShieldCheck,
    section: 'Practice Authorisation',
    order: 0.5,
    children: [
      { id: 'sim-pmo-auth-queue',             label: 'Authorisation Queue',        path: '/simulator/pmo/authorisation/queue',            icon: Inbox,         order: 1 },
      { id: 'sim-pmo-auth-dashboard',         label: 'Lifecycle Dashboard',        path: '/simulator/pmo/authorisation/dashboard',         icon: BarChart3,     order: 2 },
      { id: 'sim-pmo-auth-configure',         label: 'Configure Lifecycle Rules',  path: '/simulator/pmo/authorisation/configure',         icon: Settings2,     order: 3 },
      { id: 'sim-pmo-auth-chains',            label: 'Approval Chains',            path: '/simulator/pmo/authorisation/chains',            icon: GitBranch,     order: 4 },
      { id: 'sim-pmo-auth-archive-retention', label: 'Archive Retention Rules',    path: '/simulator/pmo/authorisation/archive-retention', icon: Archive,       order: 5 },
      { id: 'sim-pmo-auth-archive',           label: 'Archive Vault',              path: '/simulator/pmo/authorisation/archive',           icon: Database,      order: 6 },
    ],
  },

  // ── Practice Delivery Management ─────────────────────────────────────────────
  // Portfolio
  {
    id: 'sim-pmo-portfolio',
    label: 'Practice Portfolio',
    path: null,
    icon: Briefcase,
    section: 'Practice Portfolio',
    order: 1,
    children: [
      { id: 'sim-pmo-pp-dependencies', label: 'Dependencies',        path: '/simulator/practice-dependencies',      icon: GitBranch,    order: 1 },
      { id: 'sim-pmo-pp-collisions',   label: 'Portfolio Collisions', path: '/simulator/pmo/planning/collisions',    icon: AlertTriangle, order: 2 },
    ],
  },

  // Programme
  {
    id: 'sim-pmo-programme',
    label: 'Practice Programme',
    path: null,
    icon: Layers,
    section: 'Practice Programme',
    order: 2,
    children: [
      { id: 'sim-pmo-pp-programme', label: 'Programme Management', path: '/simulator/practice-programme', icon: Layers,     order: 1 },
      { id: 'sim-pmo-pp-benefits',  label: 'Benefits Management',  path: '/simulator/benefits',           icon: TrendingUp, order: 2 },
    ],
  },

  // Projects
  {
    id: 'sim-pmo-projects',
    label: 'Practice Projects',
    path: null,
    icon: FolderKanban,
    section: 'Practice Projects',
    order: 3,
    children: [
      { id: 'sim-pmo-pp-projects', label: 'All Practice Projects', path: '/simulator/practice-projects', icon: FolderKanban, order: 1 },
      {
        id: 'sim-pmo-pr-releases',
        label: 'Releases',
        path: '/simulator/practice-projects/:projectId/scrum/releases',
        icon: Rocket,
        order: 2,
      },
    ],
  },

  {
    id: 'sim-pmo-agile-lean',
    label: 'Agile & Lean Tools',
    path: null,
    icon: Activity,
    section: 'Agile & Lean Tools',
    order: 3.2,
    children: [
      { id: 'sim-pmo-agile-sos', label: 'Scrum of Scrums', path: '/simulator/practice-projects/:projectId/scrum/scrum-of-scrums', icon: Users, order: 1 },
      { id: 'sim-pmo-agile-vsm', label: 'Value Stream Map', path: '/simulator/practice-projects/:projectId/lean/value-stream-map', icon: GitBranch, order: 2 },
      { id: 'sim-pmo-agile-kaizen', label: 'Kaizen Board', path: '/simulator/practice-projects/:projectId/lean/kaizen', icon: RefreshCcw, order: 3 },
    ],
  },

  // Project Oversight — mirrors Platform PMO including Change Register
  {
    id: 'sim-pmo-oversight',
    label: 'Practice Project Oversight',
    path: null,
    icon: Eye,
    section: 'Practice Project Oversight',
    order: 3.5,
    children: [
      { id: 'sim-pmo-oversight-risk-register',    label: 'Practice Risk Register',    path: '/simulator/pmo/oversight/risk-register',    icon: AlertTriangle, order: 1 },
      { id: 'sim-pmo-oversight-issue-register',   label: 'Practice Issue Register',   path: '/simulator/pmo/oversight/issue-register',   icon: AlertCircle,   order: 2 },
      { id: 'sim-pmo-oversight-quality-register', label: 'Practice Quality Register', path: '/simulator/pmo/oversight/quality-register', icon: ClipboardList, order: 3 },
      { id: 'sim-pmo-oversight-lessons-log',      label: 'Practice Lessons Log',      path: '/simulator/pmo/oversight/lessons-log',      icon: GraduationCap, order: 4 },
      { id: 'sim-pmo-oversight-delays',           label: 'Delay Register',            path: '/simulator/pmo/oversight/delays',           icon: FileClock,     order: 5 },
      { id: 'sim-pmo-oversight-scope',            label: 'Scope Oversight',           path: '/simulator/pmo/oversight/scope',            icon: ClipboardList, order: 6 },
      { id: 'sim-pmo-oversight-schedules',        label: 'Schedule Oversight',        path: '/simulator/pmo/oversight/schedules',        icon: FileClock,     order: 7 },
      { id: 'sim-pmo-oversight-changes',          label: 'Change Register (All)',     path: '/simulator/pmo/registers/changes',          icon: RefreshCcw,    order: 8 },
    ],
  },

  // ── Financial Management ─────────────────────────────────────────────────────
  {
    id: 'sim-pmo-financial',
    label: 'Financial Management',
    path: null,
    icon: DollarSign,
    section: 'Financial Management',
    order: 4,
    children: [
      { id: 'sim-pmo-fin-reports',       label: 'Financial Reports',   path: '/simulator/financial-reports',         icon: BarChart3,      order: 1 },
      { id: 'sim-pmo-fin-portfolio-evm', label: 'Portfolio EVM',       path: '/simulator/practice-portfolio/evm',    icon: TrendingUp,     order: 2 },
      { id: 'sim-pmo-fin-exp-approvals', label: 'Expense Approvals',   path: '/simulator/expenses/approvals',        icon: ClipboardCheck, order: 3 },
      { id: 'sim-pmo-fin-thresholds',    label: 'Expense Thresholds',  path: '/simulator/pmo/expense-thresholds',    icon: SlidersHorizontal, order: 4 },
    ],
  },

  // ── Governance & Standards (+ EEF sub-group) ─────────────────────────────────
  {
    id: 'sim-pmo-governance',
    label: 'Governance & Standards',
    path: null,
    icon: Shield,
    section: 'Governance & Standards',
    order: 5,
    children: [
      {
        id: 'sim-pmo-gov-mandates-section',
        label: 'Project Mandates',
        path: null,
        icon: FileText,
        order: 0.5,
        children: [
          { id: 'sim-pmo-gov-mandates-create', label: 'Create Mandate', path: '/simulator/mandates/create', icon: FilePlus, order: 1 },
          { id: 'sim-pmo-gov-mandates-all', label: 'All Mandates', path: '/simulator/mandates/list', icon: FileText, order: 2 },
        ],
      },
      { id: 'sim-pmo-gov-mandate',                label: 'Practice Project Mandate',                    path: '/simulator/pmo/governance/mandate',                icon: FileText,    order: 1 },
      { id: 'sim-pmo-gov-communication-strategy', label: 'Practice Communication Management Strategy', path: '/simulator/pmo/governance/communication-strategy', icon: Megaphone,   order: 2 },
      { id: 'sim-pmo-gov-configuration-strategy', label: 'Practice Configuration Management Strategy', path: '/simulator/pmo/governance/configuration-strategy', icon: Settings2,   order: 3 },
      { id: 'sim-pmo-gov-quality-strategy',        label: 'Practice Quality Management Strategy',       path: '/simulator/pmo/governance/quality-strategy',       icon: CheckSquare, order: 4 },
      { id: 'sim-pmo-gov-risk-strategy',           label: 'Practice Risk Management Strategy',          path: '/simulator/pmo/governance/risk-strategy',           icon: AlertTriangle, order: 5 },
      { id: 'sim-pmo-gov-itto-templates',          label: 'ITTO Templates',                             path: '/simulator/pmo/itto/templates',                    icon: GitBranch,   order: 6 },
      { id: 'sim-pmo-gov-itto-drafts',             label: 'ITTO Drafts',                                path: '/simulator/pmo/itto/drafts',                       icon: Pause,       order: 7 },
      // Enterprise Environmental Factors sub-group (mirrors Platform PMO)
      { id: 'sim-pmo-gov-eef-list',  label: 'Environment Factors', path: '/simulator/pmo/eef',          icon: PackageOpen, order: 8 },
      { id: 'sim-pmo-gov-eef-new',   label: 'Add EEF',             path: '/simulator/pmo/eef/new',      icon: FilePlus,    order: 9 },
      { id: 'sim-pmo-gov-eef-drafts', label: 'EEF Drafts',         path: '/simulator/pmo/eef/on-hold',  icon: Pause,       order: 10 },
    ],
  },

  // ── Pre-Project Docs ────────────────────────────────────────────
  {
    id: 'sim-pmo-initiation',
    label: 'Pre-Project Docs',
    path: null,
    icon: Briefcase,
    section: 'Pre-Project Docs',
    order: 6,
    children: [
      { id: 'sim-pmo-init-project-mandate',     label: 'Practice Project Mandate',    path: '/simulator/mandates/list',                     icon: FileText,  order: 0 },
      { id: 'sim-pmo-init-business-case',      label: 'Practice Business Case',      path: '/simulator/pmo/initiation/business-case',      icon: Briefcase, order: 1 },
      { id: 'sim-pmo-init-project-brief',      label: 'Practice Project Brief',      path: '/simulator/pmo/initiation/project-brief',      icon: FileText,  order: 2 },
      { id: 'sim-pmo-init-benefits-review-plan', label: 'Practice Benefits Review Plan', path: '/simulator/pmo/initiation/benefits-review-plan', icon: BookOpen, order: 3 },
      {
        id: 'sim-pmo-init-briefs-section',
        label: 'Project Briefs',
        path: null,
        icon: FileText,
        order: 4,
        children: [
          { id: 'sim-pmo-init-briefs-all', label: 'All Briefs', path: '/simulator/practice-briefs', icon: FileText, order: 1 },
        ],
      },
    ],
  },

  {
    id: 'sim-pmo-workflows',
    label: 'Workflows & Approvals',
    path: null,
    icon: Workflow,
    section: 'Workflows & Approvals',
    order: 6.3,
    children: [
      { id: 'sim-pmo-workflows-mandate', label: 'Mandate Approvals', path: '/simulator/mandates/list', icon: FileCheck, order: 1 },
      { id: 'sim-pmo-workflows-brief', label: 'Project Brief Approvals', path: '/simulator/practice-briefs', icon: FileCheck, order: 2 },
    ],
  },

  // ── Process Templates (+ Browse / Manage / Agile / New Template) ─────────────
  {
    id: 'sim-pmo-process-templates',
    label: 'Process Templates',
    path: null,
    icon: Layers,
    section: 'Process Templates',
    order: 7,
    children: [
      { id: 'sim-pmo-pt-hub',            label: 'Hub Overview',              path: '/simulator/pmo/process-templates',                        icon: Layers,    order: 1 },
      { id: 'sim-pmo-pt-pre',            label: 'Pre-Project',               path: '/simulator/pmo/process-templates/pre-project',            icon: FileText,  order: 2 },
      { id: 'sim-pmo-pt-init',           label: 'Initiating',                path: '/simulator/pmo/process-templates/initiating',             icon: Flag,      order: 3 },
      { id: 'sim-pmo-pt-plan',           label: 'Planning',                  path: '/simulator/pmo/process-templates/planning',               icon: Map,       order: 4 },
      { id: 'sim-pmo-pt-exec',           label: 'Executing',                 path: '/simulator/pmo/process-templates/executing',              icon: Activity,  order: 5 },
      { id: 'sim-pmo-pt-mon',            label: 'Monitoring & Controlling',  path: '/simulator/pmo/process-templates/monitoring-controlling', icon: BarChart3, order: 6 },
      { id: 'sim-pmo-pt-close',          label: 'Closing',                   path: '/simulator/pmo/process-templates/closing',                icon: FileCheck, order: 7 },
      { id: 'sim-pmo-pt-delay-templates', label: 'Delay Templates',          path: '/simulator/pmo/delays/templates',                         icon: Layers,    order: 8 },
      { id: 'sim-pmo-pt-browse',         label: 'Browse Templates',          path: '/simulator/pmo/templates/browse',                         icon: Layers,    order: 9 },
      { id: 'sim-pmo-pt-manage',         label: 'Manage Templates',          path: '/simulator/pmo/templates/manage',                         icon: Settings2, order: 9 },
      { id: 'sim-pmo-pt-agile',          label: 'Agile Templates',           path: '/simulator/pmo/templates/agile',                          icon: Activity,  order: 10 },
      { id: 'sim-pmo-pt-new',            label: 'New Template',              path: '/simulator/pmo/templates/new',                            icon: FilePlus,  order: 11 },
    ],
  },

  // ── Planning Intelligence (added to match Platform PMO) ──────────────────────
  {
    id: 'sim-pmo-planning',
    label: 'Planning Intelligence',
    path: null,
    icon: BarChart3,
    section: 'Planning Intelligence',
    order: 7.5,
    children: [
      { id: 'sim-pmo-planning-hub',              label: 'Planning Hub',          path: '/simulator/pmo/planning',                    icon: LayoutDashboard, order: 1 },
      { id: 'sim-pmo-planning-intelligence',     label: 'Intelligence Rules',    path: '/simulator/pmo/planning/intelligence',       icon: SearchCode,      order: 2 },
      { id: 'sim-pmo-planning-governance-config', label: 'Governance Rules Config', path: '/simulator/pmo/planning/governance-config', icon: ShieldCheck,    order: 3 },
    ],
  },

  // ── Process Group Forms ───────────────────────────────────────────────────────
  {
    id: 'sim-pmo-forms',
    label: 'Process Group Forms',
    path: '/simulator/pmo/forms',
    icon: FileText,
    section: 'Process Group Forms',
    order: 8,
    permission: 'form.view_all',
    children: [
      { id: 'sim-pmo-forms-initiating', label: 'Initiating',              path: '/simulator/pmo/forms?group=Initiating',   icon: FileText,    order: 1, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-planning',   label: 'Planning',                path: '/simulator/pmo/forms?group=Planning',     icon: FileText,    order: 2, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-executing',  label: 'Executing',               path: '/simulator/pmo/forms?group=Executing',    icon: FileText,    order: 3, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-monitoring', label: 'Monitoring & Controlling', path: '/simulator/pmo/forms?group=Monitoring',  icon: FileText,    order: 4, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-closing',    label: 'Closing',                 path: '/simulator/pmo/forms?group=Closing',      icon: FileText,    order: 5, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-agile',      label: 'Agile',                   path: '/simulator/pmo/forms?group=Agile',        icon: FileText,    order: 6, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-drafts',     label: 'My Drafts',               path: '/simulator/pmo/forms?status=draft',       icon: FileClock,   order: 7, permission: 'form.view_all' },
      { id: 'sim-pmo-forms-approvals',  label: 'Pending Approvals',       path: '/simulator/pmo/forms?status=in_review',   icon: FileCheck,   order: 8, permission: 'form.approve' },
    ],
  },

  // ── Quality & Testing ─────────────────────────────────────────────────────────
  {
    id: 'sim-pmo-testing-centre',
    label: 'Quality & Testing',
    path: null,
    icon: FlaskConical,
    section: 'Quality & Testing',
    order: 9,
    children: [
      { id: 'sim-pmo-tc-dash',    label: 'Testing Dashboard',    path: '/simulator/pmo/testing-centre',             icon: FlaskConical,  order: 1,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-cases',   label: 'Test Case Library',    path: '/simulator/pmo/testing-centre/cases',       icon: FlaskConical,  order: 2,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-drafts',  label: 'Test Case Drafts',     path: '/simulator/pmo/testing-centre/cases/drafts', icon: FlaskConical, order: 3,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-suites',  label: 'Test Suites',          path: '/simulator/pmo/testing-centre/suites',      icon: FlaskConical,  order: 4,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-runs',    label: 'Test Runs',            path: '/simulator/pmo/testing-centre/runs',        icon: FlaskConical,  order: 5,  permission: 'testing_centre.run' },
      { id: 'sim-pmo-tc-scripts', label: 'Automated Scripts',    path: '/simulator/pmo/testing-centre/scripts',     icon: FlaskConical,  order: 6,  permission: 'testing_centre.configure' },
      { id: 'sim-pmo-tc-evidence',label: 'Screenshot Evidence',  path: '/simulator/pmo/testing-centre/evidence',    icon: FlaskConical,  order: 7,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-diag',    label: 'Diagnostic Centre',    path: '/simulator/pmo/testing-centre/diagnostics', icon: FlaskConical,  order: 8,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-defects', label: 'Defect & Issue Links', path: '/simulator/pmo/testing-centre/defects',     icon: FlaskConical,  order: 9,  permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-data',    label: 'Test Data Manager',    path: '/simulator/pmo/testing-centre/data',        icon: FlaskConical,  order: 10, permission: 'testing_centre.configure' },
      { id: 'sim-pmo-tc-reports', label: 'Reports',              path: '/simulator/pmo/testing-centre/reports',     icon: FlaskConical,  order: 11, permission: 'testing_centre.view' },
      { id: 'sim-pmo-tc-settings',label: 'Settings',             path: '/simulator/pmo/testing-centre/settings',    icon: FlaskConical,  order: 12, permission: 'testing_centre.configure' },
    ],
  },

  // ── Reporting & Assurance (+ Lessons Report and Sprint Metrics) ───────────────
  {
    id: 'sim-pmo-reporting',
    label: 'Reporting & Assurance',
    path: null,
    icon: BarChart3,
    section: 'Reporting & Assurance',
    order: 10,
    children: [
      { id: 'sim-pmo-report-highlight',       label: 'Practice Highlight Reports',  path: '/simulator/pmo/reporting/highlight-reports',  icon: Flag,         order: 1 },
      { id: 'sim-pmo-report-exception',       label: 'Practice Exception Reports',  path: '/simulator/pmo/reporting/exception-reports',  icon: FileWarning,  order: 2 },
      { id: 'sim-pmo-report-end-stage',       label: 'Practice End Stage Reports',  path: '/simulator/pmo/reporting/end-stage-reports',  icon: FileClock,    order: 3 },
      { id: 'sim-pmo-report-end-project',     label: 'Practice End Project Reports', path: '/simulator/pmo/reporting/end-project-reports', icon: FileCheck,  order: 4 },
      { id: 'sim-pmo-report-lessons',         label: 'Practice Lessons Report',     path: '/simulator/pmo/reporting/lessons-report',     icon: GraduationCap, order: 5 },
      { id: 'sim-pmo-report-sprint-metrics',  label: 'Sprint Metrics',              path: '/simulator/pmo/reporting/sprint-metrics',     icon: Activity,     order: 6 },
      { id: 'sim-pmo-report-library',         label: 'Report Library',              path: '/simulator/reports',                          icon: FileText,     order: 7 },
      { id: 'sim-pmo-report-analytics',       label: 'Analytics',                   path: '/simulator/reports/analytics',                icon: BarChart3,    order: 8 },
      { id: 'sim-pmo-report-lean-metrics',    label: 'Lean Metrics',                path: '/simulator/practice-projects/:projectId/lean/metrics', icon: TrendingUp, order: 9 },
      { id: 'sim-pmo-report-agile-metrics',   label: 'Agile Metrics Hub',           path: '/simulator/practice-projects/:projectId/agile/metrics', icon: Activity, order: 10 },
    ],
  },

  {
    id: 'sim-pmo-knowledge-assets',
    label: 'Practice Knowledge & Assets',
    path: null,
    icon: Library,
    section: 'Practice Knowledge & Assets',
    order: 10.5,
    children: [
      { id: 'sim-pmo-knowledge-opa', label: 'Process Assets', path: '/simulator/opa', icon: Library, order: 1 },
      { id: 'sim-pmo-knowledge-opa-new', label: 'Add OPA', path: '/simulator/opa/new', icon: FilePlus, order: 2 },
      { id: 'sim-pmo-knowledge-opa-drafts', label: 'OPA Drafts', path: '/simulator/opa/on-hold', icon: Pause, order: 3 },
      { id: 'sim-pmo-knowledge-opa-bulk', label: 'OPA Bulk upload', path: '/simulator/opa/bulk-upload', icon: Upload, order: 4 },
    ],
  },

  // ── Procurement ───────────────────────────────────────────────────────────────
  {
    id: 'sim-pmo-procurement',
    label: 'Procurement',
    path: null,
    icon: ShoppingCart,
    section: 'Procurement',
    order: 11,
    children: [
      { id: 'sim-pmo-proc-rfp',        label: 'Practice RFP Register', path: '/simulator/pmo/procurement/rfp',  icon: FileSpreadsheet, order: 1 },
      { id: 'sim-pmo-proc-rfp-create', label: 'Load RFP',              path: '/simulator/pmo/rfp/create',      icon: FilePlus,        order: 2 },
      { id: 'sim-pmo-proc-rfp-on-hold', label: 'RFP Drafts',           path: '/simulator/pmo/rfp/on-hold',     icon: Pause,           order: 3 },
    ],
  },

  // ── People & Resources (fixed URLs — no Platform references) ─────────────────
  {
    id: 'sim-pmo-people-resources',
    label: 'People & Resources',
    path: null,
    icon: Users,
    section: 'People & Resources',
    order: 12,
    children: [
      { id: 'sim-pmo-people-manager-assignments', label: 'Manager Assignments',  path: '/simulator/pmo/manager-assignments',          icon: Users,         order: 1 },
      { id: 'sim-pmo-appointment-tracker',        label: 'Appointment Tracker',  path: '/simulator/pmo/appointments',                 icon: ClipboardCheck, order: 2 },
      { id: 'sim-pmo-people-assignment-settings', label: 'Assignment Settings',  path: '/simulator/pmo/manager-assignment-settings',  icon: Settings2,     order: 3 },
      { id: 'sim-pmo-invitation-tracker',         label: 'Invitation Tracker',   path: '/simulator/pmo/invitation-tracker',           icon: MailCheck,     order: 4 },
      { id: 'sim-pmo-people-send-invites',        label: 'Send Invitations',     path: '/simulator/pmo/send-invitations',             icon: Send,          order: 5 },
      { id: 'sim-pmo-people-assign-roles',        label: 'Assign Roles to Projects', path: '/simulator/pmo/manager-assignments',     icon: Shield,        order: 6 },
      { id: 'sim-pmo-people-add-users',           label: 'Add users to project', path: '/simulator/practice-project-members',         icon: Users,         order: 7 },
      { id: 'sim-pmo-people-resource-directory',  label: 'Resource Directory',   path: '/simulator/practice-teams/directory',         icon: Users,         order: 8 },
      { id: 'sim-pmo-people-team-capacity',       label: 'Team Capacity',        path: '/simulator/practice-teams/capacity',          icon: BarChart3,     order: 9 },
    ],
  },

  // ── Email & Notifications (added to match Platform PMO) ──────────────────────
  {
    id: 'sim-pmo-email-notifications',
    label: 'Email & Notifications',
    path: null,
    icon: Mail,
    section: 'Email & Notifications',
    order: 13,
    children: [
      { id: 'sim-pmo-email-settings',             label: 'Email Settings',        path: '/simulator/pmo/admin/email-settings',        icon: Mail,      order: 1, permission: 'pmo.admin' },
      { id: 'sim-pmo-email-sender-profiles',      label: 'Sender Profiles',       path: '/simulator/pmo/admin/email-sender-profiles', icon: AtSign,    order: 2, permission: 'pmo.admin' },
      { id: 'sim-pmo-email-invitation-templates', label: 'Invitation Templates',  path: '/simulator/settings/invitation-templates',   icon: FileText,  order: 3, permission: 'pmo.admin' },
      { id: 'sim-pmo-email-invitation-expiry',    label: 'Invitation Expiry',     path: '/simulator/pmo/admin/invitation-settings',   icon: Clock,     order: 4, permission: 'pmo.admin' },
      // Communications sub-group
      { id: 'sim-pmo-comms-messages',      label: 'Messages',        path: '/simulator/comms/messages',          icon: MessageSquare, order: 5 },
      { id: 'sim-pmo-comms-direct',        label: 'Direct Messages', path: '/simulator/comms/direct',            icon: MessageSquare, order: 6 },
      { id: 'sim-pmo-comms-meetings',      label: 'Meetings',        path: '/simulator/comms/meetings',          icon: ClipboardList, order: 7 },
      { id: 'sim-pmo-comms-pending-ai',    label: 'Pending AI Reviews', path: '/simulator/comms/pending-review', icon: Sparkles,      order: 8 },
    ],
  },

  {
    id: 'sim-pmo-system-admin',
    label: 'System Administration',
    path: null,
    icon: Shield,
    section: 'System Administration',
    order: 13.5,
    children: [
      { id: 'sim-pmo-sys-platform-settings', label: 'Platform Settings', path: '/simulator/pmo/admin/settings', icon: Settings2, order: 1, permission: 'system.admin' },
      { id: 'sim-pmo-sys-pwa-settings', label: 'PWA Settings', path: '/simulator/pwa-settings', icon: Settings2, order: 2, permission: 'system.admin' },
    ],
  },

  // ── Administration (three subsections — match Platform PMO v728) ─────────────
  {
    id: 'sim-pmo-administration',
    label: 'Administration',
    path: null,
    icon: Settings2,
    section: 'Administration',
    order: 14,
    children: [
      {
        id: 'sim-pmo-admin-org-access',
        label: 'Organisation & Access',
        path: null,
        icon: Settings2,
        order: 1,
        children: [
          { id: 'sim-pmo-admin-org-settings', label: 'Organisation Settings', path: '/simulator/pmo/admin/settings', icon: Settings2, order: 1, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-users', label: 'User Management', path: '/simulator/pmo/admin/users', icon: Shield, order: 2, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-role-menu-access', label: 'Role Menu Access', path: '/simulator/pmo/role-menu-access', icon: ShieldCheck, order: 3, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-branding-identity', label: 'Branding & Identity', path: '/simulator/pmo/admin/branding', icon: Sparkles, order: 4, permission: 'system.admin' },
        ],
      },
      {
        id: 'sim-pmo-admin-project-config',
        label: 'Project Configuration',
        path: null,
        icon: Layers,
        order: 2,
        children: [
          { id: 'sim-pmo-admin-project-types', label: 'Project Types', path: '/simulator/pmo/admin/project-types', icon: Layers, order: 1, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-project-statuses', label: 'Project Statuses', path: '/simulator/pmo/admin/project-statuses', icon: Layers, order: 2, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-funding-sources', label: 'Funding Sources', path: '/simulator/pmo/admin/funding-sources', icon: DollarSign, order: 3, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-budget-categories', label: 'Budget Categories', path: '/simulator/pmo/admin/budget-categories', icon: DollarSign, order: 4, permission: 'pmo.admin' },
        ],
      },
      {
        id: 'sim-pmo-admin-extensions',
        label: 'Extensions & Integrations',
        path: null,
        icon: Plug,
        order: 3,
        children: [
          { id: 'sim-pmo-admin-local-data', label: 'Local Data Extensions', path: '/simulator/local-data-extensions', icon: Database, order: 1, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-form-templates', label: 'Form Templates', path: '/simulator/pmo/admin/form-templates', icon: FileText, order: 2, permission: 'pmo.admin' },
          { id: 'sim-pmo-admin-integrations', label: 'Integrations Hub', path: '/simulator/pmo/admin/integrations', icon: Plug, order: 3, permission: 'pmo.admin' },
        ],
      },
    ],
  },
];

export default simulatorPMOMenuConfig;
