/**
 * v671 §5.1.1 pmo_admin — canonical menu leaves and category nesting specs.
 * DB rows merge with these; DB wins on duplicate keys (menu_code / route_path).
 * @see projectplan/v671_Methodology_Aware_Menu_Rationalisation_Plan.md
 */

function shell(partial = {}) {
  return {
    route_path: null,
    is_visible: true,
    is_active: true,
    canUse: true,
    children: [],
    ...partial,
  }
}

const PMO = {
  initiationMandates: [
    shell({ menu_code: 'pmo-init-mandates-all', menu_label: 'All Mandates', route_path: '/platform/mandates/list', menu_icon: 'file-text', sort_order: 1 }),
    shell({ menu_code: 'pmo-init-mandates-create', menu_label: 'Create Mandate', route_path: '/platform/mandates/create', menu_icon: 'file-plus', sort_order: 2 }),
    shell({ menu_code: 'pmo-init-mandates-unlinked', menu_label: 'Unlinked Mandates', route_path: '/platform/mandates/unlinked', menu_icon: 'git-branch', sort_order: 3 }),
  ],
  initiationBriefs: [
    shell({ menu_code: 'pmo-init-briefs-all', menu_label: 'All Briefs', route_path: '/platform/briefs/list', menu_icon: 'file-text', sort_order: 1 }),
    shell({ menu_code: 'pmo-init-briefs-create', menu_label: 'Create Brief', route_path: '/platform/briefs/create', menu_icon: 'file-plus', sort_order: 2 }),
  ],
  initiationBusinessCases: [
    shell({ menu_code: 'pmo-init-business-case', menu_label: 'Business Cases', route_path: '/pmo/initiation/business-case', menu_icon: 'briefcase', sort_order: 1 }),
    shell({ menu_code: 'pmo-init-business-case-create', menu_label: 'Create Business Case', route_path: '/platform/initiation/business-cases/create', menu_icon: 'file-plus', sort_order: 2 }),
  ],
  initiationDocuments: [
    shell({ menu_code: 'pmo-init-benefits-review-plan', menu_label: 'Benefits Review Plans', route_path: '/pmo/initiation/benefits-review-plan', menu_icon: 'book-open', sort_order: 1 }),
    shell({ menu_code: 'pmo-pt-pre', menu_label: 'Pre-Project Templates', route_path: '/pmo/process-templates/pre-project', menu_icon: 'file-text', sort_order: 2 }),
  ],
  governance: [
    shell({ menu_code: 'pmo-gov-communication-strategy', menu_label: 'Communication Strategy', route_path: '/pmo/governance/communication-strategy', menu_icon: 'megaphone', sort_order: 1 }),
    shell({ menu_code: 'pmo-gov-configuration-strategy', menu_label: 'Configuration Strategy', route_path: '/pmo/governance/configuration-strategy', menu_icon: 'settings-2', sort_order: 2 }),
    shell({ menu_code: 'pmo-gov-quality-strategy', menu_label: 'Quality Strategy', route_path: '/pmo/governance/quality-strategy', menu_icon: 'check-square', sort_order: 3 }),
    shell({ menu_code: 'pmo-gov-risk-strategy', menu_label: 'Risk Strategy', route_path: '/pmo/governance/risk-strategy', menu_icon: 'alert-triangle', sort_order: 4 }),
    shell({ menu_code: 'pmo-init-pid', menu_label: 'Project Initiation Documents (PIDs)', route_path: '/platform/initiation/pids', menu_icon: 'file-text', sort_order: 5 }),
    shell({ menu_code: 'pmo-gov-itto-templates', menu_label: 'ITTO Templates / Drafts', route_path: '/platform/itto/templates', menu_icon: 'git-branch', sort_order: 6 }),
    shell({ menu_code: 'pmo-gov-eef-list', menu_label: 'Enterprise Environmental Factors (EEF)', route_path: '/platform/eef', menu_icon: 'package-open', sort_order: 7 }),
    shell({ menu_code: 'pmo-gov-opa-list', menu_label: 'Organisational Process Assets (OPA)', route_path: '/platform/opa', menu_icon: 'library', sort_order: 8 }),
  ],
  standards_based: [
    shell({ menu_code: 'pmo-forms-initiating', menu_label: 'Initiating', route_path: '/pmo/forms?group=Initiating', menu_icon: 'file-text', sort_order: 1 }),
    shell({ menu_code: 'pmo-forms-planning', menu_label: 'Planning', route_path: '/pmo/forms?group=Planning', menu_icon: 'file-text', sort_order: 2 }),
    shell({ menu_code: 'pmo-forms-executing', menu_label: 'Executing', route_path: '/pmo/forms?group=Executing', menu_icon: 'file-text', sort_order: 3 }),
    shell({ menu_code: 'pmo-forms-monitoring', menu_label: 'Monitoring & Controlling', route_path: '/pmo/forms?group=Monitoring', menu_icon: 'file-text', sort_order: 4 }),
    shell({ menu_code: 'pmo-forms-closing', menu_label: 'Closing', route_path: '/pmo/forms?group=Closing', menu_icon: 'file-text', sort_order: 5 }),
    shell({ menu_code: 'pmo-forms-drafts', menu_label: 'Drafts', route_path: '/pmo/forms?status=draft', menu_icon: 'file-clock', sort_order: 6 }),
    shell({ menu_code: 'pmo-forms-approvals', menu_label: 'Approvals', route_path: '/pmo/forms?status=in_review', menu_icon: 'file-check', sort_order: 7 }),
    shell({ menu_code: 'pmo-forms-new-template', menu_label: 'New Template', route_path: '/pmo/forms/new', menu_icon: 'file-plus', sort_order: 8 }),
  ],
  agileTools: [
    shell({ menu_code: 'pmo-agile-scrum-of-scrums', menu_label: 'Scrum of Scrums', route_path: '/platform/projects/:projectId/scrum/scrum-of-scrums', menu_icon: 'users', sort_order: 1 }),
    shell({ menu_code: 'pmo-agile-value-stream', menu_label: 'Value Stream Map', route_path: '/platform/projects/:projectId/lean/value-stream-map', menu_icon: 'git-branch', sort_order: 2 }),
    shell({ menu_code: 'pmo-agile-kaizen', menu_label: 'Kaizen Board', route_path: '/platform/projects/:projectId/lean/kaizen', menu_icon: 'refresh-ccw', sort_order: 3 }),
    shell({ menu_code: 'pmo-pt-agile', menu_label: 'Agile Templates', route_path: '/pmo/process-templates/agile', menu_icon: 'zap', sort_order: 4 }),
  ],
  agileDelivery: [
    shell({ menu_code: 'pmo-agile-story-maps', menu_label: 'Story Maps (cross-project)', route_path: '/platform/projects/story-maps', menu_icon: 'map', sort_order: 1 }),
    shell({ menu_code: 'pmo-agile-releases', menu_label: 'Releases', route_path: '/platform/projects/releases', menu_icon: 'rocket', sort_order: 2 }),
  ],
  agileMetrics: [
    shell({ menu_code: 'pmo-report-sprint-metrics', menu_label: 'Sprint Metrics', route_path: '/platform/projects/:projectId/scrum/metrics', menu_icon: 'activity', sort_order: 1 }),
    shell({ menu_code: 'pmo-report-lean-metrics', menu_label: 'Lean Metrics', route_path: '/platform/projects/:projectId/lean/metrics', menu_icon: 'trending-up', sort_order: 2 }),
  ],
  reportingAssurance: [
    shell({ menu_code: 'pmo-report-highlight', menu_label: 'Highlight Reports', route_path: '/pmo/reporting/highlight-reports', menu_icon: 'flag', sort_order: 1 }),
    shell({ menu_code: 'pmo-report-exception', menu_label: 'Exception Reports', route_path: '/pmo/reporting/exception-reports', menu_icon: 'file-warning', sort_order: 2 }),
    shell({ menu_code: 'pmo-report-end-stage', menu_label: 'End Stage Reports', route_path: '/pmo/reporting/end-stage-reports', menu_icon: 'file-clock', sort_order: 3 }),
    shell({ menu_code: 'pmo-report-end-project', menu_label: 'End Project Reports', route_path: '/pmo/reporting/end-project-reports', menu_icon: 'file-check', sort_order: 4 }),
    shell({ menu_code: 'pmo-report-lessons', menu_label: 'Lessons Reports', route_path: '/pm/closure/lessons-report', menu_icon: 'graduation-cap', sort_order: 5 }),
    shell({ menu_code: 'pmo-report-library', menu_label: 'Report Library', route_path: '/platform/reports', menu_icon: 'file-text', sort_order: 6 }),
    shell({ menu_code: 'pmo-report-analytics', menu_label: 'Analytics Dashboards', route_path: '/platform/reports/analytics', menu_icon: 'bar-chart-3', sort_order: 7 }),
    shell({ menu_code: 'pmo-report-dashboard-builder', menu_label: 'Dashboard Builder', route_path: '/platform/reports/builder', menu_icon: 'layout-dashboard', sort_order: 8 }),
    shell({ menu_code: 'pmo-report-scheduled', menu_label: 'Scheduled Reports', route_path: '/platform/reports/scheduled', menu_icon: 'calendar', sort_order: 9 }),
    shell({ menu_code: 'pmo-report-agile-metrics', menu_label: 'Agile Metrics Hub', route_path: '/platform/projects/:projectId/agile/metrics', menu_icon: 'activity', sort_order: 10 }),
  ],
  financial: [
    shell({ menu_code: 'pmo-fin-reports', menu_label: 'Financial Reports', route_path: '/platform/financial-reports', menu_icon: 'bar-chart-3', sort_order: 1 }),
    shell({ menu_code: 'pmo-fin-portfolio-evm', menu_label: 'Portfolio EVM', route_path: '/platform/portfolio/evm', menu_icon: 'trending-up', sort_order: 2 }),
    shell({ menu_code: 'pmo-fin-programme-evm', menu_label: 'Programme EVM', route_path: '/platform/programme/evm', menu_icon: 'trending-up', sort_order: 3 }),
    shell({ menu_code: 'pmo-fin-project-evm', menu_label: 'Project EVM', route_path: '/platform/projects/evm', menu_icon: 'trending-up', sort_order: 4 }),
    shell({ menu_code: 'pmo-fin-exp-approvals', menu_label: 'Expense Approvals', route_path: '/platform/expenses/approvals', menu_icon: 'clipboard-check', sort_order: 5 }),
    shell({ menu_code: 'pmo-fin-thresholds', menu_label: 'Expense Thresholds', route_path: '/platform/pmo-admin/expense-thresholds', menu_icon: 'settings-2', sort_order: 6 }),
  ],
  workflowsApprovals: [
    shell({ menu_code: 'pmo-workflows-mandate-approvals', menu_label: 'Mandate Approvals', route_path: '/platform/mandates/approvals', menu_icon: 'file-check', sort_order: 1 }),
    shell({ menu_code: 'pmo-workflows-brief-approvals', menu_label: 'Project Brief Approvals', route_path: '/platform/briefs/approvals', menu_icon: 'file-check', sort_order: 2 }),
  ],
  authorisation: [
    shell({ menu_code: 'pmo-auth-queue', menu_label: 'Authorisation Queue', route_path: '/pmo/authorisation/queue', menu_icon: 'clipboard-check', sort_order: 1 }),
    shell({ menu_code: 'pmo-auth-dashboard', menu_label: 'Lifecycle Dashboard', route_path: '/pmo/authorisation/dashboard', menu_icon: 'bar-chart-3', sort_order: 2 }),
    shell({ menu_code: 'pmo-auth-configure', menu_label: 'Configure Rules', route_path: '/pmo/authorisation/configure', menu_icon: 'settings-2', sort_order: 3 }),
    shell({ menu_code: 'pmo-auth-chains', menu_label: 'Approval Chains', route_path: '/pmo/authorisation/chains', menu_icon: 'git-branch', sort_order: 4 }),
    shell({ menu_code: 'pmo-auth-archive-retention', menu_label: 'Archive Retention', route_path: '/pmo/authorisation/archive-retention', menu_icon: 'file-clock', sort_order: 5 }),
    shell({ menu_code: 'pmo-auth-archive', menu_label: 'Archive Vault', route_path: '/pmo/authorisation/archive', menu_icon: 'file-spreadsheet', sort_order: 6 }),
  ],
  qualityTesting: [
    shell({ menu_code: 'pmo-tc-dash', menu_label: 'Quality & Testing', route_path: '/pmo/testing-centre', menu_icon: 'flask-conical', sort_order: 1 }),
  ],
  processTemplateLibrary: [
    shell({ menu_code: 'pmo-pt-hub', menu_label: 'Template Hub', route_path: '/pmo/process-templates', menu_icon: 'layers', sort_order: 1 }),
    shell({ menu_code: 'pmo-pt-browse', menu_label: 'Browse Templates', route_path: '/platform/templates', menu_icon: 'layers', sort_order: 2 }),
    shell({ menu_code: 'pmo-pt-manage', menu_label: 'Manage Templates', route_path: '/platform/templates/manage', menu_icon: 'settings-2', sort_order: 3 }),
    shell({ menu_code: 'pmo-pt-new', menu_label: 'New Template', route_path: '/platform/templates/new', menu_icon: 'file-plus', sort_order: 4 }),
    shell({ menu_code: 'pmo-industry-templates', menu_label: 'Industry Templates', route_path: '/pmo/industry-templates', menu_icon: 'layers', sort_order: 5 }),
    shell({ menu_code: 'pmo-pt-delay-templates', menu_label: 'Delay Templates', route_path: '/pmo/delays/templates', menu_icon: 'layers', sort_order: 6 }),
  ],
  knowledge: [
    shell({ menu_code: 'pmo-knowledge-hub', menu_label: 'Org Knowledge Hub', route_path: '/platform/org-knowledge', menu_icon: 'book-open', sort_order: 1 }),
    shell({ menu_code: 'pmo-knowledge-opa-new', menu_label: 'Add OPA', route_path: '/platform/opa/new', menu_icon: 'file-plus', sort_order: 2 }),
    shell({ menu_code: 'pmo-knowledge-opa-drafts', menu_label: 'OPA Drafts', route_path: '/platform/opa/on-hold', menu_icon: 'pause', sort_order: 3 }),
    shell({ menu_code: 'pmo-knowledge-opa-bulk', menu_label: 'OPA Bulk Upload', route_path: '/platform/opa/bulk-upload', menu_icon: 'upload', sort_order: 4 }),
  ],
  procurement: [
    shell({ menu_code: 'pmo-proc-rfp', menu_label: 'RFP Register', route_path: '/pmo/procurement/rfp', menu_icon: 'file-spreadsheet', sort_order: 1 }),
    shell({ menu_code: 'pmo-proc-rfp-create', menu_label: 'Load RFP', route_path: '/pmo/rfp/create', menu_icon: 'file-plus', sort_order: 2 }),
    shell({ menu_code: 'pmo-proc-rfp-on-hold', menu_label: 'RFP Drafts', route_path: '/pmo/rfp/on-hold', menu_icon: 'pause', sort_order: 3 }),
  ],
  strategyOkr: [
    shell({ menu_code: 'pmo-okr-dashboard', menu_label: 'OKR Dashboard', route_path: '/pmo/okr', menu_icon: 'target', sort_order: 1 }),
    shell({ menu_code: 'pmo-okr-objectives', menu_label: 'Objectives & Key Results', route_path: '/pmo/okr/objectives', menu_icon: 'list', sort_order: 2 }),
    shell({ menu_code: 'pmo-okr-alignment', menu_label: 'Alignment Map', route_path: '/pmo/okr/alignment', menu_icon: 'git-branch', sort_order: 3 }),
    shell({ menu_code: 'pmo-okr-checkins', menu_label: 'OKR Check-ins', route_path: '/pmo/okr/checkins', menu_icon: 'calendar-check', sort_order: 4 }),
    shell({ menu_code: 'pmo-strategy-portfolio-map', menu_label: 'Portfolio Map', route_path: '/pmo/strategy/portfolio-map', menu_icon: 'map', sort_order: 5 }),
  ],
  collaboration: [
    shell({ menu_code: 'pmo-whiteboard', menu_label: 'Whiteboard', route_path: '/pmo/collaboration/whiteboard', menu_icon: 'pen-tool', sort_order: 1 }),
  ],
  notificationPreferences: [
    shell({ menu_code: 'pmo-notification-preferences', menu_label: 'Notification Preferences', route_path: '/platform/settings/notifications', menu_icon: 'bell', sort_order: 1 }),
  ],
  people: [
    shell({ menu_code: 'pmo-people-manager-assignments', menu_label: 'Manager Assignments', route_path: '/platform/pmo-admin/manager-assignments', menu_icon: 'users', sort_order: 1 }),
    shell({ menu_code: 'pmo-people-appointment-tracker', menu_label: 'Appointment Tracker', route_path: '/platform/pmo-admin/appointments', menu_icon: 'clipboard-check', sort_order: 2 }),
    shell({ menu_code: 'pmo-people-assignment-settings', menu_label: 'Assignment Settings', route_path: '/platform/pmo-admin/manager-assignment-settings', menu_icon: 'settings-2', sort_order: 3 }),
    shell({ menu_code: 'pmo-people-invitation-tracker', menu_label: 'Invitation Tracker', route_path: '/platform/admin/invitation-tracker', menu_icon: 'mail-check', sort_order: 4 }),
    shell({ menu_code: 'pmo-people-send-invites', menu_label: 'Send Invitations', route_path: '/platform/admin/send-role-invites', menu_icon: 'send', sort_order: 5 }),
    shell({ menu_code: 'pmo-people-assign-roles', menu_label: 'Assign Roles', route_path: '/platform/admin/assign-roles-to-projects', menu_icon: 'shield', sort_order: 6 }),
    shell({ menu_code: 'pmo-people-add-users', menu_label: 'Add Users', route_path: '/platform/project-members', menu_icon: 'users', sort_order: 7 }),
    shell({ menu_code: 'pmo-people-resource-directory', menu_label: 'Resource Directory', route_path: '/platform/teams/directory', menu_icon: 'users', sort_order: 8 }),
    shell({ menu_code: 'pmo-people-team-capacity', menu_label: 'Team Capacity', route_path: '/platform/teams/capacity', menu_icon: 'bar-chart-3', sort_order: 9 }),
  ],
  stakeholders: [
    shell({ menu_code: 'pmo-stakeholder-register', menu_label: 'Stakeholders (cross-project view)', route_path: '/platform/stakeholders/register', menu_icon: 'users', sort_order: 1 }),
  ],
  email: [
    shell({ menu_code: 'pmo-email-settings', menu_label: 'Email Settings', route_path: '/platform/admin/email-settings', menu_icon: 'mail', sort_order: 1 }),
    shell({ menu_code: 'pmo-email-sender-profiles', menu_label: 'Sender Profiles', route_path: '/platform/admin/email-sender-profiles', menu_icon: 'at-sign', sort_order: 2 }),
    shell({ menu_code: 'pmo-email-invitation-templates', menu_label: 'Invitation Templates', route_path: '/app/settings/invitation-templates', menu_icon: 'file-text', sort_order: 3 }),
    shell({ menu_code: 'pmo-email-invitation-expiry', menu_label: 'Invitation Expiry', route_path: '/platform/admin/invitation-settings', menu_icon: 'clock', sort_order: 4 }),
    shell({ menu_code: 'pmo-comms-messages', menu_label: 'Messages', route_path: '/platform/comms/messages', menu_icon: 'mail', sort_order: 5 }),
    shell({ menu_code: 'pmo-comms-direct', menu_label: 'Direct Messages', route_path: '/platform/comms/direct', menu_icon: 'mail', sort_order: 6 }),
    shell({ menu_code: 'pmo-comms-meetings', menu_label: 'Meetings', route_path: '/platform/comms/meetings', menu_icon: 'clipboard-list', sort_order: 7 }),
    shell({ menu_code: 'pmo-comms-pending-ai', menu_label: 'Pending AI Reviews', route_path: '/platform/comms/pending-review', menu_icon: 'sparkles', sort_order: 8 }),
  ],
  adminOrgAccess: [
    shell({ menu_code: 'pmo-admin-org-settings', menu_label: 'Organisation Settings', route_path: '/platform/pmo-admin/settings', menu_icon: 'settings-2', sort_order: 1 }),
    shell({ menu_code: 'pmo-admin-users', menu_label: 'User Management', route_path: '/platform/pmo-admin/users', menu_icon: 'shield', sort_order: 2 }),
    shell({ menu_code: 'pmo-admin-role-menu-access', menu_label: 'Role Menu Access', route_path: '/platform/pmo/role-menu-access', menu_icon: 'shield-check', sort_order: 3 }),
    shell({ menu_code: 'pmo-admin-branding-identity', menu_label: 'Branding & Identity', route_path: '/platform/organisation/branding', menu_icon: 'sparkles', sort_order: 4 }),
  ],
  accountSubscription: [
    shell({ menu_code: 'plat_acct_current_plan', menu_label: 'Current Plan', route_path: '/platform/subscription', menu_icon: 'credit-card', sort_order: 1 }),
    shell({ menu_code: 'plat_acct_upgrade', menu_label: 'Upgrade / Downgrade', route_path: '/platform/subscription/upgrade', menu_icon: 'arrow-up-circle', sort_order: 2 }),
    shell({ menu_code: 'plat_acct_billing', menu_label: 'Billing History', route_path: '/platform/subscription/billing-history', menu_icon: 'file-text', sort_order: 3 }),
    shell({ menu_code: 'plat_acct_payment', menu_label: 'Payment Methods', route_path: '/platform/subscription/payment-methods', menu_icon: 'credit-card', sort_order: 4 }),
    shell({ menu_code: 'plat_acct_org_profile', menu_label: 'Organisation Profile', route_path: '/platform/organisation/profile', menu_icon: 'building', sort_order: 5 }),
    shell({ menu_code: 'plat_acct_branding', menu_label: 'Branding & Identity', route_path: '/platform/organisation/branding', menu_icon: 'image', sort_order: 6 }),
    shell({ menu_code: 'plat_acct_domain', menu_label: 'Domain Settings', route_path: '/platform/organisation/domain-settings', menu_icon: 'globe', sort_order: 7 }),
  ],
  adminProjectConfig: [
    shell({ menu_code: 'pmo-admin-project-types', menu_label: 'Project Types', route_path: '/platform/pmo-admin/project-types', menu_icon: 'layers', sort_order: 1 }),
    shell({ menu_code: 'pmo-admin-project-statuses', menu_label: 'Project Statuses', route_path: '/platform/pmo-admin/project-statuses', menu_icon: 'layers', sort_order: 2 }),
    shell({ menu_code: 'pmo-admin-funding-sources', menu_label: 'Funding Sources', route_path: '/platform/pmo-admin/funding-sources', menu_icon: 'dollar-sign', sort_order: 3 }),
    shell({ menu_code: 'pmo-admin-budget-categories', menu_label: 'Budget Categories', route_path: '/platform/pmo-admin/budget-categories', menu_icon: 'dollar-sign', sort_order: 4 }),
  ],
  adminExtensions: [
    shell({ menu_code: 'pmo-admin-local-data-extensions', menu_label: 'Local Data Extensions', route_path: '/app/local-data-extensions', menu_icon: 'database', sort_order: 1 }),
    shell({ menu_code: 'pmo-admin-form-templates', menu_label: 'Form Templates', route_path: '/platform/admin/form-templates', menu_icon: 'file-text', sort_order: 2 }),
    shell({ menu_code: 'pmo-admin-integrations', menu_label: 'Integrations', route_path: '/pmo/admin/integrations', menu_icon: 'plug', sort_order: 3 }),
  ],
  systemAdmin: [
    shell({ menu_code: 'pmo-sys-platform-settings', menu_label: 'Platform Settings', route_path: '/platform/settings', menu_icon: 'settings-2', sort_order: 1 }),
    shell({ menu_code: 'pmo-sys-pwa-settings', menu_label: 'PWA Settings', route_path: '/platform/pwa-settings', menu_icon: 'settings-2', sort_order: 2 }),
    shell({ menu_code: 'pmo-sys-authentication', menu_label: 'Authentication Settings', route_path: '/platform/settings/authentication', menu_icon: 'shield', sort_order: 3 }),
    shell({ menu_code: 'pmo-sys-encryption', menu_label: 'Encryption & Security', route_path: '/platform/settings/encryption', menu_icon: 'shield', sort_order: 4 }),
    shell({ menu_code: 'pmo-sys-gdpr', menu_label: 'GDPR Compliance', route_path: '/platform/settings/gdpr', menu_icon: 'shield-check', sort_order: 5 }),
    shell({ menu_code: 'pmo-sys-roles', menu_label: 'Roles & Permissions', route_path: '/platform/settings/roles-permissions', menu_icon: 'shield-check', sort_order: 6 }),
    shell({ menu_code: 'pmo-sys-help', menu_label: 'Help Content Management', route_path: '/platform/admin/help-content', menu_icon: 'book-open', sort_order: 7 }),
    shell({ menu_code: 'pmo-sys-feedback', menu_label: 'Feedback Analysis', route_path: '/platform/admin/feedback', menu_icon: 'message-square', sort_order: 8 }),
    shell({ menu_code: 'pmo-sys-monitoring', menu_label: 'Monitoring Dashboard', route_path: '/platform/admin/monitoring', menu_icon: 'activity', sort_order: 9 }),
  ],
}

