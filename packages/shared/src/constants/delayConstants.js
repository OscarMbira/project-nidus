/** v353 — Project delay register */

export const DELAY_CATEGORIES = [
  { value: 'weather', label: 'Weather / natural event' },
  { value: 'resource', label: 'Resource unavailability' },
  { value: 'technical', label: 'Technical / system' },
  { value: 'external_dependency', label: 'External vendor or partner' },
  { value: 'change_request', label: 'Approved change' },
  { value: 'regulatory', label: 'Regulatory / compliance' },
  { value: 'financial', label: 'Budget or funding' },
  { value: 'risk_materialised', label: 'Risk materialised' },
  { value: 'stakeholder', label: 'Stakeholder / approval delay' },
  { value: 'other', label: 'Other' },
]

export const DELAY_SEVERITIES = ['low', 'medium', 'high', 'critical']

export const DELAY_STATUSES = [
  'identified',
  'under_review',
  'approved',
  'resolved',
  'closed',
]

export const DELAY_SOURCE_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'from_template', label: 'From template' },
  { value: 'auto_issue', label: 'Auto: Issue' },
  { value: 'auto_risk', label: 'Auto: Risk' },
  { value: 'auto_defect', label: 'Auto: Defect' },
]

export const TEMPLATE_STATUSES = ['draft', 'active', 'archived']
