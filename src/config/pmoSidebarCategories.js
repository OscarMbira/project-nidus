/**
 * PMO sidebar category definitions — presentation grouping for useMenu transforms.
 * @see projectplan/v638_Unified_Sidebar_Menu_Implementation_Plan.md Phase 2.2
 */

/** Nested under "Delivery Management" (not top-level sidebar rows). */
export const DELIVERY_MANAGEMENT_SUB_DEFS = [
  { id: 'pmo-cat-portfolio', label: 'Portfolio', order: 1 },
  { id: 'pmo-cat-programme', label: 'Programme', order: 2 },
  { id: 'pmo-cat-projects', label: 'Projects', order: 3 },
  { id: 'pmo-cat-project-oversight', label: 'Project Oversight', order: 4 },
  { id: 'pmo-cat-delivery-controls', label: 'Delivery Controls', order: 5 },
]

export const PMO_CATEGORY_DEFS = [
  { id: 'pmo-cat-exec', label: 'Executive Overview', order: 1 },
  { id: 'pmo-cat-delivery-management', label: 'Delivery Management', order: 2, isDeliveryManagementParent: true },
  { id: 'pmo-cat-financial-commercial', label: 'Financial & Commercial Management', order: 3 },
  { id: 'pmo-cat-risk-issues-quality', label: 'Risk, Issues & Quality', order: 4 },
  { id: 'pmo-cat-governance-standards', label: 'Governance & Standards', order: 5 },
  { id: 'pmo-cat-initiation', label: 'Initiation & Business Justification', order: 5.5, menuIcon: 'briefcase' },
  { id: 'pmo-cat-process-templates', label: 'Process Templates', order: 5.8, menuIcon: 'layers' },
  { id: 'pmo-cat-reporting-intelligence', label: 'Reporting & Intelligence', order: 6 },
  { id: 'pmo-cat-workflows-approvals', label: 'Workflows & Approvals', order: 7 },
  { id: 'pmo-cat-teams', label: 'Teams', order: 8 },
  { id: 'pmo-cat-stakeholders', label: 'Stakeholders', order: 9 },
  { id: 'pmo-cat-knowledge-assets', label: 'Knowledge & Assets', order: 10 },
  { id: 'pmo-cat-audit-compliance', label: 'Audit Trail & Compliance', order: 11 },
  { id: 'pmo-cat-email-notifications', label: 'Email & Notifications', order: 12 },
  { id: 'pmo-cat-admin', label: 'PMO Administration', order: 13 },
  { id: 'pmo-cat-system-admin', label: 'System Administration', order: 14 },
  { id: 'pmo-cat-help', label: 'Help', order: 15 },
  { id: 'pmo-cat-support', label: 'Support', order: 16 },
]

export const PMO_CATEGORY_FALLBACKS = {
  'pmo-cat-exec': { label: 'PMO Dashboard', path: '/platform/dashboard' },
  'pmo-cat-portfolio': { label: 'Portfolio View', path: '/platform/portfolio' },
  'pmo-cat-programme': { label: 'Programme View', path: '/platform/programme' },
  'pmo-cat-projects': { label: 'My Projects', path: '/platform/projects' },
  'pmo-cat-project-oversight': { label: 'Project Oversight View', path: '/platform/dashboard' },
  'pmo-cat-delivery-controls': { label: 'Delivery Controls View', path: '/platform/dashboard' },
  'pmo-cat-financial-commercial': { label: 'Financial View', path: '/platform/financial-reports' },
  'pmo-cat-risk-issues-quality': { label: 'Risk & Quality View', path: '/pmo/oversight/risk-register' },
  'pmo-cat-governance-standards': { label: 'Governance View', path: '/pmo/governance/mandate' },
  'pmo-cat-initiation': { label: 'Business Cases', path: '/pmo/initiation/business-case' },
  'pmo-cat-process-templates': { label: 'Hub Overview', path: '/pmo/process-templates' },
  'pmo-cat-reporting-intelligence': { label: 'Reporting View', path: '/platform/reports' },
  'pmo-cat-workflows-approvals': { label: 'Pending Approvals', path: '/pmo/forms?status=in_review' },
  'pmo-cat-teams': { label: 'Manager assignments', path: '/platform/pmo-admin/manager-assignments' },
  'pmo-cat-stakeholders': { label: 'Stakeholder Register', path: '/platform/stakeholders/register' },
  'pmo-cat-knowledge-assets': { label: 'Org Knowledge Hub', path: '/platform/org-knowledge' },
  'pmo-cat-audit-compliance': { label: 'Compliance View', path: '/platform/reports' },
  'pmo-cat-email-notifications': { label: 'Email Settings', path: '/platform/admin/email-settings' },
  'pmo-cat-admin': { label: 'Organisation Settings', path: '/platform/pmo-admin/settings' },
  'pmo-cat-system-admin': { label: 'Platform Settings', path: '/platform/settings' },
  'pmo-cat-help': { label: 'Help Centre', path: '/help' },
  'pmo-cat-support': { label: 'Support', path: '/support' },
}