export function getV671CanonicalLeaves(bucketKey, layout = 'pmo') {
  if (layout !== 'pmo') return PMO[bucketKey] || []
  return PMO[bucketKey] || []
}

/** @typedef {{ label: string, menuCode: string, icon: string, sortOrder: number, canonicalKey: string, match: (node: object) => boolean, orderPatterns?: RegExp[] }} V671SubsectionDef */

/** @type {Record<string, { mode: 'flat', canonicalKey: string, match: (n: object) => boolean, orderPatterns?: RegExp[] } | { mode: 'subsections', subsections: V671SubsectionDef[] }>>} */
export const V671_CATEGORY_NESTING = {
  'pmo-cat-initiation': {
    mode: 'subsections',
    keepOrphansAtRoot: true,
    orphanCanonicalKey: 'initiationDocuments',
    orphanMatch: matchInitiationDocumentsLeaf,
    orphanOrderPatterns: [/benefits review/i, /pre-project/i],
    subsections: [
      {
        label: 'Project Mandates',
        menuCode: 'pmo-v671-init-mandates',
        icon: 'file-text',
        sortOrder: 1,
        canonicalKey: 'initiationMandates',
        match: matchInitiationMandatesLeaf,
        orderPatterns: [/all mandates/i, /create mandate/i, /unlinked mandates/i],
      },
      {
        label: 'Project Briefs',
        menuCode: 'pmo-v671-init-briefs',
        icon: 'file-text',
        sortOrder: 2,
        canonicalKey: 'initiationBriefs',
        match: matchInitiationBriefsLeaf,
        orderPatterns: [/all briefs/i, /create brief/i],
      },
      {
        label: 'Business Cases',
        menuCode: 'pmo-v671-init-business-cases',
        icon: 'briefcase',
        sortOrder: 3,
        canonicalKey: 'initiationBusinessCases',
        match: matchInitiationBusinessCasesLeaf,
        orderPatterns: [/business cases/i, /create business case/i],
      },
    ],
  },
  'pmo-cat-governance-standards': {
    mode: 'flat',
    canonicalKey: 'governance',
    match: matchGovernanceLeaf,
    orderPatterns: [
      /^communication strategy$/i,
      /^configuration strategy$/i,
      /^quality strategy$/i,
      /^risk strategy$/i,
      /communication management strategy|communication mgmt strategy/i,
      /configuration management strategy|configuration mgmt strategy/i,
      /quality management strategy|quality mgmt strategy/i,
      /risk management strategy|risk mgmt strategy/i,
      /project initiation documents|\(pids\)/i,
      /itto templates \/ drafts|itto template|itto draft/i,
      /enterprise environmental/i,
      /organisational process assets|\(opa\)/i,
    ],
  },
  'pmo-cat-standards-based': {
    mode: 'flat',
    canonicalKey: 'standards_based',
    match: matchStandardsBasedLeaf,
  },
  'pmo-cat-agile-lean': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Agile & Lean Tools',
        menuCode: 'pmo-v671-agile-tools',
        icon: 'activity',
        sortOrder: 1,
        canonicalKey: 'agileTools',
        match: matchAgileToolsLeaf,
      },
      {
        label: 'Agile Delivery',
        menuCode: 'pmo-v671-agile-delivery',
        icon: 'map',
        sortOrder: 2,
        canonicalKey: 'agileDelivery',
        match: matchAgileDeliveryLeaf,
      },
      {
        label: 'Agile Metrics',
        menuCode: 'pmo-v671-agile-metrics',
        icon: 'bar-chart-3',
        sortOrder: 3,
        canonicalKey: 'agileMetrics',
        match: matchAgileMetricsLeaf,
      },
    ],
  },
  'pmo-cat-reporting-intelligence': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Reporting & Assurance',
        menuCode: 'pmo-v671-reporting',
        icon: 'bar-chart-3',
        sortOrder: 1,
        canonicalKey: 'reportingAssurance',
        match: matchReportingAssuranceLeaf,
      },
      {
        label: 'Financial Management',
        menuCode: 'pmo-v671-financial',
        icon: 'dollar-sign',
        sortOrder: 2,
        canonicalKey: 'financial',
        match: matchFinancialLeaf,
      },
    ],
  },
  'pmo-cat-workflows-approvals': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Workflows & Approvals',
        menuCode: 'pmo-v671-workflows',
        icon: 'workflow',
        sortOrder: 1,
        canonicalKey: 'workflowsApprovals',
        match: matchWorkflowsApprovalsLeaf,
      },
      {
        label: 'Authorisation & Lifecycle',
        menuCode: 'pmo-v671-authorisation',
        icon: 'shield-check',
        sortOrder: 2,
        canonicalKey: 'authorisation',
        match: matchAuthorisationLeaf,
      },
      {
        label: 'Quality & Testing',
        menuCode: 'pmo-v671-quality-testing',
        icon: 'flask-conical',
        sortOrder: 3,
        canonicalKey: 'qualityTesting',
        match: matchQualityTestingLeaf,
      },
    ],
  },
  'pmo-cat-knowledge-assets': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Knowledge & Assets',
        menuCode: 'pmo-v671-knowledge',
        icon: 'library',
        sortOrder: 1,
        canonicalKey: 'knowledge',
        match: matchKnowledgeLeaf,
      },
      {
        label: 'Template Library',
        menuCode: 'pmo-v671-template-library',
        icon: 'layers',
        sortOrder: 2,
        canonicalKey: 'processTemplateLibrary',
        match: matchProcessTemplateLibraryLeaf,
      },
      {
        label: 'Strategy & OKRs',
        menuCode: 'pmo-v671-strategy-okr',
        icon: 'target',
        sortOrder: 3,
        canonicalKey: 'strategyOkr',
        match: matchStrategyOkrLeaf,
      },
      {
        label: 'Procurement',
        menuCode: 'pmo-v671-procurement',
        icon: 'shopping-cart',
        sortOrder: 4,
        canonicalKey: 'procurement',
        match: matchProcurementLeaf,
      },
      {
        label: 'Collaboration',
        menuCode: 'pmo-v671-collaboration',
        icon: 'pen-tool',
        sortOrder: 5,
        canonicalKey: 'collaboration',
        match: matchCollaborationLeaf,
      },
    ],
  },
  'pmo-cat-teams': {
    mode: 'flat',
    canonicalKey: 'people',
    match: matchPeopleLeaf,
  },
  'pmo-cat-stakeholders': {
    mode: 'flat',
    canonicalKey: 'stakeholders',
    match: matchStakeholdersLeaf,
  },
  'pmo-cat-email-notifications': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Email & Notifications',
        menuCode: 'pmo-v671-email',
        icon: 'mail',
        sortOrder: 1,
        canonicalKey: 'email',
        match: matchEmailLeaf,
      },
      {
        label: 'Notification Preferences',
        menuCode: 'pmo-v671-notification-prefs',
        icon: 'bell',
        sortOrder: 2,
        canonicalKey: 'notificationPreferences',
        match: matchNotificationPreferencesLeaf,
      },
    ],
  },
  'pmo-cat-admin': {
    mode: 'subsections',
    subsections: [
      {
        label: 'Organisation & Access',
        menuCode: 'pmo-v671-admin-org-access',
        icon: 'building-2',
        sortOrder: 1,
        canonicalKey: 'adminOrgAccess',
        match: matchAdminOrgAccessLeaf,
      },
      {
        label: 'Project Configuration',
        menuCode: 'pmo-v671-admin-project-config',
        icon: 'layers',
        sortOrder: 2,
        canonicalKey: 'adminProjectConfig',
        match: matchAdminProjectConfigLeaf,
      },
      {
        label: 'Extensions & Integrations',
        menuCode: 'pmo-v671-admin-extensions',
        icon: 'plug',
        sortOrder: 3,
        canonicalKey: 'adminExtensions',
        match: matchAdminExtensionsLeaf,
      },
    ],
  },
  'pmo-cat-system-admin': {
    mode: 'flat',
    canonicalKey: 'systemAdmin',
    match: matchSystemAdminLeaf,
  },
}

export const V671_TRACK_CATEGORY_CODES = new Set([
  'pmo-cat-initiation',
  'pmo-cat-governance-standards',
  'pmo-cat-standards-based',
  'pmo-cat-agile-lean',
])

function signal(node = {}) {
  const code = String(node?.menu_code || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const path = String(node?.route_path || '').toLowerCase()
  return `${code} ${label} ${path}`
}

export function matchInitiationLeaf(node) {
  const s = signal(node)
  if (/governance\/|itto|communication management strategy/.test(s)) return false
  return (
    (matchInitiationMandatesLeaf(node) ||
      matchInitiationBriefsLeaf(node) ||
      matchInitiationBusinessCasesLeaf(node) ||
      matchInitiationDocumentsLeaf(node)) &&
    !/pending approval|authorisation/.test(s)
  )
}

export function matchInitiationMandatesLeaf(node) {
  const s = signal(node)
  return /mandate/.test(s) && !/pending approval|authorisation|brief pending/.test(s)
}

export function matchInitiationBriefsLeaf(node) {
  const s = signal(node)
  return /brief/.test(s) && !/business case|pending approval|authorisation|mandate/.test(s)
}

export function matchInitiationBusinessCasesLeaf(node) {
  const s = signal(node)
  return /business case/.test(s) && !/pending approval|authorisation/.test(s)
}

export function matchInitiationDocumentsLeaf(node) {
  const s = signal(node)
  if (/business case|mandate|brief|pid|project initiation document/.test(s)) return false
  return /benefits review|pre-project|pre project|process-templates\/pre-project/.test(s)
}

export function matchGovernanceLeaf(node) {
  const s = signal(node)
  if (/pid|project initiation document|\(pids\)/i.test(s) && !/brief|mandate|business case/.test(s)) return true
  if (
    /organisational process assets|\(opa\)|\/platform\/opa(?:\/?$|\?)/.test(s) &&
    !/\/platform\/opa\/(new|on-hold|bulk-upload)/.test(s) &&
    !/add opa|opa draft|opa bulk/.test(s)
  ) {
    return true
  }
  return (
    /communication strategy|configuration strategy|quality strategy|risk strategy|communication management strategy|configuration management strategy|quality management strategy|risk management strategy|communication mgmt strategy|configuration mgmt strategy|quality mgmt strategy|risk mgmt strategy|itto template|itto draft|\/eef|enterprise environmental/.test(
      s
    ) && !/\/initiation\//.test(s)
  )
}

export function matchStandardsBasedLeaf(node) {
  const s = signal(node)
  return (
    (/\/pmo\/forms\?group=/.test(s) && !/group=agile/i.test(s)) ||
    /process group forms/.test(s) ||
    (/\/pmo\/forms\?group=(initiating|planning|executing|monitoring|closing)/i.test(s))
  ) && !/forms\?status=|mandate pending|brief pending/.test(s)
}

export function matchAgileToolsLeaf(node) {
  const s = signal(node)
  return (
    (/scrum-of-scrums|value stream|kaizen/.test(s) || /agile template|process-templates\/agile|plat_pt_agile|pmo_pt_agile/.test(s)) &&
    !/story map|releases|metrics|sprint metrics|lean metrics/.test(s)
  )
}

export function matchAgileDeliveryLeaf(node) {
  const s = signal(node)
  return /story map|releases/.test(s) && !/scrum-of-scrums|value-stream|kaizen/.test(s)
}

export function matchAgileMetricsLeaf(node) {
  const s = signal(node)
  return /sprint metrics|lean metrics|agile metrics hub/.test(s)
}

export function matchReportingAssuranceLeaf(node) {
  const s = signal(node)
  if (/financial|expense|portfolio evm|\/financial-reports/.test(s)) return false
  return /highlight report|exception report|end stage|end project|lessons report|report library|analytics|dashboard builder|scheduled report|agile metrics hub/.test(
    s
  )
}

export function matchFinancialLeaf(node) {
  const s = signal(node)
  return /financial report|portfolio evm|programme evm|project evm|\/portfolio\/evm|\/programme\/evm|\/projects\/evm|expense approval|expense threshold|\/financial/.test(
    s
  )
}

export function matchWorkflowsApprovalsLeaf(node) {
  const s = signal(node)
  return /mandate approvals|project brief approvals|mandate pending|brief pending|pending approval/.test(s) && !/authorisation queue|lifecycle|archive vault/.test(s)
}

export function matchAuthorisationLeaf(node) {
  const s = signal(node)
  return /authorisation|lifecycle dashboard|approval chains|archive retention|archive vault|configure lifecycle/.test(s)
}

export function matchQualityTestingLeaf(node) {
  const s = signal(node)
  return /testing-centre|testing centre|quality & testing|test case|test suite|flask-conical/.test(s)
}

export function matchProcessTemplateLibraryLeaf(node) {
  const s = signal(node)
  if (
    /\/process-templates\/(initiating|planning|executing|monitoring|closing|pre-project|agile)|process-templates\/monitoring-controlling/.test(
      s
    )
  ) {
    return false
  }
  if (/agile template|plat_pt_agile|pmo_pt_agile/.test(s)) return false
  return /process-templates|process templates|industry-templates|\/platform\/templates|delay template|delays\/templates|delay_templates|pmo_pt_delay|plat_pt_delay|plat_pt_hub|plat_xf_process/.test(
    s
  )
}

/** @deprecated Use matchProcessTemplateLibraryLeaf — retained for legacy tests and DB orphan routing. */
export function matchProcessTemplatesLeaf(node) {
  return matchProcessTemplateLibraryLeaf(node)
}

export function matchKnowledgeLeaf(node) {
  const s = signal(node)
  if (
    /organisational process assets|\(opa\)/.test(s) &&
    !/add opa|opa draft|opa bulk|\/opa\/(new|on-hold|bulk-upload)/.test(s)
  ) {
    return false
  }
  return (
    (/org-knowledge|org knowledge/.test(s) ||
      (/\/platform\/opa/.test(s) && /\/opa\/(new|on-hold|bulk-upload)/.test(s))) &&
    !/procurement|rfp|industry template|process-templates|process templates/.test(s)
  )
}

export function matchProcurementLeaf(node) {
  const s = signal(node)
  return /procurement|rfp register|load rfp|rfp draft/.test(s)
}

export function matchStrategyOkrLeaf(node) {
  const s = signal(node)
  return (
    /\/pmo\/okr|\/platform\/okr|objectives.*key results|okr check-in|alignment map|portfolio map|strategy.*okr/.test(
      s
    ) && !/communication management strategy|risk management strategy/.test(s)
  )
}

export function matchCollaborationLeaf(node) {
  const s = signal(node)
  return /whiteboard|\/pmo\/collaboration|planning.poker/.test(s)
}

export function matchNotificationPreferencesLeaf(node) {
  const s = signal(node)
  return /notification preference|\/settings\/notifications/.test(s)
}

export function matchPeopleLeaf(node) {
  const s = signal(node)
  return (
    /manager assignment|appointment tracker|assignment settings|invitation tracker|send invitation|assign roles|add users|resource directory|team capacity|people.resource|project.members/.test(
      s
    ) && !/stakeholder register/.test(s)
  )
}

export function matchStakeholdersLeaf(node) {
  return /stakeholder/.test(signal(node))
}

export function matchEmailLeaf(node) {
  const s = signal(node)
  return (
    /email settings|sender profile|invitation template|invitation expiry|pending ai review|\/comms\/|comms\/messages|comms\/direct|comms\/meetings|comms\/pending/.test(
      s
    ) && !/notification preference/.test(s)
  )
}

export function matchAdminOrgAccessLeaf(node) {
  const s = signal(node)
  return (
    /organisation settings|user management|role menu access|branding/.test(s) &&
    !/subscription|current plan|billing history|payment methods|platform settings|pwa settings|authentication settings|gdpr|roles & permissions/.test(s)
  )
}

export function matchAccountSubscriptionLeaf(node) {
  const s = signal(node)
  return (
    /plat_acct_|account & subscription|subscription & billing|current plan|upgrade \/ downgrade|billing history|payment methods|domain settings/.test(s) &&
    /\/platform\/subscription|\/platform\/organisation\/(profile|domain-settings)/.test(s)
  )
}

export function matchAdminProjectConfigLeaf(node) {
  const s = signal(node)
  return /project types|project statuses|funding source|budget categor/.test(s)
}

export function matchAdminExtensionsLeaf(node) {
  const s = signal(node)
  return (
    /local.data.extension|form template|integrations/.test(s) &&
    !/platform settings|help content|feedback analysis/.test(s)
  )
}

/** @deprecated Use subsection matchers — union of all Administration leaves */
export function matchAdminLeaf(node) {
  return matchAdminOrgAccessLeaf(node) || matchAdminProjectConfigLeaf(node) || matchAdminExtensionsLeaf(node)
}

export function matchSystemAdminLeaf(node) {
  const s = signal(node)
  return /platform settings|pwa settings|authentication|encryption|gdpr|roles & permissions|help content|feedback analysis|monitoring dashboard/.test(
    s
  )
}
